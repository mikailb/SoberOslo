import "server-only";

/** Who made a change: the OAuth client ChatGPT registered, or a direct token. */
export type Actor = {
  /** Readable name, for example "ChatGPT" or "MCP_ACCESS_TOKEN". */
  name: string;
  /** Short, stable fingerprint of the client. Never a token. */
  key: string;
};

type AuditEntry = {
  tool: string;
  actor: Actor;
  documentId?: string;
  /** Field names only. Values and tokens are never logged. */
  fields?: string[];
  outcome: "ok" | "error";
  message?: string;
};

/**
 * One JSON line per write, readable in Vercel's runtime logs under the
 * `[mcp-audit]` prefix.
 */
export function auditLog(entry: AuditEntry): void {
  console.info(
    `[mcp-audit] ${JSON.stringify({ at: new Date().toISOString(), ...entry })}`,
  );
}
