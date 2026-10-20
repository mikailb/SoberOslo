import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SanityClient } from "next-sanity";
import { z } from "zod";

import { siteConfig } from "@/lib/site";

import {
  attachImage,
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  setVisibility,
  updateActivity,
  UserError,
} from "./activities";
import type { Actor } from "./audit";
import { registerMerchTools } from "./merchTools";
import {
  chatFileSchema,
  createToolHelpers,
  fetchImage,
  imageUrlSchema,
  OAUTH_META,
  READ_ANNOTATIONS,
  todayInWords,
} from "./toolHelpers";
import {
  activityRefSchema,
  altSchema,
  categorySchema,
  checkTimes,
  CLEARABLE_FIELDS,
  dateSchema,
  locationSchema,
  priceSchema,
  registrationUrlSchema,
  richTextSchema,
  shortDescriptionSchema,
  timeSchema,
  titleSchema,
} from "./validation";

export function createMcpServer(client: SanityClient, actor: Actor): McpServer {
  const today = todayInWords();

  const server = new McpServer(
    { name: "sober-oslo", title: "Sober Oslo – nettsiden", version: "1.1.0" },
    {
      instructions: [
        `Du hjelper styret i Sober Oslo med å administrere aktivitetene og merch-siden på nettsiden ${siteConfig.url}.`,
        `I dag er det ${today} (tidssone Europe/Oslo). Bruk denne datoen for å tolke «fredag», «i morgen», «neste uke» og lignende. Mener brukeren en ukedag uten mer, velg den nærmeste kommende.`,
        "Svar på norsk.",
        "Før du oppretter, endrer, skjuler, sletter eller laster opp bilder: oppsummer nøyaktig hva som blir gjort (alle felt med verdier) og be om eksplisitt bekreftelse. Ikke kall skriveverktøyet før brukeren har sagt ja.",
        "Mangler påkrevde felt (for aktiviteter: dato, sted, kort beskrivelse), spør brukeren i stedet for å gjette. Tittel kan du foreslå, men la brukeren godkjenne den.",
        "Foretrekk å skjule (set_activity_visibility) fremfor å slette aktiviteter, og å merke merch som utsolgt fremfor å fjerne produkter. Slett bare når brukeren ber om permanent sletting.",
        "Etter en endring: oppgi lenken til siden på nettsiden.",
      ].join("\n"),
    },
  );

  const helpers = createToolHelpers(actor);
  const { guarded, read } = helpers;

  server.registerTool(
    "list_activities",
    {
      title: "Vis aktiviteter",
      description: [
        "Viser aktivitetene på nettsiden til Sober Oslo, både synlige og skjulte.",
        `I dag er det ${today} (Europe/Oslo). Standard er kommende aktiviteter, eldste dato først. Med includePast vises også tidligere, nyeste først.`,
        "Hver aktivitet har id, tittel, dato, tid, sted, kategori, om den er synlig på nettsiden og lenken dit. Bruk id-en i de andre verktøyene.",
      ].join("\n"),
      inputSchema: {
        includePast: z
          .boolean()
          .default(false)
          .describe("Ta med aktiviteter som allerede har vært."),
        category: categorySchema.optional(),
        limit: z
          .number()
          .int()
          .min(1, "Minst 1.")
          .max(200, "Maks 200 om gangen.")
          .default(50)
          .describe("Hvor mange som vises, 1–200."),
      },
      annotations: READ_ANNOTATIONS,
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Henter aktiviteter …",
        "openai/toolInvocation/invoked": "Hentet aktiviteter",
      },
    },
    async ({ includePast, category, limit }) =>
      read(() => listActivities(client, { includePast, category, limit })),
  );

  server.registerTool(
    "get_activity",
    {
      title: "Vis én aktivitet",
      description:
        "Henter alle detaljer om én aktivitet: tekstene, bilder, påmeldingslenke og status. Bruk før du endrer noe, så du vet hva som står der nå.",
      inputSchema: { activity: activityRefSchema },
      annotations: READ_ANNOTATIONS,
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Henter aktivitet …",
        "openai/toolInvocation/invoked": "Hentet aktivitet",
      },
    },
    async ({ activity }) => read(() => getActivity(client, activity)),
  );

  server.registerTool(
    "create_activity",
    {
      title: "Opprett aktivitet",
      description: [
        "Oppretter en ny aktivitet på nettsiden. Den blir synlig med en gang hvis isPublished er true (standard).",
        `I dag er det ${today} (Europe/Oslo). Regn ut datoen fra dette når brukeren skriver «fredag», «neste lørdag» o.l.`,
        "Påkrevd: tittel, dato, sted og kort beskrivelse. Mangler dato, sted eller kort beskrivelse: SPØR brukeren, ikke gjett. Klokkeslett skrives som 18:00.",
        "Nettadressen (slug) lages automatisk fra tittelen.",
        "FØR du kaller verktøyet: vis en oppsummering av alle feltene og be brukeren bekrefte. Kall det først når brukeren har sagt ja.",
      ].join("\n"),
      inputSchema: {
        title: titleSchema,
        date: dateSchema,
        location: locationSchema,
        shortDescription: shortDescriptionSchema,
        startTime: timeSchema.optional().describe("Starttid, TT:MM, for eksempel 18:00."),
        endTime: timeSchema.optional().describe("Sluttid, TT:MM. Valgfritt."),
        price: priceSchema.optional(),
        category: categorySchema.default("social"),
        description: richTextSchema.optional().describe(
          "Full beskrivelse. " + richTextSchema.description,
        ),
        practicalInfo: richTextSchema.optional().describe(
          "Praktisk info: hva man tar med, hvor man møtes, hvem som er vert. " +
            richTextSchema.description,
        ),
        registrationUrl: registrationUrlSchema.optional(),
        isPublished: z
          .boolean()
          .default(true)
          .describe("true = synlig på nettsiden med en gang. false = lagres skjult."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Oppretter aktivitet …",
        "openai/toolInvocation/invoked": "Aktivitet opprettet",
      },
    },
    async (input) =>
      guarded("create_activity", async () => {
        const timeProblem = checkTimes(input.startTime, input.endTime);
        if (timeProblem) throw new UserError(timeProblem);

        const result = await createActivity(client, input);
        return { result: { created: true, ...result }, documentId: result.id, fields: Object.keys(input) };
      }),
  );

  server.registerTool(
    "update_activity",
    {
      title: "Endre aktivitet",
      description: [
        "Endrer enkeltfelt på en eksisterende aktivitet. Bare feltene du sender med blir endret; resten står urørt.",
        `I dag er det ${today} (Europe/Oslo). Bruk dette til å tolke datoer.`,
        "Tekstfelt (description, practicalInfo) erstattes i sin helhet: hent dem først med get_activity hvis bare deler skal endres.",
        "For å fjerne et valgfritt felt helt, bruk clearFields. Endret tittel beholder den gamle nettadressen.",
        "FØR du kaller verktøyet: vis hva som endres fra og til, og be brukeren bekrefte.",
      ].join("\n"),
      inputSchema: {
        activity: activityRefSchema,
        title: titleSchema.optional(),
        date: dateSchema.optional(),
        location: locationSchema.optional(),
        shortDescription: shortDescriptionSchema.optional(),
        startTime: timeSchema.optional().describe("Ny starttid, TT:MM."),
        endTime: timeSchema.optional().describe("Ny sluttid, TT:MM."),
        price: priceSchema.optional(),
        category: categorySchema.optional(),
        description: richTextSchema.optional().describe(
          "Ny full beskrivelse (erstatter den gamle). " + richTextSchema.description,
        ),
        practicalInfo: richTextSchema.optional().describe(
          "Ny praktisk informasjon (erstatter den gamle). " + richTextSchema.description,
        ),
        registrationUrl: registrationUrlSchema.optional(),
        clearFields: z
          .array(z.enum(CLEARABLE_FIELDS))
          .max(CLEARABLE_FIELDS.length)
          .optional()
          .describe(`Felt som skal tømmes: ${CLEARABLE_FIELDS.join(", ")}.`),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Lagrer endringer …",
        "openai/toolInvocation/invoked": "Endringer lagret",
      },
    },
    async ({ activity, ...changes }) =>
      guarded("update_activity", async () => {
        const result = await updateActivity(client, activity, changes);
        return {
          result: { updated: true, ...result },
          documentId: result.id,
          fields: [...result.changedFields, ...result.clearedFields],
        };
      }),
  );

  server.registerTool(
    "set_activity_visibility",
    {
      title: "Vis eller skjul aktivitet",
      description: [
        "Skjuler en aktivitet fra nettsiden (isPublished: false) eller gjør den synlig igjen (true). Ingenting slettes.",
        "Dette er den vanlige måten å «slette» på: bruk dette når noen ber om å fjerne eller avlyse en aktivitet, med mindre de uttrykkelig vil slette den for godt.",
        "FØR du kaller verktøyet: si hvilken aktivitet (tittel og dato) som blir skjult/vist, og be om bekreftelse.",
      ].join("\n"),
      inputSchema: {
        activity: activityRefSchema,
        isPublished: z
          .boolean({ error: "Oppgi isPublished: true (vis) eller false (skjul)." })
          .describe("true = synlig på nettsiden, false = skjult."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Oppdaterer synlighet …",
        "openai/toolInvocation/invoked": "Synlighet oppdatert",
      },
    },
    async ({ activity, isPublished }) =>
      guarded("set_activity_visibility", async () => {
        const result = await setVisibility(client, activity, isPublished);
        return { result, documentId: result.id, fields: ["isPublished"] };
      }),
  );

  server.registerTool(
    "delete_activity",
    {
      title: "Slett aktivitet permanent",
      description: [
        "Sletter en aktivitet for godt, inkludert utkast i Studio. Kan ikke angres.",
        "Bruk bare når brukeren uttrykkelig vil slette permanent. Ellers: bruk set_activity_visibility for å skjule.",
        "Krever confirm: true og at aktivitetens tittel gjentas nøyaktig i confirmTitle. Be brukeren bekrefte med tittelen før du kaller verktøyet.",
      ].join("\n"),
      inputSchema: {
        activity: activityRefSchema,
        confirm: z
          .literal(true, { error: "Sletting krever confirm: true." })
          .describe("Må være true."),
        confirmTitle: z
          .string({ error: "Gjenta aktivitetens tittel i confirmTitle." })
          .trim()
          .min(1, "Gjenta aktivitetens tittel i confirmTitle.")
          .max(200)
          .describe("Aktivitetens tittel, gjentatt nøyaktig."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Sletter aktivitet …",
        "openai/toolInvocation/invoked": "Aktivitet slettet",
      },
    },
    async ({ activity, confirmTitle }) =>
      guarded("delete_activity", async () => {
        const result = await deleteActivity(client, activity, confirmTitle);
        return { result, documentId: result.id };
      }),
  );

  server.registerTool(
    "upload_activity_image",
    {
      title: "Last opp bilde til aktivitet",
      description: [
        "Legger et bilde på en aktivitet: som hovedbilde (target: cover, erstatter det gamle) eller i bildegalleriet (target: gallery).",
        "Bildet kan være en fil brukeren har lastet opp i chatten (imageFile) eller en offentlig https-adresse (imageUrl). Oppgi én av dem.",
        "Bare JPG, PNG og WebP, maks 10 MB. SVG avvises.",
        "alt er påkrevd: en kort beskrivelse av hva bildet viser, for skjermlesere. Foreslå en og la brukeren godkjenne.",
        "FØR du kaller verktøyet: si hvilken aktivitet, om det blir hovedbilde eller galleri, og alt-teksten, og be om bekreftelse.",
      ].join("\n"),
      inputSchema: {
        activity: activityRefSchema,
        imageFile: chatFileSchema.optional(),
        imageUrl: imageUrlSchema.optional(),
        target: z
          .enum(["cover", "gallery"], { error: "target må være cover eller gallery." })
          .default("cover")
          .describe("cover = hovedbilde, gallery = legg til i bildegalleriet."),
        alt: altSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      _meta: {
        ...OAUTH_META,
        "openai/fileParams": ["imageFile"],
        "openai/toolInvocation/invoking": "Laster opp bilde …",
        "openai/toolInvocation/invoked": "Bilde lastet opp",
      },
    },
    async ({ activity, imageFile, imageUrl, target, alt }) =>
      guarded("upload_activity_image", async () => {
        const image = await fetchImage(imageFile, imageUrl);
        const result = await attachImage(client, activity, image, target, alt);
        return {
          result: { uploaded: true, ...result },
          documentId: result.id,
          fields: [target === "cover" ? "coverImage" : "gallery"],
        };
      }),
  );

  registerMerchTools(server, client, helpers);

  return server;
}
