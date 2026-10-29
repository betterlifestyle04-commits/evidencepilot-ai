import type { ClaimInsight, EvidenceDetail } from "./report-insights";

type SourceItem = EvidenceDetail & { mentionedIn: number[] };

function sourceDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./i, ""); } catch { return "Source"; }
}

export function uniqueCitedSources(claims: ClaimInsight[]): SourceItem[] {
  const byUrl = new Map<string, SourceItem>();
  claims.forEach((claim, claimIndex) => {
    claim.sources.forEach((source) => {
      const previous = byUrl.get(source.url);
      if (previous) {
        if (!previous.mentionedIn.includes(claimIndex + 1)) previous.mentionedIn.push(claimIndex + 1);
      } else {
        byUrl.set(source.url, { ...source, mentionedIn: [claimIndex + 1] });
      }
    });
  });
  return [...byUrl.values()];
}

export function SourceReviewDesk({
  claims, reviewedUrls, onToggle, sourceNotes, onNoteChange
}: {
  claims: ClaimInsight[];
  reviewedUrls: string[];
  onToggle: (url: string) => void;
  sourceNotes: Record<string, string>;
  onNoteChange: (url: string, text: string) => void;
}) {
  const sources = uniqueCitedSources(claims);
  if (!sources.length) {
    return <section className="source-review-workspace" id="source-review" aria-labelledby="source-review-title">
      <span className="step-index">03 / HUMAN EVIDENCE REVIEW</span>
      <h3 id="source-review-title">No sources to inspect yet.</h3>
      <p>This report does not contain retrieved citation links. Treat every assessment as provisional.</p>
    </section>;
  }
  const reviewed = sources.filter(source => reviewedUrls.includes(source.url)).length;
  const percentage = Math.round(reviewed / sources.length * 100);
  const distinctPublishers = new Set(sources.map(item => sourceDomain(item.url))).size;
  return <section className="source-review-workspace" id="source-review" aria-labelledby="source-review-title">
    <div className="source-review-heading">
      <div>
        <span className="step-index">03 / HUMAN EVIDENCE REVIEW</span>
        <h3 id="source-review-title">Inspect the original sources.</h3>
        <p>AI-generated summaries are not evidence by themselves. Open each source, check the claim against the complete page, then record what you've personally reviewed.</p>
      </div>
      <div className="source-review-progress" aria-label={reviewed + " of " + sources.length + " distinct sources marked reviewed"}>
        <strong>{reviewed}<small> / {sources.length}</small></strong>
        <span>Marked reviewed</span>
      </div>
    </div>
    <div className="source-review-meter" role="progressbar" aria-label="Manual source review progress" aria-valuemin={0} aria-valuemax={sources.length} aria-valuenow={reviewed}>
      <span style={{ width: percentage + "%" }} />
    </div>
    <div className="source-review-stats">
      <span>{sources.length} distinct retrieved {sources.length === 1 ? "source" : "sources"}</span>
      <span>{distinctPublishers} distinct {distinctPublishers === 1 ? "domain" : "domains"}</span>
      <span>Manual checklist — not an accuracy score</span>
    </div>
    <div className="source-review-list">
      {sources.map((source, index) => {
        const isReviewed = reviewedUrls.includes(source.url);
        return <div className={"source-review-entry" + (isReviewed ? " is-reviewed" : "")} key={source.url}>
          <div className="review-source-number">{String(index + 1).padStart(2, "0")}</div>
          <div className="review-source-body">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="review-source-link">{source.title} <span aria-hidden="true">↗</span></a>
            <p>{source.publisher || sourceDomain(source.url)} · Cited for claim {source.mentionedIn.join(", ")}</p>
          </div>
          <label className="review-check">
            <input type="checkbox" checked={isReviewed} onChange={() => onToggle(source.url)} />
            <span>{isReviewed ? "Reviewed" : "Mark reviewed"}</span>
          </label>
          <details className="review-source-notes">
            <summary>{sourceNotes[source.url]?.trim() ? "Edit my research note" : "Add a research note"}</summary>
            <label htmlFor={"research-note-" + index}>Your observation about this source (optional)</label>
            <textarea id={"research-note-" + index} value={sourceNotes[source.url] || ""} maxLength={600} rows={2}
              placeholder="What did the original page actually say? Any missing context or limitations?"
              onChange={event => onNoteChange(source.url, event.target.value)} />
            <small>{(sourceNotes[source.url] || "").length} / 600 characters · Kept in this browser session</small>
          </details>
        </div>;
      })}
    </div>
    <p className="source-review-warning">Review markers and notes remain only in this browser session until you export. They are not submitted to the AI providers. Marking a source reviewed does not mean the source or the AI verdict has been independently verified.</p>
  </section>;
}
