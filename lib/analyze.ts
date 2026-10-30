import { categorizeSource, rankSearchResults, sanitizeSearchResults, sourcesFor, type Assessment, type SearchResult } from "./evidence";
import { ProviderError, type ResearchPlan } from "./providers";
import { MAX_REWRITE_INPUT_CHARS } from "./rewrite-limits";

export type AnalysisMode = "quick" | "deep";
/** Expected, non-provider error: the supplied text has no checkable facts. */
export class NoCheckableClaimsError extends Error {
  constructor() { super("No independently checkable factual claims were found."); this.name = "NoCheckableClaimsError"; }
}
export type AnalysisProviders = {
  extractClaims(content: string): Promise<string[]>;
  planClaim(claim: string): Promise<ResearchPlan>;
  searchClaim(query: string, mode?: AnalysisMode): Promise<SearchResult[]>;
  assess(claim: string, sources: SearchResult[], plan?: ResearchPlan): Promise<Assessment>;
  cautiousRewrite(original: string, assessments: { claim: string; verdict: string; explanation: string }[]): Promise<string>;
};

type ReviewedClaim = Assessment & {
  sources: ReturnType<typeof sourcesFor>;
  unassessedSources?: ReturnType<typeof sourcesFor>;
  retrievalStatus?: "unavailable" | "empty" | "assessment_unavailable";
  researchPlan?: Omit<ResearchPlan,"queries">;
};
const fallbackPlan = (claim: string): ResearchPlan => ({
  normalizedClaim: claim, claimType: "other", timeSensitive: false, entities: [],
  evidenceNeeded: "Direct evidence relevant to the claim.",
  queries: [claim + " official documentation", claim + " primary source"]
});
const searchBudget = () => Math.min(2, Math.max(1, Number.parseInt(process.env.MAX_SEARCHES_PER_CLAIM || "2", 10) || 2));
const needsFollowup = (sources: SearchResult[]) =>
  sources.length < 2 || sources.every(source => ["social_media", "commentary", "unknown"].includes(categorizeSource(source)));

export async function analyzeContent(content: string, providers: AnalysisProviders, mode: AnalysisMode = "deep") {
  // Full request latency includes the model's claim-extraction stage.
  const started = Date.now();
  const claims = await providers.extractClaims(content);
  if (!claims.length) throw new NoCheckableClaimsError();

  let nebiusCalls = 1, tavilyCalls = 0, followupSearches = 0;
  const queryCache = new Map<string, Promise<SearchResult[]>>();
  const retrieve = (query: string) => {
    const key = query.trim().toLowerCase();
    const cached = queryCache.get(key);
    if (cached) return cached;
    tavilyCalls++;
    const task = providers.searchClaim(query, mode).catch(error => {
      queryCache.delete(key);
      throw error;
    });
    queryCache.set(key, task);
    return task;
  };
  const planSummary = (plan: ResearchPlan): Omit<ResearchPlan,"queries"> => ({
    normalizedClaim: plan.normalizedClaim, claimType: plan.claimType,
    timeSensitive: plan.timeSensitive, entities: plan.entities, evidenceNeeded: plan.evidenceNeeded
  });

  async function investigate(claim: string): Promise<ReviewedClaim> {
    let plan: ResearchPlan;
    if (mode === "quick") {
      plan = { ...fallbackPlan(claim), queries: [claim + " primary source fact check"] };
    } else {
      try {
        nebiusCalls++;
        plan = await providers.planClaim(claim);
      } catch (error) {
        if (error instanceof ProviderError && error.kind === "configuration") throw error;
        plan = fallbackPlan(claim);
      }
    }
    let results: SearchResult[];
    try {
      results = await retrieve(plan.queries[0] || claim + " official documentation");
    } catch (error) {
      if (error instanceof ProviderError && error.kind === "configuration") throw error;
      return {
        claim, verdict: "insufficient_evidence",
        explanation: "Evidence retrieval was temporarily unavailable for this claim, so no conclusion can be supported.",
        sourceIndices: [], sources: [], retrievalStatus: "unavailable", researchPlan: planSummary(plan)
      };
    }

    if (mode === "deep" && searchBudget() > 1 && needsFollowup(results) && plan.queries[1]) {
      followupSearches++;
      try {
        results = sanitizeSearchResults([...results, ...await retrieve(plan.queries[1])]);
      } catch (error) {
        if (error instanceof ProviderError && error.kind === "configuration") throw error;
        // A failed optional search must not erase the successful first search.
      }
    }
    // Rank against the user's extracted claim, not a possibly drifted research paraphrase.
    results = rankSearchResults(sanitizeSearchResults(results), claim);
    if (!results.length) return {
      claim, verdict: "insufficient_evidence",
      explanation: "No usable public sources were retrieved for this claim, so no conclusion can be supported.",
      sourceIndices: [], sources: [], retrievalStatus: "empty", researchPlan: planSummary(plan)
    };

    nebiusCalls++;
    try {
      // The research planner and assessor are not allowed to replace the claim
      // that the extractor originally identified. The plan remains metadata.
      const assessment = await providers.assess(claim, results, { ...plan, normalizedClaim: claim });
      return {
        ...assessment,
        claim,
        sources: sourcesFor(assessment.sourceIndices, results, assessment.sourceAssessments),
        researchPlan: planSummary(plan)
      };
    } catch (error) {
      if (error instanceof ProviderError && error.kind === "configuration") throw error;
      return {
        claim, verdict: "insufficient_evidence",
        explanation: "Evidence was retrieved, but the assessment service was temporarily unavailable, so no conclusion can be supported.",
        // Retain real retrieved URLs for human inspection, without misrepresenting
        // them as model-cited evidence or assigning a support relationship.
        sourceIndices: [], sources: [],
        unassessedSources: sourcesFor(results.slice(0, 4).map((_, index) => index), results),
        retrievalStatus: "assessment_unavailable", researchPlan: planSummary(plan)
      };
    }
  }

  // At most two claim investigations run concurrently, preserving the displayed order.
  // This keeps model latency bounded without launching an unbounded agent swarm.
  const reviewed: ReviewedClaim[] = [];
  for (let index = 0; index < claims.length; index += 2) {
    const batch = await Promise.all(claims.slice(index, index + 2).map(investigate));
    reviewed.push(...batch);
  }
  let rewrite = content;
  let rewriteStatus: "unavailable" | "skipped_for_length" | undefined;
  if (content.length > MAX_REWRITE_INPUT_CHARS) {
    // A one-pass rewrite would see only the first 6,000 chars; retain the complete
    // original rather than silently dropping or misrepresenting the remainder.
    rewriteStatus = "skipped_for_length";
  } else {
    nebiusCalls++;
    try {
      rewrite = await providers.cautiousRewrite(content, reviewed);
    } catch (error) {
      if (error instanceof ProviderError && error.kind === "configuration") throw error;
      rewriteStatus = "unavailable";
    }
  }
  return {
    claims: reviewed,
    rewrite,
    mode,
    providerCalls: { nebius: nebiusCalls, tavily: tavilyCalls, total: nebiusCalls + tavilyCalls },
    investigation: {
      durationMs: Date.now() - started,
      uniqueSearches: tavilyCalls,
      followupSearches,
      partialClaims: reviewed.filter(claim => claim.retrievalStatus).length,
      rewriteStatus
    }
  };
}
