type Entry = { count: number; reset: number };
const local = new Map<string, Entry>();
const WINDOW_SECONDS = 60;
const LIMIT = 3;
async function upstash(bucket: string) { const base = process.env.UPSTASH_REDIS_REST_URL; const token = process.env.UPSTASH_REDIS_REST_TOKEN; if (!base || !token) return null; const response = await fetch(`${base}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify([["INCR", `evidencepilot:${bucket}`], ["EXPIRE", `evidencepilot:${bucket}`, WINDOW_SECONDS, "NX"]]), signal: AbortSignal.timeout(3000) }); if (!response.ok) throw new Error("Shared rate limit store unavailable."); const data = await response.json(); return Number(data?.[0]?.result); }
export async function checkRateLimit(client: string) { const bucket = `${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}:${client}`; const shared = await upstash(bucket); if (shared !== null) return shared <= LIMIT; if (process.env.NODE_ENV === "production") throw new Error("Shared rate limit is not configured."); const now=Date.now(), entry=local.get(bucket); if(!entry || entry.reset<now){local.set(bucket,{count:1,reset:now+WINDOW_SECONDS*1000});return true;} entry.count++;return entry.count<=LIMIT; }
export const rateLimitInfo = { limit: LIMIT, windowSeconds: WINDOW_SECONDS };
