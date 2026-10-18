import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { getAccessSecret, mcpEndpoints, OAUTH_SCOPE, publicOrigin } from "@/lib/mcp/config";
import {
  clientIp,
  jsonResponse,
  preflightResponse,
  tooManyRequests,
  withCors,
} from "@/lib/mcp/http";
import { authenticateBearer } from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/mcp/rateLimit";
import { createMcpServer } from "@/lib/mcp/server";
import { writeClient } from "@/sanity/writeClient";

/**
 * The MCP endpoint ChatGPT connects to (Streamable HTTP, stateless).
 *
 * Every request is authenticated, then gets a fresh server and transport, so
 * nothing is kept between requests and it runs fine on serverless functions.
 * Responses are plain JSON rather than an event stream.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 1024 * 1024;

function unauthorized(origin: string, tokenSent: boolean): Response {
  const { protectedResourceMetadata } = mcpEndpoints(origin);
  const challenge = [
    `Bearer resource_metadata="${protectedResourceMetadata}"`,
    `scope="${OAUTH_SCOPE}"`,
    ...(tokenSent
      ? [`error="invalid_token"`, `error_description="Innloggingen er ugyldig eller utløpt."`]
      : []),
  ].join(", ");

  return jsonResponse(
    {
      error: "unauthorized",
      error_description: "Du må logge inn for å bruke Sober Oslo-tilkoblingen.",
    },
    401,
    { "WWW-Authenticate": challenge },
  );
}

export async function POST(request: Request): Promise<Response> {
  const ipLimit = rateLimit(`mcp-ip:${clientIp(request)}`, 300, 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const secret = getAccessSecret();
  if (!secret || !writeClient) {
    return jsonResponse(
      {
        error: "not_configured",
        error_description:
          "ChatGPT-tilkoblingen er ikke satt opp. MCP_ACCESS_TOKEN (minst 32 tegn), SANITY_WRITE_TOKEN og NEXT_PUBLIC_SANITY_PROJECT_ID må være satt på serveren.",
      },
      503,
    );
  }

  const origin = publicOrigin(request);
  const authorization = request.headers.get("authorization");
  const actor = authenticateBearer(secret, authorization, mcpEndpoints(origin).resource);
  if (!actor) return unauthorized(origin, !!authorization);

  const actorLimit = rateLimit(`mcp-actor:${actor.key}`, 120, 60_000);
  if (!actorLimit.ok) return tooManyRequests(actorLimit.retryAfter);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "payload_too_large" }, 413);
  }

  const server = createMcpServer(writeClient, actor);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  return withCors(await transport.handleRequest(request));
}

/** Stateless server: no event stream to open and no session to end. */
function methodNotAllowed(): Response {
  return jsonResponse(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    405,
    { Allow: "POST, OPTIONS" },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(): Response {
  return preflightResponse();
}
