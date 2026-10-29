# Backend deployment readiness

## Verified in CI-compatible local checks

`npm test`, `npm run lint`, and `npm run build` run without provider credentials. The API route targets the Node.js runtime and exports `maxDuration = 60`, which is suitable for Vercel plans that allow a 60-second function duration.

Set `MAX_ANALYSIS_DURATION_MS` below the Vercel function duration (default 50 seconds; accepted range 5–55 seconds). When the remaining budget is exhausted after claim extraction, the backend returns an honest partial report where possible; if extraction itself exceeds the budget, it returns a sanitized 504 response. This avoids waiting until Vercel force-terminates the request.

`GET /api/health` is a non-cached, non-secret readiness endpoint. It reports `ready` only when provider and shared-rate-limit bindings are present, otherwise `degraded`; it never validates keys or reveals values. Do not treat its `integrations: "unverified"` response as proof that providers work. Every analysis response includes a random `requestId` and matching `X-Request-Id` header for support correlation, without logging or exposing provider details.

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

A normal three-claim report with usable evidence uses eight provider calls: five Nemotron and three Tavily. A Nebius `response_format` rejection triggers one JSON-only retry for that particular model call. A failed Tavily request is represented as an insufficient-evidence claim rather than destroying unrelated completed claims. If Tavily returns no usable public sources, the assessment call is skipped to save credits and the claim is marked insufficient evidence. Provider errors returned to the browser are sanitized; keys and upstream response bodies are never returned or logged.

Tavily retries one transient failure only (408, 429, 5xx, timeout, or transport failure), with a short bounded backoff. Nemotron inference is not retried automatically to avoid duplicate inference spend; its only second call is the explicit JSON-compatibility fallback after a rejected `response_format`. `providerCalls.tavily` counts actual Tavily attempts, while `investigation.uniqueSearches` counts deduplicated logical queries.

If an individual Nemotron assessment fails after retrieval, that one claim is returned as insufficient evidence with `retrievalStatus: "assessment_unavailable"`; other claims remain available. If only the optional cautious rewrite fails, the report returns the original submitted text and `investigation.rewriteStatus: "unavailable"` rather than fabricating a correction or discarding completed claim work. Rate-limit keys use a truncated SHA-256 identifier, so Upstash receives a pseudonymous client key rather than the raw forwarded address.

Requests must be JSON, have a declared body at or below 16 KB, and receive `no-store`/`nosniff` API response headers. Tavily results are deduplicated and only public HTTPS URLs are allowed through to assessment and rendering; local, credential-bearing, insecure, and malformed URLs are discarded.
