import "server-only";

import { z } from "zod";

import { categoryLabels } from "@/lib/site";

export const CATEGORIES = [
  "social",
  "outdoors",
  "culture",
  "sport",
  "workshop",
  "sober-kvinner",
] as const;

const categoryList = CATEGORIES.map(
  (value) => `${value} (${categoryLabels[value]})`,
).join(", ");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const titleSchema = z
  .string({ error: "Tittel mangler." })
  .trim()
  .min(1, "Tittel mangler.")
  .max(90, "Tittelen kan være maks 90 tegn.")
  .describe("Navnet på aktiviteten, maks 90 tegn.");

export const shortDescriptionSchema = z
  .string({ error: "Kort beskrivelse mangler." })
  .trim()
  .min(1, "Kort beskrivelse mangler.")
  .max(200, "Den korte beskrivelsen kan være maks 200 tegn.")
  .describe("Én til to setninger som vises på kortet i oversikten. Maks 200 tegn.");

export const dateSchema = z
  .string({ error: "Dato mangler." })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dato må skrives som ÅÅÅÅ-MM-DD, for eksempel 2026-10-23.")
  .refine(isRealDate, "Datoen finnes ikke i kalenderen.")
  .describe("Dato som ÅÅÅÅ-MM-DD. Regn ut fra dagens dato i Europe/Oslo.");

export const timeSchema = z
  .string()
  .trim()
  .regex(TIME_PATTERN, "Klokkeslett må skrives som TT:MM i 24-timersformat, for eksempel 18:00.");

export const locationSchema = z
  .string({ error: "Sted mangler." })
  .trim()
  .min(1, "Sted mangler.")
  .max(120, "Stedet kan være maks 120 tegn.")
  .describe("For eksempel «Deichman Bjørvika, fjerde etasje». Maks 120 tegn.");

export const priceSchema = z
  .string()
  .trim()
  .max(40, "Prisen kan være maks 40 tegn.")
  .describe("For eksempel «Gratis» eller «250 kr». Maks 40 tegn.");

export const categorySchema = z
  .enum(CATEGORIES, { error: `Kategori må være én av: ${categoryList}.` })
  .describe(`Én av: ${categoryList}.`);

export const richTextSchema = z
  .string()
  .max(10_000, "Teksten kan være maks 10 000 tegn.")
  .describe(
    "Vanlig tekst. Tom linje mellom avsnitt. Linjer som starter med «- » blir punktliste, «1. » nummerert liste, «### » mellomtittel. **fet**, *kursiv* og [lenketekst](https://...) støttes.",
  );

export const registrationUrlSchema = z
  .string()
  .trim()
  .max(2000, "Lenken er for lang.")
  .refine(isHttpsUrl, "Påmeldingslenken må være en full adresse som starter med https://")
  .describe("Lenke til påmelding. Må starte med https://");

export const activityRefSchema = z
  .string({ error: "Oppgi id eller slug for aktiviteten." })
  .trim()
  .min(1, "Oppgi id eller slug for aktiviteten.")
  .max(200)
  .describe("Dokument-id (fra list_activities) eller slug (siste del av nettadressen).");

export const altSchema = z
  .string({ error: "Bildebeskrivelse (alt) mangler." })
  .trim()
  .min(1, "Bildebeskrivelse (alt) mangler. Beskriv kort hva bildet viser.")
  .max(250, "Bildebeskrivelsen kan være maks 250 tegn.")
  .describe("Kort beskrivelse av hva bildet viser, for skjermlesere.");

export const CLEARABLE_FIELDS = [
  "startTime",
  "endTime",
  "price",
  "description",
  "practicalInfo",
  "registrationUrl",
  "coverImage",
  "gallery",
] as const;

export type ClearableField = (typeof CLEARABLE_FIELDS)[number];

export function checkTimes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string | null {
  if (!endTime) return null;
  if (!startTime) return "Sluttid er satt uten starttid. Legg inn starttid også.";
  if (endTime <= startTime) {
    return "Sluttid må være etter starttid. Varer aktiviteten over midnatt, la sluttid stå tom og skriv det i praktisk informasjon.";
  }
  return null;
}
