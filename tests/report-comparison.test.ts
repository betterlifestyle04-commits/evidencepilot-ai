import test from "node:test";
import assert from "node:assert/strict";
import { compareReports, comparisonMarkdown, normalizeComparableClaim } from "../app/compare-reports";
import type { SavedReport } from "../app/report-import";
import type { ClaimInsight } from "../app/report-insights";

function claim(name: string, verdict: ClaimInsight["verdict"], urls: string[], strength: ClaimInsight["evidenceStrength"] = "moderate"): ClaimInsight {
  return {
    claim: name, verdict, explanation: "Example explanation",
    evidenceStrength: strength,
    sources: urls.map(url => ({ title: url, url, snippet: "Retrieved snippet" }))
  };
}
const report = (...claims: ClaimInsight[]): SavedReport => ({ claims, rewrite: "A cautious rewrite", model: "nvidia/nemotron-3-super-120b-a12b" });
test("matches only claims with equivalent case whitespace and trailing punctuation", () => {
  assert.equal(normalizeComparableClaim("  JUPITER   is the largest planet!  "), "jupiter is the largest planet");
  const old = report(claim("Jupiter is the largest planet.", "supported", ["https://science.nasa.gov/solar-system/"]));
  const now = report(claim(" jupiter  is the largest planet! ", "supported", ["https://science.nasa.gov/solar-system/"]));
  const result = compareReports(old, now);
  assert.equal(result.matched, 1);
  assert.equal(result.unmatched, 0);
  assert.equal(result.rows[0].kind, "same");
});
test("flags verdict changes separately from source URL changes", () => {
  const earlier = report(claim("Mars is the biggest planet.", "supported", ["https://example.org/claim"]));
  const latest = report(claim("Mars is the biggest planet.", "contradicted", ["https://science.nasa.gov/mars/"]));
  const result = compareReports(earlier, latest);
  assert.equal(result.changedVerdicts, 1);
  assert.equal(result.changedSources, 1);
  assert.equal(result.rows[0].kind, "verdict_changed");
  assert.deepEqual(result.rows[0].addedSources, ["https://science.nasa.gov/mars/"]);
  assert.deepEqual(result.rows[0].removedSources, ["https://example.org/claim"]);
});
test("handles unmatched claims without pretending they are equivalent", () => {
  const old = report(claim("The Sahara is the largest hot desert.", "supported", []));
  const now = report(claim("The Sahara is the largest desert.", "mixed", []));
  const result = compareReports(old, now);
  assert.equal(result.matched, 0);
  assert.equal(result.unmatched, 2);
  assert.deepEqual(result.rows.map(x => x.kind), ["new", "missing"]);
});
test("detects changed evidence strength even when verdicts and URL lists are identical", () => {
  const old = report(claim("Saturn has rings.", "supported", ["https://science.nasa.gov/saturn/"], "limited"));
  const now = report(claim("Saturn has rings.", "supported", ["https://science.nasa.gov/saturn/"], "strong"));
  const result = compareReports(old, now);
  assert.equal(result.changedVerdicts, 0);
  assert.equal(result.changedSources, 0);
  assert.equal(result.rows[0].kind, "sources_changed");
  assert.equal(result.rows[0].strengthChanged, true);
});
test("deduplicates cited URLs and handles repeated claim text one-to-one", () => {
  const url = "https://example.org/data";
  const old = report(claim("Repeated claim.", "supported", [url, url]));
  const now = report(claim("Repeated claim.", "supported", [url]), claim("Repeated claim.", "supported", [url]));
  const result = compareReports(old, now);
  assert.equal(result.matched, 1);
  assert.equal(result.unmatched, 1);
  assert.equal(result.rows[0].kind, "same");
  assert.equal(result.rows[1].kind, "new");
});
test("comparison export discloses uncertainty and lists real source URLs", () => {
  const old = report(claim("The Earth orbits the Sun.", "supported", ["https://example.org/old"]));
  const now = report(claim("The Earth orbits the Sun.", "supported", ["https://science.nasa.gov/solar-system/"]));
  const markdown = comparisonMarkdown(compareReports(old, now), "2026-10-01T12:00:00.000Z", "2026-10-28T12:00:00.000Z");
  assert.match(markdown, /not a re-verification/);
  assert.match(markdown, /science\.nasa\.gov/);
  assert.match(markdown, /Changed verdicts: 0/);
});
