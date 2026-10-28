# Backend deployment readiness

## Verified in CI-compatible local checks

`npm test`, `npm run lint`, and `npm run build` run without provider credentials. The API route targets the Node.js runtime and exports `maxDuration = 60`, which is suitable for Vercel plans that allow a 60-second function duration.

## Required production configuration

| Variable | Purpose |
| --- | --- |
| `NEBIUS_API_KEY` | Server-only Nebius Token Factory credential |
| `TAVILY_API_KEY` | Server-only Tavily Search credential |
| `UPSTASH_REDIS_REST_URL` | Shared rate-limit service URL |
| `UPSTASH_REDIS_REST_TOKEN` | Shared rate-limit service credential |
| `NEBIUS_MODEL` | Optional override; default is `nvidia/Nemotron-3_5-Lightning` |

No key may use a `NEXT_PUBLIC_` prefix. In production the API fails closed if the shared rate-limit store is absent, preventing unbounded credit consumption. The limit is three analyses per minute per forwarded client IP. Configure Vercel to pass `x-forwarded-for` and allow the 60-second function duration.

## Live-integration checklist

After securely binding credentials, run `npm run verify:providers`. It checks the Nebius model catalog, performs a structured-JSON probe against the configured NVIDIA Nemotron model, and sends a Tavily query. Then make one real API request with a known supported claim, a contradicted claim, and a deliberately unsubstantiated claim. Until these requests pass, integrations are **unverified**.

## Operational limits

A normal three-claim report uses eight provider calls: five Nemotron and three Tavily. A Nebius `response_format` rejection triggers one JSON-only retry for that particular model call. A failed Tavily request is represented as an insufficient-evidence claim rather than destroying unrelated completed claims. Provider errors returned to the browser are sanitized; keys and upstream response bodies are never returned or logged.
