import { mcpEndpoints, OAUTH_SCOPE, publicOrigin } from "@/lib/mcp/config";
import { jsonResponse, preflightResponse } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const endpoints = mcpEndpoints(publicOrigin(request));

  return jsonResponse({
    resource: endpoints.resource,
    authorization_servers: [endpoints.issuer],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Sober Oslo – aktiviteter",
  });
}

export function OPTIONS(): Response {
  return preflightResponse();
}
