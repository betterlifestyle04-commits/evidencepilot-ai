import test from "node:test";
import assert from "node:assert/strict";
import { cautiousRewrite, extractClaims, ProviderError } from "../lib/providers";
test("uses JSON-only Nemotron fallback only after an unsupported format response",async()=>{const previousFetch=globalThis.fetch,previousKey=process.env.NEBIUS_API_KEY;process.env.NEBIUS_API_KEY="test";let calls=0;globalThis.fetch=async()=>{calls++;return calls===1?new Response("",{status:400}):new Response(JSON.stringify({choices:[{message:{content:'{"claims":["A factual claim has enough text."]}'}}]}),{status:200,headers:{"Content-Type":"application/json"}});};try{assert.deepEqual(await extractClaims("Input"),["A factual claim has enough text."]);assert.equal(calls,2);}finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=previousKey;}});
test("does not retry a failed provider request as a format fallback",async()=>{const previousFetch=globalThis.fetch,previousKey=process.env.NEBIUS_API_KEY;process.env.NEBIUS_API_KEY="test";let calls=0;globalThis.fetch=async()=>{calls++;return new Response("",{status:503});};try{await assert.rejects(()=>extractClaims("Input"),ProviderError);assert.equal(calls,1);}finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=previousKey;}});

test("malformed Nemotron output is a provider response error, not invalid user JSON", async () => {
  const previousFetch=globalThis.fetch, previousKey=process.env.NEBIUS_API_KEY;
  process.env.NEBIUS_API_KEY="test"; let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:"not valid model JSON"}}]}),{status:200,headers:{"Content-Type":"application/json"}});};
  try {
    await assert.rejects(()=>extractClaims("A checkable claim."),(error:unknown)=>error instanceof ProviderError && error.kind==="invalid_response");
    assert.equal(calls,1,"malformed model output must not be mistaken for an unsupported-format retry");
  } finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=previousKey;}
});
test("empty model rewrites are rejected rather than shown as completed corrections",async()=>{
  const previousFetch=globalThis.fetch, previousKey=process.env.NEBIUS_API_KEY;
  process.env.NEBIUS_API_KEY="test";
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'{"rewrite":"   "}'}}]}),{status:200,headers:{"Content-Type":"application/json"}});
  try {
    await assert.rejects(()=>cautiousRewrite("A source-backed factual statement.",[]),(error:unknown)=>error instanceof ProviderError && error.kind==="invalid_response");
  } finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=previousKey;}
});
