import type { Metadata, Viewport } from "next";

/**
 * A second root layout, used only by /studio.
 *
 * Sanity Studio takes over the whole window and brings its own styling, so this
 * layout deliberately renders nothing around it: no header, no footer, no site
 * stylesheet.
 */
export const metadata: Metadata = {
  title: "Sober Oslo – redigering",
  robots: { index: false, follow: false },
};

/** Sanity Studio expects the full viewport, with no user zooming quirks. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
