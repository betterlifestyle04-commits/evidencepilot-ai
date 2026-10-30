import { MAX_ANALYSIS_BODY_BYTES } from "../lib/request-body";

/** Small, deterministic guidance for why the public Analyze action is disabled. */
export type AnalysisReadiness = {
  canAnalyze: boolean;
  state: "ready" | "in_progress" | "cooldown" | "input_needed" | "oversized";
  explanation: string;
};

export function getAnalysisReadiness(
  content: string,
  payloadBytes: number,
  busy: boolean,
  waitSeconds: number
): AnalysisReadiness {
  if (busy) return {
    canAnalyze: false, state: "in_progress",
    explanation: "An investigation is running. Previous results remain available below."
  };
  if (waitSeconds > 0) return {
    canAnalyze: false, state: "cooldown",
    explanation: "Public demo cooldown: wait " + Math.ceil(waitSeconds) + " seconds before trying again."
  };
  if (content.length > 12_000) return {
    canAnalyze: false, state: "oversized",
    explanation: "Shorten the text to 12,000 characters or fewer before analyzing."
  };
  if (payloadBytes > MAX_ANALYSIS_BODY_BYTES) return {
    canAnalyze: false, state: "oversized",
    explanation: "The UTF-8 JSON request exceeds 16 KB. Shorten the text before analyzing."
  };
  if (content.trim().length < 20) return {
    canAnalyze: false, state: "input_needed",
    explanation: "Enter at least 20 non-whitespace characters in a factual statement to enable analysis."
  };
  return {
    canAnalyze: true, state: "ready",
    explanation: "Ready. Select Analyze to research up to three claims using the live AI and search providers."
  };
}
