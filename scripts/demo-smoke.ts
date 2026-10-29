import {demoCases,observeDemoResponse} from "../lib/demo-smoke";

const DEFAULT_SITE="https://evidencepilot-ai-flame.vercel.app";
const live=process.argv.includes("--live");
const arg=process.argv.find(value=>value.startsWith("--url="));
const target=arg?.slice("--url=".length) || process.env.EVIDENCEPILOT_URL || DEFAULT_SITE;

async function jsonRequest(url:string,init?:RequestInit) {
  const response=await fetch(url,{
    ...init,
    signal:AbortSignal.timeout(init?75_000:15_000),
    cache:"no-store",
    headers:{"Accept":"application/json",...(init?.headers||{})}
  });
  const body:unknown=await response.json().catch(()=>null);
  return {status:response.status,body};
}
async function main() {
  const parsed=new URL(target);
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||!parsed.hostname.includes("."))
    throw new Error("Supply a public HTTPS deployment URL.");
  const site=parsed.origin;
  const health=await jsonRequest(site+"/api/health");
  const body=health.body && typeof health.body==="object" && !Array.isArray(health.body)
    ? health.body as Record<string,unknown>:null;
  const ready=health.status===200 && body?.status==="ready";
  console.log(JSON.stringify({
    phase:"health-only",site,httpStatus:health.status,
    reportedStatus:body?.status||"invalid",integrations:body?.integrations||"unverified",
    readyForLiveProbe:ready,
    caveat:"Configured secrets are not proof that either provider can serve a request."
  },null,2));
  if(!live) {
    console.log("No AI credits used. Optional two-request test: npm run smoke:demo -- --live");
    return;
  }
  if(!ready)throw new Error("Health check not ready; skipping live probes.");
  console.log("Two real sequential provider-backed investigations enabled, with no automatic retries.");
  for(const item of demoCases) {
    const started=Date.now();
    let observation:ReturnType<typeof observeDemoResponse>;
    try {
      const response=await jsonRequest(site+"/api/analyze",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({content:item.content,mode:item.mode})
      });
      observation=observeDemoResponse(response.status,response.body,item.mode);
    } catch {
      observation=observeDemoResponse(0,{error:"Client timeout or network error."},item.mode);
      console.error("Client failure does not prove that provider work stopped. No retry was attempted.");
    }
    console.log(JSON.stringify({
      case:item.id,mode:item.mode,referenceVerdict:item.expectedVerdict,
      observed:observation,elapsedClientMs:Date.now()-started,
      caution:"Reference verdict is a comparison point, not an accuracy certificate."
    },null,2));
    if(!observation.responseShapeValid)process.exitCode=1;
    if(observation.httpStatus===429) {
      console.error("Demo rate limit reached. Stopping without retry.");
      break;
    }
  }
}
main().catch((error:unknown)=>{
  console.error(error instanceof Error?error.message:"Demo probe failed.");
  process.exitCode=1;
});
