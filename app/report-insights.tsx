type Verdict = "supported" | "contradicted" | "mixed" | "insufficient_evidence";
export type EvidenceDetail = {
  title: string; url: string; snippet: string; sourceIndex?: number;
  publisher?: string; publishedDate?: string;
  sourceType?: "primary" | "academic" | "established_reporting" | "commentary" | "social_media" | "unknown";
  relationship?: "supports" | "contradicts" | "context" | "inconclusive";
  relevance?: string; limitations?: string;
};
export type ResearchPlanSummary = {
  normalizedClaim: string; claimType: string; timeSensitive: boolean;
  entities: string[]; evidenceNeeded: string;
};
export type ClaimInsight = {
  claim: string; verdict: Verdict; explanation: string; sources: EvidenceDetail[];
  evidenceStrength?: "strong" | "moderate" | "limited" | "insufficient";
  qualifications?: string;
  researchPlan?: ResearchPlanSummary;
  retrievalStatus?: "empty" | "unavailable" | "assessment_unavailable";
};
export type InvestigationSummary = {
  durationMs: number; uniqueSearches: number;
  followupSearches: number; partialClaims: number;
  rewriteStatus?: "unavailable";
};
const relationships: Record<NonNullable<EvidenceDetail["relationship"]>, string> = {
  supports: "Supports", contradicts: "Challenges", context: "Context", inconclusive: "Inconclusive"
};
const sourceTypes: Record<NonNullable<EvidenceDetail["sourceType"]>, string> = {
  primary: "Possible primary source", academic: "Academic / research",
  established_reporting: "Reporting", commentary: "Commentary",
  social_media: "Social platform", unknown: "Unclassified"
};
function domain(value: string) {
  try { return new URL(value).hostname.replace(/^www\./i, ""); } catch { return "Source"; }
}
export function InvestigationOverview({ summary }: { summary?: InvestigationSummary }) {
  if (!summary) return null;
  return <div className="investigation-overview" aria-label="Investigation activity">
    <div><span>Research searches</span><strong>{summary.uniqueSearches}</strong></div>
    <div><span>Follow-up investigations</span><strong>{summary.followupSearches}</strong></div>
    <div><span>Analysis duration</span><strong>{(summary.durationMs / 1000).toFixed(1)}s</strong></div>
    <div><span>Partial evidence results</span><strong>{summary.partialClaims}</strong></div>
    <p>Actual workflow activity reported by the backend, not simulated progress.</p>
  </div>;
}
export function ResearchReasoning({ claim }: { claim: ClaimInsight }) {
  const plan = claim.researchPlan;
  const detail = claim.evidenceStrength || claim.qualifications || plan || claim.retrievalStatus;
  if (!detail) return null;
  return <div className="research-reasoning">
    <div className="research-topline">
      {claim.evidenceStrength && <span className={"strength-pill strength-" + claim.evidenceStrength}>{claim.evidenceStrength} evidence</span>}
      {plan && <span className="research-topic">{plan.claimType} {plan.timeSensitive ? "· time-sensitive" : ""}</span>}
      {claim.retrievalStatus && <span className="retrieval-warning">{claim.retrievalStatus === "unavailable" ? "Source search unavailable" : claim.retrievalStatus === "assessment_unavailable" ? "AI assessment unavailable" : "No usable sources retrieved"}</span>}
    </div>
    {claim.qualifications && <p className="research-qualification"><strong>Important qualification:</strong> {claim.qualifications}</p>}
    {plan && <details className="investigation-details"><summary>How this claim was investigated</summary>
      <p><strong>Research objective:</strong> {plan.evidenceNeeded}</p>
      {plan.entities?.length > 0 && <p><strong>Relevant entities:</strong> {plan.entities.join(", ")}</p>}
      {plan.normalizedClaim !== claim.claim && <p><strong>Normalized claim:</strong> {plan.normalizedClaim}</p>}
    </details>}
  </div>;
}
export function GroundedExplanation({ text, sources, claimNumber }: { text: string; sources: EvidenceDetail[]; claimNumber: number }) {
  const parts = text.split(/(\b[Ss]ource\s+\d+\b)/g);
  return <p className="claim-explanation">{parts.map((part, index) => {
    const match = /^[Ss]ource\s+(\d+)$/.exec(part);
    const sourceIndex = match ? Number(match[1]) : null;
    const known = sourceIndex !== null && sources.some(source => source.sourceIndex === sourceIndex);
    if (known) return <a key={index} className="inline-citation" href={"#claim-" + claimNumber + "-source-" + sourceIndex}>{part}</a>;
    return <span key={index}>{part}</span>;
  })}</p>;
}

export function EvidenceTrail({ sources, claimNumber }: { sources: EvidenceDetail[]; claimNumber: number }) {
  if (!sources.length) return <p className="no-sources">No sources are cited for this claim. Do not treat the assessment as established fact.</p>;
  const support = sources.filter(s => s.relationship === "supports").length;
  const challenge = sources.filter(s => s.relationship === "contradicts").length;
  return <div className="evidence-trail">
    {sources.some(s => s.relationship) && <div className="evidence-balance"><span className="balance-support">+ {support} supporting</span><span className="balance-challenge">− {challenge} challenging</span><span>{sources.length - support - challenge} context / unclear</span></div>}
    {sources.map((source, index) => {
      const type = source.sourceType && sourceTypes[source.sourceType];
      const relation = source.relationship && relationships[source.relationship];
      return <article className="evidence-entry" key={source.url + index} id={source.sourceIndex === undefined ? undefined : "claim-" + claimNumber + "-source-" + source.sourceIndex}>
        <div className="evidence-entry-top"><span className="source-number">SOURCE {source.sourceIndex === undefined ? String(index + 1).padStart(2,"0") : source.sourceIndex}</span>
          {relation && <span className={"relationship-tag relation-" + source.relationship}>{relation}</span>}
          {type && <span className="source-category">{type}</span>}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="evidence-source-link">
          <strong>{source.title}</strong><span aria-hidden="true">↗</span>
        </a>
        <p className="evidence-excerpt">{source.snippet}</p>
        <div className="evidence-source-meta"><span>{source.publisher || domain(source.url)}</span>{source.publishedDate && <span>Published: {source.publishedDate}</span>}</div>
        {(source.relevance || source.limitations) && <details className="source-notes">
          <summary>Why this source matters</summary>
          {source.relevance && <p><strong>Relevance:</strong> {source.relevance}</p>}
          {source.limitations && <p><strong>Limitations:</strong> {source.limitations}</p>}
        </details>}
      </article>;
    })}
    <p className="source-caution">Source labels are AI-assisted classifications, not independent endorsements. Open the linked pages to check the complete context.</p>
  </div>;
}
export function RevisionComparison({ original, rewrite }: { original: string; rewrite: string }) {
  const compact = original.trim();
  return <div className="revision-comparison">
    <div className="revision-original"><span>ORIGINAL TEXT</span><p>{compact}</p></div>
    <div className="revision-new"><span>CAUTIOUS REWRITE</span><p>{rewrite}</p></div>
  </div>;
}
