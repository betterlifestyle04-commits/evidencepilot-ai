import test from "node:test";
import assert from "node:assert/strict";
import {analysisPayloadBytes,readBoundedJson,RequestBodyTooLargeError,MAX_ANALYSIS_BODY_BYTES} from "../lib/request-body";

test("JSON wire size includes UTF-8 encoding, not just character length",()=>{
  const ascii="A".repeat(4000), multilingual="مرحبا🌍".repeat(1200);
  assert.ok(analysisPayloadBytes(multilingual,"deep")>analysisPayloadBytes(ascii,"deep"));
  assert.ok(multilingual.length<=12000);
  assert.ok(analysisPayloadBytes(multilingual,"deep")>MAX_ANALYSIS_BODY_BYTES);
  assert.ok(analysisPayloadBytes("Earth orbits the Sun.","quick")<MAX_ANALYSIS_BODY_BYTES);
});
test("bounded streaming JSON reader accepts a normal analysis payload",async()=>{
  const raw=JSON.stringify({content:"Earth orbits the Sun.",mode:"quick"});
  const parsed=await readBoundedJson(new Request("https://example.org/api/analyze",{
    method:"POST",body:raw,headers:{"Content-Type":"application/json"}
  }));
  assert.deepEqual(parsed,{content:"Earth orbits the Sun.",mode:"quick"});
});
test("reader rejects oversized bytes even when Content-Length is absent",async()=>{
  const raw=JSON.stringify({content:"💡".repeat(4500),mode:"deep"});
  await assert.rejects(()=>readBoundedJson(new Request("https://example.org/api/analyze",{
    method:"POST",body:raw,headers:{"Content-Type":"application/json"}
  })),RequestBodyTooLargeError);
});
test("stream enforces exact boundary without trusting Content-Length",async()=>{
  const raw=JSON.stringify({content:"é".repeat(40),mode:"quick"});
  const length=new TextEncoder().encode(raw).length;
  const request=()=>new Request("https://example.org/api/analyze",{method:"POST",body:raw,headers:{"Content-Length":"4"}});
  assert.deepEqual(await readBoundedJson(request(),length),{content:"é".repeat(40),mode:"quick"});
  await assert.rejects(()=>readBoundedJson(request(),length-1),RequestBodyTooLargeError);
});
test("invalid JSON remains a syntax error rather than a provider failure",async()=>{
  await assert.rejects(()=>readBoundedJson(new Request("https://example.org/",{method:"POST",body:"{bad"})),SyntaxError);
});
