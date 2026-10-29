import type { ClaimInsight, EvidenceDetail, InvestigationSummary } from "./report-insights";
import { parseEditorialReview, type EditorialReview } from "./editorial-review";

/**
 * Only accepts self-contained EvidencePilot exports. All imported data is
 * revalidated before being rendered; no file bytes are sent to providers.
 */
type AnalysisMode = "quick" | "deep";
export type SavedReport = {
  claims: ClaimInsight[];
  rewrite: string;
  model: string;
  mode?: AnalysisMode;
  providerCalls?: { nebius: number; tavily: number; total: number };
  investigation?: InvestigationSummary;
};
export type SavedSnapshot = {
  original: string;
  report: SavedReport;
  completedAt: string | null;
  reviewedUrls: string[];
  sourceNotes: Record<string, string>;
  editorialReview: EditorialReview;
};

const verdicts = new Set(["supported", "contradicted", "mixed", "insufficient_evidence"]);
const strengthLabels = new Set(["strong", "moderate", "limited", "insufficient"]);
const sourceTypes = new Set(["primary", "academic", "established_reporting", "commentary", "social_media", "unknown"]);
const sourceRelations = new Set(["supports", "contradicts", "context", "inconclusive"]);
const claimTypes = new Set(["scientific", "historical", "statistical", "technological", "economic", "political", "other"]);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("This file is not a valid EvidencePilot report.");
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, maximum: number, field: string): string {
  if (typeof value !== "string" || value.length > maximum) throw new Error("Invalid " + field + " in the saved report.");
  return value;
}
function optionalText(value: unknown, maximum: number): string | undefined {
  return typeof value === "string" && value.length <= maximum ? value : undefined;
}
function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9 ? value : undefined;
}
function oneOf<T extends string>(value: unknown, allowed: Set<string>): T | undefined {
  return typeof value === "string" && allowed.has(value) ? value as T : undefined;
}
function safeUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:"
      && !parsed.username && !parsed.password
      && host !== "localhost" && !host.endsWith(".local")
      && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)
      && !host.includes("%");
  } catch { return false; }
}
function parseEvidence(value: unknown): EvidenceDetail {
  const e = object(value);
  if (!safeUrl(e.url)) throw new Error("Saved report contains an unsafe source URL.");
  return {
    title: text(e.title, 240, "source title"),
    url: e.url,
    snippet: text(e.snippet, 2500, "source excerpt"),
    sourceIndex: typeof e.sourceIndex === "number" && Number.isInteger(e.sourceIndex) && e.sourceIndex >= 0 && e.sourceIndex < 100 ? e.sourceIndex : undefined,
    publisher: optionalText(e.publisher, 200),
    publishedDate: optionalText(e.publishedDate, 60),
    sourceType: oneOf<NonNullable<EvidenceDetail["sourceType"]>>(e.sourceType, sourceTypes),
    relationship: oneOf<NonNullable<EvidenceDetail["relationship"]>>(e.relationship, sourceRelations),
    relevance: optionalText(e.relevance, 400),
    limitations: optionalText(e.limitations, 400)
  };
}
function parseClaim(value: unknown): ClaimInsight {
  const c = object(value);
  const verdict = oneOf<ClaimInsight["verdict"]>(c.verdict, verdicts);
  if (!verdict || !Array.isArray(c.sources) || c.sources.length > 12) {
    throw new Error("Invalid claim verdict or source list in the saved report.");
  }
  const plan = c.researchPlan;
  let researchPlan: ClaimInsight["researchPlan"];
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const p = object(plan);
    researchPlan = {
      normalizedClaim: optionalText(p.normalizedClaim, 400) || "",
      claimType: oneOf<string>(p.claimType, claimTypes) || "other",
      timeSensitive: p.timeSensitive === true,
      entities: Array.isArray(p.entities)
        ? p.entities.filter((x): x is string => typeof x === "string").slice(0, 8).map(x => x.slice(0, 100))
        : [],
      evidenceNeeded: optionalText(p.evidenceNeeded, 500) || ""
    };
  }
  const evidenceStrength = oneOf<NonNullable<ClaimInsight["evidenceStrength"]>>(c.evidenceStrength, strengthLabels);
  const retrievalStatus = oneOf<NonNullable<ClaimInsight["retrievalStatus"]>>(c.retrievalStatus, new Set(["empty", "unavailable"]));
  return {
    claim: text(c.claim, 400, "claim"),
    verdict,
    explanation: text(c.explanation, 2000, "assessment"),
    sources: c.sources.map(parseEvidence),
    evidenceStrength,
    qualifications: optionalText(c.qualifications, 800),
    researchPlan,
    retrievalStatus
  };
}
function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}
export function parseSavedReport(raw: string): SavedSnapshot {
  if (raw.length > 250_000) throw new Error("The saved report is too large. Maximum size: 250 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("This is not a valid JSON file."); }
  const file = object(parsed);
  if (file.product !== "EvidencePilot") throw new Error("This JSON file was not exported by EvidencePilot.");
  const original = text(file.original, 12_000, "original text");
  const reportValue = object(file.report);
  if (!Array.isArray(reportValue.claims) || reportValue.claims.length < 1 || reportValue.claims.length > 3) {
    throw new Error("The saved report needs between one and three claim assessments.");
  }
  const claims = reportValue.claims.map(parseClaim);
  const rewrite = text(reportValue.rewrite, 8_000, "suggested revision");
  const model = text(reportValue.model, 200, "model name");
  const mode = oneOf<AnalysisMode>(reportValue.mode, new Set(["quick", "deep"]));
  const calls = reportValue.providerCalls;
  let providerCalls: SavedReport["providerCalls"];
  if (calls && typeof calls === "object" && !Array.isArray(calls)) {
    const p = object(calls);
    const nebius = number(p.nebius), tavily = number(p.tavily), total = number(p.total);
    if (nebius !== undefined && tavily !== undefined && total !== undefined) providerCalls = { nebius, tavily, total };
  }
  const summary = reportValue.investigation;
  let investigation: InvestigationSummary | undefined;
  if (summary && typeof summary === "object" && !Array.isArray(summary)) {
    const p = object(summary);
    const durationMs = number(p.durationMs), uniqueSearches = number(p.uniqueSearches);
    const followupSearches = number(p.followupSearches), partialClaims = number(p.partialClaims);
    if ([durationMs, uniqueSearches, followupSearches, partialClaims].every(x => x !== undefined)) {
      investigation = { durationMs: durationMs!, uniqueSearches: uniqueSearches!, followupSearches: followupSearches!, partialClaims: partialClaims! };
    }
  }
  const urls = new Set(claims.flatMap(claim => claim.sources.map(source => source.url)));
  const review = file.manualSourceReview;
  const reviewedUrls: string[] = [];
  const sourceNotes: Record<string, string> = {};
  if (review && typeof review === "object" && !Array.isArray(review)) {
    const r = object(review);
    if (Array.isArray(r.reviewedUrls)) {
      for (const url of r.reviewedUrls) if (typeof url === "string" && urls.has(url) && !reviewedUrls.includes(url)) reviewedUrls.push(url);
    }
    if (r.sourceNotes && typeof r.sourceNotes === "object" && !Array.isArray(r.sourceNotes)) {
      const notes = object(r.sourceNotes);
      for (const url of urls) {
        const note = optionalText(notes[url], 600);
        if (note) sourceNotes[url] = note;
      }
    }
  }
  return {
    original,
    report: { claims, rewrite, model, mode, providerCalls, investigation },
    completedAt: validTimestamp(file.analysisCompletedAt),
    reviewedUrls,
    sourceNotes,
    editorialReview: parseEditorialReview(file.manualEditorialReview, claims.length, rewrite)
  };
}
