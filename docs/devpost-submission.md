# EvidencePilot — Nebius × NVIDIA Hackathon submission pack

> **Submission deadline:** October 30, 2026, **10:00 a.m. PDT / 18:00 Oslo time**. This guide does not submit the entry. A started Devpost draft is not a final submission.
>
> **Track:** Best Apps and Agents. Consider the Best Use of Tavily prize if the form supports it.
>
> **Never mark a checklist item done without verifying it.** AI-provider configuration, GitHub CI, and a successful Vercel deployment alone do not prove the live model delivers reliable results.

## Devpost project name and tagline

**Name:** EvidencePilot

**Tagline:** Evidence before certainty: traceable AI claim investigations and human-led fact review.

## Inspiration — the problem

News stories, marketing posts, and research drafts often mix checkable facts, interpretation, and unsupported claims. A confident answer from an AI system is not the same as verifiable evidence. Traditional fact-checking takes time, while generic AI answers can obscure their sources or present uncertain claims with unwarranted certainty.

EvidencePilot is an evidence-first editorial workspace for writers, researchers, educators, and anyone who wants to investigate before repeating a claim. It intentionally prioritizes transparent uncertainty and human review rather than a single opaque "truth score."

## What it does

Paste a short article or claim and select **Quick Check** or **Deep Investigation**. EvidencePilot:

1. Extracts up to three independently checkable factual statements with NVIDIA Nemotron.
2. Retrieves live web results through Tavily Search, with a bounded extra search when Deep Investigation finds weak coverage.
3. Asks Nemotron to assess the *original extracted claim* against those retrieved excerpts, explaining support, contradiction, mixed evidence, or insufficient evidence.
4. Validates cited result indices and maps displayed URLs to real Tavily results. The AI cannot invent a displayed source URL. Unsupported decisive verdicts are downgraded.
5. Shows source relationships, investigation details, evidence coverage, and uncertainty; never labels retrieval alone as source authentication.
6. Produces a cautious rewrite and supports human source-review notes, editorial decisions, printable findings, Markdown/JSON export, reopening and local comparison of saved snapshots.

Public demo requires no account and warns users not to submit private or sensitive content. Local report review and comparison do not trigger fresh AI requests.

## How we built it

- **Frontend:** Next.js 15, React 19, TypeScript; responsive, no-signup evidence workspace.
- **AI inference:** NVIDIA Nemotron served by **Nebius Token Factory** through its OpenAI-compatible API. Server-side orchestration calls Nemotron to extract claims, build bounded plans in Deep mode, assess sources, and cautiously rewrite text.
- **Web intelligence:** **Tavily Search** retrieves actual web sources per claim. Deep mode optionally follows up when initial retrieval is sparse or low-context.
- **Evidence safeguards:** source URL validation, deduplication, provenance index mapping, source relationship consistency, claim-fidelity controls, and conservative uncertainty fallback.
- **Operational safeguards:** server-only credentials, bounded 16,000-byte request handling, short provider timeouts, shared Upstash Redis rate limiting, per-request diagnostic IDs, and partial-result handling.
- **Deployment/testing:** Vercel, public MIT-licensed GitHub repository, GitHub Actions test/typecheck/build gates, deterministic tests and optional live-provider smoke/evaluation scripts.

**Important implementation note:** EvidencePilot does not independently authenticate source content. An AI-generated verdict is an assessment of retrieved material, not a guarantee of truth.

## Challenges and how we approached them

**Source provenance:** Rather than display model-generated links, the service maps accepted citation indices back to actual retrieved result URLs. Invalid, internal, duplicate, or non-HTTPS source links are filtered.

**Unjustified certainty:** A decisive verdict must have cited retrieved evidence. Strict live assessment requires source relationships to align with the proposed verdict; conflicting or incomplete metadata causes conservative downgrades.

**Provider failures and demo costs:** Quick Check reduces model/search requests; Deep Investigation remains bounded. Failed retrieval or assessment yields partial, explicitly labeled results rather than fake citations. Public requests are rate-limited.

**Human responsibility:** Reviewers can open sources, add notes, revise the suggested correction, export results, and compare snapshots. Manual edits are clearly separated from AI assessments.

## Accomplishments

- A public, responsive workflow rather than a prompt-only prototype.
- Two genuinely distinct analysis modes with source-backed claim investigation.
- An evidence-review workspace, export/import, and local comparison tools.
- An MIT-licensed source repository with tests and automated build checks.
- Conservative failure modes and explicit limitations instead of fabricated confidence percentages.

**Do not claim:** independently measured accuracy gains, comprehensive geographic or multilingual performance, or that every returned verdict has been factually validated. Source ranking is a discovery heuristic, not a benchmark.

## What we learned

Better AI research tools need provenance, bounded resource use, and pathways for people to inspect and challenge conclusions. Model fluency is not a substitute for source review. It is useful to make failed searches, uncertain evidence, and unverified assumptions visible rather than silently returning a confident answer.

## What's next

Broader multilingual and cross-language evaluation; stronger temporal evidence handling; source-context evaluation beyond snippets; user-controlled saved research history with appropriate privacy controls; and transparent benchmarks using independently checked reference claims.

## Nebius / NVIDIA / Tavily feedback — review/edit before submitting

> **Suggested feedback (edit to reflect your own firsthand experience):** Nebius Token Factory's OpenAI-compatible API made the model integration straightforward. Clear documentation for model availability, structured-output behavior, and troubleshooting is particularly valuable when moving between different open models. We built live catalog probing and a JSON fallback because a production demo benefits from predictable model capabilities and actionable diagnostics. Tavily's retrievable URLs made it possible to build a traceable evidence interface, while also revealing how important source relevance, deduplication, and original-document review remain. These are product observations, **not** claims about measured latency or reliability.

## Links

- Working demo: https://evidencepilot-ai-flame.vercel.app/
- Public MIT repository: https://github.com/betterlifestyle04-commits/evidencepilot-ai
- How it works: https://evidencepilot-ai-flame.vercel.app/how-it-works
- Privacy & data handling: https://evidencepilot-ai-flame.vercel.app/privacy
- Technical evidence methodology: https://github.com/betterlifestyle04-commits/evidencepilot-ai/blob/main/docs/evidence-methodology-v2.md
- Real Quick/Deep production smoke-check evidence (with limitations): https://github.com/betterlifestyle04-commits/evidencepilot-ai/blob/main/docs/live-integration-check-2026-10-30.md
- Public YouTube demo: **ADD THE ACTUAL PUBLIC VIDEO URL BEFORE FINAL SUBMISSION**

## Recommended 2:45 demonstration video (real app, not a mock)

| Time | What to record |
| --- | --- |
| 0:00–0:20 | Introduce the problem and public EvidencePilot homepage |
| 0:20–0:55 | Paste a checkable claim; run a **real Quick Check** |
| 0:55–1:30 | Highlight source citations, a factual verdict, and visible uncertainty |
| 1:30–2:05 | Explain the Deep Investigation workflow and show a **real completed Deep report**. If a live run exceeds the window, clearly label an exported previous report as a saved snapshot |
| 2:05–2:30 | Show the Evidence Coverage Board, Human Editorial Desk, and source-review checklist |
| 2:30–2:45 | Show export/reopen and the MIT repo; name NVIDIA Nemotron, Nebius Token Factory and Tavily |

**Do not fabricate a demo outcome.** Before filming, separately run real Quick/Deep analysis in the deployed application. Open at least one cited URL, test JSON export and reopen, and check that the video includes the live product and an explanation of the NVIDIA/Nebius integration.

## Final, verifiable Devpost checklist

- [ ] Devpost entry explicitly selects **Best Apps and Agents**.
- [ ] Project title, description, problem, technologies, challenge details and honest limitations are entered.
- [ ] Production URL opens without sign-in.
- [x] One **real provider-backed production call** in each mode returned a structurally valid response (see linked CI logs; not an accuracy certification).
- [ ] Run a human browser review of a completed report and independently inspect the content of cited source URLs.
- [ ] Links in one real report open, with at least one independently inspected original source.
- [ ] JSON export/reopen and manual editorial review have been demonstrated.
- [ ] GitHub repository is publicly accessible; MIT license and setup README are visible.
- [ ] Public YouTube demo is no longer than three minutes and its link is pasted into Devpost.
- [ ] Feedback on Nebius/NVIDIA tools is provided and accurately describes actual experience.
- [ ] Final submission is **submitted**, not merely saved as a draft, before the deadline.
