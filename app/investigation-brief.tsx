"use client";

import type { ClaimInsight } from "./report-insights";
import { prepareBrief, reportBriefMarkdown } from "./brief-utils";

const verdictLabels = {
  supported: "Supported",
  contradicted: "Contradicted",
  mixed: "Mixed evidence",
  insufficient_evidence: "Insufficient evidence"
} as const;

export function InvestigationBrief({
  claims, mode, completedAt, reviewedUrls, rewriteUnavailable, onCopy
}: {
  claims: ClaimInsight[];
  mode?: "quick" | "deep";
  completedAt: string | null;
  reviewedUrls: string[];
  rewriteUnavailable: boolean;
  onCopy: (value: string, label: string) => void;
}) {
  const brief = prepareBrief(claims, reviewedUrls);
  const toCopy = () => onCopy(reportBriefMarkdown({ claims, mode, completedAt, reviewedUrls, rewriteUnavailable }), "Investigation brief");
  return <section className="investigation-brief" id="report-brief" aria-labelledby="brief-title">
    <div className="brief-header">
      <div>
        <span className="step-index">EXECUTIVE INVESTIGATION BRIEF</span>
        <h3 id="brief-title">The findings, at a glance.</h3>
        <p>Each verdict comes from AI-assisted research into retrieved material. This brief is a navigation aid, not an independent fact-check.</p>
      </div>
      <button type="button" className="secondary-button" onClick={toCopy}>Copy brief</button>
    </div>
    <div className="brief-metrics">
      <div><strong>{brief.rows.length}</strong><span>Claims assessed</span></div>
      <div><strong>{brief.needingAttention}</strong><span>Need further review</span></div>
      <div><strong>{brief.cited}</strong><span>Distinct cited URLs</span></div>
      <div><strong>{brief.reviewed} / {brief.cited}</strong><span>Marked reviewed by reader</span></div>
    </div>
    <div className="brief-findings">
      {brief.rows.map(row => <a key={row.number} href={"#claim-" + row.number} className="brief-finding">
        <span className="brief-finding-index">{String(row.number).padStart(2,"0")}</span>
        <span className="brief-finding-content">
          <strong>{row.claim}</strong>
          <small>{row.citedSources} {row.citedSources === 1 ? "cited URL" : "cited URLs"}
            {row.evidenceStrength ? " · " + row.evidenceStrength + " evidence" : ""}
            {row.unavailable ? " · analysis stage unavailable" : ""}
            {row.timeSensitive ? " · time-sensitive" : ""}
          </small>
        </span>
        <span className={"brief-verdict brief-verdict-" + row.verdict}>{verdictLabels[row.verdict]}</span>
      </a>)}
    </div>
    <div className="brief-next-step">
      <strong>Before relying on this report</strong>
      <p>{rewriteUnavailable
        ? "The AI rewrite did not complete. The original text was retained; verify the evidence and prepare your own correction."
        : brief.cited === 0
          ? "No source links were cited. Seek independent evidence before relying on these conclusions."
          : brief.reviewed < brief.cited
            ? "Inspect the original source pages and mark the ones you have personally checked."
            : "Review the evidence and wording yourself; completed manual checks are not proof of factual accuracy."}</p>
      <a href={brief.cited > 0 ? "#source-review" : "#claim-assessments"}>{brief.cited > 0 ? "Go to source review" : "Inspect claim assessments"} <span aria-hidden="true">↗</span></a>
    </div>
  </section>;
}

export function ReportSectionNavigation() {
  return <nav className="report-jump-nav" aria-label="Jump to a section of this report">
    <a href="#report-brief">Brief</a>
    <a href="#evidence-coverage">Evidence coverage</a>
    <a href="#claim-assessments">Claims & citations</a>
    <a href="#source-review">Source review</a>
    <a href="#report-rewrite">Correction</a>
    <a href="#editorial-review">Editorial desk</a>
    <a href="#report-comparison">Compare reports</a>
  </nav>;
}
