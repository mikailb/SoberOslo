import { groq } from "next-sanity";

/** Shared projections keep the queries short and the types predictable. */
const imageFields = /* groq */ `{ ..., "alt": alt }`;

const activityCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  date,
  startTime,
  endTime,
  location,
  shortDescription,
  category,
  price,
  coverImage ${imageFields}
`;

/** Only published activities are ever returned to the website. */
const publishedFilter = /* groq */ `_type == "activity" && isPublished == true && defined(slug.current)`;

export const upcomingActivitiesQuery = groq`
  *[${publishedFilter} && date >= $today]
    | order(date asc)[0...$limit] { ${activityCardFields} }
`;

export const upcomingActivitiesByCategoryQuery = groq`
  *[${publishedFilter} && date >= $today && category == $category]
    | order(date asc)[0...$limit] { ${activityCardFields} }
`;

export const allUpcomingActivitiesQuery = groq`
  *[${publishedFilter} && date >= $today] | order(date asc) { ${activityCardFields} }
`;

export const pastActivitiesQuery = groq`
  *[${publishedFilter} && date < $today] | order(date desc)[0...$limit] { ${activityCardFields} }
`;

export const activityBySlugQuery = groq`
  *[${publishedFilter} && slug.current == $slug][0] {
    ${activityCardFields},
    description,
    practicalInfo,
    registrationUrl,
    gallery[] ${imageFields}
  }
`;

export const activitySlugsQuery = groq`
  *[${publishedFilter}].slug.current
`;

/** Gallery images pulled from recent activities, used on the home page. */
export const communityImagesQuery = groq`
  *[${publishedFilter} && (defined(gallery) || defined(coverImage))]
    | order(date desc)[0...8] {
      "images": [coverImage, ...coalesce(gallery, [])][defined(asset)] ${imageFields}
    }.images[]
`;

export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    organisationName,
    tagline,
    description,
    footerNavHeading,
    footerContactHeading,
    footerMembershipLabel,
    footerCopyrightNote,
    footerNote,
    membershipUrl,
    contactEmail,
    socialLinks[]{ _key, label, url }
  }
`;

export const homePageQuery = groq`
  *[_type == "homePage"][0] {
    heroEyebrow,
    heroHeading,
    heroIntro,
    heroImage ${imageFields},

    activitiesEyebrow,
    activitiesHeading,
    activitiesIntro,
    activitiesEmptyText,

    introHeading,
    introBody,
    stats[]{ _key, value, label },

    kvinnerHeading,
    kvinnerBody,
    kvinnerButtonLabel,
    kvinnerImage ${imageFields},

    galleryEyebrow,
    galleryHeading,
    galleryIntro,
    galleryImages[] ${imageFields},

    ctaHeading,
    ctaBody
  }
`;

export const activitiesPageQuery = groq`
  *[_type == "activitiesPage"][0] {
    heroEyebrow,
    heroHeading,
    heroIntro,
    pastEyebrow,
    pastHeading,
    pastIntro,
    ctaHeading,
    ctaBody
  }
`;

export const aboutPageQuery = groq`
  *[_type == "aboutPage"][0] {
    heroHeading,
    heroIntro,
    missionHeading,
    missionBody,
    values[]{ _key, heading, body },
    images[] ${imageFields}
  }
`;

export const soberKvinnerPageQuery = groq`
  *[_type == "soberKvinnerPage"][0] {
    heroHeading,
    heroIntro,
    heroImage ${imageFields},
    heroImageUrl,
    heroImageLabel,
    introHeading,
    introBody,
    highlights[]{ _key, heading, body },
    images[] ${imageFields},
    ctaHeading,
    ctaBody,
    ctaUrl
  }
`;

export const merchPageQuery = groq`
  *[_type == "merchPage"][0] {
    heading,
    intro,
    shopUrl,
    linkLabel,
    image ${imageFields}
  }
`;
