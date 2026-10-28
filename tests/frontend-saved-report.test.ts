import test from "node:test";
import assert from "node:assert/strict";
import { parseSavedReport } from "../app/report-import";

function exportFixture() {
  const source = "https://science.nasa.gov/solar-system/";
  return {
    product: "EvidencePilot",
    schemaVersion: 1,
    original: "Jupiter is the largest planet in our Solar System.",
    analysisCompletedAt: "2026-10-28T22:00:00.000Z",
    report: {
      model: "nvidia/nemotron-3-super-120b-a12b",
      mode: "quick",
      rewrite: "Jupiter is the largest planet in our Solar System.",
      claims: [{
        claim: "Jupiter is the largest planet in our Solar System.",
        verdict: "supported",
        explanation: "Source 0 discusses planetary sizes.",
        evidenceStrength: "moderate",
        sources: [{ title: "Our Solar System", url: source, snippet: "Jupiter is the largest planet.", sourceIndex: 0, relationship: "supports" }]
      }],
      investigation: { durationMs: 3500, uniqueSearches: 1, followupSearches: 0, partialClaims: 0 }
    },
    manualSourceReview: {
      reviewedUrls: [source, "https://unknown-source.example/fake"],
      sourceNotes: { [source]: "Checked the primary NASA page.", "https://unknown-source.example/fake": "Should be discarded." }
    }
  };
}
test("reopens a real EvidencePilot export without dropping useful review notes", () => {
  const saved = parseSavedReport(JSON.stringify(exportFixture()));
  assert.equal(saved.report.claims[0].sources[0].relationship, "supports");
  assert.deepEqual(saved.reviewedUrls, ["https://science.nasa.gov/solar-system/"]);
  assert.deepEqual(Object.values(saved.sourceNotes), ["Checked the primary NASA page."]);
  assert.equal(saved.report.mode, "quick");
  assert.equal(saved.report.investigation?.uniqueSearches, 1);
  assert.equal(saved.completedAt, "2026-10-28T22:00:00.000Z");
});
test("rejects scripts, credential-bearing links and localhost URLs", () => {
  for (const unsafe of ["javascript:alert(1)", "http://example.com", "https://user:secret@example.org/path", "https://localhost/internal", "https://127.0.0.1/private"]) {
    const fixture = exportFixture();
    fixture.report.claims[0].sources[0].url = unsafe;
    assert.throws(() => parseSavedReport(JSON.stringify(fixture)), /unsafe source URL/);
  }
});
test("rejects malformed or unrelated JSON files", () => {
  assert.throws(() => parseSavedReport("{not valid"), /not a valid JSON/);
  assert.throws(() => parseSavedReport(JSON.stringify({ product: "OtherProduct" })), /not exported by EvidencePilot/);
  assert.throws(() => parseSavedReport(JSON.stringify({ ...exportFixture(), report: { claims: [] } })), /one and three/);
});
test("caps saved report size and source excerpts", () => {
  assert.throws(() => parseSavedReport("x".repeat(250_001)), /too large/);
  const fixture = exportFixture();
  fixture.report.claims[0].sources[0].snippet = "x".repeat(2501);
  assert.throws(() => parseSavedReport(JSON.stringify(fixture)), /Invalid source excerpt/);
});
