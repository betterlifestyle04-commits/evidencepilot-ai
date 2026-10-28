import { sourcesFor, type Assessment, type SearchResult } from "./evidence";
import { ProviderError } from "./providers";

export type AnalysisProviders = { extractClaims(content:string):Promise<string[]>; searchClaim(claim:string):Promise<SearchResult[]>; assess(claim:string,sources:SearchResult[]):Promise<Assessment>; cautiousRewrite(original:string,assessments:{claim:string;verdict:string;explanation:string}[]):Promise<string> };
type ReviewedClaim = Assessment & { sources: ReturnType<typeof sourcesFor>; retrievalStatus?: "unavailable" | "empty" };

export async function analyzeContent(content:string, providers:AnalysisProviders) {
  const claims=await providers.extractClaims(content);
  if(!claims.length) throw new Error("No independently verifiable factual claims were found in this text.");
  const reviewed: ReviewedClaim[]=[];
  let nebiusCalls=1, tavilyCalls=0;
  for(const claim of claims){
    let results: SearchResult[];
    try { tavilyCalls++; results=await providers.searchClaim(claim); }
    catch(error) {
      if(error instanceof ProviderError && error.kind === "configuration") throw error;
      reviewed.push({claim,verdict:"insufficient_evidence",explanation:"Evidence retrieval was temporarily unavailable for this claim, so no conclusion can be supported.",sourceIndices:[],sources:[],retrievalStatus:"unavailable"});
      continue;
    }
    if(results.length===0){
      reviewed.push({claim,verdict:"insufficient_evidence",explanation:"No usable public sources were retrieved for this claim, so no conclusion can be supported.",sourceIndices:[],sources:[],retrievalStatus:"empty"});
      continue;
    }
    const assessment=await providers.assess(claim,results); nebiusCalls++;
    reviewed.push({...assessment,sources:sourcesFor(assessment.sourceIndices,results)});
  }
  const rewrite=await providers.cautiousRewrite(content,reviewed); nebiusCalls++;
  return {claims:reviewed,rewrite,providerCalls:{nebius:nebiusCalls,tavily:tavilyCalls,total:nebiusCalls+tavilyCalls}};
}
