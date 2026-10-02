import type { Metadata } from "next";

import { MerchCard } from "@/components/MerchCard";
import { MembershipCTA } from "@/components/MembershipCTA";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { getMerchPage, getSettings, textFrom } from "@/lib/content";
import { merchContent } from "@/lib/site";
import { safeExternalUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Merch",
  description:
    "Plagg og ting fra Sober Oslo. Overskuddet går rett tilbake til de alkoholfrie aktivitetene våre.",
  alternates: { canonical: "/merch" },
};

export default async function MerchPage() {
  const [settings, page] = await Promise.all([getSettings(), getMerchPage()]);

  // A field left empty in Sanity means the text is gone from the site.
  const t = textFrom(page);
  const heading = t(page?.heading, merchContent.heading);
  const intro = t(page?.intro, merchContent.intro);
  const linkLabel = page?.linkLabel?.trim() || merchContent.linkLabel;
  const shopUrl = safeExternalUrl(page?.shopUrl);
  const productsHeading = t(
    page?.productsHeading,
    merchContent.productsHeading,
  );
  const products = page?.products ?? [];

  return (
    <>
      <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
        <Container size="wide">
          <p className="eyebrow text-green">Merch</p>
          {heading ? (
            <h1 className="display-lg mt-5 max-w-3xl text-ink">{heading}</h1>
          ) : null}
          {intro ? (
            <p className="lede mt-6 max-w-2xl text-muted">{intro}</p>
          ) : null}

          {/* The shop is a separate site, so this is the way out to it. Without
              an address in Sanity there is a short note instead of a button. */}
          <div className="mt-8">
            {shopUrl ? (
              <Button href={shopUrl} size="lg">
                {linkLabel}
              </Button>
            ) : (
              <p className="text-sm text-muted">
                {merchContent.missingUrlNote}
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* Products from Sanity: three per row on a computer, two below that.
          The padding is small because the section above already ends with its
          own spacing, and the two together left a large empty gap. */}
      {products.length ? (
        <section className="pt-4 sm:pt-6">
          <Container size="wide">
            {productsHeading ? (
              <Reveal>
                <h2 className="display-md text-ink">{productsHeading}</h2>
              </Reveal>
            ) : null}

            <ul
              className={`grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 lg:grid-cols-3 ${
                productsHeading ? "mt-10" : ""
              }`}
            >
              {products.map((product, index) => (
                <li key={product._key} className="h-full">
                  <Reveal delay={Math.min(index, 3) * 80} className="h-full">
                    <MerchCard product={product} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <div className="mt-20 sm:mt-28">
        <MembershipCTA
          membershipUrl={settings.membershipUrl}
          heading={t(page?.ctaHeading, merchContent.ctaHeading)}
          body={t(page?.ctaBody, merchContent.ctaBody)}
        />
      </div>
    </>
  );
}
