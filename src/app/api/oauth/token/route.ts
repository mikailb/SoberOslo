import { getAccessSecret, mcpEndpoints, publicOrigin } from "@/lib/mcp/config";
import {
  clientIp,
  jsonResponse,
  preflightResponse,
  readParams,
  tooManyRequests,
} from "@/lib/mcp/http";
import {
  fingerprint,
  isValidClientSecret,
  issueTokens,
  readClient,
  readRefreshToken,
  redeemCode,
  type RegisteredClient,
} from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/mcp/rateLimit";

/**
 * Token endpoint: trades an authorization code (with PKCE) or a refresh token
 * for a new access token.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400): Response {
  return jsonResponse({ error, error_description: description }, status);
}

/** Client credentials may arrive in the body or as HTTP Basic. */
function clientCredentials(request: Request, params: Record<string, string>) {
  const basic = request.headers.get("authorization")?.match(/^Basic\s+(\S+)$/i);
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator > 0) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, separator)),
        clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
      };
    }
  }
  return { clientId: params.client_id, clientSecret: params.client_secret };
}

function authenticateClient(
  secret: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
): RegisteredClient | null {
  if (!clientId) return null;
  const client = readClient(secret, clientId);
  if (!client) return null;
  if (client.authMethod !== "none" && !isValidClientSecret(secret, clientId, clientSecret)) {
    return null;
  }
  return client;
}

export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(`oauth-token:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const secret = getAccessSecret();
  if (!secret) return oauthError("temporarily_unavailable", "Tilkoblingen er ikke satt opp.", 503);

  const params = await readParams(request);
  const { clientId, clientSecret } = clientCredentials(request, params);
  const client = authenticateClient(secret, clientId, clientSecret);
  if (!client) return oauthError("invalid_client", "Ukjent eller ugyldig klient.", 401);

  const audience = mcpEndpoints(publicOrigin(request)).resource;
  if (params.resource && params.resource.replace(/\/$/, "") !== audience) {
    return oauthError("invalid_target", "Ukjent resource.");
  }

  if (params.grant_type === "authorization_code") {
    const check = redeemCode(
      secret,
      params.code ?? "",
      client.clientId,
      params.redirect_uri ?? "",
      params.code_verifier ?? "",
    );
    if (!check.ok) return oauthError("invalid_grant", check.description);
    if (check.payload.aud !== audience) {
      return oauthError("invalid_grant", "Koden gjelder en annen tjeneste.");
    }

    return jsonResponse(issueTokens(secret, check.payload.cid, client.name, audience));
  }

  if (params.grant_type === "refresh_token") {
    const refresh = readRefreshToken(secret, params.refresh_token ?? "");
    if (!refresh || refresh.cid !== fingerprint(client.clientId) || refresh.aud !== audience) {
      return oauthError("invalid_grant", "Refresh-tokenet er ugyldig eller utløpt.");
    }
    return jsonResponse(issueTokens(secret, refresh.cid, client.name, audience));
  }

  return oauthError("unsupported_grant_type", "Bare authorization_code og refresh_token støttes.");
}

export function OPTIONS(): Response {
  return preflightResponse();
}
