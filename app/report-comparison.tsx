"use client";

import { useMemo, useState } from "react";
import { compareReports, comparisonMarkdown, type ClaimDifference } from "./compare-reports";
import { parseSavedReport, type SavedReport, type SavedSnapshot } from "./report-import";

function statusLabel(row: ClaimDifference): string {
  switch (row.kind) {
    case "verdict_changed": return "Verdict changed";
    case "sources_changed": return "Cited pages changed";
    case "strength_changed": return "Evidence strength changed";
    case "new": return "New claim";
    case "missing": return "Not in current report";
    default: return "No tracked changes";
  }
}
function verdictLabel(value?: string) {
  return value ? value.replaceAll("_", " ") : "Not assessed";
}
function displayDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Date unavailable";
  return new Date(value).toLocaleString();
}
function SourceChanges({ title, urls }: { title: string; urls: string[] }) {
  if (!urls.length) return null;
  return <div className="compare-source-change"><strong>{title} ({urls.length})</strong>
    <ul>{urls.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url} ↗</a></li>)}</ul>
  </div>;
}

export default function ReportComparison({ current, completedAt }: { current: SavedReport; completedAt: string | null }) {
  const [baseline, setBaseline] = useState<SavedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const comparison = useMemo(() => baseline ? compareReports(baseline.report, current) : null, [baseline, current]);

  async function importBaseline(file?: File) {
    if (!file) return;
    if (!/\.json$/i.test(file.name) || file.size > 250_000) {
      setError("Choose an EvidencePilot JSON report smaller than 250 KB.");
      return;
    }
    try {
      const parsed = parseSavedReport(await file.text());
      setBaseline(parsed);
      setError("");
      setNotice("Older saved report loaded locally. No provider requests were made.");
      setDifferencesOnly(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be read.");
    }
  }

  async function copyComparison() {
    if (!comparison) return;
    try {
      await navigator.clipboard.writeText(comparisonMarkdown(comparison, baseline?.completedAt || null, completedAt));
      setNotice("Comparison summary copied.");
    } catch {
      setNotice("Clipboard access was blocked. Use your browser's text selection to copy the comparison.");
    }
  }

  const shown = comparison?.rows.filter(row => !differencesOnly || row.kind !== "same") || [];
  return <section className="report-compare-workspace" id="report-comparison" aria-labelledby="report-compare-title">
    <div className="report-compare-header">
      <div>
        <span className="step-index">LOCAL INVESTIGATION HISTORY</span>
        <h3 id="report-compare-title">Compare two evidence reports.</h3>
        <p>Reopen an earlier exported JSON report to compare its verdicts and cited URLs with this investigation. The comparison stays in your browser—no new AI requests or uploads.</p>
      </div>
      {baseline && <button type="button" className="secondary-button" onClick={() => { setBaseline(null); setError(""); setNotice(""); }}>Clear comparison</button>}
    </div>
    <div className="compare-upload-row">
      <label className="import-file">
        ↑ {baseline ? "Replace older report" : "Choose an older report (.json)"}
        <input type="file" accept=".json,application/json" aria-label="Choose an earlier EvidencePilot JSON report for comparison" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void importBaseline(file);
        }}/>
      </label>
      <span>Local-only comparison · Maximum 250 KB</span>
    </div>
    {error && <p className="compare-error" role="alert">{error}</p>}
    {notice && <p className="compare-notice" role="status">{notice}</p>}
    {baseline && comparison && <div className="compare-results">
      <div className="compare-dates">
        <div><span>EARLIER SNAPSHOT</span><strong>{displayDate(baseline.completedAt)}</strong></div>
        <span aria-hidden="true">→</span>
        <div><span>CURRENT REPORT</span><strong>{displayDate(completedAt)}</strong></div>
      </div>
      <div className="compare-metrics" aria-label="Comparison summary">
        <div><strong>{comparison.matched}</strong><span>Matching claims</span></div>
        <div><strong>{comparison.changedVerdicts}</strong><span>Verdict differences</span></div>
        <div><strong>{comparison.changedSources}</strong><span>Changed cited pages</span></div>
        <div><strong>{comparison.unmatched}</strong><span>Unmatched claims</span></div>
      </div>
      <div className="compare-options">
        <label><input type="checkbox" checked={differencesOnly} onChange={event => setDifferencesOnly(event.target.checked)}/> Show only differences</label>
        <button type="button" className="secondary-button" onClick={() => void copyComparison()}>Copy comparison summary</button>
      </div>
      {!comparison.matched && <p className="compare-warning">No claims matched by normalized text. This tool does not guess whether differently worded claims mean the same thing.</p>}
      {!shown.length ? <p className="compare-no-changes">There are no differences in verdict, evidence-strength label or cited source pages for the matched claims. This is not proof that either report is correct.</p>
        : <div className="compare-claim-list">{shown.map((row, index) => <article className="compare-claim" key={row.claim + ":" + index}>
          <div className="compare-claim-heading"><h4>{row.claim}</h4><span className={"compare-status compare-status-" + row.kind}>{statusLabel(row)}</span></div>
          <div className="compare-verdicts">
            <div><span>Earlier assessment</span><strong>{verdictLabel(row.earlier?.verdict)}</strong><small>Evidence strength: {verdictLabel(row.earlier?.evidenceStrength)}</small></div>
            <div><span>Current assessment</span><strong>{verdictLabel(row.current?.verdict)}</strong><small>Evidence strength: {verdictLabel(row.current?.evidenceStrength)}</small></div>
          </div>
          {row.strengthChanged && <p className="compare-strength-note">The evidence-strength label changed; review the original sources before drawing conclusions.</p>}
          <div className="compare-source-columns">
            <SourceChanges title="Newly cited source URLs" urls={row.addedSources}/>
            <SourceChanges title="No longer cited source URLs" urls={row.removedSources}/>
          </div>
        </article>)}</div>}
      <p className="compare-caveat">Comparisons match claims only after normalizing capitalization, spacing and trailing punctuation. Tracking-only URL parameters are ignored when comparing page identity. Different search results or model versions can produce different answers. A changed verdict or a new URL is not proof of improved accuracy. This tool never rechecks or authenticates the sources.</p>
    </div>}
  </section>;
}
