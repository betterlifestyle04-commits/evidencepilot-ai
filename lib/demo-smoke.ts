/** A smoke check verifies response shape and connectivity, not factual accuracy. */
export type DemoMode = "quick" | "deep";
export const demoCases: ReadonlyArray<{id:string;mode:DemoMode;content:string;expectedVerdict:string}> = [
  {id:"mars-false",mode:"quick",content:"Mars is the biggest planet in the Solar System.",expectedVerdict:"contradicted"},
  {id:"apollo-history",mode:"deep",content:"Apollo 11 landed humans on the Moon in 1969.",expectedVerdict:"supported"}
];
const verdicts = new Set(["supported","contradicted","mixed","insufficient_evidence"]);
const asRecord=(value:unknown):Record<string,unknown>|null=>
  value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown>:null;
export function observeDemoResponse(status:number,value:unknown,expectedMode:DemoMode) {
  const body=asRecord(value);
  const id=body?.requestId;
  const requestId=typeof id==="string" && /^[0-9a-f-]{36}$/i.test(id)?id:null;
  const mode=body?.mode==="quick"||body?.mode==="deep"?body.mode:null;
  const claims=Array.isArray(body?.claims)?body.claims:[];
  const rows=claims.map(asRecord);
  const valid=status===200 && mode===expectedMode && claims.length>0 && claims.length<=3 &&
    rows.every(row=>row && typeof row.claim==="string" && verdicts.has(String(row.verdict)) && Array.isArray(row.sources));
  const urls=new Set<string>();
  if(valid) for(const row of rows) for(const value of row!.sources as unknown[]) {
    const source=asRecord(value);
    if(typeof source?.url==="string" && source.url.startsWith("https://"))urls.add(source.url);
  }
  const investigation=asRecord(body?.investigation);
  const partial=investigation?.partialClaims, duration=investigation?.durationMs;
  const safeError=typeof body?.error==="string" && body.error.length<=160 ? body.error:null;
  return {
    httpStatus:status,responseShapeValid:Boolean(valid),mode,
    actualVerdict:valid&&typeof rows[0]?.verdict==="string"?rows[0].verdict:null,
    citedSourceUrls:urls.size,
    partialClaims:typeof partial==="number"&&Number.isFinite(partial)?partial:null,
    rewriteUnavailable:investigation?.rewriteStatus==="unavailable",
    serverDurationMs:typeof duration==="number"&&Number.isFinite(duration)?duration:null,
    requestId,
    warning:status===429?"Rate limit reached. No automatic retry."
      :status!==200?(safeError||"Request could not complete.")
      :!valid?"Report response shape was unexpected.":null
  };
}
