import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy for the public website.
 *
 * `script-src` still needs `'unsafe-inline'` because the App Router ships small
 * inline bootstrap scripts. Everything else is locked down: pictures may only
 * come from Sanity, videos may only be framed from YouTube and Vimeo, and no
 * other site may frame this one. If you later want a nonce-based policy, add a
 * middleware that generates one per request; note that it makes every page
 * render dynamically.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://cdn.sanity.io https://*.api.sanity.io${
    isDev ? " ws: http://localhost:*" : ""
  }`,
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  // Videos editors upload are served from Sanity's asset CDN.
  "media-src 'self' https://cdn.sanity.io",
  "upgrade-insecure-requests",
].join("; ");

/** Applied everywhere, including the editor. */
const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Next.js writes AGENTS.md and CLAUDE.md into the project root on every
  // `next dev` unless this is off. Deleting them without this brings them back.
  agentRules: false,

  images: {
    // Sanity is the only place images are ever loaded from.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },

  // OAuth discovery for the ChatGPT connection at /api/mcp. Clients look for
  // these at fixed addresses, with or without the endpoint path appended.
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/oauth/protected-resource",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/oauth/metadata",
      },
    ];
  },

  async headers() {
    return [
      {
        // The ChatGPT login page sets its own, stricter policy. The site policy
        // would block it: `form-action 'self'` also stops the redirect back to
        // ChatGPT after the form is sent, and two policies always combine.
        source: "/api/oauth/authorize",
        headers: baseHeaders,
      },
      {
        // Sanity Studio loads its own assets and talks to the Sanity API, so it
        // is left out of the site policy. Access is controlled by Sanity login.
        source: "/studio/:path*",
        headers: [
          ...baseHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/((?!studio|api/oauth/authorize).*)",
        headers: [
          ...baseHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
