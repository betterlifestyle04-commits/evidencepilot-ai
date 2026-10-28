export type Verdict = "supported" | "contradicted" | "mixed" | "insufficient_evidence";
export type SearchResult = { title?: string; url?: string; content?: string };
export type Evidence = { title: string; url: string; snippet: string };
export type Assessment = { claim: string; verdict: Verdict; explanation: string; sourceIndices: number[] };

export function sanitizeSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (!isSafeSourceUrl(result.url)) return false;
    const url = new URL(result.url);
    const identity = `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).slice(0, 5);
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
  const verdict: Verdict = input.verdict === "supported" && sourceIndices.length === 0 ? "insufficient_evidence" : input.verdict as Verdict;
  return { claim: input.claim.trim().slice(0, 400), verdict, explanation: input.explanation.trim().slice(0, 1200), sourceIndices };
}
export function sourcesFor(indices: number[], sources: SearchResult[]): Evidence[] { return indices.map((index) => sources[index]).filter((source): source is SearchResult & {url:string} => Boolean(source && isSafeSourceUrl(source.url))).map((source) => ({ title: source.title?.trim().slice(0, 240) || "Untitled source", url: source.url, snippet: source.content?.trim().slice(0, 500) || "No excerpt supplied by Tavily." })); }
export function isSafeSourceUrl(value: unknown): value is string { try { const url = new URL(String(value)); const host = url.hostname.toLowerCase(); return url.protocol === "https:" && !url.username && !url.password && host !== "localhost" && !host.endsWith(".local") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host); } catch { return false; } }
