import test from "node:test";
import assert from "node:assert/strict";
import { markdownEvidenceSection } from "../app/report-evidence-markdown";

test("an uncited investigation does not invent an empty cited-source heading", () => {
  const text = markdownEvidenceSection({ sources: [] }).join("\n");
  assert.match(text, /No retrieved sources were cited/);
  assert.doesNotMatch(text, /Cited retrieved sources/);
});
test("only retrieved-unassessed leads are explicitly not misrepresented as citations", () => {
  const text = markdownEvidenceSection({
    sources: [],
    unassessedSources: [{ title: "NASA landing report", url: "https://www.nasa.gov/moon/", snippet: "Excerpt" }]
  }).join("\n");
  assert.match(text, /No retrieved sources were cited/);
  assert.match(text, /NOT AI citations/);
  assert.match(text, /not assessed/);
  assert.doesNotMatch(text, /\*\*Cited retrieved sources:\*\*/);
});
test("hybrid imported reports retain actual citations and label unassessed leads separately", () => {
  const text = markdownEvidenceSection({
    sources: [{ title: "Official evidence", url: "https://example.org/fact", snippet: "Example", relationship: "supports", relevance: "Direct\nrelevance", limitations: "Excerpt only" }],
    unassessedSources: [{ title: "Further reading", url: "https://example.org/reading", snippet: "Example" }]
  }).join("\n");
  assert.match(text, /Cited retrieved sources/);
  assert.match(text, /supports/);
  assert.match(text, /Direct relevance/);
  assert.match(text, /NOT AI citations/);
});
test("source link titles cannot introduce Markdown line breaks", () => {
  const text = markdownEvidenceSection({
    sources: [{ title: "Open [this]\nsource", url: "https://example.org/record?id=42", snippet: "Example" }]
  }).join("\n");
  assert.match(text, /Open\s+this\s+source/);
  assert.doesNotMatch(text, /\[this\]/);
  assert.match(text, /https:\/\/example.org\/record\?id=42/);
});
