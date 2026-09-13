import { safeExternalUrl } from "./urls";

/**
 * Turns a YouTube or Vimeo link into an embed URL.
 *
 * Only these two providers are accepted. Anything else returns null and the
 * video is skipped, so an editor cannot frame an arbitrary third-party page
 * inside the site.
 */

export type VideoEmbedInfo = {
  src: string;
  provider: "YouTube" | "Vimeo";
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

export function getVideoEmbed(
  value: string | null | undefined,
): VideoEmbedInfo | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;

  const url = new URL(safe);
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    const id = readYouTubeId(url);
    if (!id) return null;
    // The privacy-friendly host avoids setting cookies until playback starts.
    return {
      src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      provider: "YouTube",
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = readVimeoId(url);
    if (!id) return null;
    return { src: `https://player.vimeo.com/video/${id}`, provider: "Vimeo" };
  }

  return null;
}

function readYouTubeId(url: URL): string | null {
  if (url.hostname.toLowerCase().endsWith("youtu.be")) {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && ID_PATTERN.test(fromQuery)) return fromQuery;

  const segments = url.pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    ["embed", "shorts", "live", "v"].includes(segments[0])
  ) {
    return ID_PATTERN.test(segments[1]) ? segments[1] : null;
  }

  return null;
}

function readVimeoId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments.includes("video")
    ? segments[segments.indexOf("video") + 1]
    : segments[0];
  return id && /^\d{6,12}$/.test(id) ? id : null;
}

export type UploadedVideo = {
  src: string;
  type?: string;
  caption?: string;
};

/**
 * Accepts a video file only when it is served from Sanity's own asset CDN.
 *
 * Editors upload through the Studio, so that is the only place these files can
 * come from. Checking it here means a stray address in the data can never turn
 * into a video element pointing at some other server.
 */
export function getUploadedVideos(
  files:
    | readonly {
        url?: string | null;
        mimeType?: string | null;
        caption?: string | null;
      }[]
    | null
    | undefined,
): UploadedVideo[] {
  if (!files?.length) return [];

  const videos: UploadedVideo[] = [];

  for (const file of files) {
    const safe = safeExternalUrl(file?.url);
    if (!safe) continue;

    const { hostname } = new URL(safe);
    if (hostname.toLowerCase() !== "cdn.sanity.io") continue;

    const type = file?.mimeType?.trim();
    videos.push({
      src: safe,
      type: type?.startsWith("video/") ? type : undefined,
      caption: file?.caption?.trim() || undefined,
    });
  }

  return videos;
}

/** Filters a list of CMS video links down to the ones that can be embedded. */
export function getVideoEmbeds(
  values: readonly (string | null | undefined)[] | null | undefined,
): VideoEmbedInfo[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const embeds: VideoEmbedInfo[] = [];

  for (const value of values) {
    const embed = getVideoEmbed(value);
    if (embed && !seen.has(embed.src)) {
      seen.add(embed.src);
      embeds.push(embed);
    }
  }

  return embeds;
}
