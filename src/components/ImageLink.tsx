import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import type { CmsImage } from "@/sanity/types";

type ImageLinkProps = {
  image?: CmsImage | null;
  /** Seeds the placeholder artwork when no picture has been uploaded. */
  seed: string;
  /** Already validated with safeExternalUrl. Null renders a plain picture. */
  url: string | null;
  label: string;
  /** Shown under the picture when there is no address yet. */
  missingUrlNote: string;
};

/**
 * One large picture that acts as the link to another site.
 *
 * Used by the pages whose real content lives elsewhere. Without an address the
 * picture still shows, with a short note instead of a dead link.
 */
export function ImageLink({
  image,
  seed,
  url,
  label,
  missingUrlNote,
}: ImageLinkProps) {
  const frame =
    "relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-sage sm:aspect-[21/9]";

  if (!url) {
    return (
      <Reveal>
        <div className={frame}>
          <Media
            image={image}
            seed={seed}
            alt={image?.alt ?? ""}
            sizes="(min-width: 1408px) 1408px, 100vw"
            priority
            width={2000}
          />
        </div>
        <p className="mt-5 text-sm text-muted">{missingUrlNote}</p>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <figure className={frame}>
          <Media
            image={image}
            seed={seed}
            alt={image?.alt ?? ""}
            sizes="(min-width: 1408px) 1408px, 100vw"
            priority
            width={2000}
            className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
          />

          <figcaption className="absolute inset-x-0 bottom-0 flex justify-center p-5 sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-cream/95 px-6 py-3 font-medium text-ink shadow-[0_6px_20px_rgba(8,40,31,0.18)] backdrop-blur-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1">
              {label}
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
              >
                <path
                  d="M6 3h7v7M13 3 4 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </figcaption>
        </figure>
      </a>
    </Reveal>
  );
}
