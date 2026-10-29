"use client";

import { useState } from "react";
import type { ClaimInsight, EvidenceDetail } from "./report-insights";

type Focus = "all" | "attention";
type Relationship = NonNullable<EvidenceDetail["relationship"]>;

type ClaimCoverage = {
  index: number;
  claim: ClaimInsight;
  supporting: EvidenceDetail[];
  challenging: EvidenceDetail[];
  other: EvidenceDetail[];
  domains: number;
  attention: string[];
};

function safeDomain(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return "Unknown domain"; }
}

function getCoverage(claim: ClaimInsight, index: number): ClaimCoverage {
  const supporting = claim.sources.filter(source => source.relationship === "supports");
  const challenging = claim.sources.filter(source => source.relationship === "contradicts");
  const other = claim.sources.filter(source => source.relationship !== "supports" && source.relationship !== "contradicts");
  const domains = new Set(claim.sources.map(source => safeDomain(source.url))).size;
  const attention: string[] = [];
  if (claim.verdict === "contradicted") attention.push("Claim contradicted by retrieved material");
  if (claim.verdict === "mixed") attention.push("Conflicting evidence needs careful review");
  if (claim.verdict === "insufficient_evidence") attention.push("Not enough evidence to establish a verdict");
  if (claim.evidenceStrength === "limited") attention.push("Only limited evidence was assessed");
  if (!claim.sources.length) attention.push("No cited sources");
  else if (!supporting.length && !challenging.length) {
    attention.push("No sources explicitly classified as supporting or challenging");
  }
  if (claim.sources.length >= 2 && domains === 1) attention.push("Citations are concentrated on one domain");
  if (claim.researchPlan?.timeSensitive) attention.push("Time-sensitive claim: check dates");
  return { claim, index, supporting, challenging, other, domains, attention };
}

function SourcePreview({ entries, kind, claimIndex }: {
  entries: EvidenceDetail[];
  kind: "supports" | "contradicts" | "other";
  claimIndex: number;
}) {
  const heading = kind === "supports" ? "Supporting" : kind === "contradicts" ? "Challenging" : "Context / unclassified";
  return <div className={"coverage-source-group coverage-" + kind}>
    <div className="coverage-source-heading"><span>{heading}</span><strong>{entries.length}</strong></div>
    {entries.length === 0
      ? <p className="coverage-empty">{kind === "supports"
          ? "No source was explicitly labelled as supporting."
          : kind === "contradicts" ? "No source was explicitly labelled as challenging."
          : "No additional context sources."}</p>
      : <ul className="coverage-source-links">
          {entries.map((source, position) => <li key={source.url + ":" + position}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" title={"Open original source: " + source.title}>
              {source.title} <span aria-hidden="true">↗</span>
            </a>
            <span>{source.publisher || safeDomain(source.url)}</span>
          </li>)}
        </ul>}
    <a href={"#claim-" + claimIndex} className="coverage-jump">Read claim assessment ↗</a>
  </div>;
}

export default function EvidenceCoverageBoard({ claims }: { claims: ClaimInsight[] }) {
  const [focus, setFocus] = useState<Focus>("all");
  const [showContext, setShowContext] = useState(false);
  const rows = claims.map((claim, index) => getCoverage(claim, index + 1));
  const needingAttention = rows.filter(row => row.attention.length > 0);
  const shown = focus === "attention" ? needingAttention : rows;
  const supported = rows.reduce((sum, row) => sum + row.supporting.length, 0);
  const challenging = rows.reduce((sum, row) => sum + row.challenging.length, 0);
  const other = rows.reduce((sum, row) => sum + row.other.length, 0);

  if (!rows.length) return null;

  return <section className="coverage-board" id="evidence-coverage" aria-labelledby="coverage-title">
    <div className="coverage-topline">
      <div>
        <span className="step-index">EVIDENCE COVERAGE</span>
        <h3 id="coverage-title">See both sides of each claim.</h3>
        <p>This matrix organizes the source relationships reported by the AI. It does not independently confirm or authenticate those sources.</p>
      </div>
      <div className="coverage-overall" aria-label="Source-claim relationships across the report">
        <span><b>{supported}</b> supporting</span>
        <span><b>{challenging}</b> challenging</span>
        <span><b>{other}</b> context / unclassified</span>
      </div>
    </div>

    <div className="coverage-toolbar">
      <div className="coverage-filters" role="group" aria-label="Filter claims in evidence coverage">
        <button type="button" className={focus === "all" ? "is-active" : ""} aria-pressed={focus === "all"} onClick={() => setFocus("all")}>All claims ({rows.length})</button>
        <button type="button" className={focus === "attention" ? "is-active" : ""} aria-pressed={focus === "attention"} onClick={() => setFocus("attention")}>Needs attention ({needingAttention.length})</button>
      </div>
      <label className="coverage-context-toggle">
        <input type="checkbox" checked={showContext} onChange={(event) => setShowContext(event.target.checked)} />
        Show context sources
      </label>
    </div>

    {shown.length === 0
      ? <div className="coverage-nothing"><strong>No claims flagged by this checklist.</strong><p>That does not establish factual accuracy. Review the original evidence before relying on the report.</p></div>
      : <div className="coverage-rows">{shown.map(row => <article className="coverage-row" key={row.index}>
          <div className="coverage-row-header">
            <div><span>CLAIM {String(row.index).padStart(2, "0")}</span><h4>{row.claim.claim}</h4></div>
            <a className="coverage-claim-link" href={"#claim-" + row.index}>Full assessment ↗</a>
          </div>
          <div className="coverage-row-meta">
            <span>{row.claim.verdict.replaceAll("_", " ")}</span>
            {row.claim.evidenceStrength && <span>{row.claim.evidenceStrength} evidence</span>}
            <span>{row.domains} cited {row.domains === 1 ? "domain" : "domains"}</span>
          </div>
          {row.attention.length > 0 && <div className="coverage-attention" aria-label="Issues requiring review">
            <strong>Review priorities</strong>
            <ul>{row.attention.map(item => <li key={item}>{item}</li>)}</ul>
          </div>}
          <div className="coverage-columns">
            <SourcePreview entries={row.supporting} kind="supports" claimIndex={row.index}/>
            <SourcePreview entries={row.challenging} kind="contradicts" claimIndex={row.index}/>
            {showContext && <SourcePreview entries={row.other} kind="other" claimIndex={row.index}/>}
          </div>
        </article>)}</div>}

    <p className="coverage-disclaimer">Counts represent cited source–claim relationships, not independent corroboration, trust scores, or certainty. The same website or source may be cited more than once. Open original pages and evaluate their context.</p>
  </section>;
}
