"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Artwork } from "@/components/ui/Artwork";

export type GalleryImage = {
  /** Null when there is no CMS image and placeholder artwork is used. */
  src: string | null;
  alt: string;
  seed: string;
};

type GalleryLightboxProps = {
  images: GalleryImage[];
};

/**
 * Image grid with an optional full-screen viewer.
 *
 * Only the viewer needs JavaScript; the grid itself is plain buttons, so the
 * pictures are visible and readable either way. Escape closes, arrow keys move
 * between images, and focus returns to the thumbnail that opened the viewer.
 */
/** How many thumbnails to show before the gallery folds. */
const COLLAPSED_COUNT = 8;

export function GalleryLightbox({ images }: GalleryLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpenIndex((current) => {
      if (current !== null) triggerRefs.current[current]?.focus();
      return null;
    });
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) =>
        current === null
          ? current
          : (current + direction + images.length) % images.length,
      );
    },
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
        return;
      }

      // Keep Tab inside the viewer while it is open.
      if (event.key !== "Tab") return;

      const controls =
        dialogRef.current?.querySelectorAll<HTMLElement>("button");
      if (!controls?.length) return;

      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, step]);

  if (!images.length) return null;

  const active = openIndex === null ? null : images[openIndex];

  // Long galleries start folded. The slice always begins at 0, so a thumbnail's
  // position here is also its position in the full list, which keeps the
  // viewer's next and previous buttons working across every picture.
  const isFoldable = images.length > COLLAPSED_COUNT;
  const visible =
    isFoldable && !isExpanded ? images.slice(0, COLLAPSED_COUNT) : images;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((image, index) => (
          <li key={`${image.seed}-${index}`}>
            <button
              type="button"
              ref={(element) => {
                triggerRefs.current[index] = element;
              }}
              onClick={() => setOpenIndex(index)}
              className="group relative block aspect-square w-full overflow-hidden rounded-[1rem] bg-sage"
            >
              <span className="sr-only">
                {image.alt
                  ? `Vis større: ${image.alt}`
                  : `Vis bilde ${index + 1} i full størrelse`}
              </span>
              <Thumb image={image} />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-green-ink/0 transition-colors duration-300 group-hover:bg-green-ink/15"
              />
            </button>
          </li>
        ))}
      </ul>

      {isFoldable ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/45 hover:bg-ink/[0.04]"
          >
            {isExpanded ? "Vis færre" : `Vis alle ${images.length} bilder`}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      {/* Rendered straight onto <body>. A modal must not sit inside a section
          that has a transform or filter on it, because that would make the
          section the containing block and keep the viewer from covering the
          screen. */}
      {active && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Bildevisning"
              onClick={(event) => {
                // A click on the backdrop itself closes the viewer.
                if (event.target === event.currentTarget) close();
              }}
              className="fixed inset-0 z-[60] flex h-[100dvh] flex-col gap-3 bg-green-ink/95 p-4 sm:p-6"
            >
              <div className="flex shrink-0 items-center justify-between text-white">
                <p className="text-sm text-white/70">
                  {(openIndex ?? 0) + 1} av {images.length}
                </p>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white/10"
                >
                  <span className="sr-only">Lukk bildevisning</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l10 10M13 3 3 13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative min-h-0 flex-1">
                {active.src ? (
                  <Image
                    src={active.src}
                    alt={active.alt}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                ) : (
                  <Artwork seed={active.seed} className="h-full w-full" />
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4">
                <p className="min-h-[1.25rem] flex-1 text-sm text-white/70">
                  {active.alt}
                </p>
                {images.length > 1 ? (
                  <div className="flex gap-2">
                    <ArrowButton
                      label="Forrige bilde"
                      onClick={() => step(-1)}
                    />
                    <ArrowButton
                      label="Neste bilde"
                      onClick={() => step(1)}
                      forward
                    />
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Thumb({ image }: { image: GalleryImage }) {
  if (!image.src) {
    return <Artwork seed={image.seed} className="h-full w-full object-cover" />;
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes="(min-width: 640px) 30vw, 45vw"
      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
    />
  );
}

function ArrowButton({
  label,
  onClick,
  forward = false,
}: {
  label: string;
  onClick: () => void;
  forward?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    >
      <span className="sr-only">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={forward ? "" : "rotate-180"}
      >
        <path
          d="M3 8h10M9 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
