"use client";

import { useEffect, useMemo, useState } from "react";
import { SourceReviewDesk, uniqueCitedSources } from "./source-review";
import { EvidenceTrail, GroundedExplanation, InvestigationOverview, ResearchReasoning, RevisionComparison, type ClaimInsight, type InvestigationSummary } from "./report-insights";

type Verdict = "supported" | "contradicted" | "mixed" | "insufficient_evidence";
type AnalysisMode = "quick" | "deep";
type Claim = ClaimInsight;
type Report = { claims: Claim[]; rewrite: string; model: string; mode?: AnalysisMode; providerCalls?: { nebius: number; tavily: number; total: number }; investigation?: InvestigationSummary };

const verdicts: Record<Verdict, { label: string; short: string }> = {
  supported: { label: "Supported", short: "Supported" },
  contradicted: { label: "Contradicted", short: "Contradicted" },
  mixed: { label: "Mixed evidence", short: "Mixed" },
  insufficient_evidence: { label: "Not enough evidence", short: "Unclear" }
};

const examples = [
  { title: "Investigate a known fact", tag: "Astronomy", text: "Jupiter is the largest planet in our Solar System." },
  { title: "Challenge a common misconception", tag: "Planetary science", text: "Mars is the biggest planet in the Solar System." },
  { title: "Explore a contextual claim", tag: "Geography", text: "The Sahara is the largest desert on Earth." }
];

function reportMarkdown(report: Report, original: string, reviewedUrls: string[], completedAt: string | null) {
  const lines: string[] = [
    "# EvidencePilot evidence report",
    "",
    "This is AI-assisted research. Sources must be reviewed independently.",
    ...(completedAt ? ["Analysis completed (UTC): " + completedAt] : []),
    "",
    "## Original submitted text",
    "",
    ...original.split("\n").map(line => "> " + line),
    "",
    "## Claim assessments",
    ""
  ];
  report.claims.forEach((item, index) => {
    lines.push("### " + (index + 1) + ". " + item.claim);
    lines.push("**Verdict:** " + verdicts[item.verdict].label);
    if (item.evidenceStrength) lines.push("**Evidence strength:** " + item.evidenceStrength);
    lines.push("", item.explanation, "");
    if (item.qualifications) lines.push("**Qualifications:** " + item.qualifications, "");
    if (!item.sources.length) lines.push("No retrieved sources were cited.", "");
    else {
      lines.push("**Retrieved sources:**");
      item.sources.forEach((source) => {
        lines.push("- [" + source.title.replace(/[\[\]]/g, "") + "](" + source.url + ")" + (source.relationship ? " — " + source.relationship : ""));
        if (source.relevance) lines.push("  - Relevance: " + source.relevance);
        if (source.limitations) lines.push("  - Limitations: " + source.limitations);
      });
      lines.push("");
    }
  });
  lines.push("## Suggested cautious rewrite", "", report.rewrite, "", "## Reader source-review checklist", "", "These marks are recorded manually by the reader, not independent verification.", "");
  for (const source of uniqueCitedSources(report.claims)) {
    lines.push("- [" + (reviewedUrls.includes(source.url) ? "x" : " ") + "] [" + source.title.replace(/[\[\]]/g, "") + "](" + source.url + ")");
  }
  lines.push("", "Model: " + report.model);
  if (report.investigation) lines.push("Searches: " + report.investigation.uniqueSearches + " (follow-up: " + report.investigation.followupSearches + ")");
  return lines.join("\n");
}


function publishableDraft(report: Report) {
  // All URLs are taken directly from the server-validated retrieved sources.
  const links = new Map<string, string>();
  for (const claim of report.claims) {
    for (const source of claim.sources) {
      if (!links.has(source.url)) links.set(source.url, source.title);
    }
  }
  const citations = [...links].map(([url,title],index) =>
    "[" + (index + 1) + "] " + title + " — " + url);
  return [report.rewrite,
    "",
    "Retrieved sources to independently review:",
    citations.length ? citations.join("\n") : "No source links were provided.",
    "",
    "AI-assisted research; verify original sources before publication."
  ].join("\n");
}

export default function Analyzer() {
  const [content, setContent] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewedUrls, setReviewedUrls] = useState<string[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [submittedContent, setSubmittedContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedGuide, setExpandedGuide] = useState(false);

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const canAnalyze = content.trim().length >= 20 && !busy;
  const markdown = report ? reportMarkdown(report, submittedContent, reviewedUrls, completedAt) : "";
  const counts: Record<Verdict, number> = { supported: 0, contradicted: 0, mixed: 0, insufficient_evidence: 0 };
  report?.claims.forEach((item) => { if (counts[item.verdict] !== undefined) counts[item.verdict] += 1; });

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  function toggleReviewedSource(url: string) {
    setReviewedUrls(previous => previous.includes(url) ? previous.filter(item => item !== url) : [...previous, url]);
  }

  function useExample(text: string) {
    setContent(text);
    setReport(null);
    setError("");
    setNotice("Sample claim loaded. Select Analyze to perform a live evidence review.");
    document.getElementById("content")?.focus();
  }

  async function importTextFile(file: File | undefined) {
    if (!file) return;
    setReport(null);
    setError("");
    setNotice("");
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Please select a .txt or .md document. Other file types are not supported yet.");
      return;
    }
    if (file.size > 60_000) {
      setError("The file is too large for this demo. Import a short excerpt instead.");
      return;
    }
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      if (text.length > 12_000) {
        setError("This file exceeds the 12,000-character limit. Shorten it before importing.");
        return;
      }
      setContent(text);
      setNotice("Document imported locally. No text is transmitted until you select Analyze.");
      document.getElementById("content")?.focus();
    } catch {
      setError("We could not read this file. Please paste the text manually.");
    }
  }

  async function analyze() {
    if (!canAnalyze) return;
    setBusy(true);
    setElapsedSeconds(0);
    setError("");
    setNotice("");
    setReport(null);
    const submitted = content;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: submitted, mode })
      });
      const data: unknown = await response.json();
      const payload = data as Partial<Report> & { error?: string };
      if (!response.ok) {
        if (response.status === 503 && payload.error === "Provider configuration is incomplete.") {
          throw new Error("Live analysis has not been connected yet. Set the secure Nebius and Tavily API keys on the server to activate it.");
        }
        throw new Error(payload.error || "We could not complete this analysis. Please try again.");
      }
      if (!Array.isArray(payload.claims) || typeof payload.rewrite !== "string" || typeof payload.model !== "string") {
        throw new Error("The analysis service returned an incomplete report.");
      }
      setSubmittedContent(submitted);
      setReviewedUrls([]);
      setCompletedAt(new Date().toISOString());
      setReport(payload as Report);
      setNotice("Analysis complete. Review the original sources before relying on the conclusions.");
      window.requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this content right now.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(label + " copied to clipboard.");
    } catch {
      setNotice("Copy was blocked by your browser. Select the text and copy it manually.");
    }
  }

  function downloadJson() {
    if (!report) return;
    const exportData = { product: "EvidencePilot", exportedAt: new Date().toISOString(), analysisCompletedAt: completedAt, original: submittedContent, report, manualSourceReview: { reviewedUrls, note: "Reader-marked only; not independent verification." } };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evidencepilot-evidence.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Structured evidence report downloaded.");
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evidencepilot-report.md";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Report downloaded as Markdown.");
  }

  return (
    <section className="site-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="signal-dot" /> Evidence intelligence, built for clarity</div>
          <h1 id="hero-title">Better claims.<br /><span>Stronger proof.</span></h1>
          <p>Turn a paragraph into a source-backed evidence review. Discover what holds up, what needs context, and what you should rewrite before you publish.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#workspace">Start checking <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">→</span></a>
          </div>
          <div className="hero-facts" aria-label="Platform capabilities"><span>✦ Up to 3 claims</span><span>✦ Live-source research</span><span>✦ Evidence-based rewrites</span></div>
        </div>
        <div className="hero-visual" aria-label="Illustration of the evidence analysis process">
          <div className="visual-top"><span className="tiny-pulse" /> EVIDENCE WORKFLOW <span>01 / 03</span></div>
          <div className="visual-claim"><small>INPUT CLAIM</small><p>Is this statement supported by credible evidence?</p><span className="visual-line" /></div>
          <div className="visual-connector" aria-hidden="true">↓</div>
          <div className="visual-steps"><span>01 <b>Extract</b></span><span>02 <b>Research</b></span><span>03 <b>Assess</b></span></div>
          <div className="visual-result"><span className="result-glyph">✓</span><div><small>OUTPUT</small><strong>A clearer answer, with sources.</strong></div></div>
          <p className="visual-disclaimer">Workflow illustration — not a live fact-check</p>
        </div>
      </section>

      <section className="workspace" id="workspace" aria-labelledby="workspace-title">
        <div className="workspace-main">
          <div className="section-top"><span className="step-index">01 / WORKSPACE</span><span className="section-aside">Research desk</span></div>
          <h2 id="workspace-title">What would you like to verify?</h2>
          <p className="section-intro">Paste your article, social post, or research notes. We&apos;ll identify checkable claims and compare them against retrieved evidence.</p>
          <div className="composer">
            <div className="composer-heading"><label htmlFor="content">Your content</label><span className="field-hint">No account needed</span></div>
            <textarea
              id="content"
              value={content}
              onChange={(event) => { setContent(event.target.value); setError(""); }}
              onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); if (canAnalyze) void analyze(); } }}
              maxLength={12000}
              disabled={busy}
              placeholder="Paste something worth checking...&#10;&#10;Example: The first iPhone was introduced in 2007. The original iPhone supported 5G connectivity."
              aria-describedby="text-guidance"
            />
            <div className="input-meta"><span id="text-guidance">{wordCount} words · {content.length.toLocaleString()} / 12,000 characters</span><button className="link-button" type="button" onClick={() => { setContent(""); setReport(null); setError(""); setNotice(""); }} disabled={busy || content.length === 0}>Clear text</button></div>
            <div className="import-row"><label className="import-file">↑ Import .txt or .md<input type="file" accept=".txt,.md,text/plain,text/markdown" aria-label="Import a text or Markdown file" onChange={(event) => { void importTextFile(event.target.files?.[0]); event.target.value = ""; }} disabled={busy} /></label><span className="import-note">Files are read in your browser, not uploaded until analysis.</span></div>
            <div className="mode-selector" role="group" aria-label="Choose investigation depth">
              <button type="button" aria-pressed={mode === "quick"} className={"mode-option" + (mode === "quick" ? " selected" : "")} onClick={() => { setMode("quick"); setReport(null); }} disabled={busy}>
                <span className="mode-title">Quick Check</span>
                <span className="mode-description">Fewer AI calls · Basic search · Designed for speed</span>
              </button>
              <button type="button" aria-pressed={mode === "deep"} className={"mode-option" + (mode === "deep" ? " selected" : "")} onClick={() => { setMode("deep"); setReport(null); }} disabled={busy}>
                <span className="mode-title">Deep Investigation</span>
                <span className="mode-description">Research plans · Advanced search · Optional follow-up</span>
              </button>
            </div>
            <div className="input-divider" />
            <div className="form-bottom"><div><strong>Up to three claims · {mode === "quick" ? "Quick Check" : "Deep Investigation"}</strong><span>AI-assisted research. Press Ctrl+Enter (or ⌘+Enter) to analyze.</span></div><button type="button" className="analyze-button" onClick={analyze} disabled={!canAnalyze}>{busy ? <><span className="button-spinner" /> Analyzing…</> : <>{mode === "quick" ? "Run quick check" : "Investigate deeply"} <span aria-hidden="true">↗</span></>}</button></div>
            {busy && <div className="busy-state" role="status"><span className="button-spinner" /> Live {mode === "deep" ? "deep investigation" : "quick check"} in progress. <span className="busy-duration" aria-hidden="true">{elapsedSeconds}s elapsed.</span> Provider requests may take some time; this is a real timer, not simulated research stages.</div>}
            {error && <div className="error-banner" role="alert"><strong>Analysis unavailable</strong><span>{error}</span></div>}
          </div>
          <div className="examples">
            <div className="examples-heading"><span>TRY AN EXAMPLE</span><span>These only fill the input — no results are fabricated.</span></div>
            <div className="examples-list">
              {examples.map((example) => <button key={example.tag} type="button" className="example-card" onClick={() => useExample(example.text)}><span className="example-tag">{example.tag}</span><strong>{example.title}</strong><span className="example-arrow" aria-hidden="true">↗</span></button>)}
            </div>
          </div>
        </div>

        <aside className="workspace-aside" aria-label="Research workflow and analysis limitations">
          <div className="side-card side-dark">
            <span className="side-eyebrow">THE EVIDENCE METHOD</span>
            <h3>From a bold claim to an informed decision.</h3>
            <ol className="method-list">
              <li><span className="method-number">01</span><div><strong>Identify claims</strong><p>NVIDIA Nemotron extracts statements that can be checked.</p></div></li>
              <li><span className="method-number">02</span><div><strong>Find context</strong><p>Tavily retrieves live web results for each claim.</p></div></li>
              <li><span className="method-number">03</span><div><strong>Review evidence</strong><p>Nemotron assesses the results and prepares a careful rewrite.</p></div></li>
            </ol>
            <div className="powered-by"><span>POWERED BY</span><strong>NVIDIA Nemotron <i>×</i> Nebius <i>×</i> Tavily</strong></div>
          </div>
          <div className="side-card trust-card">
            <span className="side-eyebrow">BUILT FOR TRANSPARENCY</span>
            <h3>More nuance. Less certainty theater.</h3>
            <div className="verdict-list"><span><i className="dot supported-dot" /> Supported</span><span><i className="dot contradicted-dot" /> Contradicted</span><span><i className="dot mixed-dot" /> Mixed evidence</span><span><i className="dot insufficient-dot" /> Insufficient evidence</span></div>
            <button type="button" className="guide-button" onClick={() => setExpandedGuide(!expandedGuide)} aria-expanded={expandedGuide} aria-controls="trust-explainer">Why these categories? <span aria-hidden="true">{expandedGuide ? "−" : "+"}</span></button>
            {expandedGuide && <p id="trust-explainer" className="guide-copy">A web search result is not proof by itself. These assessments reflect the material retrieved, can miss important sources, and must be independently reviewed.</p>}
          </div>
        </aside>
      </section>

      {report && (
        <section className="results" id="results" aria-labelledby="results-title">
          <div className="results-heading"><div><span className="step-index">02 / EVIDENCE REPORT · {report.mode === "deep" ? "DEEP INVESTIGATION" : "QUICK CHECK"}</span><h2 id="results-title">Your analysis, unpacked.</h2><p>Review each assessment and open the sources before relying on it.</p>{completedAt && <p className="report-completed-at">Report completed: {new Date(completedAt).toLocaleString()}</p>}</div><div className="result-actions"><button type="button" className="secondary-button" onClick={() => copyText(markdown, "Report")}>Copy report</button><button type="button" className="secondary-button" onClick={downloadJson}>Export JSON</button><button type="button" className="dark-button" onClick={downloadReport}>↓ Export .md</button></div></div>
          <div className="summary-grid"><div className="summary-item"><strong>{report.claims.length}</strong><span>Claims reviewed</span></div><div className="summary-item success"><strong>{counts.supported}</strong><span>Supported</span></div><div className="summary-item danger"><strong>{counts.contradicted}</strong><span>Contradicted</span></div><div className="summary-item caution"><strong>{counts.mixed + counts.insufficient_evidence}</strong><span>Need context</span></div></div>
          {report.claims.some(claim => claim.researchPlan?.timeSensitive) && <p className="time-sensitive-warning"><strong>Time-sensitive investigation:</strong> One or more claims depend on dates or changing conditions. Re-check the original sources before using this report later.</p>}
          <InvestigationOverview summary={report.investigation} />
          <div className="report-list">
            {report.claims.map((claim, index) => <article className="claim-card" key={index}>
              <div className="claim-card-head"><span className="claim-index">CLAIM {String(index + 1).padStart(2, "0")}</span><span className={"verdict verdict-" + claim.verdict}>{verdicts[claim.verdict].label}</span></div>
              <h3>{claim.claim}</h3><ResearchReasoning claim={claim} /><div className="assessment-label">ASSESSMENT</div><GroundedExplanation text={claim.explanation} sources={claim.sources} claimNumber={index + 1} />
              <div className="source-list"><div className="source-title"><span>RETRIEVED SOURCES</span><span>{claim.sources.length} cited</span></div>
                <EvidenceTrail sources={claim.sources} claimNumber={index + 1} />
              </div>
              <button className="claim-copy" type="button" onClick={() => copyText(claim.claim + "\n\n" + claim.explanation, "Claim assessment")}>Copy assessment ↗</button>
            </article>)}
          </div>
          <SourceReviewDesk claims={report.claims} reviewedUrls={reviewedUrls} onToggle={toggleReviewedSource} />
          <div className="rewrite-panel"><div className="rewrite-heading"><div><span className="step-index">SUGGESTED REVISION</span><h3>Say what the evidence supports.</h3></div><div className="result-actions"><button className="secondary-button" type="button" onClick={() => window.print()}>Print / Save PDF</button><button className="secondary-button" type="button" onClick={() => copyText(publishableDraft(report), "Sourced draft")}>Copy with sources</button><button className="secondary-button" type="button" onClick={() => copyText(report.rewrite, "Rewritten text")}>Copy rewrite ↗</button></div></div><RevisionComparison original={submittedContent} rewrite={report.rewrite} /></div>
          {content !== submittedContent && <p className="result-stale-note">You have edited the input since this analysis. The report still reflects the original submitted text.</p>}
          <p className="report-disclaimer">Model: {report.model}. {report.providerCalls ? "This run used " + report.providerCalls.total + " reported provider calls. " : ""}This is AI-assisted evidence analysis, not a definitive fact-check. Retrieved sources have not been independently authenticated.</p>
        </section>
      )}

      {!report && <section className="empty-guide" id="how-it-works"><div><span className="step-index">WHY EVIDENCEPILOT</span><h2>A research assistant,<br />not a truth machine.</h2></div><p>EvidencePilot gives each factual claim its own verdict and source trail, then helps you write more cautiously. It shows uncertainty rather than hiding it behind a single invented accuracy score.</p><div className="empty-guide-tags"><span>Research-first</span><span>Source-linked</span><span>Transparent uncertainty</span></div></section>}
      {report && <span id="how-it-works" />}
      {notice && <div className="notice" role="status"><span aria-hidden="true">✓</span>{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
    </section>
  );
}
