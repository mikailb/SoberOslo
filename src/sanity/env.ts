/**
 * Sanity connection settings.
 *
 * Only public values live here — a project id and a dataset name. There is no
 * write token anywhere in this project, so nothing secret can leak to the
 * browser. Content is read from the public CDN.
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2024-10-01";

/**
 * The site is designed to run before the CMS is connected. When no project id
 * is set, every page falls back to the built-in Norwegian starter content so
 * the design can be reviewed straight away.
 */
export const isSanityConfigured = projectId.length > 0;

/** How long a cached CMS response may be reused, in seconds. */
export const revalidateSeconds = 60;
