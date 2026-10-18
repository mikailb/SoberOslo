import "server-only";

/**
 * Settings and addresses for the ChatGPT connection.
 *
 * `MCP_ACCESS_TOKEN` is the board's password for connecting ChatGPT. It is
 * also the root of every signed OAuth value, so changing it signs every
 * connected ChatGPT out at once.
 */

/** Shorter values are refused, so a weak password cannot switch the connection on. */
export const MIN_ACCESS_TOKEN_LENGTH = 32;

/** The only OAuth scope. Everything the connection can do sits behind it. */
export const OAUTH_SCOPE = "activities";

export function getAccessSecret(): string | null {
  const value = process.env.MCP_ACCESS_TOKEN?.trim() ?? "";
  return value.length >= MIN_ACCESS_TOKEN_LENGTH ? value : null;
}

const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * The public origin the request came in on, for example
 * `https://soberoslo.no`.
 *
 * The OAuth issuer must match the address ChatGPT connected to exactly, and
 * preview deployments each have their own, so this is read from the request.
 * `MCP_PUBLIC_URL` overrides it when a proxy hides the real host.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.MCP_PUBLIC_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request.
    }
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

/** Exact redirect addresses allowed in addition to ChatGPT's and loopback. */
export function extraRedirectUris(): string[] {
  return (process.env.MCP_OAUTH_EXTRA_REDIRECT_URIS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
