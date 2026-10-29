import test from "node:test";
import assert from "node:assert/strict";
import { clientRateLimitKey } from "../lib/request-security";
test("uses a bounded IP key for valid forwarded addresses",()=>{assert.equal(clientRateLimitKey("203.0.113.4, 10.0.0.1"),"ip:203.0.113.4");assert.equal(clientRateLimitKey("2001:db8::1"),"ip:2001:db8::1");});
test("coalesces malformed forwarded headers into the anonymous bucket",()=>{assert.equal(clientRateLimitKey("attacker-controlled-key-with-many-characters"),"anonymous");assert.equal(clientRateLimitKey(null),"anonymous");});
test("does not treat impossible IP-like forwarded values as unique clients",()=>{assert.equal(clientRateLimitKey("999.999.999.999"),"anonymous");assert.equal(clientRateLimitKey("2001:::1"),"anonymous");assert.equal(clientRateLimitKey("256.0.0.1, 203.0.113.9"),"anonymous");});
