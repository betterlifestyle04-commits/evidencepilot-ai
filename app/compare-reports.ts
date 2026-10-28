import type { ClaimInsight } from "./report-insights";
import type { SavedReport } from "./report-import";

/**
 * Deterministic, local-only comparison. No semantic matching, provider calls
 * or credibility claims. Rows are matched only by near-identical claim text
 * (case, whitespace and trailing sentence punctuation ignored).
 */
export type DifferenceType = "same" | "verdict_changed" | "sources_changed" | "new" | "missing";
export type ClaimDifference = {
  claim: string;
  earlier?: ClaimInsight;
  current?: ClaimInsight;
  kind: DifferenceType;
  addedSources: string[];
  removedSources: string[];
  strengthChanged: boolean;
};
export type ComparisonResult = {
  rows: ClaimDifference[];
  matched: number;
  changedVerdicts: number;
  changedSources: number;
  unmatched: number;
};

export function normalizeComparableClaim(claim: string): string {
  return claim.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").toLocaleLowerCase("en-US");
}

function sourceUrls(claim?: ClaimInsight): string[] {
  return claim ? [...new Set(claim.sources.map(source => source.url))] : [];
}

export function compareReports(earlier: SavedReport, current: SavedReport): ComparisonResult {
  const oldClaims = new Map<string, ClaimInsight[]>();
  for (const claim of earlier.claims) {
    const key = normalizeComparableClaim(claim.claim);
    oldClaims.set(key, [...(oldClaims.get(key) || []), claim]);
  }
  const rows: ClaimDifference[] = [];
  let matched = 0, changedVerdicts = 0, changedSources = 0;
  for (const claim of current.claims) {
    const key = normalizeComparableClaim(claim.claim);
    const priorList = oldClaims.get(key) || [];
    const prior = priorList.shift();
    if (!prior) {
      rows.push({ claim: claim.claim, current: claim, kind: "new", addedSources: sourceUrls(claim), removedSources: [], strengthChanged: false });
      continue;
    }
    matched++;
    const oldUrls = new Set(sourceUrls(prior));
    const newUrls = new Set(sourceUrls(claim));
    const addedSources = [...newUrls].filter(url => !oldUrls.has(url));
    const removedSources = [...oldUrls].filter(url => !newUrls.has(url));
    const strengthChanged = prior.evidenceStrength !== claim.evidenceStrength;
    const verdictChanged = prior.verdict !== claim.verdict;
    const sourcesChanged = addedSources.length > 0 || removedSources.length > 0;
    if (verdictChanged) changedVerdicts++;
    if (sourcesChanged) changedSources++;
    rows.push({
      claim: claim.claim, earlier: prior, current: claim,
      kind: verdictChanged ? "verdict_changed" : sourcesChanged || strengthChanged ? "sources_changed" : "same",
      addedSources, removedSources, strengthChanged
    });
  }
  for (const oldList of oldClaims.values()) {
    for (const prior of oldList) {
      rows.push({ claim: prior.claim, earlier: prior, kind: "missing", addedSources: [], removedSources: sourceUrls(prior), strengthChanged: false });
    }
  }
  return { rows, matched, changedVerdicts, changedSources, unmatched: rows.filter(row => !row.earlier || !row.current).length };
}

const label = (value?: string) => value ? value.replaceAll("_", " ") : "Not assessed";
export function comparisonMarkdown(result: ComparisonResult, earlierAt: string | null, currentAt: string | null): string {
  const lines = [
    "# EvidencePilot — saved report comparison", "",
    "Earlier report: " + (earlierAt || "Date not available"),
    "Current report: " + (currentAt || "Date not available"),
    "Matched claims: " + result.matched,
    "Changed verdicts: " + result.changedVerdicts,
    "Claims with changed source URLs: " + result.changedSources,
    "Unmatched claims: " + result.unmatched,
    "",
    "This is a local comparison of AI-generated reports, not a re-verification of facts or original sources.",
    "Only nearly identical claim wording is matched automatically; new/missing rows may describe semantically equivalent claims.",
    ""
  ];
  for (const [index, row] of result.rows.entries()) {
    lines.push("## " + (index + 1) + ". " + row.claim);
    lines.push("Status: " + row.kind.replaceAll("_", " "));
    lines.push("Earlier verdict: " + label(row.earlier?.verdict));
    lines.push("Current verdict: " + label(row.current?.verdict));
    lines.push("Earlier evidence strength: " + label(row.earlier?.evidenceStrength));
    lines.push("Current evidence strength: " + label(row.current?.evidenceStrength));
    if (row.addedSources.length) lines.push("New source URLs:", ...row.addedSources.map(url => "- " + url));
    if (row.removedSources.length) lines.push("No longer cited URLs:", ...row.removedSources.map(url => "- " + url));
    lines.push("");
  }
  return lines.join("\n");
}
