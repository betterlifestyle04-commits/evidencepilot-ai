import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/analyze/route";
import { GET } from "../app/api/health/route";
test("analysis API rejects non-JSON bodies before provider use",async()=>{const response=await POST(new NextRequest("http://localhost/api/analyze",{method:"POST",body:"text/plain"}));assert.equal(response.status,415);assert.equal((await response.json()).error,"Content-Type must be application/json.");});
test("analysis API rejects oversized declared payloads",async()=>{const response=await POST(new NextRequest("http://localhost/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","Content-Length":"16001"},body:"{}"}));assert.equal(response.status,413);});
test("health endpoint is non-secret and non-cached",async()=>{const response=await GET();const body=await response.json();assert.equal(response.status,200);assert.equal(body.status,"ok");assert.equal(body.integrations,"unverified");assert.equal(response.headers.get("cache-control"),"no-store");});
