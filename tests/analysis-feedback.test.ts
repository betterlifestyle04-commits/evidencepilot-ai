import test from "node:test";
import assert from "node:assert/strict";
import { analysisFailure, readRetryAfter } from "../app/analysis-feedback";

const requestId = "2dc4d54d-a101-4c49-aec1-3fc6f24a719a";
test("429 errors provide a bounded countdown and valid support ID", () => {
  const result = analysisFailure(429, { error: "Rate limit reached", requestId }, "60");
  assert.equal(result.cooldownSeconds, 60);
  assert.equal(result.requestId, requestId);
  assert.match(result.message, /60 seconds/);
  assert.equal(result.recommendQuick, false);
});
test("retry-after parser handles seconds, dates and invalid headers safely", () => {
  assert.equal(readRetryAfter("15"), 15);
  assert.equal(readRetryAfter("99999"), 300);
  assert.equal(readRetryAfter("-2"), 60);
  assert.equal(readRetryAfter("nonsense"), 60);
  assert.equal(readRetryAfter(new Date(90_000).toUTCString(), 30_000), 60);
});
test("provider timeouts advise a lighter investigation without claiming cancellation", () => {
  const response = analysisFailure(504, { requestId }, null);
  assert.equal(response.recommendQuick, true);
  assert.match(response.message, /may still have been processing/);
});
test("configuration and shared rate-limit failures remain distinct", () => {
  assert.match(analysisFailure(503, { error: "Demo protection is temporarily unavailable." }, null).message, /Shared demo protection/);
  assert.match(analysisFailure(503, { error: "Provider configuration is incomplete." }, null).message, /Vercel environment/);
});
test("untrusted request identifiers are not echoed", () => {
  const result = analysisFailure(502, { error: "Bad gateway", requestId: "<script>alert(1)</script>" }, null);
  assert.equal(result.requestId, null);
  assert.doesNotMatch(result.message, /<script>/);
});

test("no factual claims is an actionable validation outcome, not a provider outage",()=>{
  const response=analysisFailure(422,{code:"NO_CHECKABLE_CLAIMS",error:"No independently checkable facts.",requestId},null);
  assert.match(response.message,/No checkable factual statements/);
  assert.match(response.message,/load an example/);
  assert.equal(response.cooldownSeconds,null);
  assert.equal(response.recommendQuick,false);
  assert.equal(response.requestId,requestId);
});
