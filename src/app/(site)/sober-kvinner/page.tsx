import type { Metadata } from "next";

import { MembershipCTA } from "@/components/MembershipCTA";
import { ActivityGrid } from "@/components/activities/ActivityGrid";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { RichText } from "@/components/ui/RichText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  getActivitiesByCategory,
  getSettings,
  getSoberKvinnerPage,
  textFrom,
} from "@/lib/content";
import { paragraphsToBlocks, soberKvinnerContent } from "@/lib/site";
import { safeExternalUrl } from "@/lib/urls";
import type { CmsImage } from "@/sanity/types";

export const metadata: Metadata = {
  title: "Sober Kvinner",
  description:
    "Sober Kvinner er en møteplass i Sober Oslo for kvinner som vil bli kjent med andre uten alkohol. Fast samling hver måned, alltid med vert.",
  alternates: { canonical: "/sober-kvinner" },
};

export default async function SoberKvinnerPage() {
  const [settings, page, activities] = await Promise.all([
    getSettings(),
    getSoberKvinnerPage(),
    getActivitiesByCategory("sober-kvinner", 3),
  ]);

  // A field left empty in Sanity means the text is gone from the site.
  const t = textFrom(page);
  const heroHeading = t(page?.heroHeading, soberKvinnerContent.heroHeading);
  const heroIntro = t(page?.heroIntro, soberKvinnerContent.heroIntro);
  const heroImageUrl = safeExternalUrl(page?.heroImageUrl);
  const heroImageLabel =
    page?.heroImageLabel?.trim() || soberKvinnerContent.heroImageLabel;
  const introHeading = t(page?.introHeading, soberKvinnerContent.introHeading);
  const introBody = page
    ? (page.introBody ?? [])
    : paragraphsToBlocks([...soberKvinnerContent.introBody]);
  const highlights = page
    ? (page.highlights ?? [])
    : soberKvinnerContent.highlights;
  const ctaHeading = t(page?.ctaHeading, soberKvinnerContent.ctaHeading);
  const ctaBody = t(page?.ctaBody, soberKvinnerContent.ctaBody);
  const ctaUrl = safeExternalUrl(page?.ctaUrl) ?? settings.membershipUrl;

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="bg-sage">
        <Container size="wide" className="py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="eyebrow text-green">En del av Sober Oslo</p>
              <AnimatedHeading
                text={heroHeading}
                className="display-xl mt-6 text-green-ink"
                delay={80}
              />
              {heroIntro ? (
                <p className="lede mt-7 max-w-xl text-green-ink/75">
                  {heroIntro}
                </p>
              ) : null}
              <div className="mt-9 flex flex-wrap gap-3">
                <Button href={ctaUrl} size="lg">
                  Bli medlem
                </Button>
                <Button
                  href="/activities?kategori=sober-kvinner"
                  variant="secondary"
                  size="lg"
                >
                  Se samlingene
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <HeroImage
                image={page?.heroImage}
                url={heroImageUrl}
                label={heroImageLabel}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------------- Intro */}
      <section className="py-20 sm:py-28">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              {introHeading ? (
                <h2 className="display-md text-ink">{introHeading}</h2>
              ) : null}
            </Reveal>
            <Reveal delay={100} className="lg:col-span-7">
              <RichText value={introBody} className="lede" />
            </Reveal>
          </div>

          <ul className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-3">
            {highlights.map((item, index) => (
              <li key={item._key}>
                <Reveal delay={index * 90}>
                  <div
                    aria-hidden="true"
                    className="mb-5 h-1 w-10 rounded-full bg-coral"
                  />
                  <h3 className="font-display text-xl font-medium text-ink">
                    {item.heading}
                  </h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                    {item.body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------------------------------------------------------- Activities */}
      <section className="pb-4">
        <Container size="wide">
          <Reveal>
            <SectionHeading
              eyebrow="Samlinger"
              title="Neste gang vi møtes"
              intro="Alle samlinger er åpne for kvinner i alle aldre. Du kan komme én gang for å se hvordan det er."
              action={
                <Button
                  href="/activities?kategori=sober-kvinner"
                  variant="secondary"
                >
                  Alle samlinger
                </Button>
              }
            />
          </Reveal>

          <div className="mt-12">
            {activities.length ? (
              <ActivityGrid activities={activities} columns={3} />
            ) : (
              <EmptyState
                title="Neste samling er ikke satt ennå"
                description="Vi legger ut nye datoer hver måned. Bli medlem, så får du invitasjonen på e-post."
                action={<Button href={ctaUrl}>Bli medlem</Button>}
              />
            )}
          </div>
        </Container>
      </section>

      {/* -------------------------------------------------------------- Images */}
      {page?.images?.length ? (
        <section className="py-20 sm:py-28">
          <Container size="wide">
            <Reveal>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {page.images.slice(0, 4).map((image, index) => (
                  <li
                    key={index}
                    className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-sage"
                  >
                    <Media
                      image={image}
                      seed={`sober-kvinner-${index}`}
                      alt={image?.alt ?? ""}
                      sizes="(min-width: 640px) 22vw, 45vw"
                      width={700}
                    />
                  </li>
                ))}
              </ul>
            </Reveal>
          </Container>
        </section>
      ) : null}

      <div className="mt-20 sm:mt-28">
        <MembershipCTA
          membershipUrl={ctaUrl}
          heading={ctaHeading}
          body={ctaBody}
          showActivitiesLink={false}
        />
      </div>
    </>
  );
}

/**
 * The picture beside the headline. With an address set in Sanity it becomes a
 * link, otherwise it stays an ordinary picture.
 */
function HeroImage({
  image,
  url,
  label,
}: {
  image?: CmsImage | null;
  url: string | null;
  label: string;
}) {
  const frame =
    "relative aspect-[5/4] overflow-hidden rounded-[1.75rem] bg-sage-deep";

  const picture = (
    <Media
      image={image}
      seed="sober-kvinner-hero"
      alt={image?.alt ?? ""}
      sizes="(min-width: 1024px) 46vw, 92vw"
      priority
      width={1400}
      className={
        url
          ? "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          : undefined
      }
    />
  );

  if (!url) {
    return <div className={frame}>{picture}</div>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <figure className={frame}>
        {picture}
        <figcaption className="absolute inset-x-0 bottom-0 flex justify-center p-5 sm:p-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/95 px-5 py-2.5 font-medium text-ink shadow-[0_6px_20px_rgba(8,40,31,0.18)] backdrop-blur-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1">
            {label}
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
            >
              <path
                d="M6 3h7v7M13 3 4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </figcaption>
      </figure>
    </a>
  );
}
