import { client } from "./client";
import { revalidateSeconds } from "./env";

/**
 * Read content from Sanity.
 *
 * Returns `null` instead of throwing when the CMS is unreachable or not yet
 * connected, so a temporary CMS outage shows the built-in starter content
 * rather than an error page.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T | null> {
  if (!client) return null;

  try {
    return await client.fetch<T>(query, params, {
      next: { revalidate: revalidateSeconds },
    });
  } catch (error) {
    console.error("[sanity] Kunne ikke hente innhold:", error);
    return null;
  }
}

/**
 * Today in Oslo as `YYYY-MM-DD`, used to split upcoming from past activities.
 *
 * Deliberately not `toISOString()`, which is UTC. Servers run on UTC, so between
 * midnight and 01:00 or 02:00 Norwegian time that returns yesterday's date and
 * an activity that is already over stays listed as upcoming.
 */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}
