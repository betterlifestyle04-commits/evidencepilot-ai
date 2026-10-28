import test from "node:test";
import assert from "node:assert/strict";
import { createLocalRateLimiter } from "../lib/rate-limit";
test("local limiter enforces three requests per client per minute",()=>{let now=0;const limit=createLocalRateLimiter(()=>now);assert.equal(limit("client"),true);assert.equal(limit("client"),true);assert.equal(limit("client"),true);assert.equal(limit("client"),false);now=60_000;assert.equal(limit("client"),true);});
