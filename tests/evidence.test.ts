import test from "node:test";
import assert from "node:assert/strict";
import { parseClaims, sourcesFor, validateAssessment } from "../lib/evidence";
test("parses, de-duplicates, and caps claims",()=>{const claims=parseClaims(JSON.stringify(["A verifiable claim is here.","A verifiable claim is here.","Another claim with enough text.","Third claim with enough text.","Fourth claim with enough text.","Fifth claim with enough text.","Sixth claim with enough text."]));assert.equal(claims.length,5);});
test("rejects malformed claim outputs",()=>assert.throws(()=>parseClaims('{"claims":[]}')));
test("drops model citations that are not valid returned URLs",()=>{const sources=[{title:"Good",url:"https://example.com",content:"Excerpt"},{title:"Bad",url:"javascript:alert(1)",content:"No"}];const assessment=validateAssessment(JSON.stringify({claim:"A claim long enough",verdict:"supported",explanation:"The result supports it.",sourceIndices:[0,1,99]}),sources);assert.deepEqual(assessment.sourceIndices,[0]);assert.equal(sourcesFor(assessment.sourceIndices,sources).length,1);});
