/**
 * Norwegian date and time formatting.
 *
 * Dates arrive from Sanity as plain `YYYY-MM-DD` strings. They are parsed into
 * a local date rather than through `new Date(string)`, which would read them as
 * UTC midnight and show the wrong day in some time zones.
 */

const LOCALE = "nb-NO";

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "torsdag 18. september 2026" */
export function formatFullDate(iso: string | null | undefined): string {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "tor. 18. sep." — for cards and lists. */
export function formatShortDate(iso: string | null | undefined): string {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/** The two halves of the small date badge on activity cards. */
export function formatDateBadge(
  iso: string | null | undefined,
): { day: string; month: string } | null {
  const date = parseIsoDate(iso);
  if (!date) return null;
  return {
    day: new Intl.DateTimeFormat(LOCALE, { day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat(LOCALE, { month: "short" })
      .format(date)
      .replace(".", ""),
  };
}

/** "18:00–21:00", or "18:00" when there is no end time. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start) return "";
  return end ? `${start}–${end}` : start;
}

/** Value for the `datetime` attribute on a `<time>` element. */
export function machineDateTime(
  iso: string | null | undefined,
  start?: string | null,
): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  return start ? `${day}T${start}` : day;
}

/** Groups upcoming activities by month for the overview page. */
export function monthLabel(iso: string | null | undefined): string {
  const date = parseIsoDate(iso);
  if (!date) return "";
  const label = new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
