import test from "node:test";
import assert from "node:assert/strict";
import cases from "../evaluations/claims-v1.json";
const verdicts=new Set(["supported","contradicted","mixed","insufficient_evidence"]);
test("live evaluation suite has at least twelve well-formed, distinct cases",()=>{assert.ok(cases.length>=12);assert.equal(new Set(cases.map(item=>item.id)).size,cases.length);for(const item of cases){assert.ok(item.claim.length>=20,`${item.id} needs a substantive claim`);assert.ok(verdicts.has(item.expectedVerdict),`${item.id} has a supported expected verdict`);assert.doesNotThrow(()=>new URL(item.reference),`${item.id} has a reference URL`);}});
