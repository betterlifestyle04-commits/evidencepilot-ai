import test from "node:test";
import assert from "node:assert/strict";
import { parseClaims, parseJsonObject, rankSearchResults, sanitizeSearchResults, sourcesFor, validateAssessment } from "../lib/evidence";
test("parses, de-duplicates, and caps claims at three",()=>{const claims=parseClaims(["A verifiable claim is here.","A verifiable claim is here.","Another claim with enough text.","Third claim with enough text.","Fourth claim with enough text."]);assert.equal(claims.length,3);});
test("accepts a fenced compatible JSON fallback",()=>assert.equal(parseJsonObject("```json\n{\"ok\":true}\n``` ").ok,true));
test("never permits supported without a cited retrieved URL",()=>{const sources=[{title:"Good",url:"https://example.com",content:"Excerpt"},{title:"Bad",url:"javascript:alert(1)",content:"No"}];const assessment=validateAssessment({claim:"A claim long enough",verdict:"supported",explanation:"The result supports it.",sourceIndices:[1]},sources);assert.equal(assessment.verdict,"insufficient_evidence");assert.equal(sourcesFor(assessment.sourceIndices,sources).length,0);});
test("removes duplicate and unsafe retrieved URLs before assessment",()=>{const results=sanitizeSearchResults([{url:"https://example.com/a",title:"A"},{url:"https://example.com/a?tracking=1",title:"Duplicate"},{url:"http://example.org",title:"Insecure"},{url:"https://localhost/internal",title:"Local"},{url:"https://example.net/evidence",title:"Valid"}]);assert.deepEqual(results.map(result=>result.url),["https://example.com/a","https://example.net/evidence"]);});
test("orders equally relevant primary material before social commentary",()=>{const ranked=rankSearchResults([{title:"Mars is the fourth planet",url:"https://instagram.com/p/mars",content:"Mars facts"},{title:"Mars is the fourth planet",url:"https://science.nasa.gov/mars/",content:"Mars facts"}],"Mars is the biggest planet");assert.equal(ranked[0].url,"https://science.nasa.gov/mars/");});

test("ranks a relevant primary source ahead of a repetitive social post",()=>{
  const ranked = rankSearchResults([
    {title:"Mars is the biggest planet",url:"https://www.instagram.com/p/123",content:"Mars is the biggest planet in the Solar System"},
    {title:"Mars overview from NASA",url:"https://science.nasa.gov/mars/",content:"Mars is smaller than Jupiter and is the fourth planet from the Sun."},
    {title:"Unrelated official overview",url:"https://science.nasa.gov/galaxies/",content:"A view of distant stars"}
  ],"Mars is the biggest planet");
  assert.equal(ranked[0].url,"https://science.nasa.gov/mars/");
  assert.equal(ranked[ranked.length-1].url,"https://science.nasa.gov/galaxies/");
});
test("prefers direct relevance even when a nominally official result is off-topic",()=>{
  const ranked=rankSearchResults([
    {title:"Unrelated agency report",url:"https://example.gov/finance",content:"A financial filing"},
    {title:"The first iPhone was released in 2007",url:"https://example.org/iphone-history",content:"The first iPhone arrived in 2007."}
  ],"The first iPhone was released in 2007");
  assert.equal(ranked[0].url,"https://example.org/iphone-history");
});

test("downgrades uncited contradiction and mixed verdicts with consistent strength",()=>{
  for (const proposed of ["contradicted","mixed"] as const) {
    const assessment=validateAssessment({claim:"An unsupported statement.",verdict:proposed,explanation:"No direct evidence provided.",sourceIndices:[],evidenceStrength:"strong"},[]);
    assert.equal(assessment.verdict,"insufficient_evidence");
    assert.equal(assessment.evidenceStrength,"insufficient");
  }
});
test("downgrades a supported verdict with invalid citations to insufficient strength",()=>{
  const assessment=validateAssessment({claim:"A claim",verdict:"supported",explanation:"A claim is supported",sourceIndices:[0],evidenceStrength:"strong"},[{url:"http://localhost/private",content:"Local source"}]);
  assert.equal(assessment.verdict,"insufficient_evidence");
  assert.equal(assessment.evidenceStrength,"insufficient");
});
