import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SanityClient } from "next-sanity";
import { z } from "zod";

import {
  addIdeas,
  getSurprisePage,
  removeIdea,
  SURPRISE_TEXT_FIELDS,
  updateIdea,
  updateSurpriseTexts,
} from "./surprise";
import { OAUTH_META, READ_ANNOTATIONS, type ToolHelpers } from "./toolHelpers";

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} kan ikke være tom. Bruk clearFields for å fjerne teksten.`)
    .max(max, `${label} kan være maks ${max} tegn.`);

const ideaTitle = z
  .string({ error: "Ideen mangler." })
  .trim()
  .min(1, "Ideen kan ikke være tom.")
  .max(40, "Ideen kan være maks 40 tegn. Gjør den kortere.")
  .describe("Selve ideen, kort og konkret. For eksempel «Bowling + pizza». Maks 40 tegn.");

const ideaNote = z
  .string()
  .trim()
  .min(1, "Den morsomme teksten kan ikke være tom. Bruk clearNote for å fjerne den.")
  .max(120, "Den morsomme teksten kan være maks 120 tegn.")
  .describe("Én kort, lun setning som vises under ideen. Maks 120 tegn.");

const ideaRefSchema = z
  .string({ error: "Oppgi ideens key eller navn." })
  .trim()
  .min(1, "Oppgi ideens key eller navn.")
  .max(200)
  .describe("Ideens key (fra get_surprise_ideas) eller navnet.");

const CONFIRM_FIRST =
  "FØR du kaller verktøyet: oppsummer nøyaktig hva som endres og be brukeren bekrefte.";

/** How the assistant should come up with new ideas when asked to. */
const IDEA_GUIDE = [
  "Når brukeren ber deg finne på nye ideer:",
  "1. Hent listen med get_surprise_ideas først, så du ikke foreslår noe som finnes.",
  "2. Foreslå ideer i samme stil: en konkret aktivitet, gjerne «aktivitet + noe å spise eller drikke». Maks 40 tegn.",
  "3. Alt skal være alkoholfritt, rimelig, mulig å gjøre i Oslo, og passe for en vennegjeng eller nye bekjentskaper. Ikke nevn alkohol, fyll eller pengespill.",
  "4. Gi hver idé en kort, lun tekst (maks 120 tegn) i samme tone som de som finnes: varm, litt tørr humor, aldri sarkastisk mot noen.",
  "5. Vis forslagene som en liste og la brukeren velge, endre eller forkaste før du lagrer.",
].join("\n");

export function registerSurpriseTools(
  server: McpServer,
  client: SanityClient,
  { guarded, read }: ToolHelpers,
) {
  server.registerTool(
    "get_surprise_ideas",
    {
      title: "Vis ideene på skrapekortet",
      description:
        "Henter «Overrask meg»-siden (skrapekortet): overskrift, undertekst og alle ideene med key, idé og morsom tekst. Nettsiden trekker én tilfeldig idé hver gang noen skraper. Bruk før du foreslår eller endrer ideer.",
      inputSchema: {},
      annotations: READ_ANNOTATIONS,
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Henter ideene …",
        "openai/toolInvocation/invoked": "Hentet ideene",
      },
    },
    async () => read(() => getSurprisePage(client)),
  );

  server.registerTool(
    "add_surprise_ideas",
    {
      title: "Legg til ideer på skrapekortet",
      description: [
        "Legger til én eller flere nye ideer på skrapekortet på «Overrask meg»-siden. De kan trekkes med en gang.",
        "Ideer som allerede finnes (samme navn) hoppes over og rapporteres tilbake.",
        IDEA_GUIDE,
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        ideas: z
          .array(z.object({ title: ideaTitle, note: ideaNote.optional() }), {
            error: "Oppgi minst én idé.",
          })
          .min(1, "Oppgi minst én idé.")
          .max(15, "Maks 15 ideer om gangen.")
          .describe("Ideene som skal legges til. Maks 15 om gangen."),
        position: z
          .enum(["first", "last"], { error: "position må være first eller last." })
          .default("last")
          .describe("first = først i listen, last = sist. Rekkefølgen påvirker ikke trekningen."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Legger til ideer …",
        "openai/toolInvocation/invoked": "Ideer lagt til",
      },
    },
    async ({ ideas, position }) =>
      guarded("add_surprise_ideas", async () => {
        const result = await addIdeas(client, ideas, position);
        return { result, documentId: "surprisePage", fields: ["ideas"] };
      }),
  );

  server.registerTool(
    "update_surprise_idea",
    {
      title: "Endre en idé",
      description: [
        "Endrer én idé på skrapekortet: selve ideen og/eller den morsomme teksten under.",
        "Bare feltene du sender med endres. clearNote: true fjerner den morsomme teksten.",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        idea: ideaRefSchema,
        title: ideaTitle.optional(),
        note: ideaNote.optional(),
        clearNote: z.boolean().optional().describe("true = fjern den morsomme teksten."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Lagrer idé …",
        "openai/toolInvocation/invoked": "Idé lagret",
      },
    },
    async ({ idea, clearNote = false, ...changes }) =>
      guarded("update_surprise_idea", async () => {
        const result = await updateIdea(client, idea, changes, clearNote);
        return {
          result: { updated: true, ...result },
          documentId: "surprisePage",
          fields: result.changedFields.map((field) => `ideas.${field}`),
        };
      }),
  );

  server.registerTool(
    "remove_surprise_idea",
    {
      title: "Fjern en idé",
      description: [
        "Fjerner én idé fra skrapekortet for godt. Kan ikke angres.",
        "Krever confirm: true og at ideen gjentas nøyaktig i confirmTitle. Be brukeren bekrefte med navnet før du kaller verktøyet.",
      ].join("\n"),
      inputSchema: {
        idea: ideaRefSchema,
        confirm: z
          .literal(true, { error: "Fjerning krever confirm: true." })
          .describe("Må være true."),
        confirmTitle: z
          .string({ error: "Gjenta ideen i confirmTitle." })
          .trim()
          .min(1, "Gjenta ideen i confirmTitle.")
          .max(200)
          .describe("Ideen, gjentatt nøyaktig."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Fjerner idé …",
        "openai/toolInvocation/invoked": "Idé fjernet",
      },
    },
    async ({ idea, confirmTitle }) =>
      guarded("remove_surprise_idea", async () => {
        const result = await removeIdea(client, idea, confirmTitle);
        return { result, documentId: "surprisePage", fields: ["ideas"] };
      }),
  );

  server.registerTool(
    "update_surprise_page",
    {
      title: "Endre tekstene på «Overrask meg»",
      description: [
        "Endrer overskriften (heading) og/eller underteksten (intro) over skrapekortet. Bare feltene du sender med endres.",
        "clearFields fjerner tekster helt fra nettsiden.",
        "Ideene endres med egne verktøy (add_surprise_ideas, update_surprise_idea …).",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        heading: text("Overskriften", 70).optional().describe("Overskrift. Maks 70 tegn."),
        intro: text("Underteksten", 160).optional().describe("Undertekst under overskriften. Maks 160 tegn."),
        clearFields: z
          .array(z.enum(SURPRISE_TEXT_FIELDS))
          .max(SURPRISE_TEXT_FIELDS.length)
          .optional()
          .describe(`Tekster som skal fjernes fra siden: ${SURPRISE_TEXT_FIELDS.join(", ")}.`),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Lagrer «Overrask meg» …",
        "openai/toolInvocation/invoked": "«Overrask meg» lagret",
      },
    },
    async ({ clearFields = [], ...set }) =>
      guarded("update_surprise_page", async () => {
        const result = await updateSurpriseTexts(client, set, clearFields);
        return {
          result: { updated: true, ...result },
          documentId: "surprisePage",
          fields: [...result.changedFields, ...result.clearedFields],
        };
      }),
  );
}
