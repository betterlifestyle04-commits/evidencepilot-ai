import { categorizeSource, rankSearchResults, sanitizeSearchResults, sourcesFor, type Assessment, type SearchResult } from "./evidence";
import { ProviderError, type ResearchPlan } from "./providers";

export type AnalysisProviders = {
  extractClaims(content: string): Promise<string[]>;
  planClaim(claim: string): Promise<ResearchPlan>;
  searchClaim(query: string): Promise<SearchResult[]>;
  assess(claim: string, sources: SearchResult[], plan?: ResearchPlan): Promise<Assessment>;
  cautiousRewrite(original: string, assessments: { claim: string; verdict: string; explanation: string }[]): Promise<string>;
};

type ReviewedClaim = Assessment & {
  sources: ReturnType<typeof sourcesFor>;
  retrievalStatus?: "unavailable" | "empty";
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

export async function analyzeContent(content: string, providers: AnalysisProviders) {
  const claims = await providers.extractClaims(content);
  if (!claims.length) throw new Error("No independently verifiable factual claims were found in this text.");

  let nebiusCalls = 1, tavilyCalls = 0, followupSearches = 0;
  const started = Date.now();
  const queryCache = new Map<string, Promise<SearchResult[]>>();
  const retrieve = (query: string) => {
    const key = query.trim().toLowerCase();
    const cached = queryCache.get(key);
    if (cached) return cached;
    tavilyCalls++;
    const task = providers.searchClaim(query).catch(error => {
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
    try {
      nebiusCalls++;
      plan = await providers.planClaim(claim);
    } catch (error) {
      if (error instanceof ProviderError && error.kind === "configuration") throw error;
      plan = fallbackPlan(claim);
    }
    let results: SearchResult[];
    try {
      results = await retrieve(plan.queries[0] || claim + " official documentation");
    } catch (error) {
      if (error instanceof ProviderError && error.kind === "configuration") throw error;
      return {
        claim: plan.normalizedClaim, verdict: "insufficient_evidence",
        explanation: "Evidence retrieval was temporarily unavailable for this claim, so no conclusion can be supported.",
        sourceIndices: [], sources: [], retrievalStatus: "unavailable", researchPlan: planSummary(plan)
      };
    }

    if (searchBudget() > 1 && needsFollowup(results) && plan.queries[1]) {
      followupSearches++;
      try {
        results = sanitizeSearchResults([...results, ...await retrieve(plan.queries[1])]);
      } catch (error) {
        if (error instanceof ProviderError && error.kind === "configuration") throw error;
        // A failed optional search must not erase the successful first search.
      }
    }
    results = rankSearchResults(sanitizeSearchResults(results), plan.normalizedClaim);
    if (!results.length) return {
      claim: plan.normalizedClaim, verdict: "insufficient_evidence",
      explanation: "No usable public sources were retrieved for this claim, so no conclusion can be supported.",
      sourceIndices: [], sources: [], retrievalStatus: "empty", researchPlan: planSummary(plan)
    };

    nebiusCalls++;
    const assessment = await providers.assess(plan.normalizedClaim, results, plan);
    return {
      ...assessment,
      sources: sourcesFor(assessment.sourceIndices, results, assessment.sourceAssessments),
      researchPlan: planSummary(plan)
    };
  }

  // At most two claim investigations run concurrently, preserving the displayed order.
  // This keeps model latency bounded without launching an unbounded agent swarm.
  const reviewed: ReviewedClaim[] = [];
  for (let index = 0; index < claims.length; index += 2) {
    const batch = await Promise.all(claims.slice(index, index + 2).map(investigate));
    reviewed.push(...batch);
  }
  nebiusCalls++;
  const rewrite = await providers.cautiousRewrite(content, reviewed);
  return {
    claims: reviewed,
    rewrite,
    providerCalls: { nebius: nebiusCalls, tavily: tavilyCalls, total: nebiusCalls + tavilyCalls },
    investigation: {
      durationMs: Date.now() - started,
      uniqueSearches: tavilyCalls,
      followupSearches,
      partialClaims: reviewed.filter(claim => claim.retrievalStatus).length
    }
  };
}
