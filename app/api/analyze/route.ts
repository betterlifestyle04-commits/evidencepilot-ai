import { NextRequest, NextResponse } from "next/server";
import { analyzeContent, type AnalysisMode } from "@/lib/analyze";
import * as providers from "@/lib/providers";
import { ProviderError } from "@/lib/providers";
import { checkRateLimit, rateLimitInfo } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY_BYTES = 16_000;
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
      return response({ error: "Content-Type must be application/json." }, 415);
    }
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return response({ error: "Request payload is too large." }, 413);
    }
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response({ error: "Request body must contain content and an optional mode." }, 400);
    }
    const { content, mode = "quick" } = body as Record<string, unknown>;
    if (typeof content !== "string" || content.trim().length < 20 || content.length > 12_000) {
      return response({ error: "Content must be between 20 and 12,000 characters." }, 400);
    }
    if (mode !== "quick" && mode !== "deep") {
      return response({ error: "Mode must be quick or deep." }, 400);
    }
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    if (!await checkRateLimit(client)) {
      return response({ error: "Rate limit reached. Try again in " + rateLimitInfo.windowSeconds + " seconds." }, 429);
    }
    const report = await analyzeContent(content, providers, mode as AnalysisMode);
    return response({ ...report, model: process.env.NEBIUS_MODEL || "nvidia/nemotron-3-super-120b-a12b" });
  } catch (error) {
    if (error instanceof ProviderError) return response({
      error: error.kind === "configuration" ? "Provider configuration is incomplete."
        : error.kind === "timeout" ? "A provider timed out. Please try again."
        : "A provider could not complete the analysis. Please try again."
    }, error.kind === "configuration" ? 503 : error.kind === "timeout" ? 504 : 502);
    if (error instanceof Error && error.message.includes("rate limit")) {
      return response({ error: "Demo protection is temporarily unavailable." }, 503);
    }
    if (error instanceof SyntaxError) return response({ error: "Request body must be valid JSON." }, 400);
    return response({ error: "Analysis service unavailable. Please retry shortly." }, 502);
  }
}
