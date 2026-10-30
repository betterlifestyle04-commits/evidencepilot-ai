/** A report must never be presented as covering text edited after it ran. */
export function hasUnanalyzedEdits(hasReport: boolean, input: string, analyzedText: string): boolean {
  return hasReport && input !== analyzedText;
}
