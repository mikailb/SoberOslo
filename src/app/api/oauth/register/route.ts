import { getAccessSecret } from "@/lib/mcp/config";
import {
  clientIp,
  jsonResponse,
  preflightResponse,
  tooManyRequests,
} from "@/lib/mcp/http";
import { isAllowedRedirectUri, registerClient, type ClientAuthMethod } from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/mcp/rateLimit";

/**
 * Dynamic client registration (RFC 7591). ChatGPT registers itself once per
 * connection. Nothing is stored: the returned client id is a signed record of
 * the name and redirect addresses. Only ChatGPT's and local redirect addresses
 * are accepted, see isAllowedRedirectUri.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_METHODS: ClientAuthMethod[] = ["none", "client_secret_post", "client_secret_basic"];

function invalid(description: string, error = "invalid_client_metadata"): Response {
  return jsonResponse({ error, error_description: description }, 400);
}

export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(`oauth-register:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const secret = getAccessSecret();
  if (!secret) {
    return jsonResponse({ error: "temporarily_unavailable" }, 503);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return invalid("Body må være JSON.");

  const redirectUris = body.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > 5 ||
    !redirectUris.every((uri) => typeof uri === "string" && uri.length <= 500)
  ) {
    return invalid("redirect_uris må være en liste med 1–5 adresser.", "invalid_redirect_uri");
  }

  const rejected = (redirectUris as string[]).filter((uri) => !isAllowedRedirectUri(uri));
  if (rejected.length) {
    return invalid(
      `Redirect-adressen er ikke tillatt: ${rejected.join(", ")}`,
      "invalid_redirect_uri",
    );
  }

  const requestedMethod = body.token_endpoint_auth_method;
  const authMethod = AUTH_METHODS.includes(requestedMethod as ClientAuthMethod)
    ? (requestedMethod as ClientAuthMethod)
    : "none";

  const name =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 100)
      : "MCP-klient";

  const client = registerClient(secret, name, redirectUris as string[], authMethod);
  console.info(
    `[mcp-audit] ${JSON.stringify({ at: new Date().toISOString(), event: "client_registered", name, redirectUris })}`,
  );

  return jsonResponse(
    {
      client_id: client.clientId,
      client_id_issued_at: client.issuedAt,
      ...(client.clientSecret
        ? { client_secret: client.clientSecret, client_secret_expires_at: 0 }
        : {}),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: client.authMethod,
    },
    201,
  );
}

export function OPTIONS(): Response {
  return preflightResponse();
}
