export type Verdict = "supported" | "contradicted" | "mixed" | "insufficient_evidence";
export type SearchResult = { title?: string; url?: string; content?: string; published_date?: string };
export type SourceType = "primary"|"academic"|"established_reporting"|"commentary"|"social_media"|"unknown";
export type EvidenceRelationship = "supports"|"contradicts"|"context"|"inconclusive";
export type Evidence = { title: string; url: string; snippet: string; sourceIndex?: number; publisher?: string; publishedDate?: string; sourceType?: SourceType; relationship?: EvidenceRelationship; relevance?: string; limitations?: string };
export type SourceAssessment = { index: number; relationship: EvidenceRelationship; relevance: string; limitations: string };
export type Assessment = { claim: string; verdict: Verdict; explanation: string; sourceIndices: number[]; evidenceStrength?: "strong"|"moderate"|"limited"|"insufficient"; qualifications?: string; sourceAssessments?: SourceAssessment[] };

export function sanitizeSearchResults(results: SearchResult[], limit = 8): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (!isSafeSourceUrl(result.url)) return false;
    const url = new URL(result.url);
    const identity = `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).slice(0, limit);
}
/**
 * Heuristic retrieval ordering: relevance is necessary, authority adds context.
 * A trusted domain never earns a high ranking if its result is unrelated.
 * This ranking does NOT assert that a claim is true or a source is trustworthy.
 */
export function rankSearchResults(results: SearchResult[], claim: string): SearchResult[] {
  const stopWords = new Set(["that", "this", "with", "from", "were", "have", "been", "their", "there", "which", "largest", "biggest"]);
  const terms = [...new Set((claim.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter(term => !stopWords.has(term)))];
  const categoryWeight: Record<SourceType, number> = {
    primary: 11, academic: 9, established_reporting: 5, unknown: 1, commentary: -2, social_media: -5
  };
  const score = (source: SearchResult) => {
    const title = String(source.title || "").toLowerCase();
    const excerpt = String(source.content || "").toLowerCase();
    const titleMatches = terms.filter(term => title.includes(term)).length;
    const excerptMatches = terms.filter(term => excerpt.includes(term)).length;
    const relevance = titleMatches * 3 + excerptMatches;
    // A generic official page should not outrank a highly relevant result.
    return relevance === 0 ? -100 : relevance * 2 + categoryWeight[categorizeSource(source)];
  };
  return [...results].sort((a,b) => score(b) - score(a) || String(a.title || "").localeCompare(String(b.title || "")));
}

export function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const value: unknown = JSON.parse(cleaned);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Model returned an invalid JSON object.");
  return value as Record<string, unknown>;
}
export function parseClaims(value: unknown, limit = 3): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error("Nemotron returned an invalid claim list.");
  return [...new Set(value.map((item) => item.trim()).filter((item) => item.length >= 8 && item.length <= 400))].slice(0, limit);
}
export function validateAssessment(value: unknown, sources: SearchResult[]): Assessment {
  if (!value || typeof value !== "object") throw new Error("Nemotron returned an invalid assessment.");
  const input = value as Partial<Assessment>;
  const validVerdicts: Verdict[] = ["supported", "contradicted", "mixed", "insufficient_evidence"];
  if (typeof input.claim !== "string" || !validVerdicts.includes(input.verdict as Verdict) || typeof input.explanation !== "string" || !Array.isArray(input.sourceIndices)) throw new Error("Nemotron assessment is incomplete.");
  const sourceIndices = [...new Set(input.sourceIndices.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < sources.length && isSafeSourceUrl(sources[index].url)))].slice(0, 4);
  // No cited retrieved evidence can substantiate a decisive verdict.
  // This includes contradiction and mixed-evidence claims, not only support.
  const sourceAssessments = Array.isArray(input.sourceAssessments) ? input.sourceAssessments.filter((item): item is SourceAssessment => Boolean(item && typeof item === "object" && Number.isInteger((item as SourceAssessment).index) && sourceIndices.includes((item as SourceAssessment).index) && ["supports","contradicts","context","inconclusive"].includes((item as SourceAssessment).relationship) && typeof (item as SourceAssessment).relevance === "string" && typeof (item as SourceAssessment).limitations === "string")).slice(0, 4).map(item=>({...item,relevance:item.relevance.slice(0,300),limitations:item.limitations.slice(0,300)})) : [];
  const relationships = new Set(sourceAssessments.map(source => source.relationship));
  let verdict: Verdict = sourceIndices.length === 0 ? "insufficient_evidence" : input.verdict as Verdict;
  // When the model provides per-source relationships, they must substantiate its
  // decisive verdict. Older callers without this optional metadata remain supported.
  if (sourceAssessments.length) {
    if (verdict === "supported" && !relationships.has("supports")) verdict = "insufficient_evidence";
    if (verdict === "contradicted" && !relationships.has("contradicts")) verdict = "insufficient_evidence";
    if (verdict === "mixed" && !(relationships.has("supports") && relationships.has("contradicts"))) verdict = "insufficient_evidence";
  }
  const strengths = ["strong","moderate","limited","insufficient"] as const;
  const rawStrength = strengths.includes(input.evidenceStrength as typeof strengths[number])
    ? input.evidenceStrength as typeof strengths[number] : "limited";
  const evidenceStrength = verdict === "insufficient_evidence" ? "insufficient" : rawStrength;
  return { claim: input.claim.trim().slice(0, 400), verdict, explanation: input.explanation.trim().slice(0, 1200), sourceIndices, evidenceStrength, qualifications: typeof input.qualifications === "string" ? input.qualifications.slice(0,600) : undefined, sourceAssessments };
}
export function sourcesFor(indices: number[], sources: SearchResult[], assessments: SourceAssessment[] = []): Evidence[] { const output:Evidence[]=[];for(const index of indices){const source=sources[index];if(!source||!isSafeSourceUrl(source.url))continue;const review=assessments.find(item=>item.index===index);output.push({title:source.title?.trim().slice(0,240)||"Untitled source",url:source.url,snippet:source.content?.trim().slice(0,500)||"No excerpt supplied by Tavily.",sourceIndex:index,publisher:publisherFor(source.url),publishedDate:typeof source.published_date==="string"?source.published_date.slice(0,50):undefined,sourceType:categorizeSource(source),relationship:review?.relationship,relevance:review?.relevance,limitations:review?.limitations});}return output; }
export function isSafeSourceUrl(value: unknown): value is string { try { const url = new URL(String(value)); const host = url.hostname.toLowerCase(); return url.protocol === "https:" && !url.username && !url.password && host !== "localhost" && !host.endsWith(".local") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host); } catch { return false; } }
export function publisherFor(url:string){return new URL(url).hostname.replace(/^www\./,"");}
export function categorizeSource(source:SearchResult):SourceType{const host=isSafeSourceUrl(source.url)?new URL(source.url).hostname.toLowerCase():"";const text=`${source.title||""} ${source.content||""}`.toLowerCase();if(/instagram|facebook|tiktok|reddit|x\.com|twitter\.com/.test(host))return "social_media";if(/\.gov$|\.int$|\.edu$/.test(host)||/official documentation|technical documentation|dataset/.test(text))return "primary";if(/arxiv\.org|pubmed|doi\.org|journal|university research/.test(host+text))return "academic";if(/news|reuters|apnews|bbc|theguardian|nytimes/.test(host))return "established_reporting";if(/blog|opinion|forum|brainly/.test(host+text))return "commentary";return "unknown";}
