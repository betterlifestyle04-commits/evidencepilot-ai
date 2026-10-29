import test from "node:test";
import assert from "node:assert/strict";
import { createLocalRateLimiter, pseudonymousClientKey } from "../lib/rate-limit";
test("local limiter enforces three requests per client per minute",()=>{let now=0;const limit=createLocalRateLimiter(()=>now);assert.equal(limit("client"),true);assert.equal(limit("client"),true);assert.equal(limit("client"),true);assert.equal(limit("client"),false);now=60_000;assert.equal(limit("client"),true);});
test("rate-limit keys do not retain a raw client address",()=>{const key=pseudonymousClientKey("ip:203.0.113.4");assert.match(key,/^[a-f0-9]{32}$/);assert.notEqual(key,"ip:203.0.113.4");assert.equal(key,pseudonymousClientKey("ip:203.0.113.4"));assert.notEqual(key,pseudonymousClientKey("ip:203.0.113.5"));});
