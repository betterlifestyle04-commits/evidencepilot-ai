/**
 * Browser-side, deterministic API failure guidance. Never assumes that an
 * aborted browser request stopped an already-running server-side workflow.
 */
export type AnalysisFailure = {
  message: string;
  cooldownSeconds: number | null;
  recommendQuick: boolean;
  requestId: string | null;
};
const validRequestId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function readRetryAfter(value: string | null, now = Date.now()): number {
  const v = value?.trim() || "";
  if (/^\d{1,5}$/.test(v)) return Math.max(1, Math.min(300, Number(v)));
  // Retry-After HTTP dates use the standard IMF-fixdate format, not arbitrary
  // strings that Date.parse may coerce (for example, "-2" or "1").
  if (!/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(v)) return 60;
  const date = Date.parse(v);
  return Number.isFinite(date) ? Math.max(1, Math.min(300, Math.ceil((date - now) / 1000))) : 60;
}
export function analysisFailure(status: number, data: unknown, retryAfter: string | null): AnalysisFailure {
  const body = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const requestId = validRequestId(body.requestId) ? body.requestId : null;
  const detail = requestId ? " Request ID: " + requestId + "." : "";
  if (status === 422 && body.code === "NO_CHECKABLE_CLAIMS") {
    return { message: "No checkable factual statements were detected. Try a concrete claim with a date, number, event, or measurable fact. You can load an example below without submitting automatically." + detail,
      cooldownSeconds: null, recommendQuick: false, requestId };
  }
  if (status === 429) {
    const seconds = readRetryAfter(retryAfter);
    return {
      message: "The public demo has reached its analysis limit. Please wait at least " + seconds + " seconds before another attempt." + detail,
      cooldownSeconds: seconds, recommendQuick: false, requestId
    };
  }
  if (status === 504 || status === 408) {
    return {
      message: "An upstream request took too long. Quick Check uses fewer provider calls; wait before retrying because the previous server request may still have been processing." + detail,
      cooldownSeconds: null, recommendQuick: true, requestId
    };
  }
  if (status === 503 && body.error === "Demo protection is temporarily unavailable.") {
    return {
      message: "Shared demo protection is currently unavailable. Do not repeatedly submit requests; check the rate-limit service configuration." + detail,
      cooldownSeconds: null, recommendQuick: false, requestId
    };
  }
  if (status === 503 && body.error === "Provider configuration is incomplete.") {
    return {
      message: "Provider credentials are missing or incomplete on the server. Check Vercel environment settings." + detail,
      cooldownSeconds: null, recommendQuick: false, requestId
    };
  }
  const safeMessage = typeof body.error === "string" && body.error.length <= 200
    ? body.error : "The analysis service could not complete the request.";
  return { message: safeMessage + " Please try again later." + detail,
    cooldownSeconds: null, recommendQuick: status === 502, requestId };
}
