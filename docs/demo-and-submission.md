# EvidencePilot — Demo and submission playbook

> Preparation notes for the Nebius × NVIDIA Global AI Hackathon. **Not evidence that the live providers, public deployment, or project submission have been completed.**

## Positioning

**Product:** EvidencePilot — Better claims. Stronger proof.

**One-sentence description:** Paste an article or social post; EvidencePilot extracts verifiable claims, searches for supporting or contradicting context, presents source-linked assessments with uncertainty, and proposes a more cautious rewrite.

**Why this matters:** People often make decisions and publish content without time to independently research every factual assertion. A claim-by-claim source trail can make editorial and research work more transparent. EvidencePilot is **research assistance**, not a definitive truth engine.

**Technical story:**
- A Next.js app provides an accessible no-account research workspace.
- Server-side Nebius Token Factory serves an NVIDIA Nemotron model for claim extraction, evidence assessment, and rewriting.
- Tavily supplies web search results to compare against each claim.
- The application maps cited result indices to actual Tavily-returned URLs.
- Rate limiting and server-side environment variables protect provider usage.

**Core limitation:** Search results and model outputs can be mistaken or incomplete. A cited URL is not the same as independent verification of a claim.

## Two-minute-thirty-second video storyboard

| Time | Shot | Talk track |
| --- | --- | --- |
| 0:00–0:15 | Home page and headline | "Publishing a confident claim is easy. Finding the evidence behind it is harder." |
| 0:15–0:30 | Paste mixed factual claims | "EvidencePilot separates checkable statements from the rest of your text." |
| 0:30–1:05 | Run actual live analysis | "A Nemotron model on Nebius extracts claims while Tavily searches for relevant sources." |
| 1:05–1:40 | Open verdict cards and original source URLs | "The report distinguishes supported, contradicted, mixed, and insufficient evidence, and lets you inspect its source trail." |
| 1:40–2:05 | Show cautious rewrite and Markdown export | "It doesn't just flag problems — it helps you publish more responsibly." |
| 2:05–2:20 | Brief source code or architecture view | "NVIDIA Nemotron supplies the reasoning and Nebius provides the model API. Tavily retrieves evidence." |
| 2:20–2:30 | Closing on the product | "EvidencePilot: better claims, stronger proof." |

**Do not record a synthetic results sequence as though it were live.** If integrations are not working, record only functioning elements and clearly identify limitations; prioritize a genuine real-API run for the competition.

## Demo inputs for a live test

Choose examples with two independent claims and a mixture of clearly checkable facts. Verify source availability and expected outcomes manually before recording. Examples already built into the UI:

- Science: "Venus is the hottest planet in the Solar System. Mars has three natural moons."
- Technology: "The first iPhone was introduced in 2007. The original iPhone supported 5G connectivity."
- Society: "The European Union has 27 member countries. Norway is a member of the European Union."

These are **sample inputs**, not pre-scored outputs. Do not prelabel results as correct unless corroborated with primary or authoritative sources.

## Manual frontend acceptance tests

- [ ] Desktop, tablet, and narrow mobile layouts render without horizontal overflow.
- [ ] Navigation to /how-it-works and /privacy works, and navigation back to /#workspace works.
- [ ] Keyboard access and visible focus states work for all interactive controls.
- [ ] Ctrl+Enter / Command+Enter submits a valid input only once when ready.
- [ ] Importing .txt or .md fills the text area; unsupported/oversized files show a safe error.
- [ ] Choosing an example fills the field but **does not generate fake verdicts**.
- [ ] Empty or short inputs cannot be submitted.
- [ ] Analysis errors explain the issue without exposing secrets.
- [ ] A successful analysis shows verdict counts, cited links, explanations, and rewrite.
- [ ] Copy report, copy rewrite, source links, and Markdown export all work.
- [ ] Browser refresh and navigation do not expose API keys.

## Final submission readiness

- [ ] Public repository contains correct source and the open-source license.
- [ ] Live deployment accessible without signup and tested in a private browser window.
- [ ] Real Nemotron and Tavily integrations verified end to end.
- [ ] Provider credits and rate limiting monitored.
- [ ] README documents setup and deployment without any secrets.
- [ ] Public demo video shows actual functioning behavior.
- [ ] Devpost project form, technical descriptions, links, and any required feedback submitted before the deadline.
- [ ] Any third-party integrations and limitations are described honestly.

## Suggested written pitch

**EvidencePilot turns raw claims into a transparent evidence workflow.** Instead of returning a single opaque "true" or "false" score, it extracts independently checkable statements, retrieves current web sources, compares those sources to each claim, and communicates both findings and uncertainty. A cautious rewrite helps people correct weak statements before publishing. The current MVP is intentionally scoped to a small number of claims to keep cost, latency, and interpretation manageable. Built with NVIDIA Nemotron via Nebius Token Factory and Tavily Search.
