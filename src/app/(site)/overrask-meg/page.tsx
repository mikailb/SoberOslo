import type { Metadata } from "next";

import { SurpriseCard } from "@/components/scratchcard/SurpriseCard";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Container } from "@/components/ui/Container";
import { getSurprisePage, textFrom } from "@/lib/content";
import { surpriseContent } from "@/lib/site";

export const metadata: Metadata = {
  title: "Overrask meg",
  description:
    "Vet du ikke hva dere skal finne på? Skrap fram en alkoholfri plan for kvelden.",
  alternates: { canonical: "/overrask-meg" },
};

export default async function OverraskMegPage() {
  const page = await getSurprisePage();

  // A field left empty in Sanity means the text is gone from the site.
  const t = textFrom(page);
  const heading = t(page?.heading, surpriseContent.heading);
  const intro = t(page?.intro, surpriseContent.intro);
  // An empty list would leave nothing under the cover, so that one falls back.
  const ideas = page?.ideas?.length ? page.ideas : surpriseContent.ideas;

  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <Container>
        <div className="text-center">
          <p className="eyebrow text-green">Overrask meg</p>
          <AnimatedHeading
            text={heading}
            className="display-lg mt-5 text-ink"
            delay={80}
          />
          {intro ? (
            <p className="lede mx-auto mt-5 max-w-xl text-muted">{intro}</p>
          ) : null}
        </div>

        <div className="mt-10 sm:mt-14">
          <SurpriseCard
            ideas={ideas}
            coverLabel={surpriseContent.coverLabel}
            coverHint={surpriseContent.coverHint}
            resultEyebrow={surpriseContent.resultEyebrow}
            againLabel={surpriseContent.againLabel}
          />
        </div>
      </Container>
    </section>
  );
}
