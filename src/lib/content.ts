import { isSanityConfigured } from "@/sanity/env";
import { sanityFetch, todayIso } from "@/sanity/fetch";
import {
  aboutPageQuery,
  activitiesPageQuery,
  activityBySlugQuery,
  activitySlugsQuery,
  allUpcomingActivitiesQuery,
  communityImagesQuery,
  homePageQuery,
  merchPageQuery,
  pastActivitiesQuery,
  siteSettingsQuery,
  soberKvinnerPageQuery,
  upcomingActivitiesByCategoryQuery,
  upcomingActivitiesQuery,
} from "@/sanity/queries";
import type {
  AboutPage,
  ActivitiesPage,
  Activity,
  ActivityCategory,
  ActivitySummary,
  CmsImage,
  HomePage,
  MerchPage,
  SiteSettings,
  SoberKvinnerPage,
} from "@/sanity/types";
import { safeExternalUrl } from "./urls";
import { findStarterActivity, siteConfig, starterActivities } from "./site";

/**
 * One place where CMS content and the built-in starter content meet.
 *
 * Every function returns something usable: if Sanity is not connected, or has
 * no document yet, the starter content is served instead. Pages never have to
 * think about which of the two they got.
 */

export type ResolvedSettings = {
  name: string;
  tagline: string;
  membershipUrl: string;
  contactEmail: string;
  /** Whatever channels the editors listed, in their order. */
  socialLinks: { label: string; url: string }[];
  /** Everything in the footer, which is the same on every page. */
  footer: {
    description: string;
    navHeading: string;
    contactHeading: string;
    membershipLabel: string;
    copyrightNote: string;
    note: string;
  };
};

/**
 * The social channels shown in the footer.
 *
 * Editors control the whole list, so removing a row removes it from the site.
 * Each address is validated, and a row missing a name or a usable address is
 * skipped rather than rendered as a broken link.
 */
function resolveSocialLinks(
  cms: SiteSettings | null,
): { label: string; url: string }[] {
  if (!cms) return [...siteConfig.social];

  return (cms.socialLinks ?? []).flatMap((item) => {
    const label = item?.label?.trim();
    const url = safeExternalUrl(item?.url);
    return label && url ? [{ label, url }] : [];
  });
}

export async function getSettings(): Promise<ResolvedSettings> {
  const cms = await sanityFetch<SiteSettings>(siteSettingsQuery);

  // Footer copy follows the same rule as the pages: once the settings exist in
  // Sanity, a field left empty means that line is gone from the footer.
  const t = textFrom(cms);

  return {
    name: cms?.organisationName?.trim() || siteConfig.name,
    tagline: cms?.tagline?.trim() || siteConfig.tagline,
    membershipUrl:
      safeExternalUrl(cms?.membershipUrl) ?? siteConfig.membershipUrl,
    contactEmail: cms?.contactEmail?.trim() || siteConfig.contactEmail,
    socialLinks: resolveSocialLinks(cms),
    footer: {
      description: t(cms?.description, siteConfig.description),
      navHeading: t(cms?.footerNavHeading, siteConfig.footer.navHeading),
      contactHeading: t(
        cms?.footerContactHeading,
        siteConfig.footer.contactHeading,
      ),
      membershipLabel: t(
        cms?.footerMembershipLabel,
        siteConfig.footer.membershipLabel,
      ),
      copyrightNote: t(
        cms?.footerCopyrightNote,
        siteConfig.footer.copyrightNote,
      ),
      note: t(cms?.footerNote, siteConfig.footer.note),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The starter activities are demo content for previewing the design before the
 * CMS exists. Once Sanity is connected they must never appear: an empty list
 * from the CMS means there really are no activities, and inventing some would
 * put events on the website that nobody is arranging.
 */
function starterUpcoming(): ActivitySummary[] {
  if (isSanityConfigured) return [];

  const today = todayIso();
  return starterActivities
    .filter((activity) => activity.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getUpcomingActivities(
  limit = 4,
): Promise<ActivitySummary[]> {
  const cms = await sanityFetch<ActivitySummary[]>(upcomingActivitiesQuery, {
    today: todayIso(),
    limit,
  });
  if (cms?.length) return cms;
  return starterUpcoming().slice(0, limit);
}

export async function getAllUpcomingActivities(): Promise<ActivitySummary[]> {
  const cms = await sanityFetch<ActivitySummary[]>(allUpcomingActivitiesQuery, {
    today: todayIso(),
  });
  if (cms?.length) return cms;
  return starterUpcoming();
}

export async function getActivitiesByCategory(
  category: ActivityCategory,
  limit = 3,
): Promise<ActivitySummary[]> {
  const cms = await sanityFetch<ActivitySummary[]>(
    upcomingActivitiesByCategoryQuery,
    { today: todayIso(), category, limit },
  );
  if (cms?.length) return cms;
  return starterUpcoming()
    .filter((activity) => activity.category === category)
    .slice(0, limit);
}

/** Recent activities that have already happened, kept for their photos. */
export async function getPastActivities(limit = 6): Promise<ActivitySummary[]> {
  const cms = await sanityFetch<ActivitySummary[]>(pastActivitiesQuery, {
    today: todayIso(),
    limit,
  });
  return cms ?? [];
}

export async function getActivity(slug: string): Promise<Activity | null> {
  const cms = await sanityFetch<Activity>(activityBySlugQuery, { slug });
  if (cms) return cms;
  // With the CMS connected, an unknown slug is a 404 rather than demo content.
  return isSanityConfigured ? null : (findStarterActivity(slug) ?? null);
}

export async function getActivitySlugs(): Promise<string[]> {
  const cms = await sanityFetch<string[]>(activitySlugsQuery);
  if (cms?.length) return cms;
  if (isSanityConfigured) return [];
  return starterActivities.map((activity) => activity.slug);
}

/** Images collected from recent activities, for the home page strip. */
export async function getCommunityImages(): Promise<CmsImage[]> {
  const cms = await sanityFetch<CmsImage[]>(communityImagesQuery);
  return cms?.filter(Boolean) ?? [];
}

/* -------------------------------------------------------------------------- */
/* Editable pages                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Decides what a page shows for one piece of copy.
 *
 * Once the page exists in Sanity, the editor is in charge: a field left empty
 * means the text is meant to be gone, and the website shows nothing rather
 * than quietly putting the built-in wording back. The starter wording is only
 * used before the page has been created at all, so a brand new project still
 * looks finished.
 */
export function textFrom(document: object | null | undefined) {
  return (value: string | null | undefined, fallback: string): string =>
    document ? (value?.trim() ?? "") : fallback;
}

/** The same rule for lists, such as the numbers on the home page. */
export function listFrom<T>(document: object | null | undefined) {
  return (
    value: readonly T[] | null | undefined,
    fallback: readonly T[],
  ): readonly T[] => (document ? (value ?? []) : fallback);
}

export async function getHomePage(): Promise<HomePage | null> {
  return sanityFetch<HomePage>(homePageQuery);
}

export async function getActivitiesPage(): Promise<ActivitiesPage | null> {
  return sanityFetch<ActivitiesPage>(activitiesPageQuery);
}

export async function getAboutPage(): Promise<AboutPage | null> {
  return sanityFetch<AboutPage>(aboutPageQuery);
}

export async function getSoberKvinnerPage(): Promise<SoberKvinnerPage | null> {
  return sanityFetch<SoberKvinnerPage>(soberKvinnerPageQuery);
}

export async function getMerchPage(): Promise<MerchPage | null> {
  return sanityFetch<MerchPage>(merchPageQuery);
}
