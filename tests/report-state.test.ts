import test from "node:test";
import assert from "node:assert/strict";
import { hasUnanalyzedEdits } from "../app/report-state";

test("reports are not stale when no report is displayed", () => {
  assert.equal(hasUnanalyzedEdits(false, "New statement", "Old statement"), false);
});
test("a completed report remains matched only to its exact submitted text", () => {
  assert.equal(hasUnanalyzedEdits(true, "The Moon landing was in 1969.", "The Moon landing was in 1969."), false);
  assert.equal(hasUnanalyzedEdits(true, "The Moon landing was in 1970.", "The Moon landing was in 1969."), true);
});
test("even whitespace-only edits are disclosed, not silently treated as analyzed", () => {
  assert.equal(hasUnanalyzedEdits(true, "Hello world. ", "Hello world."), true);
  assert.equal(hasUnanalyzedEdits(true, "", "Hello world."), true);
});
