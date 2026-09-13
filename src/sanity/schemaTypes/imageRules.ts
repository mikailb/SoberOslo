/**
 * Shared rules for images editors upload.
 *
 * The website renders these through next/image, whose optimiser refuses SVG
 * unless `dangerouslyAllowSVG` is switched on. Turning that on would let an
 * uploaded SVG run scripts in the browser, so instead the format is rejected
 * here, at upload time, where the editor gets a clear message rather than a
 * broken picture on the live site.
 *
 * The site's own favicon at src/app/icon.svg is unaffected: it is part of the
 * code, not something uploaded through the CMS.
 */

/** Wording reused under every image field. */
export const IMAGE_FORMAT_HINT =
  "Bruk JPG, PNG eller WebP. SVG kan ikke brukes.";

const SVG_MESSAGE =
  "SVG kan ikke brukes på nettsiden. Lagre bildet som JPG, PNG eller WebP og last opp på nytt.";

/**
 * Sanity stores an asset reference shaped like
 * `image-<hash>-<width>x<height>-<extension>`, so the format is readable
 * straight from the value without looking the asset up.
 */
export function rejectSvgUpload(value: unknown): true | string {
  const ref = (value as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
  if (!ref) return true;

  const extension = ref.split("-").pop()?.toLowerCase();
  return extension === "svg" ? SVG_MESSAGE : true;
}
