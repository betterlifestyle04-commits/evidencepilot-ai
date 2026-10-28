/**
 * Vercel supplies x-forwarded-for. Treat malformed values as one anonymous
 * bucket so an attacker cannot create arbitrary rate-limit keys with headers.
 */
export function clientRateLimitKey(forwardedFor: string | null) {
  const candidate = forwardedFor?.split(",")[0]?.trim().toLowerCase() || "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate)) return `ip:${candidate}`;
  if (/^[0-9a-f:]{2,64}$/.test(candidate)) return `ip:${candidate}`;
  return "anonymous";
}

export function requestId() { return crypto.randomUUID(); }
