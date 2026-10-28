import { searchClaim, verifyNebiusModel } from "../lib/providers";
async function main(){const model=await verifyNebiusModel();const results=await searchClaim("Earth orbits the Sun");if(!results.length)throw new Error("Tavily returned no results for the verification query.");console.log(JSON.stringify({ok:true,model,tavilyResults:results.length}));}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"Provider verification failed.");process.exitCode=1;});
