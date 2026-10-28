import Analyzer from "./analyzer";
export default function Home() {
  return <main>
    <header className="site-header">
      <a className="brand" href="/" aria-label="EvidencePilot home">Evidence<span>Pilot</span></a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/#workspace">Analyze</a>
        <a href="/how-it-works">How it works</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </header>
    <Analyzer />
    <footer className="site-footer">
      <p>EvidencePilot uses <strong>NVIDIA Nemotron via Nebius Token Factory</strong> to assess results retrieved with <strong>Tavily Search</strong>. Review original sources before relying on an assessment.</p>
      <div className="site-footer-links"><a href="/how-it-works">Method &amp; limitations</a><a href="/privacy">Data &amp; privacy</a><a href="https://github.com/betterlifestyle04-commits/evidencepilot-ai" target="_blank" rel="noopener noreferrer">Open-source code ↗</a></div>
    </footer>
  </main>;
}
