import { NextRequest, NextResponse } from "next/server";
import { analyzeContent, NoCheckableClaimsError, type AnalysisMode } from "@/lib/analyze";
import * as providers from "@/lib/providers";
import { ProviderError } from "@/lib/providers";
import { checkRateLimit, rateLimitInfo } from "@/lib/rate-limit";
import { clientRateLimitKey, requestId } from "@/lib/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY_BYTES = 16_000;
const response = (body: unknown, status = 200, id = requestId(), extraHeaders: Record<string,string> = {}) =>
  NextResponse.json({ ...body as object, requestId: id }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Request-Id": id, ...extraHeaders } });

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
      return response({ error: "Content-Type must be application/json." }, 415, id);
    }
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return response({ error: "Request payload is too large." }, 413, id);
    }
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response({ error: "Request body must contain content and an optional mode." }, 400, id);
    }
    const { content, mode = "quick" } = body as Record<string, unknown>;
    if (typeof content !== "string" || content.trim().length < 20 || content.length > 12_000) {
      return response({ error: "Content must be between 20 and 12,000 characters." }, 400, id);
    }
    if (mode !== "quick" && mode !== "deep") {
      return response({ error: "Mode must be quick or deep." }, 400, id);
    }
    const client = clientRateLimitKey(request.headers.get("x-forwarded-for"));
    if (!await checkRateLimit(client)) {
      return response({ error: "Rate limit reached. Try again in " + rateLimitInfo.windowSeconds + " seconds." }, 429, id, { "Retry-After": String(rateLimitInfo.windowSeconds) });
    }
    const report = await analyzeContent(content, providers, mode as AnalysisMode);
    return response({ ...report, model: process.env.NEBIUS_MODEL || "nvidia/nemotron-3-super-120b-a12b" }, 200, id);
  } catch (error) {
    // A valid opinion-only submission is not a service outage or malformed JSON.
    if (error instanceof NoCheckableClaimsError) return response({
      code: "NO_CHECKABLE_CLAIMS",
      error: "No independently checkable factual statements were found. Try a specific claim involving dates, numbers, events, or measurable facts."
    }, 422, id);
    // Log only an opaque request ID and broad failure type, never user text or secrets.
    const failureKind = error instanceof ProviderError ? "provider-" + error.kind
      : error instanceof SyntaxError ? "invalid-json"
      : error instanceof Error && error.message.includes("rate limit") ? "rate-limit-service"
      : "internal";
    console.error("[EvidencePilot] analysis failed", { requestId: id, kind: failureKind });
    if (error instanceof ProviderError) return response({
      error: error.kind === "configuration" ? "Provider configuration is incomplete."
        : error.kind === "timeout" ? "A provider timed out. Please try again."
        : "A provider could not complete the analysis. Please try again."
    }, error.kind === "configuration" ? 503 : error.kind === "timeout" ? 504 : 502, id);
    if (error instanceof Error && error.message.includes("rate limit")) {
      return response({ error: "Demo protection is temporarily unavailable." }, 503, id);
    }
    if (error instanceof SyntaxError) return response({ error: "Request body must be valid JSON." }, 400, id);
    return response({ error: "Analysis service unavailable. Please retry shortly." }, 502, id);
  }
}
