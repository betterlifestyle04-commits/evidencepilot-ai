# EvidencePilot

An evidence-first fact-checking web app for the Nebius × NVIDIA Global AI Hackathon 2026, Best Apps & Agents track. It is a public, no-signup demo once deployed.

## What happens during analysis

1. The browser sends pasted content to the server API; no API keys reach the client.
2. An NVIDIA Nemotron model, served through [Nebius Token Factory](https://api.tokenfactory.nebius.com/v1/)'s OpenAI-compatible API, extracts up to three independently verifiable claims.
3. The server calls [Tavily Search](https://tavily.com/) for each claim.
4. Nemotron assesses only the supplied Tavily result set as `supported`, `contradicted`, `mixed`, or `insufficient_evidence`.
5. EvidencePilot maps citations from model-selected result indices back to Tavily-returned URLs. The model cannot fabricate a displayed URL. A `supported` verdict requires at least one cited retrieved result; otherwise it is downgraded to insufficient evidence. It also produces a careful rewrite that removes or qualifies unsupported statements.

The UI labels URLs as **Retrieved sources**, not verified sources. It shows source excerpts, clickable URLs, uncertainty, and Markdown export. Retrieved web content is treated as untrusted data, never as instructions. Treat it as research assistance—not final editorial, legal, medical, or scientific judgment.

## Local setup

```bash
cp .env.example .env.local
# Set NEBIUS_API_KEY and TAVILY_API_KEY in .env.local (do not commit it)
npm ci
npm run dev
```

Open `http://localhost:3000`. Confirm the selected `NEBIUS_MODEL` exists in your Token Factory account catalog. The default is `nvidia/Nemotron-3_5-Lightning`.

## Checks and deployment

```bash
npm test       # claim parsing and citation/evidence validation
npm run lint   # TypeScript
npm run build  # production build
npm run verify:providers # live Nebius catalog/structured-JSON and Tavily probe; consumes provider credits
```

Deploy to Vercel by importing this repository, setting `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and optionally `NEBIUS_MODEL` in Project Settings → Environment Variables, then deploy. Keep all keys server-side; never use `NEXT_PUBLIC_` for them. Set Vercel's function duration to at least 60 seconds (the route exports `maxDuration = 60`).

Each normal three-claim analysis makes **8 provider calls**: 5 Nemotron calls (claim extraction, 3 assessments, rewrite) and 3 Tavily calls. If the OpenAI-compatible `response_format` is rejected, a Nemotron call is retried with an explicit JSON-only fallback; that failed attempt adds one call. Production requires an Upstash Redis REST binding and enforces a shared limit of 3 analyses/minute/IP. Local development uses an in-memory equivalent. This protects the public demo from unbounded provider spend.

## Architecture

`app/analyzer.tsx` is the client UI. `app/api/analyze/route.ts` is the server-only orchestration endpoint. `lib/providers.ts` makes the real Nebius and Tavily calls with request timeouts and a structured-output fallback. `lib/evidence.ts` validates model output and ensures rendered citations originate from Tavily results. `scripts/verify-providers.ts` validates the live model catalog, JSON capability, and Tavily response without exposing credentials.
