import "server-only";

export type Actor = {
  name: string;
  key: string;
};

type AuditEntry = {
  tool: string;
  actor: Actor;
  documentId?: string;
  fields?: string[];
  outcome: "ok" | "error";
  message?: string;
};

export function auditLog(entry: AuditEntry): void {
  console.info(
    `[mcp-audit] ${JSON.stringify({ at: new Date().toISOString(), ...entry })}`,
  );
}
