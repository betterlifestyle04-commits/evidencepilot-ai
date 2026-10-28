# EvidencePilot

An evidence-first fact-checking web app for the Nebius × NVIDIA Global AI Hackathon 2026, Best Apps & Agents track. It is a public, no-signup demo once deployed.

## What happens during analysis

1. The browser sends pasted content to the server API; no API keys reach the client.
2. An NVIDIA Nemotron model, served through [Nebius Token Factory](https://api.tokenfactory.nebius.com/v1/)'s OpenAI-compatible API, extracts up to five independently verifiable claims.
3. The server calls [Tavily Search](https://tavily.com/) for each claim.
4. Nemotron assesses only the supplied Tavily result set as `supported`, `contradicted`, `mixed`, or `insufficient_evidence`.
5. EvidencePilot maps citations from model-selected result indices back to Tavily-returned URLs. The model cannot fabricate a displayed URL. It also produces a careful rewrite that removes or qualifies unsupported statements.

The UI shows source excerpts, clickable URLs, uncertainty, and Markdown export. Treat it as research assistance—not final editorial, legal, medical, or scientific judgment.

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
```

Deploy to Vercel by importing this repository, setting `NEBIUS_API_KEY`, `TAVILY_API_KEY`, and optionally `NEBIUS_MODEL` in Project Settings → Environment Variables, then deploy. Keep all keys server-side; never use `NEXT_PUBLIC_` for them.

The API applies a small in-memory limit of eight analyses per minute per forwarded IP. For multi-instance production use, replace it with a shared rate-limit store.

## Architecture

`app/analyzer.tsx` is the client UI. `app/api/analyze/route.ts` is the server-only orchestration endpoint. `lib/providers.ts` makes the real Nebius and Tavily calls with request timeouts. `lib/evidence.ts` validates model output and ensures rendered citations originate from Tavily results.
