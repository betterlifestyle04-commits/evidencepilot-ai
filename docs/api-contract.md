# EvidencePilot API contract

## `POST /api/analyze`

This public endpoint accepts `application/json` only. The complete UTF-8 request body may be at most 16 KB. Send a `content` string of 20–12,000 characters and an optional `mode` of `quick` or `deep`; omitted mode means `quick`.

```json
{ "content": "Paste text to investigate here.", "mode": "quick" }
```

Successful responses are non-cached and include a `requestId` in the JSON and matching `X-Request-Id` response header. The model name is informational only; it is not a claim that the configured provider has passed a live probe.

```json
{
  "claims": [{
    "claim": "A normalized factual claim",
    "verdict": "supported",
    "explanation": "Cautious explanation based on retrieved evidence.",
    "sourceIndices": [0],
    "evidenceStrength": "moderate",
    "sources": [{
      "title": "Retrieved source title",
      "url": "https://example.org/source",
      "snippet": "Tavily-provided excerpt",
      "relationship": "supports",
      "limitations": "Scope caveat"
    }],
    "researchPlan": { "claimType": "other", "timeSensitive": false }
  }],
  "rewrite": "A cautious rewrite of the submitted text.",
  "mode": "quick",
  "providerCalls": { "nebius": 5, "tavily": 3, "total": 8 },
  "investigation": { "durationMs": 1234, "uniqueSearches": 3, "followupSearches": 0, "partialClaims": 0 },
  "model": "nvidia/nemotron-3-super-120b-a12b",
  "requestId": "uuid"
}
```

`sources` means **retrieved sources**, not verified facts. URLs are rendered only if they came from Tavily and passed the public-HTTPS policy. A decisive verdict needs cited retrieved evidence; otherwise the service downgrades it to `insufficient_evidence`. `independenceNote`, source categories, relationship labels, relevance, and limitations are cautious aids—not proof of authority or independence.

An analysis may be partial: `retrievalStatus` is `unavailable`, `empty`, or `assessment_unavailable` when the affected claim could not be completed honestly. `investigation.rewriteStatus: "unavailable"` means `rewrite` is the original submission. Clients should preserve completed claims and show this uncertainty rather than treating partial output as a success.

Errors contain a public `error` string and `requestId`, never provider bodies or credentials. Common status codes are 400 (invalid JSON/input), 413 (body too large), 415 (non-JSON), 429 (demo limit; includes `Retry-After`), 502 (provider unavailable), 503 (missing/failed production protection), and 504 (provider or analysis deadline).

`providerCalls.tavily` counts actual Tavily attempts, including its one permitted transient retry. The Nemotron count represents logical analysis operations; a JSON compatibility fallback may issue an additional model request.

## `GET /api/health`

This non-cached, non-secret readiness endpoint returns `ready` only when the provider and shared rate-limit bindings are present. `integrations: "unverified"` is deliberate: it does not validate credentials or make provider calls. Use `npm run verify:providers` after secret binding for that live check.
