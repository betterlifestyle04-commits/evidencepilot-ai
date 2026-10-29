import test from "node:test";
import assert from "node:assert/strict";
import { newEditorialReview, parseEditorialReview, summarizeEditorialReview } from "../app/editorial-review";

test("older EvidencePilot exports load with unreviewed editorial decisions", () => {
  assert.deepEqual(parseEditorialReview(undefined, 2, "Rewrite."), {
    draft: "Rewrite.", decisions: ["unreviewed", "unreviewed"]
  });
});
test("round-trips manually edited drafts and claim decisions", () => {
  const saved = { draft: "A more carefully qualified statement.", decisions: ["revise", "selected_for_draft"] };
  assert.deepEqual(parseEditorialReview(JSON.parse(JSON.stringify(saved)), 2, "Original rewrite."), saved);
  assert.deepEqual(summarizeEditorialReview(saved as ReturnType<typeof newEditorialReview>),
    { selected: 1, needsWork: 1, unreviewed: 0, total: 2 });
});
test("rejects altered, oversized or misaligned reader decisions", () => {
  assert.throws(() => parseEditorialReview({ draft: "text", decisions: ["verified"] }, 1, "Rewrite"), /Invalid editorial claim decisions/);
  assert.throws(() => parseEditorialReview({ draft: "text", decisions: ["revise"] }, 2, "Rewrite"), /Invalid editorial claim decisions/);
  assert.throws(() => parseEditorialReview({ draft: "a".repeat(12001), decisions: ["revise"] }, 1, "Rewrite"), /Invalid editorial draft/);
  assert.throws(() => parseEditorialReview("not an object", 1, "Rewrite"), /Invalid manual editorial review/);
});
