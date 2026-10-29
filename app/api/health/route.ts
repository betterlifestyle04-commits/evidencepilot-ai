import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providersConfigured = Boolean(process.env.NEBIUS_API_KEY && process.env.TAVILY_API_KEY);
  const rateLimitConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const status = providersConfigured && rateLimitConfigured ? "ready" : "degraded";
  return NextResponse.json({ status, checks: { providersConfigured, rateLimitConfigured }, integrations: "unverified" }, { headers: { "Cache-Control": "no-store" } });
}
