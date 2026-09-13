import type { Metadata } from "next";

import { ImageLink } from "@/components/ImageLink";
import { MembershipCTA } from "@/components/MembershipCTA";
import { Container } from "@/components/ui/Container";
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
        </Container>
      </section>

      {/* The shop lives on another site, so the picture is the whole page. */}
      <section>
        <Container size="wide">
          <ImageLink
            image={page?.image}
            seed="sober-oslo-merch"
            url={shopUrl}
            label={linkLabel}
            missingUrlNote={merchContent.missingUrlNote}
          />
        </Container>
      </section>

      <div className="mt-20 sm:mt-28">
        <MembershipCTA
          membershipUrl={settings.membershipUrl}
          heading="Støtt arbeidet"
          body="Medlemskapet ditt betaler for lokaler, utstyr og turer. Det er det som gjør at aktivitetene kan være gratis eller nesten gratis."
        />
      </div>
    </>
  );
}
