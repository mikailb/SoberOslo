import Image from "next/image";

import type { CmsImage } from "@/sanity/types";
import { urlForImage } from "@/sanity/image";
import { Artwork } from "./Artwork";

type MediaProps = {
  image?: CmsImage | null;
  /** Falls back to placeholder artwork keyed on this string. */
  seed: string;
  /** Describes the picture for screen readers. Empty string = decorative. */
  alt?: string;
  sizes: string;
  priority?: boolean;
  width?: number;
  className?: string;
};

/**
 * Renders a CMS image, or the placeholder artwork when there is none.
 *
 * Always fills its parent, so the parent decides the aspect ratio. The parent
 * needs `position: relative` and `overflow: hidden`.
 */
export function Media({
  image,
  seed,
  alt,
  sizes,
  priority = false,
  width = 1600,
  className = "",
}: MediaProps) {
  const src = urlForImage(image, width);

  if (!src) {
    return (
      <Artwork seed={seed} className={`h-full w-full object-cover ${className}`} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? image?.alt ?? ""}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={`object-cover ${className}`}
    />
  );
}
