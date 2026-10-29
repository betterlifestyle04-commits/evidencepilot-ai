import test from "node:test";
import assert from "node:assert/strict";
import { prepareBrief, reportBriefMarkdown } from "../app/brief-utils";
import type { ClaimInsight } from "../app/report-insights";

const claim = (text: string, verdict: ClaimInsight["verdict"], url: string, extra: Partial<ClaimInsight> = {}): ClaimInsight => ({
  claim: text, verdict, explanation: "Assessment based on retrieved material.",
  sources: url ? [{ title: "Source", url, snippet: "Evidence excerpt", relationship: "context" }] : [],
  ...extra
});
test("brief reports only source and verdict metadata present in actual results",()=>{
  const item = claim("Jupiter is the largest planet.", "supported", "https://science.nasa.gov/jupiter/");
  const brief = prepareBrief([item], []);
  assert.equal(brief.cited, 1);
  assert.equal(brief.reviewed, 0);
  assert.equal(brief.needingAttention, 0);
  assert.equal(brief.rows[0].verdict, "supported");
});
test("brief deduplicates shared URLs and ignores unknown manually reviewed URLs",()=>{
  const source = "https://science.nasa.gov/solar-system/";
  const brief=prepareBrief([
    claim("Claim A", "mixed", source),
    claim("Claim B", "insufficient_evidence", source),
    claim("Claim C", "contradicted", "")
  ], [source,"https://unrelated.example.com"]);
  assert.equal(brief.cited,1);
  assert.equal(brief.reviewed,1);
  assert.equal(brief.needingAttention,3);
});
test("brief labels unavailable stages and time-sensitive claims for human attention",()=>{
  const brief=prepareBrief([claim("Claim A", "supported", "https://example.org/a", {
    retrievalStatus:"assessment_unavailable",
    researchPlan:{normalizedClaim:"Claim A",claimType:"statistical",timeSensitive:true,entities:[],evidenceNeeded:"Recent evidence"}
  })], []);
  assert.equal(brief.needingAttention,1);
  assert.equal(brief.rows[0].timeSensitive,true);
  assert.equal(brief.rows[0].unavailable,true);
});
test("copyable summary includes safeguards without invented confidence percentages",()=>{
  const text=reportBriefMarkdown({
    claims:[claim("Claim A","insufficient_evidence","")],completedAt:null,mode:"deep",
    reviewedUrls:[],rewriteUnavailable:true
  });
  assert.match(text,/Deep Investigation/);
  assert.match(text,/original text was retained/);
  assert.match(text,/not independently verified/);
  assert.doesNotMatch(text,/\\b\\d+%/);
});
