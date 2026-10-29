import test from "node:test";
import assert from "node:assert/strict";
import {demoCases,observeDemoResponse} from "../lib/demo-smoke";
test("live smoke suite is bounded to one Quick and one Deep request",()=>{
  assert.deepEqual(demoCases.map(x=>x.mode),["quick","deep"]);
  assert.equal(demoCases.length,2);
  demoCases.forEach(x=>assert.ok(x.content.length>=20));
});
test("reports actual verdict and partial state without claiming accuracy",()=>{
  const observed=observeDemoResponse(200,{
    mode:"quick",requestId:"e12d79bf-1591-4eee-8992-16e1ae32e51b",
    claims:[{claim:"Mars is the biggest planet.",verdict:"insufficient_evidence",
      sources:[{url:"https://science.nasa.gov/mars/"},{url:"https://science.nasa.gov/mars/"}]}],
    investigation:{partialClaims:1,rewriteStatus:"unavailable",durationMs:12345}
  },"quick");
  assert.equal(observed.responseShapeValid,true);
  assert.equal(observed.actualVerdict,"insufficient_evidence");
  assert.equal(observed.citedSourceUrls,1);
  assert.equal(observed.partialClaims,1);
  assert.equal(observed.rewriteUnavailable,true);
  assert.equal(observed.serverDurationMs,12345);
});
test("rejects errors and mismatched modes as successful smoke results",()=>{
  assert.equal(observeDemoResponse(502,{error:"Server unavailable"},"quick").responseShapeValid,false);
  assert.equal(observeDemoResponse(200,{mode:"deep",claims:[{claim:"A",verdict:"supported",sources:[]}]},"quick").responseShapeValid,false);
  assert.equal(observeDemoResponse(200,{mode:"quick",claims:[{claim:"A",verdict:"CERTAIN",sources:[]}]},"quick").responseShapeValid,false);
});
test("rate limits trigger stop guidance",()=>{
  assert.match(observeDemoResponse(429,{error:"Rate limit reached"},"deep").warning||"",/No automatic retry/);
});
