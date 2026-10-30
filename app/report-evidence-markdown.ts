import type { ClaimInsight, EvidenceDetail } from "./report-insights";

/** Export sections must distinguish model-cited evidence from merely retrieved leads. */
function safeMarkdownLink(source: EvidenceDetail): string {
  // Keep titles on one line and encode Markdown punctuation in the URL target.
  const title = source.title.replace(/[\[\]\r\n]/g, " ").replace(/\s+/g, " ").trim();
  const href = new URL(source.url).href;
  return "[" + (title || "Untitled source") + "](<" + href + ">)";
}

export function markdownEvidenceSection(claim: Pick<ClaimInsight, "sources" | "unassessedSources">): string[] {
  const lines: string[] = [];
  if (claim.sources.length) {
    lines.push("**Cited retrieved sources:**");
    for (const source of claim.sources) {
      lines.push("- " + safeMarkdownLink(source) + (source.relationship ? " — " + source.relationship : ""));
      if (source.relevance) lines.push("  - Relevance: " + source.relevance.replace(/\s+/g, " ").trim());
      if (source.limitations) lines.push("  - Limitations: " + source.limitations.replace(/\s+/g, " ").trim());
    }
    lines.push("");
  } else {
    lines.push("No retrieved sources were cited.", "");
  }
  if (claim.unassessedSources?.length) {
    lines.push("**Retrieved but unassessed leads (NOT AI citations):**");
    for (const lead of claim.unassessedSources) lines.push("- " + safeMarkdownLink(lead) + " — not assessed");
    lines.push("These links have not been verified or classified as supporting or challenging.", "");
  }
  return lines;
}
