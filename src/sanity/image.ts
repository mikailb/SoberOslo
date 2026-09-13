import createImageUrlBuilder from "@sanity/image-url";
import type { Image } from "sanity";

import { dataset, isSanityConfigured, projectId } from "./env";

const builder = isSanityConfigured
  ? createImageUrlBuilder({ projectId, dataset })
  : null;

/**
 * Build a sized, auto-format URL for a Sanity image.
 * Returns null when the CMS is not connected or the field is empty, so callers
 * can fall back to the built-in placeholder artwork.
 */
export function urlForImage(
  source: Image | null | undefined,
  width = 1600,
): string | null {
  if (!builder || !source?.asset) return null;
  return builder.image(source).width(width).auto("format").fit("max").url();
}
