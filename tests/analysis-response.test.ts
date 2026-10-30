import test from "node:test";
import assert from "node:assert/strict";
import { readAnalysisPayload } from "../app/analysis-response";

test("preserves a valid analysis error response with correlation ID", async () => {
  const payload = await readAnalysisPayload(new Response(
    JSON.stringify({ error: "A provider timed out.", requestId: "example" }),
    { status: 504, headers: { "content-type": "application/json" } }
  ));
  assert.equal(payload.error, "A provider timed out.");
  assert.equal(payload.requestId, "example");
});
test("does not expose raw HTML gateway failures or throw on empty bodies", async () => {
  assert.deepEqual(await readAnalysisPayload(new Response("<html><body>Bad Gateway</body></html>", { status: 502 })), {});
  assert.deepEqual(await readAnalysisPayload(new Response("", { status: 504 })), {});
});
test("rejects non-object or incomplete response data before report rendering", async () => {
  assert.deepEqual(await readAnalysisPayload(new Response("null")), {});
  assert.deepEqual(await readAnalysisPayload(new Response("[]")), {});
  assert.deepEqual(await readAnalysisPayload(new Response("{ invalid")), {});
});
