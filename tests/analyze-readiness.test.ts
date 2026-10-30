import test from "node:test";
import assert from "node:assert/strict";
import { getAnalysisReadiness } from "../app/analyze-readiness";
import { analysisPayloadBytes, MAX_ANALYSIS_BODY_BYTES } from "../lib/request-body";

const ready = (content: string, busy = false, wait = 0) =>
  getAnalysisReadiness(content, analysisPayloadBytes(content, "quick"), busy, wait);

test("the input guidance explains why short claims cannot be analyzed", () => {
  const result = ready("Earth is round.");
  assert.equal(result.canAnalyze, false);
  assert.equal(result.state, "input_needed");
  assert.match(result.explanation, /at least 20/);
});

test("guidance recognizes the same 20-character minimum as the actual API", () => {
  assert.equal(ready("x".repeat(19)).canAnalyze, false);
  const result = ready("x".repeat(20));
  assert.equal(result.canAnalyze, true);
  assert.equal(result.state, "ready");
});

test("UTF-8 payload limit is explained independently of character count", () => {
  const content = "🚀".repeat(5000);
  assert.ok(content.length <= 12_000);
  assert.ok(analysisPayloadBytes(content, "quick") > MAX_ANALYSIS_BODY_BYTES);
  const result = ready(content);
  assert.equal(result.canAnalyze, false);
  assert.equal(result.state, "oversized");
  assert.match(result.explanation, /UTF-8 JSON request/);
});

test("oversized imported strings get a character-limit explanation", () => {
  const result = ready("a".repeat(12_001));
  assert.equal(result.canAnalyze, false);
  assert.equal(result.state, "oversized");
  assert.match(result.explanation, /12,000 characters/);
});

test("busy and cooldown states override otherwise valid text", () => {
  const input = "Apollo 11 landed on the Moon in July 1969.";
  assert.equal(ready(input, true, 0).state, "in_progress");
  const result = ready(input, false, 12);
  assert.equal(result.canAnalyze, false);
  assert.equal(result.state, "cooldown");
  assert.match(result.explanation, /12 seconds/);
});

test("ready state only follows a valid request with no usage cooldown", () => {
  const input = "The planet Jupiter is larger than Mars.";
  const result = ready(input);
  assert.equal(result.canAnalyze, true);
  assert.equal(result.state, "ready");
  assert.match(result.explanation, /live AI and search/);
});
