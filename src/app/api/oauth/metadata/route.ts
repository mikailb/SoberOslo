import { mcpEndpoints, OAUTH_SCOPE, publicOrigin } from "@/lib/mcp/config";
import { jsonResponse, preflightResponse } from "@/lib/mcp/http";

/**
 * OAuth authorization server metadata (RFC 8414). Served at
 * /.well-known/oauth-authorization-server through a rewrite in next.config.ts.
 */

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const endpoints = mcpEndpoints(publicOrigin(request));

  return jsonResponse({
    issuer: endpoints.issuer,
    authorization_endpoint: endpoints.authorizationEndpoint,
    token_endpoint: endpoints.tokenEndpoint,
    registration_endpoint: endpoints.registrationEndpoint,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
    scopes_supported: [OAUTH_SCOPE],
    authorization_response_iss_parameter_supported: true,
  });
}

export function OPTIONS(): Response {
  return preflightResponse();
}
