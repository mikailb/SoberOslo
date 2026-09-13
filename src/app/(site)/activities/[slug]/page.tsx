import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MembershipCTA } from "@/components/MembershipCTA";
import { ActivityMeta } from "@/components/activities/ActivityMeta";
import { ActivityMedia } from "@/components/media/ActivityMedia";
import type { GalleryImage } from "@/components/media/GalleryLightbox";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { RichText } from "@/components/ui/RichText";
import { getActivity, getActivitySlugs, getSettings } from "@/lib/content";
import { formatFullDate, formatTimeRange, machineDateTime } from "@/lib/format";
import { categoryLabels } from "@/lib/site";
import { safeExternalUrl } from "@/lib/urls";
import { getUploadedVideos, getVideoEmbeds } from "@/lib/video";
import { urlForImage } from "@/sanity/image";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getActivitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivity(slug);

  if (!activity) {
    return { title: "Fant ikke aktiviteten" };
  }

  const when = formatFullDate(activity.date);
  const description =
    activity.shortDescription ||
    `${activity.title} – ${when} i ${activity.location}.`;
  const image = urlForImage(activity.coverImage, 1200);

  return {
    title: activity.title,
    description,
    alternates: { canonical: `/activities/${activity.slug}` },
    openGraph: {
      type: "article",
      title: activity.title,
      description,
      url: `/activities/${activity.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [activity, settings] = await Promise.all([
    getActivity(slug),
    getSettings(),
  ]);

  if (!activity) notFound();

  const registrationUrl = safeExternalUrl(activity.registrationUrl);

  // Media is prepared here on the server, so the image-url builder and the
  // link validation never reach the browser.
  const galleryImages: GalleryImage[] = (activity.gallery ?? []).map(
    (image, index) => ({
      src: urlForImage(image, 1600),
      alt: image?.alt?.trim() ?? "",
      seed: `${activity.slug}-${index}`,
    }),
  );
  const embeds = getVideoEmbeds(activity.videoUrls);
  const uploads = getUploadedVideos(activity.videoFiles);
  const hasMedia = galleryImages.length + embeds.length + uploads.length > 0;

  const time = formatTimeRange(activity.startTime, activity.endTime);
  const category = activity.category ? categoryLabels[activity.category] : null;

  return (
    <>
      <article>
        {/* ------------------------------------------------------------- Title */}
        <Container size="wide" className="pt-8 sm:pt-12">
          <Link
            href="/activities"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="rotate-180 transition-transform duration-300 group-hover:-translate-x-1"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Alle aktiviteter
          </Link>

          <div className="mt-8 max-w-4xl">
            {category ? <p className="eyebrow text-green">{category}</p> : null}
            <h1 className="display-lg mt-4 text-ink">{activity.title}</h1>
            <p className="lede mt-5 max-w-2xl text-muted">
              {activity.shortDescription}
            </p>
            <p className="mt-6 text-[0.9375rem] text-ink">
              <time
                dateTime={machineDateTime(activity.date, activity.startTime)}
              >
                {formatFullDate(activity.date)}
                {time ? ` kl. ${time}` : ""}
              </time>
              <span aria-hidden="true"> · </span>
              {activity.location}
            </p>
          </div>
        </Container>

        {/* ------------------------------------------------------------- Image */}
        <Container size="wide" className="mt-10 sm:mt-12">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-sage sm:aspect-[21/9]">
            <Media
              image={activity.coverImage}
              seed={activity.slug}
              alt={activity.coverImage?.alt ?? ""}
              sizes="(min-width: 1408px) 1408px, 100vw"
              priority
              width={2000}
            />
          </div>
        </Container>

        {/* -------------------------------------------------- Text and details */}
        <Container size="wide" className="mt-14 sm:mt-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <RichText value={activity.description} className="lede" />

              {activity.practicalInfo?.length ? (
                <div className="mt-14">
                  <h2 className="display-md text-ink">Praktisk informasjon</h2>
                  <RichText value={activity.practicalInfo} className="mt-5" />
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <div className="rounded-[1.5rem] border border-line bg-paper p-6 sm:p-8">
                  <h2 className="font-display text-xl font-medium text-ink">
                    Detaljer
                  </h2>
                  <div className="mt-5">
                    <ActivityMeta activity={activity} />
                  </div>

                  {registrationUrl ? (
                    <div className="mt-7">
                      <Button
                        href={registrationUrl}
                        size="lg"
                        className="w-full"
                      >
                        Meld deg på
                      </Button>
                      <p className="mt-3 text-sm text-muted">
                        Påmelding skjer på en ekstern side.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-7 text-sm text-muted">
                      Ingen påmelding. Bare møt opp på stedet til oppgitt tid.
                    </p>
                  )}
                </div>

                <div className="mt-6 rounded-[1.5rem] bg-sage p-6 sm:p-8">
                  <p className="font-display text-lg font-medium text-green-ink">
                    Første gang?
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-green-ink/75">
                    De fleste kommer alene. Si fra til verten når du kommer, så
                    blir du presentert for noen.
                  </p>
                  <div className="mt-5">
                    <Button href={settings.membershipUrl} variant="primary">
                      Bli medlem
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* ------------------------------------------------ Pictures and video */}
        {hasMedia ? (
          <Container size="wide" className="mt-20 sm:mt-28">
            <Reveal>
              <ActivityMedia
                images={galleryImages}
                embeds={embeds}
                uploads={uploads}
                title={activity.title}
              />
            </Reveal>
          </Container>
        ) : null}

        <Container size="wide" className="mt-20 sm:mt-28">
          <div className="border-t border-line pt-8">
            <Button href="/activities" variant="secondary">
              Tilbake til alle aktiviteter
            </Button>
          </div>
        </Container>
      </article>

      <div className="mt-20 sm:mt-28">
        <MembershipCTA
          membershipUrl={settings.membershipUrl}
          heading="Bli med på flere"
          body="Som medlem får du invitasjon til alt vi arrangerer, og du støtter arbeidet med å lage flere alkoholfrie møteplasser i Oslo."
        />
      </div>
    </>
  );
}
