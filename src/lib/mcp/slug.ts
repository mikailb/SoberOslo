import "server-only";

export const SLUG_MAX_LENGTH = 80;

/**
 * Turns a Norwegian title into an address: "Tur på Grünerløkka" becomes
 * "tur-pa-grunerlokka". æ, ø and å are spelled out first, since stripping
 * accents alone would turn ø into nothing.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return trimSlug(slug) || "aktivitet";
}

function trimSlug(slug: string, maxLength = SLUG_MAX_LENGTH): string {
  return slug.slice(0, maxLength).replace(/-+$/, "");
}

/**
 * Candidates in the order they are tried: the plain title, then with the date
 * added, then numbered. Every candidate stays within the 80-character limit.
 */
export function slugCandidates(base: string, date: string): string[] {
  const withSuffix = (suffix: string) =>
    `${trimSlug(base, SLUG_MAX_LENGTH - suffix.length - 1)}-${suffix}`;

  return [
    base,
    withSuffix(date),
    ...Array.from({ length: 20 }, (_, index) => withSuffix(String(index + 2))),
  ];
}
