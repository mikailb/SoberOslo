import "server-only";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { todayIso } from "@/sanity/fetch";

import { UserError } from "./activities";
import { auditLog, type Actor } from "./audit";
import { OAUTH_SCOPE } from "./config";
import { rateLimit } from "./rateLimit";
import {
  detectImageFormat,
  DownloadError,
  downloadPublicFile,
  type ImageFormat,
} from "./safeDownload";

const WRITES_PER_HOUR = 60;

export const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const OAUTH_META = {
  securitySchemes: [{ type: "oauth2", scopes: [OAUTH_SCOPE] }],
};

export function todayInWords(): string {
  const weekday = new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
  }).format(new Date());
  return `${weekday} ${todayIso()}`;
}

function ok(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function explain(error: unknown): string {
  if (error instanceof UserError || error instanceof DownloadError) return error.message;

  const message = error instanceof Error ? error.message : String(error);
  console.error("[mcp] Uventet feil:", error);
  if (/permission|unauthorized|forbidden/i.test(message)) {
    return "Sanity avviste forespørselen. Sjekk at SANITY_WRITE_TOKEN er gyldig, har rollen Editor og hører til riktig prosjekt.";
  }
  if (/revision|conflict/i.test(message)) {
    return "Noen endret det samme i Studio akkurat nå. Hent innholdet på nytt og prøv igjen.";
  }
  if (/reference/i.test(message)) {
    return "Dokumentet brukes et annet sted i Sanity og kan ikke slettes. Skjul det heller.";
  }
  return "Noe gikk galt i kontakten med Sanity. Prøv igjen om litt. Ingenting er sikkert endret, så sjekk ved å hente innholdet på nytt.";
}

export type WriteOutcome = {
  result: Record<string, unknown>;
  documentId?: string;
  fields?: string[];
};

export function createToolHelpers(actor: Actor) {
  const guarded = async (
    tool: string,
    run: () => Promise<WriteOutcome>,
  ): Promise<CallToolResult> => {
    const limit = rateLimit(`mcp-write:${actor.key}`, WRITES_PER_HOUR, 60 * 60 * 1000);
    if (!limit.ok) {
      return fail(
        `For mange endringer på kort tid. Vent ${Math.ceil(limit.retryAfter / 60)} minutter og prøv igjen.`,
      );
    }

    try {
      const { result, documentId, fields } = await run();
      auditLog({ tool, actor, documentId, fields, outcome: "ok" });
      return ok({ today: todayIso(), ...result });
    } catch (error) {
      const message = explain(error);
      auditLog({ tool, actor, outcome: "error", message });
      return fail(message);
    }
  };

  const read = async (run: () => Promise<Record<string, unknown>>) => {
    try {
      return ok(await run());
    } catch (error) {
      return fail(explain(error));
    }
  };

  return { guarded, read };
}

export type ToolHelpers = ReturnType<typeof createToolHelpers>;

export const chatFileSchema = z
  .object({
    download_url: z.string().describe("Nedlastingsadresse fra ChatGPT."),
    file_id: z.string().describe("Fil-id fra ChatGPT."),
    mime_type: z.string().optional(),
    file_name: z.string().optional(),
  })
  .describe("Et bilde brukeren har lastet opp i chatten.");

export const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .describe("Offentlig https-adresse til bildet.");

export type DownloadedImage = ImageFormat & { body: Buffer };

export async function fetchImage(
  imageFile: { download_url: string } | undefined,
  imageUrl: string | undefined,
): Promise<DownloadedImage> {
  const source = imageFile?.download_url ?? imageUrl;
  if (!source) {
    throw new UserError(
      "Oppgi enten et opplastet bilde (imageFile) eller en bildeadresse (imageUrl).",
    );
  }

  const download = await downloadPublicFile(source);
  return { body: download.body, ...detectImageFormat(download.body, download.contentType) };
}
