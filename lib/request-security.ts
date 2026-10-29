import { isIP } from "node:net";
/** Accept only valid IPs from the trusted forwarding chain. */
export function clientRateLimitKey(forwardedFor: string | null) {
  const candidate = forwardedFor?.split(",")[0]?.trim().toLowerCase() || "";
  if (!candidate || candidate.length > 64 || isIP(candidate) === 0) return "anonymous";
  return `ip:${candidate}`;
}
export function requestId() { return crypto.randomUUID(); }
