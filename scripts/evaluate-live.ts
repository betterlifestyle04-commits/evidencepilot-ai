import cases from "../evaluations/claims-v1.json";
import { analyzeContent } from "../lib/analyze";
import * as providers from "../lib/providers";
type Verdict="supported"|"contradicted"|"mixed"|"insufficient_evidence";
async function main(){const started=Date.now();const results=[] as {id:string;expected:Verdict;actual:Verdict|"no_claim";citations:number;durationMs:number}[];for(const item of cases){const caseStarted=Date.now();const report=await analyzeContent(item.claim,providers);const assessment=report.claims[0];results.push({id:item.id,expected:item.expectedVerdict as Verdict,actual:assessment?.verdict||"no_claim",citations:assessment?.sources.length||0,durationMs:Date.now()-caseStarted});}const matches=results.filter(item=>item.actual===item.expected).length;console.log(JSON.stringify({cases:results,summary:{matchedVerdicts:matches,total:results.length,elapsedMs:Date.now()-started}},null,2));}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"Live evaluation failed.");process.exitCode=1;});
