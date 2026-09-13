"use client";

import { useRef, useState } from "react";

import type { VideoEmbedInfo, UploadedVideo } from "@/lib/video";
import { GalleryLightbox, type GalleryImage } from "./GalleryLightbox";

type ActivityMediaProps = {
  images: GalleryImage[];
  embeds: VideoEmbedInfo[];
  uploads: UploadedVideo[];
  title: string;
};

type Tab = "images" | "videos";

/**
 * Pictures and videos from an activity, with a filter between them.
 *
 * The filter only appears when there is something in both groups. With just
 * pictures, or just videos, the section shows that on its own.
 */
export function ActivityMedia({
  images,
  embeds,
  uploads,
  title,
}: ActivityMediaProps) {
  const videoCount = embeds.length + uploads.length;
  const hasImages = images.length > 0;
  const hasVideos = videoCount > 0;

  const [tab, setTab] = useState<Tab>(hasImages ? "images" : "videos");
  const imagesTabRef = useRef<HTMLButtonElement>(null);
  const videosTabRef = useRef<HTMLButtonElement>(null);

  if (!hasImages && !hasVideos) return null;

  const showFilter = hasImages && hasVideos;
  const active: Tab = showFilter ? tab : hasImages ? "images" : "videos";

  // One panel is in the DOM at a time, so both tabs point at the same element
  // and the panel names itself after whichever tab is selected.
  const activeTabId =
    active === "images" ? "media-tab-images" : "media-tab-videos";

  /** Left and right move between the tabs, as the tab pattern expects. */
  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();

    const next: Tab = active === "images" ? "videos" : "images";
    setTab(next);
    (next === "images" ? imagesTabRef : videosTabRef).current?.focus();
  }

  return (
    <section>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="display-md text-ink">
            {showFilter ? "Bilder og video" : hasImages ? "Bilder" : "Video"}
          </h2>
          {active === "images" ? (
            <p className="mt-3 text-muted">
              Trykk på et bilde for å se det i full størrelse.
            </p>
          ) : null}
        </div>

        {showFilter ? (
          <div
            role="tablist"
            aria-label="Velg bilder eller video"
            onKeyDown={onTabKeyDown}
            className="flex gap-2"
          >
            <FilterPill
              ref={imagesTabRef}
              id="media-tab-images"
              isActive={active === "images"}
              onClick={() => setTab("images")}
            >
              Bilder ({images.length})
            </FilterPill>
            <FilterPill
              ref={videosTabRef}
              id="media-tab-videos"
              isActive={active === "videos"}
              onClick={() => setTab("videos")}
            >
              Video ({videoCount})
            </FilterPill>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        {active === "images" ? (
          <div
            id="media-panel"
            role={showFilter ? "tabpanel" : undefined}
            aria-labelledby={showFilter ? activeTabId : undefined}
            tabIndex={showFilter ? 0 : undefined}
          >
            <GalleryLightbox images={images} />
          </div>
        ) : (
          <div
            id="media-panel"
            role={showFilter ? "tabpanel" : undefined}
            aria-labelledby={showFilter ? activeTabId : undefined}
            tabIndex={showFilter ? 0 : undefined}
          >
            <ul className="grid gap-5 sm:grid-cols-2">
              {uploads.map((video, index) => (
                <li key={video.src}>
                  <div className="overflow-hidden rounded-[1.25rem] bg-green-ink">
                    {/* Uploaded straight from a phone or computer. Nothing
                        plays until the visitor presses play. */}
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      className="aspect-video w-full"
                    >
                      <source src={video.src} type={video.type} />
                      Nettleseren din kan ikke spille av denne videoen.
                    </video>
                  </div>
                  {video.caption ? (
                    <p className="mt-2 text-sm text-muted">{video.caption}</p>
                  ) : (
                    <span className="sr-only">
                      Video {index + 1} fra {title}
                    </span>
                  )}
                </li>
              ))}

              {embeds.map((embed, index) => (
                <li
                  key={embed.src}
                  className="relative aspect-video overflow-hidden rounded-[1.25rem] bg-green-ink"
                >
                  <iframe
                    src={embed.src}
                    title={
                      embeds.length > 1
                        ? `${title} – video ${index + 1} (${embed.provider})`
                        : `${title} (${embed.provider})`
                    }
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  ref,
  id,
  isActive,
  onClick,
  children,
}: {
  ref: React.Ref<HTMLButtonElement>;
  id: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls="media-panel"
      // Roving tabindex: Tab reaches the tab strip once, then the arrow keys
      // move between the tabs inside it.
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={`inline-flex rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
        isActive
          ? "border-green bg-green text-white"
          : "border-ink/15 text-muted hover:border-ink/35 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
