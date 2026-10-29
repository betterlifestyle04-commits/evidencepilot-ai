/**
 * Reader-controlled editorial state. These labels are not model verdicts or
 * independent verification. No data is submitted to an AI provider.
 */
export const editorialDecisionLabels = {
  unreviewed: "Not reviewed",
  needs_research: "Needs more research",
  revise: "Revise the wording",
  selected_for_draft: "Select for my draft"
} as const;
export type EditorialDecision = keyof typeof editorialDecisionLabels;
export type EditorialReview = { decisions: EditorialDecision[]; draft: string };
const allowed = new Set<string>(Object.keys(editorialDecisionLabels));
export const newEditorialReview = (claimCount: number, aiRewrite: string): EditorialReview => ({
  decisions: Array.from({ length: claimCount }, () => "unreviewed" as const),
  draft: aiRewrite
});
export function parseEditorialReview(value: unknown, claimCount: number, aiRewrite: string): EditorialReview {
  const defaults = newEditorialReview(claimCount, aiRewrite);
  if (value === undefined || value === null) return defaults; // Backward-compatible JSON imports
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid manual editorial review.");
  const raw = value as Record<string, unknown>;
  if (typeof raw.draft !== "string" || raw.draft.length > 12_000) throw new Error("Invalid editorial draft.");
  if (!Array.isArray(raw.decisions) || raw.decisions.length !== claimCount
      || raw.decisions.some(x => typeof x !== "string" || !allowed.has(x))) {
    throw new Error("Invalid editorial claim decisions.");
  }
  return { draft: raw.draft, decisions: raw.decisions as EditorialDecision[] };
}
export function summarizeEditorialReview(review: EditorialReview) {
  const selected = review.decisions.filter(x => x === "selected_for_draft").length;
  const needsWork = review.decisions.filter(x => x === "needs_research" || x === "revise").length;
  const unreviewed = review.decisions.filter(x => x === "unreviewed").length;
  return { selected, needsWork, unreviewed, total: review.decisions.length };
}
