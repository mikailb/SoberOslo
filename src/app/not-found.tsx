import Link from "next/link";

import "./globals.css";

/**
 * The 404 page for addresses that match no route group at all.
 *
 * It carries its own `<html>` because this project has two root layouts, one
 * for the website and one for the editor. Pages inside the website use the
 * richer 404 in `(site)/not-found.tsx`, which keeps the header and footer.
 */
export default function NotFound() {
  return (
    <html lang="nb">
      <body className="min-h-screen">
        <div className="mx-auto w-full max-w-6xl px-5 py-28 sm:px-8 sm:py-40">
          <p className="eyebrow text-green">404</p>
          <h1 className="display-lg mt-5 max-w-2xl text-ink">
            Denne siden fant vi ikke
          </h1>
          <p className="lede mt-6 max-w-xl text-muted">
            Lenken kan være utdatert. Prøv forsiden eller oversikten over
            aktiviteter.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-green px-7 py-3.5 font-medium text-white transition-colors hover:bg-green-deep"
            >
              Til forsiden
            </Link>
            <Link
              href="/activities"
              className="inline-flex items-center rounded-full border border-ink/20 px-7 py-3.5 font-medium text-ink transition-colors hover:border-ink/45"
            >
              Se aktiviteter
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
