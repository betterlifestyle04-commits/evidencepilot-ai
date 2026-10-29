import test from "node:test";
import assert from "node:assert/strict";
import { analyzeContent } from "../lib/analyze";
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
test("returns a bounded partial report before the function deadline", async () => {
  const input = "A factual statement that needs review.";
  const report = await analyzeContent(input, {
    extractClaims: async () => ["A factual statement that needs review."],
    planClaim: async () => new Promise(() => {}),
    searchClaim: async () => { throw new Error("should not run after deadline"); },
    assess: async () => { throw new Error("should not run after deadline"); },
    cautiousRewrite: async () => "Should not run after deadline"
  }, "deep", 20);
  assert.equal(report.claims[0].retrievalStatus, "unavailable");
  assert.equal(report.rewrite, input);
  assert.equal(report.investigation.deadlineReached, true);
});
test("reports actual completed model attempts supplied by providers", async () => {
  const tagged = <T extends object>(value: T, attempts: number) => {
    Object.defineProperty(value, "providerAttempts", { value: attempts, enumerable: false });
    return value;
  };
  const report = await analyzeContent("Claim input", {
    extractClaims: async () => tagged(["The Earth revolves around the Sun."], 2),
    planClaim: async claim => plan(claim),
    searchClaim: async () => tagged([{ title: "NASA", url: "https://science.nasa.gov/earth/", content: "Earth orbits the Sun." }], 1),
    assess: async claim => tagged({ claim, verdict: "supported" as const, explanation: "Evidence agrees.", sourceIndices: [0] }, 2),
    cautiousRewrite: async () => ({ rewrite: "Earth orbits the Sun.", providerAttempts: 2 })
  }, "quick");
  assert.deepEqual(report.providerCalls, { nebius: 6, tavily: 1, total: 7 });
});
