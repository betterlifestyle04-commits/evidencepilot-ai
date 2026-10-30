// ONE-TIME TEST: deliberately not retained in main.
// Makes exactly one real POST to the public EvidencePilot endpoint. No keys.
import test from "node:test";
import assert from "node:assert/strict";

test("one-time public Quick Check smoke: real Nebius + Tavily flow", { timeout: 115_000 }, async () => {
  const started = Date.now();
  const response = await fetch("https://evidencepilot-ai-flame.vercel.app/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      mode: "quick",
      content: "The Apollo 11 Moon landing occurred in July 1969."
    }),
    signal: AbortSignal.timeout(105_000)
  });
  const payload = await response.json() as Record<string, unknown>;
  const claims = Array.isArray(payload.claims) ? payload.claims as Array<Record<string, unknown>> : [];
  const citedUrls = claims.flatMap(claim => Array.isArray(claim.sources)
    ? (claim.sources as Array<{url?: unknown}>).filter(source => typeof source.url === "string" && String(source.url).startsWith("https://"))
    : []);
  const calls = payload.providerCalls as { nebius?: number; tavily?: number } | undefined;
  console.log("PUBLIC_LIVE_SMOKE " + JSON.stringify({
    httpStatus: response.status,
    mode: payload.mode || null,
    claimCount: claims.length,
    citedHttpsUrls: citedUrls.length,
    nebiusLogicalCalls: calls?.nebius ?? null,
    tavilySearches: calls?.tavily ?? null,
    elapsedMs: Date.now() - started,
    requestId: payload.requestId || null,
    error: typeof payload.error === "string" ? payload.error.slice(0, 160) : null,
    note: "Structural live integration probe, NOT an accuracy benchmark"
  }));
  assert.equal(response.status, 200, "Production API failed live Quick Check");
  assert.equal(payload.mode, "quick");
  assert.ok(claims.length >= 1, "No verifiable claims returned");
  assert.ok((calls?.nebius || 0) >= 3, "Expected real claim extraction, assessment, and rewrite workflow");
  assert.ok((calls?.tavily || 0) >= 1, "Expected a real Tavily search");
  assert.ok(citedUrls.length >= 1, "No usable cited HTTPS sources found");
});
