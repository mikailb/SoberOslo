import type { Metadata } from "next";

import { MembershipCTA } from "@/components/MembershipCTA";
import { ActivityGrid } from "@/components/activities/ActivityGrid";
import { CategoryFilter } from "@/components/activities/CategoryFilter";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  getActivitiesPage,
  getAllUpcomingActivities,
  getPastActivities,
  getSettings,
  textFrom,
} from "@/lib/content";
import { monthLabel } from "@/lib/format";
import { activitiesContent, categoryLabels } from "@/lib/site";
import type { ActivityCategory, ActivitySummary } from "@/sanity/types";

export const metadata: Metadata = {
  title: "Aktiviteter",
  description:
    "Alle kommende aktiviteter i Sober Oslo: turer, trening, kultur og sosiale kvelder helt uten alkohol.",
  alternates: { canonical: "/activities" },
};

const CATEGORY_VALUES = Object.keys(categoryLabels) as ActivityCategory[];

function isCategory(value: string | undefined): value is ActivityCategory {
  return Boolean(value) && CATEGORY_VALUES.includes(value as ActivityCategory);
}

/** Splits the list into months, keeping the order the activities came in. */
function groupByMonth(activities: ActivitySummary[]) {
  const groups: { label: string; items: ActivitySummary[] }[] = [];

  for (const activity of activities) {
    const label = monthLabel(activity.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(activity);
    } else {
      groups.push({ label, items: [activity] });
    }
  }

  return groups;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const activeCategory = isCategory(kategori) ? kategori : null;

  const [settings, page, allUpcoming, past] = await Promise.all([
    getSettings(),
    getActivitiesPage(),
    getAllUpcomingActivities(),
    // Eight are shown at once, the rest sit behind "Vis alle".
    getPastActivities(16),
  ]);

  // Once the page exists in Sanity, a field left empty means the text is gone
  // from the site. The starter wording only applies before it is created.
  const t = textFrom(page);
  const text = {
    heroEyebrow: t(page?.heroEyebrow, activitiesContent.heroEyebrow),
    heroHeading: t(page?.heroHeading, activitiesContent.heroHeading),
    heroIntro: t(page?.heroIntro, activitiesContent.heroIntro),
    pastEyebrow: t(page?.pastEyebrow, activitiesContent.pastEyebrow),
    pastHeading: t(page?.pastHeading, activitiesContent.pastHeading),
    pastIntro: t(page?.pastIntro, activitiesContent.pastIntro),
  };

  const available = CATEGORY_VALUES.filter((category) =>
    allUpcoming.some((activity) => activity.category === category),
  );

  const activities = activeCategory
    ? allUpcoming.filter((activity) => activity.category === activeCategory)
    : allUpcoming;

  // The category applies to what has already happened too, so picking Friluft
  // shows only Friluft in both lists rather than everything further down.
  const pastActivities = activeCategory
    ? past.filter((activity) => activity.category === activeCategory)
    : past;

  const groups = groupByMonth(activities);

  return (
    <>
      <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
        <Container size="wide">
          {text.heroEyebrow ? (
            <p className="eyebrow text-green">{text.heroEyebrow}</p>
          ) : null}
          {text.heroHeading ? (
            <h1 className="display-lg mt-5 max-w-3xl text-ink">
              {text.heroHeading}
            </h1>
          ) : null}
          {text.heroIntro ? (
            <p className="lede mt-6 max-w-2xl text-muted">{text.heroIntro}</p>
          ) : null}

          <div className="mt-10">
            <CategoryFilter available={available} active={activeCategory} />
          </div>
        </Container>
      </section>

      <section className="pb-8">
        <Container size="wide">
          {activities.length === 0 ? (
            <EmptyState
              title="Ingen aktiviteter her ennå"
              description={
                activeCategory
                  ? "Prøv en annen kategori, eller se alt vi har på programmet."
                  : "Vi legger ut nye aktiviteter fortløpende. Bli medlem, så får du beskjed først."
              }
              action={
                activeCategory ? (
                  <Button href="/activities" variant="secondary">
                    Vis alle aktiviteter
                  </Button>
                ) : (
                  <Button href={settings.membershipUrl}>Bli medlem</Button>
                )
              }
            />
          ) : (
            <div className="space-y-16 sm:space-y-20">
              {groups.map((group) => (
                <div key={group.label}>
                  <h2 className="eyebrow mb-8 border-b border-line pb-4 text-muted">
                    {group.label}
                  </h2>
                  <ActivityGrid
                    activities={group.items}
                    columns={4}
                    priorityCount={4}
                    collapseAfter={8}
                  />
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>

      {pastActivities.length > 0 ? (
        <section className="pt-20 sm:pt-28">
          <Container size="wide">
            <Reveal>
              <SectionHeading
                eyebrow={text.pastEyebrow}
                title={text.pastHeading}
                intro={text.pastIntro}
                as="h2"
              />
            </Reveal>
            <div className="mt-12">
              <ActivityGrid
                activities={pastActivities}
                columns={4}
                collapseAfter={8}
              />
            </div>
          </Container>
        </section>
      ) : null}

      <div className="mt-24 sm:mt-32">
        <MembershipCTA
          membershipUrl={settings.membershipUrl}
          heading={page ? (page.ctaHeading?.trim() ?? "") : undefined}
          body={page ? (page.ctaBody?.trim() ?? "") : undefined}
          showActivitiesLink={false}
        />
      </div>
    </>
  );
}
