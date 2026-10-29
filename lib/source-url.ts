/**
 * Browser-safe validation of URLs displayed as source links.
 *
 * This is a static URL guard, NOT proof that the destination is trustworthy,
 * publicly resolvable, non-private after DNS lookup, or safe to visit.
 * Do not substitute this for DNS/IP checks when making server-side fetches.
 */
export function isSafeSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password) return false;
    // IPv6 hosts include brackets in URL.hostname; the browser will normalize
    // numeric IPv4 encodings (0x7f000001, 2130706433, etc.) to dotted IPv4.
    if (!host || host.includes(":") || host.includes("[") || host.includes("]") ||
      host.includes("%") || host.startsWith(".") || host.includes("..")) return false;
    if (!host.includes(".") || /^\d+(?:\.\d+){3}$/.test(host)) return false;
    if (/(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
