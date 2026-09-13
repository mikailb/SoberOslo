import type { PortableTextBlock } from "next-sanity";
import type { Image } from "sanity";

/** A Sanity image with the alt text editors fill in next to it. */
export type CmsImage = Image & { alt?: string | null };

export type ActivityCategory =
  "social" | "outdoors" | "culture" | "sport" | "workshop" | "sober-kvinner";

/** The fields a card needs. Kept small so listing pages stay fast. */
export type ActivitySummary = {
  _id: string;
  title: string;
  slug: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location: string;
  shortDescription: string;
  category?: ActivityCategory | null;
  price?: string | null;
  coverImage?: CmsImage | null;
};

/** A video uploaded straight from a phone or computer, stored by Sanity. */
export type CmsVideoFile = {
  url?: string | null;
  mimeType?: string | null;
  caption?: string | null;
};

/** Everything the detail page renders. */
export type Activity = ActivitySummary & {
  description?: PortableTextBlock[] | null;
  practicalInfo?: PortableTextBlock[] | null;
  gallery?: CmsImage[] | null;
  videoUrls?: string[] | null;
  videoFiles?: CmsVideoFile[] | null;
  registrationUrl?: string | null;
};

export type SiteSettings = {
  organisationName?: string | null;
  tagline?: string | null;
  description?: string | null;
  membershipUrl?: string | null;
  contactEmail?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
};

export type PageSection = {
  _key: string;
  heading: string;
  body: string;
};

/** Headings on the activities overview. The activities come from their own list. */
export type ActivitiesPage = {
  heroEyebrow?: string | null;
  heroHeading?: string | null;
  heroIntro?: string | null;
  pastEyebrow?: string | null;
  pastHeading?: string | null;
  pastIntro?: string | null;
  ctaHeading?: string | null;
  ctaBody?: string | null;
};

export type AboutPage = {
  heroHeading?: string | null;
  heroIntro?: string | null;
  missionHeading?: string | null;
  missionBody?: PortableTextBlock[] | null;
  values?: PageSection[] | null;
  images?: CmsImage[] | null;
  volunteerHeading?: string | null;
  volunteerBody?: string | null;
  volunteerUrl?: string | null;
};

export type SoberKvinnerPage = {
  heroHeading?: string | null;
  heroIntro?: string | null;
  heroImage?: CmsImage | null;
  /** When set, the hero picture becomes a link to this address. */
  heroImageUrl?: string | null;
  heroImageLabel?: string | null;
  introHeading?: string | null;
  introBody?: PortableTextBlock[] | null;
  highlights?: PageSection[] | null;
  images?: CmsImage[] | null;
  ctaHeading?: string | null;
  ctaBody?: string | null;
  ctaUrl?: string | null;
};

/** The shop itself lives on another site, so this is one picture and a link. */
export type MerchPage = {
  heading?: string | null;
  intro?: string | null;
  image?: CmsImage | null;
  shopUrl?: string | null;
  linkLabel?: string | null;
};

export type HomeStat = {
  _key: string;
  value: string;
  label: string;
};

export type HomePage = {
  heroEyebrow?: string | null;
  heroHeading?: string | null;
  heroIntro?: string | null;
  heroImage?: CmsImage | null;

  activitiesEyebrow?: string | null;
  activitiesHeading?: string | null;
  activitiesIntro?: string | null;
  activitiesEmptyText?: string | null;

  introHeading?: string | null;
  introBody?: string | null;
  stats?: HomeStat[] | null;

  kvinnerHeading?: string | null;
  kvinnerBody?: string | null;
  kvinnerButtonLabel?: string | null;
  kvinnerImage?: CmsImage | null;

  galleryEyebrow?: string | null;
  galleryHeading?: string | null;
  galleryIntro?: string | null;
  galleryImages?: CmsImage[] | null;

  ctaHeading?: string | null;
  ctaBody?: string | null;
};
