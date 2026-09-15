import type { Metadata } from "next";

import { MembershipCTA } from "@/components/MembershipCTA";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { RichText } from "@/components/ui/RichText";
import { getAboutPage, getSettings, textFrom } from "@/lib/content";
import { aboutContent, paragraphsToBlocks } from "@/lib/site";
import type { CmsImage } from "@/sanity/types";

export const metadata: Metadata = {
  title: "Om oss",
  description:
    "Sober Oslo er en frivillig organisasjon som lager alkoholfrie møteplasser i Oslo. Les om hvorfor vi finnes og hva vi står for.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [settings, page] = await Promise.all([getSettings(), getAboutPage()]);

  // A field left empty in Sanity means the text is gone from the site.
  const t = textFrom(page);
  const heroHeading = t(page?.heroHeading, aboutContent.heroHeading);
  const heroIntro = t(page?.heroIntro, aboutContent.heroIntro);
  const missionHeading = t(page?.missionHeading, aboutContent.missionHeading);
  const missionBody = page
    ? (page.missionBody ?? [])
    : paragraphsToBlocks([...aboutContent.missionBody]);
  const values = page ? (page.values ?? []) : aboutContent.values;

  const imageSlots: (CmsImage | null)[] = page?.images?.length
    ? page.images.slice(0, 3)
    : Array.from({ length: 3 }, () => null);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-20">
        <Container size="wide">
          <p className="eyebrow text-green">Om oss</p>
          <AnimatedHeading
            text={heroHeading}
            className="display-lg mt-6 max-w-4xl text-ink"
            delay={80}
          />
          {heroIntro ? (
            <p className="lede mt-7 max-w-2xl text-muted">{heroIntro}</p>
          ) : null}
        </Container>
      </section>

      {/* -------------------------------------------------------------- Images */}
      <section>
        <Container size="wide">
          <Reveal>
            <ul className="grid gap-4 sm:grid-cols-3">
              {imageSlots.map((image, index) => (
                <li
                  key={index}
                  className={`relative overflow-hidden rounded-[1.5rem] bg-sage ${
                    index === 0
                      ? "aspect-[4/3] sm:col-span-2"
                      : "aspect-[4/3] sm:aspect-auto"
                  }`}
                >
                  <Media
                    image={image}
                    seed={`about-${index}`}
                    alt={image?.alt ?? ""}
                    sizes="(min-width: 640px) 40vw, 92vw"
                    priority={index === 0}
                    width={1200}
                  />
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      {/* ------------------------------------------------------------- Mission */}
      <section className="py-20 sm:py-28">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              {missionHeading ? (
                <h2 className="display-md text-ink">{missionHeading}</h2>
              ) : null}
            </Reveal>
            <Reveal delay={100} className="lg:col-span-7">
              <RichText value={missionBody} className="lede" />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* -------------------------------------------------------------- Values */}
      <section className="bg-sage">
        <Container size="wide" className="py-20 sm:py-28">
          <Reveal>
            <h2 className="display-md max-w-2xl text-green-ink">
              Slik jobber vi
            </h2>
          </Reveal>

          <ul className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {values.map((value, index) => (
              <li key={value._key}>
                <Reveal delay={Math.min(index, 3) * 90}>
                  <p
                    aria-hidden="true"
                    className="font-display text-sm font-semibold text-green"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-xl font-medium text-green-ink sm:text-2xl">
                    {value.heading}
                  </h3>
                  <p className="mt-3 max-w-md leading-relaxed text-green-ink/75">
                    {value.body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <MembershipCTA membershipUrl={settings.membershipUrl} />
    </>
  );
}
