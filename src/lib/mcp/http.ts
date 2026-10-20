import "server-only";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers":
    "Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return jsonResponse(
    {
      error: "rate_limited",
      error_description: `For mange forespørsler. Prøv igjen om ${retryAfterSeconds} sekunder.`,
    },
    429,
    { "Retry-After": String(retryAfterSeconds) },
  );
}

export async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  const result: Record<string, string> = {};

  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as unknown;
    if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") result[key] = value;
      }
    }
    return result;
  }

  const form = await request.formData().catch(() => null);
  form?.forEach((value, key) => {
    if (typeof value === "string") result[key] = value;
  });
  return result;
}
