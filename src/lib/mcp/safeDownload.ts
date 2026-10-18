import "server-only";

import dns from "node:dns";
import https from "node:https";
import net from "node:net";

/**
 * Downloads an image from an address ChatGPT supplies, without letting that
 * address reach anything private (SSRF).
 *
 * - https only, on the standard port, with no user name or password
 * - every resolved IP address is checked when the connection is made, inside
 *   the DNS lookup, so a name cannot resolve to a public address during the
 *   check and a private one during the request
 * - at most three redirects, each checked the same way
 * - a timeout, a 10 MB ceiling enforced while streaming, and a content check
 *   on the actual bytes, so an SVG cannot slip through with an image/png label
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export class DownloadError extends Error {}

// Two lists, because a single BlockList treats IPv4 addresses as IPv4-mapped
// IPv6, so a ::ffff:0:0/96 rule would block every IPv4 address there is.
const blockedV4 = new net.BlockList();
const blockedV6 = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedV4.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  blockedV6.addSubnet(address, prefix, "ipv6");
}

/** `::ffff:7f00:1` or `::ffff:127.0.0.1` -> `127.0.0.1`. */
function mappedIpv4(address: string): string | null {
  const match = address.toLowerCase().match(/^(?:0{0,4}:){0,5}:?ffff:(.+)$/);
  if (!match) return null;
  const rest = match[1];
  if (net.isIPv4(rest)) return rest;

  const groups = rest.split(":");
  if (groups.length !== 2 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }
  const [high, low] = groups.map((group) => parseInt(group, 16));
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

export function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blockedV4.check(address, "ipv4");
  if (family === 6) {
    const mapped = mappedIpv4(address);
    if (mapped) return blockedV4.check(mapped, "ipv4");
    return blockedV6.check(address, "ipv6");
  }
  return true;
}

/** DNS lookup that refuses to hand back a private address. */
const guardedLookup = ((
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family?: number,
  ) => void,
) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((entry) => isPrivateAddress(entry.address))) {
      return callback(
        new DownloadError("Adressen peker til et privat eller lokalt nettverk."),
        "",
      );
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}) as unknown as net.LookupFunction;

function checkUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DownloadError("Bildeadressen er ikke en gyldig URL.");
  }

  if (url.protocol !== "https:") {
    throw new DownloadError("Bildeadressen må starte med https://");
  }
  if (url.username || url.password) {
    throw new DownloadError("Bildeadressen kan ikke inneholde brukernavn eller passord.");
  }
  if (url.port && url.port !== "443") {
    throw new DownloadError("Bildeadressen må bruke standardporten for https.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new DownloadError("Adressen peker til et privat eller lokalt nettverk.");
  }

  return url;
}

type Downloaded = { body: Buffer; contentType: string };

function requestOnce(url: URL, deadline: number): Promise<
  Downloaded | { redirect: string }
> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        lookup: guardedLookup,
        headers: { "User-Agent": "SoberOslo-MCP/1.0", Accept: "image/*" },
        timeout: Math.max(1, deadline - Date.now()),
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          resolve({ redirect: new URL(response.headers.location, url).toString() });
          return;
        }
        if (status !== 200) {
          response.resume();
          reject(new DownloadError(`Bildet kunne ikke lastes ned (HTTP ${status}).`));
          return;
        }

        const declared = Number(response.headers["content-length"] ?? 0);
        if (declared > MAX_IMAGE_BYTES) {
          response.destroy();
          reject(new DownloadError("Bildet er større enn 10 MB."));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy();
            reject(new DownloadError("Bildet er større enn 10 MB."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] ?? "")
              .split(";")[0]
              .trim()
              .toLowerCase(),
          }),
        );
        response.on("error", reject);
      },
    );

    request.on("timeout", () => {
      request.destroy(new DownloadError("Nedlastingen av bildet tok for lang tid."));
    });
    request.on("error", (error) =>
      reject(
        error instanceof DownloadError
          ? error
          : new DownloadError(`Bildet kunne ikke lastes ned: ${error.message}`),
      ),
    );
  });
}

export async function downloadPublicFile(value: string): Promise<Downloaded> {
  const deadline = Date.now() + TIMEOUT_MS;
  let url = checkUrl(value);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const result = await requestOnce(url, deadline);
    if (!("redirect" in result)) return result;
    url = checkUrl(result.redirect);
  }

  throw new DownloadError("Bildeadressen videresender for mange ganger.");
}

/* ------------------------------------------------------------ Image check */

export type ImageFormat = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string };

/** Headers servers commonly send for a file whose type they do not know. */
const GENERIC_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"]);

/**
 * Accepts JPG, PNG and WebP only, the formats the site can show. The decision
 * is made from the file's first bytes; the declared content type must agree
 * or be generic.
 */
export function detectImageFormat(body: Buffer, contentType: string): ImageFormat {
  if (contentType.includes("svg")) {
    throw new DownloadError(
      "SVG kan ikke brukes på nettsiden. Bruk JPG, PNG eller WebP.",
    );
  }
  if (!GENERIC_TYPES.has(contentType) && !ALLOWED_TYPES.has(contentType)) {
    throw new DownloadError(
      `Filen er ikke et bilde som kan brukes (${contentType}). Bruk JPG, PNG eller WebP.`,
    );
  }

  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    body.length >= 8 &&
    body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    body.length >= 12 &&
    body.subarray(0, 4).toString("ascii") === "RIFF" &&
    body.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  throw new DownloadError(
    "Filen er ikke et JPG-, PNG- eller WebP-bilde. SVG og andre formater kan ikke brukes.",
  );
}
