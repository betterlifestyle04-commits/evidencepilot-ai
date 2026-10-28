import type { Metadata } from "next";
export const metadata: Metadata = { title: "Data & privacy", description: "Understand how EvidencePilot handles pasted content, third-party AI and search providers, and public-demo limitations." };
export default function Privacy() {
  return <main>
    <header className="site-header"><a className="brand" href="/">Evidence<span>Pilot</span></a><nav className="site-nav" aria-label="Main navigation"><a href="/#workspace">Analyze</a><a href="/how-it-works">How it works</a><a href="/privacy" aria-current="page">Privacy</a></nav></header>
    <article className="info-page">
      <div className="info-hero"><span className="step-index">TRANSPARENT BY DESIGN</span><h1>Your text deserves<br /><span>careful handling.</span></h1><p>EvidencePilot is a research demo that analyzes text using third-party AI and web-search services. Understand where your content goes before submitting it.</p><a className="primary-link" href="/#workspace">Return to analyzer ↗</a></div>
      <section className="info-callout"><div><span className="step-index">BEFORE YOU ANALYZE</span><h2>Do not submit private or sensitive information.</h2></div><p>Avoid personal identifiers, confidential documents, proprietary business information, health records, passwords, API keys, and other secrets. Use public or non-sensitive content for this hackathon demo.</p></section>
      <div className="info-grid">
        <section className="info-card"><span className="info-number">01</span><h2>What is sent</h2><p>When you analyze text, the browser sends it to EvidencePilot's server. Factual claims and analysis context are then sent to Nebius Token Factory, and search queries based on those claims are sent to Tavily. Those providers process requests under their own terms and privacy practices.</p></section>
        <section className="info-card"><span className="info-number">02</span><h2>What is stored</h2><p>The current application code does not contain a user-account database or a feature that intentionally saves your text as a permanent document. Hosting, infrastructure, analytics (if later added), and upstream providers may process technical logs or retain data according to their own policies.</p></section>
        <section className="info-card"><span className="info-number">03</span><h2>Usage protection</h2><p>Production analysis is protected by rate limiting, which may process a network identifier such as your IP address using an external rate-limit store. This reduces abuse and protects limited demo credits.</p></section>
        <section className="info-card"><span className="info-number">04</span><h2>Your control</h2><p>Submitting content is optional. You can clear the text box without analyzing it. You can download a JSON report, reopen it, and compare it locally with another saved report without new provider requests. Research notes, comparison files, and source-review checkboxes remain in your browser session unless you export them. Reopened files are not independently verified.</p></section>
      </div>
      <section className="info-faq"><span className="step-index">OPEN SOURCE</span><h2>Review how it works.</h2><p>Our source code is available for technical inspection. Provider configurations, hosting policies, and data handling may change as the project develops.</p><a href="https://github.com/betterlifestyle04-commits/evidencepilot-ai" target="_blank" rel="noopener noreferrer" className="text-link">View the EvidencePilot repository ↗</a></section>
    </article>
    <footer className="site-footer"><p>Use public, non-sensitive material for the demo.</p><div className="site-footer-links"><a href="/">Home</a><a href="/how-it-works">Method &amp; limitations</a></div></footer>
  </main>;
}
