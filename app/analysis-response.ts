/** Vercel and upstream gateways may return HTML or truncated bodies instead of our API JSON. */
export async function readAnalysisPayload(response: Response): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {};
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
}
