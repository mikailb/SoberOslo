import "server-only";

import { createClient, type SanityClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

/**
 * Write client, used only by the ChatGPT connection at /api/mcp.
 *
 * `server-only` makes the build fail if this file is ever imported from client
 * code, so the token cannot end up in the browser bundle. It reads the raw
 * perspective so it sees both published documents and Studio drafts, and
 * skips the CDN so it never acts on stale data.
 *
 * The token must come from a Sanity robot token with the Editor role, set as
 * `SANITY_WRITE_TOKEN` in the server environment. Never give it a
 * `NEXT_PUBLIC_` prefix.
 */
const token = process.env.SANITY_WRITE_TOKEN?.trim() ?? "";

export const isWriteClientConfigured = projectId.length > 0 && token.length > 0;

export const writeClient: SanityClient | null = isWriteClientConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token,
      useCdn: false,
      perspective: "raw",
    })
  : null;
