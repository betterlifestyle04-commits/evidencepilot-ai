"use client";

import { useState } from "react";
import type { ClaimInsight } from "./report-insights";
import {
  editorialDecisionLabels, summarizeEditorialReview, type EditorialDecision
} from "./editorial-review";

export default function EditorialReviewDesk({
  claims, aiRewrite, draft, decisions, reviewedSourceCount, totalSourceCount, rewriteUnavailable = false,
  onChangeDraft, onSetDecision
}: {
  claims: ClaimInsight[];
  aiRewrite: string;
  draft: string;
  decisions: EditorialDecision[];
  reviewedSourceCount: number;
  totalSourceCount: number;
  rewriteUnavailable?: boolean;
  onChangeDraft: (draft: string) => void;
  onSetDecision: (index: number, decision: EditorialDecision) => void;
}) {
  const [copied, setCopied] = useState(false);
  const summary = summarizeEditorialReview({ decisions, draft });
  const isEdited = draft !== aiRewrite;
  const incompleteSources = totalSourceCount - reviewedSourceCount;
  const outstanding = summary.unreviewed + summary.needsWork;
  async function copyWorkingDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return <section className="editorial-desk" aria-labelledby="editorial-desk-title">
    <div className="editorial-desk-heading">
      <div>
        <span className="step-index">HUMAN EDITORIAL DESK</span>
        <h3 id="editorial-desk-title">Make the final wording your own.</h3>
        <p>Decide what needs more research, revise the proposed wording, and save your review alongside the evidence report. These are reader decisions, not AI verification.</p>
      </div>
      <div className="editorial-count">
        <strong>{summary.selected}<small> / {summary.total}</small></strong>
        <span>Selected for draft</span>
      </div>
    </div>
    <div className="editorial-decision-list">
      {claims.map((claim, index) => <div className="editorial-decision" key={index}>
        <div>
          <span>CLAIM {String(index + 1).padStart(2, "0")}</span>
          <p>{claim.claim}</p>
          <small>AI assessment: {claim.verdict.replaceAll("_", " ")}</small>
        </div>
        <label>
          <span>My editorial decision</span>
          <select value={decisions[index] || "unreviewed"}
            onChange={event => onSetDecision(index, event.target.value as EditorialDecision)}
            aria-label={"Editorial decision for claim " + (index + 1)}>
            {Object.entries(editorialDecisionLabels).map(([value, label]) =>
              <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </div>)}
    </div>
    <div className="editorial-draft-heading">
      <div><span className="step-index">YOUR WORKING DRAFT</span>
        <h4>{rewriteUnavailable ? "Prepare your own correction." : "Review the suggested correction."}</h4>
        <p>{rewriteUnavailable ? "The AI rewrite was unavailable. This editor starts with the original submitted text, which has not been corrected." : "The editor starts with Nemotron's cautious rewrite."} Changes you make are local and are never sent to Nebius or Tavily.</p>
      </div>
      <button className="secondary-button" type="button" disabled={!isEdited} onClick={() => onChangeDraft(aiRewrite)}>{rewriteUnavailable ? "Reset to original text" : "Reset to AI suggestion"}</button>
    </div>
    <label className="editorial-draft-label" htmlFor="editorial-draft">Editable publication draft</label>
    <textarea id="editorial-draft" value={draft} maxLength={12_000} rows={7}
      onChange={event => { onChangeDraft(event.target.value); setCopied(false); }}
      placeholder="Use the evidence report to prepare an accurately qualified statement."
      aria-describedby="editorial-draft-hint"/>
    <div className="editorial-draft-actions">
      <span id="editorial-draft-hint">{draft.length.toLocaleString()} / 12,000 characters · {isEdited ? "Reader-edited draft" : rewriteUnavailable ? "Original text retained — no AI correction" : "Unedited AI suggestion"}</span>
      <button type="button" className="secondary-button" onClick={() => void copyWorkingDraft()} disabled={!draft.trim()}>
        {copied ? "Copied draft ✓" : "Copy working draft"}
      </button>
    </div>
    <div className="editorial-readiness" aria-label="Editorial checklist">
      <strong>Before publishing this text</strong>
      <div className="editorial-readiness-grid">
        <span className={outstanding ? "editorial-pending" : "editorial-reviewed"}>
          {outstanding ? outstanding + " claim decisions still require attention" : "All claims received an editorial decision"}
        </span>
        <span className={totalSourceCount === 0 || incompleteSources ? "editorial-pending" : "editorial-reviewed"}>
          {totalSourceCount === 0 ? "No cited sources available — verify independently" : incompleteSources ? incompleteSources + " cited sources not marked reviewed" : "All cited sources marked reviewed"}
        </span>
      </div>
      <p>This checklist measures only your manual workflow. Even if every item is complete, it does not establish that the claims, sources, or draft are accurate.</p>
    </div>
  </section>;
}
