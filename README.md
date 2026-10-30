# EvidencePilot

An evidence-first fact-checking web app for the Nebius × NVIDIA Global AI Hackathon 2026, Best Apps & Agents track. It is a public, no-signup demo once deployed.

## What happens during analysis

1. The browser sends pasted content to the server API; no API keys reach the client.
2. An NVIDIA Nemotron model, served through [Nebius Token Factory](https://api.tokenfactory.nebius.com/v1/)'s OpenAI-compatible API, extracts up to three independently verifiable claims.
3. The server calls [Tavily Search](https://tavily.com/) for each claim.
4. Deep Investigation creates a Nemotron research plan and may run a second Tavily search for weak evidence; Quick Check skips planning and follow-up. Both assess claims as `supported`, `contradicted`, `mixed`, or `insufficient_evidence`.
5. EvidencePilot maps citations from model-selected result indices back to Tavily-returned URLs. The model cannot fabricate a displayed URL. A `supported` verdict requires at least one cited retrieved result; otherwise it is downgraded to insufficient evidence. It also produces a careful rewrite that removes or qualifies unsupported statements.

The UI labels URLs as **Retrieved sources**, not verified sources. It shows source excerpts, clickable URLs, uncertainty, and Markdown export. Retrieved web content is treated as untrusted data, never as instructions. Treat it as research assistance—not final editorial, legal, medical, or scientific judgment.

## Local setup

```bash
cp .env.example .env.local
# Set NEBIUS_API_KEY and TAVILY_API_KEY in .env.local (do not commit it)
npm ci
npm run dev
```

Open `http://localhost:3000`. Confirm the selected `NEBIUS_MODEL` exists in your Token Factory account catalog. The default is `nvidia/nemotron-3-super-120b-a12b`; use `npm run verify:providers` to verify it against the live account.

## Checks and deployment

```bash
npm test       # claim parsing and citation/evidence validation
npm run lint   # TypeScript
npm run build  # production build
npm run smoke:demo # public deployment health probe; no AI calls or credits
npm run smoke:demo -- --live # optional 2 real API investigations; consumes credits
npm run verify:providers # live Nebius catalog/structured-JSON and Tavily probe; consumes provider credits
npm run evaluate:live # optional live 10-case evaluation; consumes provider credits
```

Deploy to Vercel by importing this repository, setting `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and optionally `NEBIUS_MODEL` in Project Settings → Environment Variables, then deploy. Keep all keys server-side; never use `NEXT_PUBLIC_` for them. Set Vercel's function duration to at least 60 seconds (the route exports `maxDuration = 60`).

A full V2 three-claim investigation typically makes **8 Nemotron calls** (extraction, three research plans, three assessments, rewrite) and **3–6 Tavily calls** (one targeted search per claim, plus at most one conditional follow-up each). An optional structured-output fallback can add a model request. Configure `MAX_SEARCHES_PER_CLAIM=1` to disable follow-up searches for cost/latency-sensitive demos. Calls can be fewer when searches are deduplicated or evidence is unavailable. Production requires an Upstash Redis REST binding and enforces a shared limit of 3 analyses/minute/IP. Local development uses an in-memory equivalent. This protects the public demo from unbounded provider spend.

## Architecture

`app/analyzer.tsx` is the client UI. `app/api/analyze/route.ts` is the server-only orchestration endpoint. `lib/providers.ts` makes the real Nebius and Tavily calls with request timeouts and a structured-output fallback. `lib/evidence.ts` validates model output and ensures rendered citations originate from Tavily results. `scripts/verify-providers.ts` validates the live model catalog, JSON capability, and Tavily response without exposing credentials.

Read [the V2 evidence methodology](docs/evidence-methodology-v2.md) for the bounded investigation design, qualitative source handling, live evaluation suite, and limitations.

## Quick Check and Deep Investigation

The UI offers two actual server-side workflows:
- **Quick Check (default):** extract up to 3 claims, run one basic Tavily search per claim, assess using Nemotron, and rewrite cautiously. For a full 3-claim run, normally 5 Nemotron calls and 3 Tavily calls.
- **Deep Investigation:** plan each claim with Nemotron, run advanced Tavily searches, and optionally conduct one targeted follow-up per claim when evidence is weak. For 3 claims, normally 8 Nemotron calls and 3–6 Tavily calls.

Both modes use the same citation validation, uncertainty and Upstash rate limiting. The API returns its actual mode. Without a mode, the API defaults to Quick Check. Neither mode fabricates results.

Live Vercel latency for each mode needs verification before relying on it for demonstrations.

## Demonstration runbook

For the [operator checklist and three-minute recording outline](docs/demo-runbook.md), use the credit-free `npm run smoke:demo` deployment check first. Add `--live` only when you explicitly want two real Quick/Deep analyses. This is not an accuracy benchmark and does not automatically retry failed requests.

For the [Devpost-ready project description, truthful technical narrative, and final submission checklist](docs/devpost-submission.md), review the hackathon submission pack before uploading the public YouTube demo and finalizing the entry.

The [October 30 public Quick/Deep integration-check record](docs/live-integration-check-2026-10-30.md) links to two one-time provider-backed CI probes, with clear limits on what those checks establish. They are not an accuracy benchmark.
