import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SanityClient } from "next-sanity";
import { z } from "zod";

import {
  addProduct,
  getMerchPage,
  MERCH_TEXT_FIELDS,
  PRODUCT_CLEARABLE_FIELDS,
  removeProduct,
  setProductImage,
  updateMerchTexts,
  updateProduct,
} from "./merch";
import {
  chatFileSchema,
  fetchImage,
  imageUrlSchema,
  OAUTH_META,
  READ_ANNOTATIONS,
  type ToolHelpers,
} from "./toolHelpers";
import { altSchema, isHttpsUrl } from "./validation";

/**
 * Tools for the merch page. The rules mirror the `merchPage` type in
 * src/sanity/schemaTypes/pages.ts.
 */

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} kan ikke være tom. Bruk clearFields for å fjerne teksten.`)
    .max(max, `${label} kan være maks ${max} tegn.`);

const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(2000, "Lenken er for lang.")
    .refine(isHttpsUrl, `${label} må være en full adresse som starter med https://`);

const productRefSchema = z
  .string({ error: "Oppgi produktets key eller navn." })
  .trim()
  .min(1, "Oppgi produktets key eller navn.")
  .max(200)
  .describe("Produktets key (fra get_merch_page) eller navnet.");

const productFields = {
  description: text("Beskrivelsen", 160).optional().describe("Én setning under navnet. Maks 160 tegn."),
  price: text("Prisen", 30).optional().describe("For eksempel «349 kr». Maks 30 tegn."),
  url: httpsUrl("Produktlenken")
    .optional()
    .describe("Lenke til produktet i nettbutikken. Gjør hele boksen klikkbar. Må starte med https://"),
  soldOut: z
    .boolean()
    .optional()
    .describe("true = vises som «Utsolgt» og lenker ikke til butikken."),
};

const CONFIRM_FIRST =
  "FØR du kaller verktøyet: oppsummer nøyaktig hva som endres og be brukeren bekrefte.";

export function registerMerchTools(
  server: McpServer,
  client: SanityClient,
  { guarded, read }: ToolHelpers,
) {
  /* ------------------------------------------------- get_merch_page --- */

  server.registerTool(
    "get_merch_page",
    {
      title: "Vis merch-siden",
      description:
        "Henter alt på merch-siden: overskrift, ingress, lenken til nettbutikken, knappeteksten, teksten i «Støtt arbeidet»-boksen og alle produktene med key, navn, pris, lenke, utsolgt-status og bilde. Bruk før du endrer noe.",
      inputSchema: {},
      annotations: READ_ANNOTATIONS,
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Henter merch-siden …",
        "openai/toolInvocation/invoked": "Hentet merch-siden",
      },
    },
    async () => read(() => getMerchPage(client)),
  );

  /* ---------------------------------------------- update_merch_page --- */

  server.registerTool(
    "update_merch_page",
    {
      title: "Endre tekstene på merch-siden",
      description: [
        "Endrer tekstene på merch-siden. Bare feltene du sender med endres.",
        "heading = overskrift, intro = ingress, shopUrl = lenken til nettbutikken (knappen), linkLabel = teksten på knappen, productsHeading = overskriften over produktene, ctaHeading/ctaBody = den mørkegrønne «Støtt arbeidet»-boksen nederst.",
        "clearFields fjerner tekster helt fra nettsiden. Tom linkLabel gir standardteksten «Gå til nettbutikken». Uten shopUrl vises ingen knapp.",
        "Produkter endres med egne verktøy (add_merch_product, update_merch_product …).",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        heading: text("Overskriften", 70).optional().describe("Overskrift. Maks 70 tegn."),
        intro: text("Ingressen", 300).optional().describe("Ingress under overskriften. Maks 300 tegn."),
        shopUrl: httpsUrl("Lenken til nettbutikken").optional().describe("Lenke til nettbutikken. Må starte med https://"),
        linkLabel: text("Knappeteksten", 40).optional().describe("Tekst på knappen til butikken. Maks 40 tegn."),
        productsHeading: text("Overskriften over produktene", 70).optional().describe("Maks 70 tegn."),
        ctaHeading: text("Overskriften i «Støtt arbeidet»", 70).optional().describe("Maks 70 tegn."),
        ctaBody: text("Teksten i «Støtt arbeidet»", 300).optional().describe("Maks 300 tegn."),
        clearFields: z
          .array(z.enum(MERCH_TEXT_FIELDS))
          .max(MERCH_TEXT_FIELDS.length)
          .optional()
          .describe(`Tekster som skal fjernes fra siden: ${MERCH_TEXT_FIELDS.join(", ")}.`),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Lagrer merch-siden …",
        "openai/toolInvocation/invoked": "Merch-siden lagret",
      },
    },
    async ({ clearFields = [], ...set }) =>
      guarded("update_merch_page", async () => {
        const result = await updateMerchTexts(client, set, clearFields);
        return {
          result: { updated: true, ...result },
          documentId: "merchPage",
          fields: [...result.changedFields, ...result.clearedFields],
        };
      }),
  );

  /* ---------------------------------------------- add_merch_product --- */

  server.registerTool(
    "add_merch_product",
    {
      title: "Legg til produkt",
      description: [
        "Legger til et nytt produkt på merch-siden. Det vises med en gang.",
        "Påkrevd: navn. Pris, kort beskrivelse og lenke til produktet i nettbutikken er valgfritt, men spør om dem hvis brukeren ikke har nevnt dem.",
        "Bilde legges til etterpå med upload_merch_product_image.",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        name: z
          .string({ error: "Produktnavn mangler." })
          .trim()
          .min(1, "Produktnavn mangler.")
          .max(60, "Produktnavnet kan være maks 60 tegn.")
          .describe("Produktnavn. Maks 60 tegn."),
        ...productFields,
        position: z
          .enum(["first", "last"], { error: "position må være first eller last." })
          .default("last")
          .describe("first = først i listen, last = sist."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Legger til produkt …",
        "openai/toolInvocation/invoked": "Produkt lagt til",
      },
    },
    async ({ position, ...input }) =>
      guarded("add_merch_product", async () => {
        const result = await addProduct(client, input, position);
        return {
          result: { added: true, ...result },
          documentId: "merchPage",
          fields: Object.keys(input).map((field) => `products.${field}`),
        };
      }),
  );

  /* ------------------------------------------- update_merch_product --- */

  server.registerTool(
    "update_merch_product",
    {
      title: "Endre produkt",
      description: [
        "Endrer ett produkt på merch-siden: navn, beskrivelse, pris, lenke eller utsolgt-status, og kan flytte det først eller sist i listen.",
        "Bare feltene du sender med endres. clearFields fjerner beskrivelse, pris, lenke eller bilde.",
        "Bruk soldOut: true når noe er utsolgt, i stedet for å fjerne produktet.",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        product: productRefSchema,
        name: z
          .string()
          .trim()
          .min(1, "Produktnavnet kan ikke være tomt.")
          .max(60, "Produktnavnet kan være maks 60 tegn.")
          .optional()
          .describe("Nytt navn. Maks 60 tegn."),
        ...productFields,
        clearFields: z
          .array(z.enum(PRODUCT_CLEARABLE_FIELDS))
          .max(PRODUCT_CLEARABLE_FIELDS.length)
          .optional()
          .describe(`Felt som skal fjernes: ${PRODUCT_CLEARABLE_FIELDS.join(", ")}.`),
        moveTo: z
          .enum(["first", "last"], { error: "moveTo må være first eller last." })
          .optional()
          .describe("Flytt produktet først eller sist i listen."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Lagrer produkt …",
        "openai/toolInvocation/invoked": "Produkt lagret",
      },
    },
    async ({ product, clearFields = [], moveTo, ...changes }) =>
      guarded("update_merch_product", async () => {
        const result = await updateProduct(client, product, changes, clearFields, moveTo);
        return {
          result: { updated: true, ...result },
          documentId: "merchPage",
          fields: [...result.changedFields, ...result.clearedFields].map(
            (field) => `products.${field}`,
          ),
        };
      }),
  );

  /* ------------------------------------------- remove_merch_product --- */

  server.registerTool(
    "remove_merch_product",
    {
      title: "Fjern produkt",
      description: [
        "Fjerner et produkt fra merch-siden for godt. Kan ikke angres.",
        "Er produktet bare utsolgt, bruk heller update_merch_product med soldOut: true.",
        "Krever confirm: true og at produktnavnet gjentas nøyaktig i confirmName. Be brukeren bekrefte med navnet før du kaller verktøyet.",
      ].join("\n"),
      inputSchema: {
        product: productRefSchema,
        confirm: z
          .literal(true, { error: "Fjerning krever confirm: true." })
          .describe("Må være true."),
        confirmName: z
          .string({ error: "Gjenta produktnavnet i confirmName." })
          .trim()
          .min(1, "Gjenta produktnavnet i confirmName.")
          .max(200)
          .describe("Produktnavnet, gjentatt nøyaktig."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: {
        ...OAUTH_META,
        "openai/toolInvocation/invoking": "Fjerner produkt …",
        "openai/toolInvocation/invoked": "Produkt fjernet",
      },
    },
    async ({ product, confirmName }) =>
      guarded("remove_merch_product", async () => {
        const result = await removeProduct(client, product, confirmName);
        return { result, documentId: "merchPage", fields: ["products"] };
      }),
  );

  /* ------------------------------------- upload_merch_product_image --- */

  server.registerTool(
    "upload_merch_product_image",
    {
      title: "Last opp produktbilde",
      description: [
        "Setter bildet på ett produkt på merch-siden (erstatter det gamle). Bildet vises kvadratisk.",
        "Bildet kan være en fil brukeren har lastet opp i chatten (imageFile) eller en offentlig https-adresse (imageUrl). Oppgi én av dem.",
        "Bare JPG, PNG og WebP, maks 10 MB. SVG avvises.",
        "alt er påkrevd: kort beskrivelse av hva bildet viser. Foreslå en og la brukeren godkjenne.",
        CONFIRM_FIRST,
      ].join("\n"),
      inputSchema: {
        product: productRefSchema,
        imageFile: chatFileSchema.optional(),
        imageUrl: imageUrlSchema.optional(),
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
        "openai/toolInvocation/invoking": "Laster opp produktbilde …",
        "openai/toolInvocation/invoked": "Produktbilde lastet opp",
      },
    },
    async ({ product, imageFile, imageUrl, alt }) =>
      guarded("upload_merch_product_image", async () => {
        const image = await fetchImage(imageFile, imageUrl);
        const result = await setProductImage(client, product, image, alt);
        return { result: { uploaded: true, ...result }, documentId: "merchPage", fields: ["products.image"] };
      }),
  );
}
