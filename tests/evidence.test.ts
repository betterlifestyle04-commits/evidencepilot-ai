import test from "node:test";
import assert from "node:assert/strict";
import { categorizeSource, parseClaims, parseJsonObject, rankSearchResults, sanitizeSearchResults, sourcesFor, validateAssessment, type SearchResult } from "../lib/evidence";
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

test("retains original catalog indices for source-to-explanation linking",()=>{
  const sources=[
    {title:"First",url:"https://example.com/first",content:"Claim evidence"},
    {title:"Second",url:"https://example.com/second",content:"Claim evidence"},
    {title:"Third",url:"https://science.nasa.gov/source",content:"Claim evidence"}
  ];
  const selected=sourcesFor([2,0],sources);
  assert.deepEqual(selected.map(source=>source.sourceIndex),[2,0]);
});

test("rejects supported verdicts that cite only inconclusive context",()=>{
  const sources=[{title:"Context",url:"https://example.org/context",content:"General background information"}];
  const item=validateAssessment({claim:"A checkable statement",verdict:"supported",explanation:"Generic context",sourceIndices:[0],evidenceStrength:"strong",sourceAssessments:[{index:0,relationship:"context",relevance:"General topic",limitations:"Does not substantiate claim"}]},sources);
  assert.equal(item.verdict,"insufficient_evidence");
  assert.equal(item.evidenceStrength,"insufficient");
});
test("requires at least one supporting and opposing relationship for a mixed verdict",()=>{
  const sources=[{title:"Opposing only",url:"https://example.org/negative",content:"Contradictory material"}];
  const item=validateAssessment({claim:"A checkable statement",verdict:"mixed",explanation:"Model said mixed",sourceIndices:[0],sourceAssessments:[{index:0,relationship:"contradicts",relevance:"Opposing",limitations:"No supporting source"}]},sources);
  assert.equal(item.verdict,"insufficient_evidence");
});
test("keeps directly supported verdicts with aligned cited relationships",()=>{
  const sources=[{title:"Direct",url:"https://example.org/primary",content:"Direct evidence"}];
  const item=validateAssessment({claim:"A checkable statement",verdict:"supported",explanation:"The source supports it",sourceIndices:[0],sourceAssessments:[{index:0,relationship:"supports",relevance:"Direct",limitations:"Excerpt only"}]},sources);
  assert.equal(item.verdict,"supported");
});

test("preserves distinct query-identified pages while dropping tracking-only duplicates",()=>{
  const results=sanitizeSearchResults([
    {url:"https://youtube.com/watch?v=videoA",title:"First video"},
    {url:"https://youtube.com/watch?v=videoB",title:"Second video"},
    {url:"https://youtube.com/watch?v=videoA&utm_source=share",title:"Tracked duplicate"},
    {url:"https://example.org/article?id=123",title:"Article 123"},
    {url:"https://example.org/article?id=456",title:"Article 456"},
    {url:"https://example.org/article?id=123&fbclid=tracker",title:"Duplicated article"}
  ]);
  assert.deepEqual(results.map(x=>x.title),["First video","Second video","Article 123","Article 456"]);
});
test("tracking parameter order and trailing slash do not create extra citations",()=>{
  const sources=sanitizeSearchResults([
    {url:"https://example.org/record/?utm_campaign=launch&id=42",title:"Original"},
    {url:"https://example.org/record?id=42&utm_source=newsletter",title:"Tracked alternate"},
    {url:"https://example.org/record?id=43",title:"Separate record"}
  ]);
  assert.deepEqual(sources.map(x=>x.title),["Original","Separate record"]);
});
test("does not promote unrelated pages because their excerpts contain authority keywords",()=>{
  const sources=[
    {url:"https://untrusted.example.org/post",title:"Official documentation and NASA dataset",content:"University research on climate science"},
    {url:"https://evil-reuters.com/story",title:"Reuters report",content:"Official technical documentation"},
    {url:"https://science.nasa.gov/solar-system/",title:"Solar System",content:"A planetary overview"},
    {url:"https://reuters.com/world/report",title:"News",content:"Current reporting"},
    {url:"https://arxiv.org/abs/1234.56789",title:"Research",content:"A preprint"},
    {url:"https://brainly.in/question/1234",title:"User answer",content:"Claim text"}
  ];
  assert.deepEqual(sources.map(categorizeSource),["unknown","unknown","primary","established_reporting","academic","commentary"]);
});
test("hostnames resembling social media or news domains cannot spoof publisher class",()=>{
  assert.equal(categorizeSource({url:"https://notinstagram.com/post"}),"unknown");
  assert.equal(categorizeSource({url:"https://reuters.com.evil.org/story"}),"unknown");
  assert.equal(categorizeSource({url:"https://news.reuters.com/story"}),"established_reporting");
});
test("discards private address destinations, credential URLs and malformed search results",()=>{
  const sources=sanitizeSearchResults([
    {url:"https://[::1]/private"},{url:"https://10.0.0.1/private"},
    {url:"https://test.internal/notes"},{url:"https://user:pw@example.org/a"},
    {url:"https://example.org/"+"a".repeat(2050)},
    null as unknown as SearchResult,
    {url:"https://science.nasa.gov/jupiter/",title:"NASA"}
  ]);
  assert.deepEqual(sources.map(x=>x.title),["NASA"]);
});


test("downgrading unsupported model conclusions also removes contradictory explanation and qualifications",()=>{
  const source=[{title:"Background",url:"https://example.org/background",content:"General background"}];
  const item=validateAssessment({
    claim:"A factual claim",verdict:"supported",
    explanation:"This claim is DEFINITELY VERIFIED by the material.",
    qualifications:"There is no uncertainty whatsoever.",
    sourceIndices:[0],evidenceStrength:"strong",
    sourceAssessments:[{index:0,relationship:"context",relevance:"Indirect",limitations:"No direct evidence"}]
  },source);
  assert.equal(item.verdict,"insufficient_evidence");
  assert.equal(item.evidenceStrength,"insufficient");
  assert.match(item.explanation,/downgraded to insufficient evidence/);
  assert.doesNotMatch(item.explanation,/DEFINITELY VERIFIED/);
  assert.equal(item.qualifications,undefined);
  assert.equal(item.sourceIndices[0],0,"retain real source for human inspection");
});
test("an ungrounded decisive verdict cannot retain its original confident explanation",()=>{
  const item=validateAssessment({
    claim:"Another factual claim",verdict:"contradicted",
    explanation:"Proven false beyond a doubt",sourceIndices:[],
    evidenceStrength:"moderate"
  },[]);
  assert.equal(item.verdict,"insufficient_evidence");
  assert.doesNotMatch(item.explanation,/Proven false beyond a doubt/);
});
