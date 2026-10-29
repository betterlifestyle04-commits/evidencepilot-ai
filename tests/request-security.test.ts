import test from "node:test";
import assert from "node:assert/strict";
import { clientRateLimitKey } from "../lib/request-security";
test("uses a bounded IP key for valid forwarded addresses",()=>{assert.equal(clientRateLimitKey("203.0.113.4, 10.0.0.1"),"ip:203.0.113.4");assert.equal(clientRateLimitKey("2001:db8::1"),"ip:2001:db8::1");});
test("coalesces malformed forwarded headers into the anonymous bucket",()=>{assert.equal(clientRateLimitKey("attacker-controlled-key-with-many-characters"),"anonymous");assert.equal(clientRateLimitKey(null),"anonymous");});

test("invalid IP formats cannot create separate rate-limit buckets",()=>{
  for(const bad of ["999.999.999.999","999.2.3.4",":::","a:a:a:a:!","192.168.1.1;extra"])
    assert.equal(clientRateLimitKey(bad),"anonymous");
});
