import { MembershipCTA } from "@/components/MembershipCTA";
import { ActivityGrid } from "@/components/activities/ActivityGrid";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ImageSection } from "@/components/ui/ImageSection";
import { Marquee } from "@/components/ui/Marquee";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  getCommunityImages,
  getHomePage,
  getSettings,
  getUpcomingActivities,
  listFrom,
  textFrom,
} from "@/lib/content";
import { homeContent, soberKvinnerContent } from "@/lib/site";
import type { CmsImage, HomeStat } from "@/sanity/types";

export default async function HomePage() {
  const [settings, page, activities, communityImages] = await Promise.all([
    getSettings(),
    getHomePage(),
    getUpcomingActivities(3),
    getCommunityImages(),
  ]);

  // Once the page exists in Sanity the editor decides: a field left empty means
  // the text is gone from the site. The starter wording is only used before the
  // page has been created.
  const t = textFrom(page);
  const text = {
    heroEyebrow: t(page?.heroEyebrow, homeContent.heroEyebrow),
    heroHeading: t(page?.heroHeading, homeContent.heroHeading),
    heroIntro: t(page?.heroIntro, homeContent.heroIntro),

    activitiesEyebrow: t(
      page?.activitiesEyebrow,
      homeContent.activitiesEyebrow,
    ),
    activitiesHeading: t(
      page?.activitiesHeading,
      homeContent.activitiesHeading,
    ),
    activitiesIntro: t(page?.activitiesIntro, homeContent.activitiesIntro),
    activitiesEmptyText: t(
      page?.activitiesEmptyText,
      homeContent.activitiesEmptyText,
    ),

    introHeading: t(page?.introHeading, homeContent.introHeading),
    introBody: t(page?.introBody, homeContent.introBody),

    kvinnerHeading: t(page?.kvinnerHeading, soberKvinnerContent.heroHeading),
    kvinnerBody: t(page?.kvinnerBody, homeContent.kvinnerBody),

    galleryEyebrow: t(page?.galleryEyebrow, homeContent.galleryEyebrow),
    galleryHeading: t(page?.galleryHeading, homeContent.galleryHeading),
    galleryIntro: t(page?.galleryIntro, homeContent.galleryIntro),
  };

  // A button with no words on it would be broken rather than empty, so the
  // label keeps its fallback.
  const kvinnerButtonLabel =
    page?.kvinnerButtonLabel?.trim() || homeContent.kvinnerButtonLabel;

  const stats = listFrom<HomeStat>(page)(page?.stats, homeContent.stats);

  // Six slots either way: real photos when they exist, placeholder art if not.
  const stripSource = page?.galleryImages?.length
    ? page.galleryImages
    : communityImages;
  const stripSlots: (CmsImage | null)[] = stripSource.length
    ? stripSource
    : Array.from({ length: 6 }, () => null);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24">
        <Container size="wide">
          <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              {text.heroEyebrow ? (
                <p
                  className="eyebrow text-green"
                  style={{
                    animation: "so-fade-in 0.6s ease both",
                  }}
                >
                  {text.heroEyebrow}
                </p>
              ) : null}

              <AnimatedHeading
                text={text.heroHeading}
                className="display-xl mt-6 text-ink"
                delay={120}
              />

              {text.heroIntro ? (
                <p
                  className="lede mt-7 max-w-xl text-muted"
                  style={{
                    animation: "so-fade-in 0.8s ease both",
                    animationDelay: "520ms",
                  }}
                >
                  {text.heroIntro}
                </p>
              ) : null}

              <div
                className="mt-9 flex flex-wrap gap-3"
                style={{
                  animation: "so-fade-in 0.8s ease both",
                  animationDelay: "640ms",
                }}
              >
                <Button href="/activities" size="lg">
                  Se aktiviteter
                </Button>
                <Button
                  href={settings.membershipUrl}
                  variant="secondary"
                  size="lg"
                >
                  Bli medlem
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-sage sm:aspect-[3/2] lg:aspect-[4/5]">
                <Media
                  image={page?.heroImage}
                  seed="sober-oslo-hero"
                  alt={page?.heroImage?.alt ?? ""}
                  sizes="(min-width: 1024px) 40vw, 92vw"
                  priority
                  width={1200}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------- Upcoming activities */}
      <section className="pt-16 sm:pt-24">
        <Container size="wide">
          <Reveal>
            <SectionHeading
              eyebrow={text.activitiesEyebrow}
              title={text.activitiesHeading}
              intro={text.activitiesIntro}
              action={
                <Button href="/activities" variant="secondary">
                  Alle aktiviteter
                </Button>
              }
            />
          </Reveal>

          <div className="mt-12 sm:mt-14">
            {activities.length ? (
              <ActivityGrid activities={activities} columns={3} />
            ) : // Without this the heading would sit above an empty space when
            // there is nothing on the programme.
            text.activitiesEmptyText ? (
              <p className="border-t border-line pt-8 text-muted">
                {text.activitiesEmptyText}
              </p>
            ) : null}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------ Intro and tall */}
      <section className="pt-24 sm:pt-32">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-7">
              {text.introHeading ? (
                <h2 className="display-lg max-w-2xl text-ink">
                  {text.introHeading}
                </h2>
              ) : null}
              {text.introBody ? (
                <p className="lede mt-7 max-w-2xl text-muted">
                  {text.introBody}
                </p>
              ) : null}
              <div className="mt-9">
                <Button href="/about" variant="secondary">
                  Om oss
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-5">
              <dl className="divide-y divide-line border-y border-line">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-baseline gap-6 py-6"
                  >
                    <dt className="font-display text-4xl leading-none font-medium text-green sm:text-5xl">
                      {stat.value}
                    </dt>
                    <dd className="text-[0.9375rem] text-muted">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------- Sober Kvinner */}
      <ImageSection
        eyebrow="Sober Kvinner"
        title={text.kvinnerHeading}
        image={page?.kvinnerImage}
        seed="sober-kvinner-home"
        tone="sage"
        reverse
        className="mt-24 sm:mt-32"
        action={
          <Button href="/sober-kvinner" variant="primary">
            {kvinnerButtonLabel}
          </Button>
        }
      >
        {text.kvinnerBody ? <p>{text.kvinnerBody}</p> : null}
      </ImageSection>

      {/* --------------------------------------------------- Community images */}
      <section className="py-20 sm:py-28">
        <Container size="wide">
          <Reveal>
            <SectionHeading
              eyebrow={text.galleryEyebrow}
              title={text.galleryHeading}
              intro={text.galleryIntro}
            />
          </Reveal>
        </Container>

        <Reveal className="mt-12">
          <Marquee duration={80}>
            {stripSlots.map((image, index) => (
              <div
                key={index}
                className="relative h-52 w-72 shrink-0 overflow-hidden rounded-[1.25rem] bg-sage sm:h-64 sm:w-96"
              >
                <Media
                  image={image}
                  seed={`community-${index}`}
                  alt=""
                  sizes="(min-width: 640px) 24rem, 18rem"
                  width={800}
                />
              </div>
            ))}
          </Marquee>
        </Reveal>
      </section>

      <MembershipCTA
        membershipUrl={settings.membershipUrl}
        heading={page ? (page.ctaHeading?.trim() ?? "") : undefined}
        body={page ? (page.ctaBody?.trim() ?? "") : undefined}
      />
    </>
  );
}
