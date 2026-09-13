import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSettings } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} – ${siteConfig.tagline}`,
    template: `%s – ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "nb_NO",
    siteName: siteConfig.name,
    title: `${siteConfig.name} – ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} – ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="nb" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        {/* Without JavaScript the scroll reveals never run, so show everything. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen [--header-height:4.5rem] md:[--header-height:5rem]">
        <a
          href="#hovedinnhold"
          className="sr-only rounded-full bg-green px-5 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]"
        >
          Hopp til hovedinnhold
        </a>

        <Header
          membershipUrl={settings.membershipUrl}
          organisationName={settings.name}
        />

        <main id="hovedinnhold">{children}</main>

        <Footer settings={settings} />
      </body>
    </html>
  );
}
