import type { ClaimInsight } from "./report-insights";

/** A deterministic synopsis: no new model inferences or invented confidence. */
export type BriefStatus = "supported" | "contradicted" | "mixed" | "insufficient_evidence";
export type BriefRow = {
  number: number;
  claim: string;
  verdict: BriefStatus;
  evidenceStrength?: ClaimInsight["evidenceStrength"];
  citedSources: number;
  needsAttention: boolean;
  timeSensitive: boolean;
  unavailable: boolean;
};
export function prepareBrief(claims: ClaimInsight[], reviewedUrls: string[]) {
  const urls = new Set(claims.flatMap(claim => claim.sources.map(source => source.url)));
  const reviewed = [...urls].filter(url => reviewedUrls.includes(url)).length;
  const rows: BriefRow[] = claims.map((claim, index) => ({
    number: index + 1, claim: claim.claim, verdict: claim.verdict,
    evidenceStrength: claim.evidenceStrength,
    citedSources: new Set(claim.sources.map(source => source.url)).size,
    timeSensitive: claim.researchPlan?.timeSensitive === true,
    unavailable: Boolean(claim.retrievalStatus),
    needsAttention: claim.verdict !== "supported" ||
      Boolean(claim.retrievalStatus) ||
      claim.evidenceStrength === "limited" ||
      claim.evidenceStrength === "insufficient" ||
      claim.sources.length === 0 ||
      claim.researchPlan?.timeSensitive === true
  }));
  return { rows, cited: urls.size, reviewed, needingAttention: rows.filter(row => row.needsAttention).length };
}
const verdictNames: Record<BriefStatus, string> = {
  supported: "Supported by retrieved evidence",
  contradicted: "Contradicted by retrieved evidence",
  mixed: "Mixed evidence",
  insufficient_evidence: "Insufficient evidence"
};
export function reportBriefMarkdown(params: {
  claims: ClaimInsight[];
  mode?: "quick" | "deep";
  completedAt: string | null;
  reviewedUrls: string[];
  rewriteUnavailable?: boolean;
}): string {
  const summary = prepareBrief(params.claims, params.reviewedUrls);
  const lines = [
    "# EvidencePilot — Investigation Brief", "",
    "Investigation type: " + (params.mode === "deep" ? "Deep Investigation" : params.mode === "quick" ? "Quick Check" : "Not specified"),
    "Completed at: " + (params.completedAt || "Not recorded"),
    "Claims assessed: " + summary.rows.length,
    "Distinct cited source URLs: " + summary.cited,
    "Sources marked manually reviewed: " + summary.reviewed,
    "Claims flagged for further attention: " + summary.needingAttention,
    "",
    "## Findings",
    ""
  ];
  for (const row of summary.rows) {
    lines.push(row.number + ". " + row.claim);
    lines.push("   Verdict: " + verdictNames[row.verdict]);
    lines.push("   Cited source URLs: " + row.citedSources);
    if (row.evidenceStrength) lines.push("   Evidence strength: " + row.evidenceStrength);
    if (row.unavailable) lines.push("   Warning: An analysis stage was unavailable.");
    if (row.timeSensitive) lines.push("   Warning: Time-sensitive claim; evidence may become outdated.");
    lines.push("");
  }
  if (params.rewriteUnavailable) lines.push("Warning: The AI rewrite was unavailable; original text was retained.", "");
  lines.push("These are model assessments of retrieved material, not independently verified facts or confidence scores.",
    "Open the original sources and review important statements before publication.");
  return lines.join("\n");
}
