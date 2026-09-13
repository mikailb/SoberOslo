/**
 * URL handling for values that come out of the CMS.
 *
 * Everything an editor types is treated as untrusted: only absolute http(s)
 * links and mailto addresses are allowed through, which rules out
 * `javascript:` and `data:` links entirely.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Returns the URL when it is a safe absolute link, otherwise null. */
export function safeExternalUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Stand-in origin used to check that a path stays on this site. */
const INTERNAL_ORIGIN = "https://internal.invalid";

/**
 * Allows an internal path (`/about`), a safe absolute URL, or a mailto address.
 *
 * A path is resolved against a stand-in origin and only accepted if it stays
 * there. That catches the shapes browsers quietly treat as another domain:
 * `//evil.com`, and `/\evil.com`, where the backslash is normalised to a slash
 * and turns the value into a protocol-relative link.
 */
export function safeLinkHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    try {
      const url = new URL(trimmed, INTERNAL_ORIGIN);
      if (url.origin !== INTERNAL_ORIGIN) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return safeMailto(trimmed.slice("mailto:".length));
  }

  return safeExternalUrl(trimmed);
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Basic shape check before turning an editor's value into a mailto link. */
export function safeMailto(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}
