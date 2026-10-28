import test from "node:test";
import assert from "node:assert/strict";
import { parseClaims, parseJsonObject, sourcesFor, validateAssessment } from "../lib/evidence";
test("parses, de-duplicates, and caps claims at three",()=>{const claims=parseClaims(["A verifiable claim is here.","A verifiable claim is here.","Another claim with enough text.","Third claim with enough text.","Fourth claim with enough text."]);assert.equal(claims.length,3);});
test("accepts a fenced compatible JSON fallback",()=>assert.equal(parseJsonObject("```json\n{\"ok\":true}\n``` ").ok,true));
test("never permits supported without a cited retrieved URL",()=>{const sources=[{title:"Good",url:"https://example.com",content:"Excerpt"},{title:"Bad",url:"javascript:alert(1)",content:"No"}];const assessment=validateAssessment({claim:"A claim long enough",verdict:"supported",explanation:"The result supports it.",sourceIndices:[1]},sources);assert.equal(assessment.verdict,"insufficient_evidence");assert.equal(sourcesFor(assessment.sourceIndices,sources).length,0);});
