import test from "node:test";
import assert from "node:assert/strict";
import { analyzeContent, NoCheckableClaimsError } from "../lib/analyze";
const plan=(claim:string)=>({normalizedClaim:claim,claimType:"scientific" as const,timeSensitive:false,entities:["Mars"],evidenceNeeded:"Direct observation",queries:[`${claim} science`,`${claim} primary source`]});
test("investigates claims with bounded plans and grounded citations",async()=>{const searches:string[]=[];const report=await analyzeContent("Input",{extractClaims:async()=>["Mars is the biggest planet."],planClaim:async claim=>plan(claim),searchClaim:async query=>{searches.push(query);return [{title:"NASA",url:"https://science.nasa.gov/mars/",content:"Mars is the fourth planet."}]},assess:async claim=>({claim,verdict:"contradicted",explanation:"The retrieved NASA text conflicts with the claim.",sourceIndices:[0],evidenceStrength:"strong",sourceAssessments:[{index:0,relationship:"contradicts",relevance:"Directly identifies Mars as fourth.",limitations:"Excerpt is short."}]}),cautiousRewrite:async()=>"Mars is the fourth planet from the Sun."});assert.equal(searches.length,2);assert.equal(report.claims[0].sources[0].publisher,"science.nasa.gov");assert.equal(report.claims[0].sources[0].relationship,"contradicts");assert.equal(report.claims[0].evidenceStrength,"strong");assert.deepEqual(report.providerCalls,{nebius:4,tavily:2,total:6});});
test("uses one follow-up search only when initial evidence is weak",async()=>{const queries:string[]=[];const report=await analyzeContent("Input",{extractClaims:async()=>["A claim."],planClaim:async claim=>plan(claim),searchClaim:async query=>{queries.push(query);return query.endsWith("science")?[{title:"Post",url:"https://example.com/blog",content:"Opinion"}]:[{title:"NASA",url:"https://nasa.gov/data",content:"Direct record"}]},assess:async claim=>({claim,verdict:"supported",explanation:"Supported.",sourceIndices:[1]}),cautiousRewrite:async()=>"Rewrite"});assert.equal(queries.length,2);assert.equal(report.providerCalls.tavily,2);});
test("marks unavailable retrieval as insufficient without aborting",async()=>{const report=await analyzeContent("Input",{extractClaims:async()=>["Unavailable claim."],planClaim:async claim=>plan(claim),searchClaim:async()=>{throw new Error("timeout")},assess:async()=>{throw new Error("must not run")},cautiousRewrite:async()=>"Careful rewrite."});assert.equal(report.claims[0].retrievalStatus,"unavailable");assert.equal(report.claims[0].verdict,"insufficient_evidence");});
test("deduplicates repeated targeted queries within one investigation",async()=>{let searches=0;const report=await analyzeContent("Input",{extractClaims:async()=>["First claim.","Second claim."],planClaim:async claim=>({...plan(claim),queries:["shared authoritative query"]}),searchClaim:async()=>{searches++;return [{title:"Source",url:"https://nasa.gov/source",content:"Direct material"}]},assess:async claim=>({claim,verdict:"supported",explanation:"Supported.",sourceIndices:[0]}),cautiousRewrite:async()=>"Rewrite"});assert.equal(searches,1);assert.equal(report.providerCalls.tavily,1);assert.equal(report.investigation.uniqueSearches,1);assert.equal(report.investigation.followupSearches,0);});

test("investigates independent claims concurrently while preserving their order",async()=>{
  let started = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const analysis = analyzeContent("Input",{
    extractClaims: async()=>["First independent claim.","Second independent claim."],
    planClaim: async claim=>({...plan(claim),queries:[claim + " relevant sources"]}),
    searchClaim: async()=>{started++;await gate;return [{title:"Record",url:"https://example.org/record",content:"Published evidence."}]},
    assess: async claim=>({claim,verdict:"supported",explanation:"Retrieved supporting material.",sourceIndices:[0]}),
    cautiousRewrite: async()=> "Rewritten cautiously."
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(started,2,"both first searches should have started before either resolves");
  release();
  const result=await analysis;
  assert.deepEqual(result.claims.map(claim=>claim.claim),["First independent claim.","Second independent claim."]);
});
test("preserves initial sources if an optional follow-up search fails",async()=>{
  const report=await analyzeContent("Input",{
    extractClaims:async()=>["A factual claim for checking."],
    planClaim:async claim=>plan(claim),
    searchClaim:async query=>{if(query.endsWith("primary source"))throw new Error("optional search timeout");return [{title:"Relevant record",url:"https://example.org/a",content:"Evidence"}]},
    assess:async claim=>({claim,verdict:"supported",explanation:"Evidence supports it.",sourceIndices:[0]}),
    cautiousRewrite:async()=>"A careful statement."
  });
  assert.equal(report.claims[0].sources.length,1);
  assert.equal(report.claims[0].retrievalStatus,undefined);
  assert.equal(report.providerCalls.tavily,2);
});

test("quick mode skips research planning and follow-up searches", async () => {
  let plans = 0;
  const modes: string[] = [];
  const report = await analyzeContent("Claim input", {
    extractClaims: async () => ["Jupiter is the largest planet."],
    planClaim: async claim => { plans++; return plan(claim); },
    searchClaim: async (_query, mode) => {
      modes.push(mode || "");
      return [{ title: "NASA source", url: "https://science.nasa.gov/jupiter/", content: "Jupiter is the largest planet." }];
    },
    assess: async claim => ({ claim, verdict: "supported", explanation: "NASA provides relevant evidence.", sourceIndices: [0] }),
    cautiousRewrite: async () => "Jupiter is the largest planet."
  }, "quick");
  assert.equal(plans, 0);
  assert.deepEqual(modes, ["quick"]);
  assert.equal(report.mode, "quick");
  assert.equal(report.providerCalls.nebius, 3);
  assert.equal(report.providerCalls.tavily, 1);
});
test("deep mode creates a plan and uses advanced search", async () => {
  let planned = 0;
  const modes: string[] = [];
  const report = await analyzeContent("Claim input", {
    extractClaims: async () => ["The Earth revolves around the Sun."],
    planClaim: async claim => { planned++; return { ...plan(claim), queries: ["earth revolution NASA"] }; },
    searchClaim: async (_query, mode) => {
      modes.push(mode || "");
      return [{ title: "NASA", url: "https://science.nasa.gov/earth/", content: "The Earth orbits the Sun." },
        { title: "NASA solar system", url: "https://science.nasa.gov/solar-system/", content: "Planets orbit the Sun." }];
    },
    assess: async claim => ({ claim, verdict: "supported", explanation: "Evidence agrees.", sourceIndices: [0] }),
    cautiousRewrite: async () => "Earth orbits the Sun."
  }, "deep");
  assert.equal(planned, 1);
  assert.deepEqual(modes, ["deep"]);
  assert.equal(report.mode, "deep");
  assert.equal(report.providerCalls.nebius, 4);
});
test("returns a partial report when one assessment fails", async () => {
  const report = await analyzeContent("Claim input", {
    extractClaims: async () => ["First claim.", "Second claim."],
    planClaim: async claim => ({ ...plan(claim), queries: [claim + " sources"] }),
    searchClaim: async () => [{ title: "Record", url: "https://example.org/record", content: "Evidence" }],
    assess: async claim => { if (claim.startsWith("Second")) throw new Error("temporary failure"); return { claim, verdict: "supported", explanation: "Evidence supports it.", sourceIndices: [0] }; },
    cautiousRewrite: async () => "Careful rewrite."
  });
  assert.equal(report.claims[0].verdict, "supported");
  assert.equal(report.claims[1].retrievalStatus, "assessment_unavailable");
  assert.equal(report.claims[1].sources.length,0,"failed assessment must not invent model citations");
  assert.equal(report.claims[1].unassessedSources?.length,1,"real retrieved links should remain reviewable");
  assert.equal(report.claims[1].unassessedSources?.[0].url,"https://example.org/record");
  assert.equal(report.claims[1].unassessedSources?.[0].relationship,undefined);
  assert.equal(report.claims[1].verdict, "insufficient_evidence");
});
test("returns original text when the optional rewrite service fails", async () => {
  const input = "A factual statement that needs review.";
  const report = await analyzeContent(input, {
    extractClaims: async () => ["A factual statement that needs review."],
    planClaim: async claim => ({ ...plan(claim), queries: [claim + " sources"] }),
    searchClaim: async () => [{ title: "Record", url: "https://example.org/record", content: "Evidence" }],
    assess: async claim => ({ claim, verdict: "supported", explanation: "Evidence supports it.", sourceIndices: [0] }),
    cautiousRewrite: async () => { throw new Error("temporary failure"); }
  });
  assert.equal(report.rewrite, input);
  assert.equal(report.investigation.rewriteStatus, "unavailable");
});

test("investigation duration includes claim extraction",async()=>{
  const report = await analyzeContent("Jupiter is the largest planet.",{
    extractClaims: async()=>{await new Promise(resolve=>setTimeout(resolve,30));return ["Jupiter is the largest planet."];},
    planClaim: async claim=>plan(claim),
    searchClaim: async()=>[{title:"NASA",url:"https://science.nasa.gov/jupiter/",content:"Jupiter is the largest planet."}],
    assess: async claim=>({claim,verdict:"supported",explanation:"Evidence supports this claim.",sourceIndices:[0]}),
    cautiousRewrite: async()=> "Jupiter is the largest planet."
  },"quick");
  assert.ok(report.investigation.durationMs >= 25,"elapsed time must include slow claim extraction");
});

test("opinion-only text returns a typed no-claims outcome without performing searches", async () => {
  let searches = 0;
  await assert.rejects(() => analyzeContent("I believe sunsets are truly the best things ever.", {
    extractClaims: async () => [],
    planClaim: async claim => plan(claim),
    searchClaim: async () => { searches++; return []; },
    assess: async claim => ({claim, verdict: "insufficient_evidence", explanation: "No evidence", sourceIndices: []}),
    cautiousRewrite: async () => "Not used"
  }, "quick"), (error: unknown) => error instanceof NoCheckableClaimsError);
  assert.equal(searches, 0);
});


test("deep investigation anchors the assessed, ranked, and displayed claim to the extracted wording",async()=>{
  const original="Mars is the biggest planet in the Solar System.";
  const plannerRewrite="Jupiter is the biggest planet in the Solar System.";
  const assessed:string[]=[];
  const report=await analyzeContent(original,{
    extractClaims:async()=>[original],
    planClaim:async()=>({
      ...plan(original),normalizedClaim:plannerRewrite,
      queries:["solar system largest planet NASA"]
    }),
    searchClaim:async()=>[{
      title:"Mars and Jupiter in the Solar System",
      url:"https://science.nasa.gov/solar-system/",
      content:"Jupiter is the largest planet, not Mars."
    }],
    assess:async claim=>{
      assessed.push(claim);
      // Deliberately return a changed claim: the server must not adopt it.
      return {
        claim:"Jupiter is the largest planet, which is true.",
        verdict:"contradicted",explanation:"Source contradicts the exact Mars claim.",
        sourceIndices:[0]
      };
    },
    cautiousRewrite:async()=> "Mars is not the largest planet."
  },"deep");
  assert.deepEqual(assessed,[original]);
  assert.equal(report.claims[0].claim,original);
  assert.equal(report.claims[0].researchPlan?.normalizedClaim,plannerRewrite);
  assert.equal(report.claims[0].verdict,"contradicted");
});
test("retrieval and assessment failure preserve the extracted claim, never planner wording",async()=>{
  const original="The Moon is bigger than Earth.";
  const drift="The Moon is smaller than Earth.";
  for(const failAt of ["retrieve","assess"] as const) {
    const report=await analyzeContent(original,{
      extractClaims:async()=>[original],
      planClaim:async()=>({...plan(original),normalizedClaim:drift,queries:["Moon size Earth"]}),
      searchClaim:async()=>failAt==="retrieve"
        ? Promise.reject(new Error("offline search"))
        : [{title:"Moon size",url:"https://science.nasa.gov/moon/",content:"Relative sizes."}],
      assess:async()=>{throw new Error("assessment failed");},
      cautiousRewrite:async()=> "Original text."
    },"deep");
    assert.equal(report.claims[0].claim,original);
    assert.equal(report.claims[0].verdict,"insufficient_evidence");
    assert.equal(report.claims[0].researchPlan?.normalizedClaim,drift);
  }
});


test("long documents are fully retained instead of being silently half-rewritten", async () => {
  const original = "Jupiter is the largest planet in our Solar System. ".repeat(170);
  assert.ok(original.length > 6_000 && original.length <= 12_000);
  let rewrites = 0;
  const report = await analyzeContent(original, {
    extractClaims: async () => ["Jupiter is the largest planet in our Solar System."],
    planClaim: async claim => ({ ...plan(claim), queries: ["Jupiter largest planet NASA"] }),
    searchClaim: async () => [
      { title: "NASA overview", url: "https://science.nasa.gov/jupiter/", content: "Jupiter is the largest planet." },
      { title: "NASA solar system", url: "https://science.nasa.gov/solar-system/", content: "Solar System planets." }
    ],
    assess: async claim => ({ claim, verdict: "supported", explanation: "Retrieved record supports it.", sourceIndices: [0] }),
    cautiousRewrite: async () => { rewrites++; return "Partial and unsafe rewrite"; }
  }, "deep");
  assert.equal(rewrites, 0, "the unsafe truncated rewrite must not run");
  assert.equal(report.rewrite, original, "the full original must remain byte-for-byte intact");
  assert.equal(report.investigation.rewriteStatus, "skipped_for_length");
  assert.equal(report.claims.length, 1);
  assert.equal(report.providerCalls.nebius, 3, "a skipped provider call must not be charged in the workflow count");
});
test("the precise rewrite limit still allows a full short-text rewrite", async () => {
  const original = "X".repeat(6_000);
  let rewrites = 0;
  const report = await analyzeContent(original, {
    extractClaims: async () => ["A factual claim long enough."],
    planClaim: async claim => plan(claim),
    searchClaim: async () => [{ title: "Record", url: "https://example.org/page", content: "Evidence" }],
    assess: async claim => ({ claim, verdict: "supported", explanation: "Record discusses claim.", sourceIndices: [0] }),
    cautiousRewrite: async () => { rewrites++; return "A complete cautious statement."; }
  }, "quick");
  assert.equal(rewrites, 1);
  assert.equal(report.investigation.rewriteStatus, undefined);
  assert.equal(report.rewrite, "A complete cautious statement.");
});
