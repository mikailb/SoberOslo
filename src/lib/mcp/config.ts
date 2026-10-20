import "server-only";

export const MIN_ACCESS_TOKEN_LENGTH = 32;

export const OAUTH_SCOPE = "activities";

export function getAccessSecret(): string | null {
  const value = process.env.MCP_ACCESS_TOKEN?.trim() ?? "";
  return value.length >= MIN_ACCESS_TOKEN_LENGTH ? value : null;
}

const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

export function publicOrigin(request: Request): string {
  const configured = process.env.MCP_PUBLIC_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {}
  }

  const url = new URL(request.url);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : url.protocol.replace(":", "");

  if (!HOST_PATTERN.test(host)) return url.origin;
  return `${proto}://${host}`;
}

export function mcpEndpoints(origin: string) {
  return {
    issuer: origin,
    resource: `${origin}/api/mcp`,
    protectedResourceMetadata: `${origin}/.well-known/oauth-protected-resource`,
    authorizationEndpoint: `${origin}/api/oauth/authorize`,
    tokenEndpoint: `${origin}/api/oauth/token`,
    registrationEndpoint: `${origin}/api/oauth/register`,
  };
}

export function extraRedirectUris(): string[] {
  return (process.env.MCP_OAUTH_EXTRA_REDIRECT_URIS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
