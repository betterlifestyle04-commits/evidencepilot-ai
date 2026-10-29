import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/analyze/route";
import { GET } from "../app/api/health/route";
test("analysis API rejects non-JSON bodies before provider use",async()=>{const response=await POST(new NextRequest("http://localhost/api/analyze",{method:"POST",body:"text/plain"}));assert.equal(response.status,415);assert.equal((await response.json()).error,"Content-Type must be application/json.");});
test("analysis API rejects oversized declared payloads",async()=>{const response=await POST(new NextRequest("http://localhost/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","Content-Length":"16001"},body:"{}"}));assert.equal(response.status,413);});
test("analysis API enforces UTF-8 payload size when content length is absent",async()=>{const response=await POST(new NextRequest("http://localhost/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:"🙂".repeat(5_000)})}));assert.equal(response.status,413);});
test("analysis API enforces the full chunked JSON payload budget", async () => {
  const response = await POST(new NextRequest("http://localhost/api/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "This is a valid factual statement worth checking.", ignored: "x".repeat(16_000) })
  }));
  assert.equal(response.status, 413);
});
test("health endpoint is non-secret and non-cached",async()=>{const response=await GET();const body=await response.json();assert.equal(response.status,200);assert.equal(body.status,"degraded");assert.equal(body.integrations,"unverified");assert.equal(response.headers.get("cache-control"),"no-store");});

test("analysis API rejects invalid mode before invoking providers", async () => {
  const response = await POST(new NextRequest("http://localhost/api/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "This is a valid factual statement worth checking.", mode: "ultra" })
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Mode must be quick or deep.");
});
test("analysis API rejects non-object JSON payloads", async () => {
  const response = await POST(new NextRequest("http://localhost/api/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "null"
  }));
  assert.equal(response.status, 400);
});
test("analysis responses include a correlation ID without internal details", async () => {
  const response = await POST(new NextRequest("http://localhost/api/analyze", { method: "POST", body: "invalid" }));
  const body = await response.json();
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get("x-request-id"), body.requestId);
});
test("rate-limit rejection includes a standard retry window", async () => {
  const headers = { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.77" };
  const body = JSON.stringify({ content: "This is a valid factual statement worth checking." });
  for (let index = 0; index < 3; index++) await POST(new NextRequest("http://localhost/api/analyze", { method: "POST", headers, body }));
  const response = await POST(new NextRequest("http://localhost/api/analyze", { method: "POST", headers, body }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
});
