import { isIP } from "node:net";

/**
 * Vercel supplies x-forwarded-for. Treat malformed values as one anonymous
 * bucket so an attacker cannot create arbitrary rate-limit keys with headers.
 */
export function clientRateLimitKey(forwardedFor: string | null) {
  const candidate = forwardedFor?.split(",")[0]?.trim().toLowerCase() || "";
  // Do not let syntactically IP-like but impossible values (for example
  // 999.999.999.999) create unlimited distinct rate-limit buckets.
  if (isIP(candidate)) return `ip:${candidate}`;
  return "anonymous";
}

export function requestId() { return crypto.randomUUID(); }
