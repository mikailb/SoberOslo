import { defineArrayMember, defineField, defineType } from "sanity";

import { IMAGE_FORMAT_HINT, rejectSvgUpload } from "./imageRules";

/** Reused image field with the alt text right next to the picture. */
const imageWithAlt = (name: string, title: string, group?: string) =>
  defineField({
    name,
    title,
    type: "image",
    group,
    description: IMAGE_FORMAT_HINT,
    options: { hotspot: true },
    validation: (rule) => rule.custom(rejectSvgUpload),
    fields: [
      defineField({
        name: "alt",
        title: "Bildebeskrivelse",
        type: "string",
        description: "Kort beskrivelse for de som bruker skjermleser.",
      }),
    ],
  });

const imageListWithAlt = (
  name: string,
  title: string,
  description: string,
  group?: string,
) =>
  defineField({
    name,
    title,
    type: "array",
    group,
    description: `${description} ${IMAGE_FORMAT_HINT}`,
    options: { layout: "grid" },
    of: [
      defineArrayMember({
        type: "image",
        options: { hotspot: true },
        validation: (rule) => rule.custom(rejectSvgUpload),
        fields: [
          defineField({
            name: "alt",
            title: "Bildebeskrivelse",
            type: "string",
          }),
        ],
      }),
    ],
  });

/** Small heading-and-text pair used in the value and highlight lists. */
const textSection = defineArrayMember({
  type: "object",
  name: "section",
  title: "Punkt",
  fields: [
    defineField({
      name: "heading",
      title: "Overskrift",
      type: "string",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "body",
      title: "Tekst",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(280),
    }),
  ],
  preview: { select: { title: "heading", subtitle: "body" } },
});

/* -------------------------------------------------------------------------- */

/**
 * The home page, one tab per block the visitor scrolls past. Every piece of
 * text on the page has a field here, so nothing is stuck in the code.
 */
export const homePage = defineType({
  name: "homePage",
  title: "Forsiden",
  type: "document",
  groups: [
    { name: "hero", title: "1. Toppseksjon", default: true },
    { name: "activities", title: "2. Kommende aktiviteter" },
    { name: "intro", title: "3. Om fellesskapet" },
    { name: "kvinner", title: "4. Sober Kvinner" },
    { name: "gallery", title: "5. Bildestripe" },
    { name: "cta", title: "6. Bli medlem" },
  ],
  fields: [
    /* ------------------------------------------------------ 1. Toppseksjon */
    defineField({
      name: "heroEyebrow",
      title: "Liten tekst over overskriften",
      type: "string",
      group: "hero",
      description: 'Standard er "Frivillig fellesskap i Oslo".',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: "heroHeading",
      title: "Hovedoverskrift",
      type: "string",
      group: "hero",
      description:
        "Den store teksten øverst. La feltet stå tomt for å bruke standardteksten.",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "heroIntro",
      title: "Ingress",
      type: "text",
      rows: 3,
      group: "hero",
      description: "Setningene under overskriften.",
      validation: (rule) => rule.max(280),
    }),
    imageWithAlt("heroImage", "Bilde til høyre", "hero"),

    /* ---------------------------------------------- 2. Kommende aktiviteter */
    defineField({
      name: "activitiesEyebrow",
      title: "Liten tekst over overskriften",
      type: "string",
      group: "activities",
      description: 'Standard er "Hva skjer".',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: "activitiesHeading",
      title: "Overskrift",
      type: "string",
      group: "activities",
      description: 'Standard er "Kommende aktiviteter".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "activitiesIntro",
      title: "Ingress",
      type: "text",
      rows: 2,
      group: "activities",
      description:
        "Selve aktivitetene hentes automatisk fra Aktiviteter. Her styrer du bare teksten over dem.",
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: "activitiesEmptyText",
      title: "Tekst når det ikke er noen aktiviteter",
      type: "text",
      rows: 2,
      group: "activities",
      description:
        "Vises i stedet for kortene når ingen kommende aktiviteter er publisert.",
      validation: (rule) => rule.max(200),
    }),

    /* -------------------------------------------------- 3. Om fellesskapet */
    defineField({
      name: "introHeading",
      title: "Overskrift",
      type: "string",
      group: "intro",
      description: 'Standard er "Et fellesskap, ikke et program".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "introBody",
      title: "Tekst",
      type: "text",
      rows: 5,
      group: "intro",
      validation: (rule) => rule.max(600),
    }),
    defineField({
      name: "stats",
      title: "Tallene til høyre",
      type: "array",
      group: "intro",
      description:
        'De tre store tallene, for eksempel "40+" med teksten "arrangementer i året". La listen stå tom for å bruke standardtallene.',
      of: [
        defineArrayMember({
          type: "object",
          name: "stat",
          title: "Tall",
          fields: [
            defineField({
              name: "value",
              title: "Tall",
              type: "string",
              description: 'For eksempel "40+", "600" eller "0 kr".',
              validation: (rule) => rule.required().max(10),
            }),
            defineField({
              name: "label",
              title: "Tekst ved siden av",
              type: "string",
              description: 'For eksempel "arrangementer i året".',
              validation: (rule) => rule.required().max(60),
            }),
          ],
          preview: { select: { title: "value", subtitle: "label" } },
        }),
      ],
      validation: (rule) => rule.max(3),
    }),

    /* ----------------------------------------------------- 4. Sober Kvinner */
    defineField({
      name: "kvinnerHeading",
      title: "Overskrift",
      type: "string",
      group: "kvinner",
      description:
        "Den grønne seksjonen som presenterer Sober Kvinner på forsiden.",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "kvinnerBody",
      title: "Tekst",
      type: "text",
      rows: 4,
      group: "kvinner",
      validation: (rule) => rule.max(400),
    }),
    defineField({
      name: "kvinnerButtonLabel",
      title: "Tekst på knappen",
      type: "string",
      group: "kvinner",
      description:
        'Standard er "Les om Sober Kvinner". Knappen går alltid til Sober Kvinner-siden.',
      validation: (rule) => rule.max(40),
    }),
    imageWithAlt("kvinnerImage", "Bilde", "kvinner"),

    /* ------------------------------------------------------ 5. Bildestripe */
    defineField({
      name: "galleryEyebrow",
      title: "Liten tekst over overskriften",
      type: "string",
      group: "gallery",
      description: 'Standard er "Fellesskapet".',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: "galleryHeading",
      title: "Overskrift",
      type: "string",
      group: "gallery",
      description: 'Standard er "Fra aktivitetene våre".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "galleryIntro",
      title: "Ingress",
      type: "text",
      rows: 2,
      group: "gallery",
      validation: (rule) => rule.max(200),
    }),
    imageListWithAlt(
      "galleryImages",
      "Bilder i stripen",
      "Er listen tom, hentes bilder automatisk fra aktivitetene.",
      "gallery",
    ),

    /* -------------------------------------------------------- 6. Bli medlem */
    defineField({
      name: "ctaHeading",
      title: "Overskrift",
      type: "string",
      group: "cta",
      description:
        'Den mørkegrønne seksjonen nederst. Standard er "Vil du bli med?".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "ctaBody",
      title: "Tekst",
      type: "text",
      rows: 3,
      group: "cta",
      description:
        "Selve knappen peker til lenken du setter under Innstillinger.",
      validation: (rule) => rule.max(300),
    }),
  ],
  preview: { prepare: () => ({ title: "Forsiden" }) },
});

/**
 * The texts on the activities overview. The activities themselves come from
 * the Aktiviteter list; only the headings around them live here.
 */
export const activitiesPage = defineType({
  name: "activitiesPage",
  title: "Aktivitetssiden",
  type: "document",
  groups: [
    { name: "hero", title: "1. Toppseksjon", default: true },
    { name: "past", title: "2. Tidligere aktiviteter" },
    { name: "cta", title: "3. Bli medlem" },
  ],
  fields: [
    /* ------------------------------------------------------ 1. Toppseksjon */
    defineField({
      name: "heroEyebrow",
      title: "Liten tekst over overskriften",
      type: "string",
      group: "hero",
      description: 'Standard er "Aktiviteter".',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: "heroHeading",
      title: "Overskrift",
      type: "string",
      group: "hero",
      description: 'Standard er "Noe å gjøre, noen å gjøre det med".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "heroIntro",
      title: "Ingress",
      type: "text",
      rows: 3,
      group: "hero",
      description:
        "Teksten under overskriften. Selve aktivitetene og kategoriknappene kommer automatisk.",
      validation: (rule) => rule.max(300),
    }),

    /* ---------------------------------------------- 2. Tidligere aktiviteter */
    defineField({
      name: "pastEyebrow",
      title: "Liten tekst over overskriften",
      type: "string",
      group: "past",
      description: 'Standard er "Tidligere".',
      validation: (rule) => rule.max(50),
    }),
    defineField({
      name: "pastHeading",
      title: "Overskrift",
      type: "string",
      group: "past",
      description:
        'Seksjonen som viser aktiviteter som allerede har vært. Standard er "Det vi har gjort".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "pastIntro",
      title: "Ingress",
      type: "text",
      rows: 2,
      group: "past",
      validation: (rule) => rule.max(200),
    }),

    /* -------------------------------------------------------- 3. Bli medlem */
    defineField({
      name: "ctaHeading",
      title: "Overskrift",
      type: "string",
      group: "cta",
      description: "Den mørkegrønne seksjonen nederst på siden.",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "ctaBody",
      title: "Tekst",
      type: "text",
      rows: 3,
      group: "cta",
      description:
        "Selve knappen peker til lenken du setter under Innstillinger.",
      validation: (rule) => rule.max(300),
    }),
  ],
  preview: { prepare: () => ({ title: "Aktivitetssiden" }) },
});

export const aboutPage = defineType({
  name: "aboutPage",
  title: "Om oss",
  type: "document",
  groups: [
    { name: "hero", title: "Toppseksjon", default: true },
    { name: "mission", title: "Hvorfor vi finnes" },
    { name: "values", title: "Slik jobber vi" },
    { name: "cta", title: "Bli medlem" },
  ],
  fields: [
    defineField({
      name: "heroHeading",
      title: "Hovedoverskrift",
      type: "string",
      group: "hero",
      validation: (rule) => rule.max(90),
    }),
    defineField({
      name: "heroIntro",
      title: "Ingress",
      type: "text",
      rows: 3,
      group: "hero",
      validation: (rule) => rule.max(300),
    }),
    imageListWithAlt(
      "images",
      "Bilder",
      "Opptil tre bilder som vises rett under overskriften.",
      "hero",
    ),
    defineField({
      name: "missionHeading",
      title: "Overskrift",
      type: "string",
      group: "mission",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "missionBody",
      title: "Tekst",
      type: "blockContent",
      group: "mission",
    }),
    defineField({
      name: "values",
      title: "Punkter",
      type: "array",
      group: "values",
      of: [textSection],
      validation: (rule) => rule.max(6),
    }),

    /* -------------------------------------------------------- Bli medlem --- */
    defineField({
      name: "ctaHeading",
      title: "Overskrift",
      type: "string",
      group: "cta",
      description:
        'Den mørkegrønne seksjonen nederst på siden. Standard er "Vil du bli med?".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "ctaBody",
      title: "Tekst",
      type: "text",
      rows: 3,
      group: "cta",
      description:
        "Selve knappen peker til lenken du setter under Innstillinger.",
      validation: (rule) => rule.max(300),
    }),
  ],
  preview: { prepare: () => ({ title: "Om oss" }) },
});

export const soberKvinnerPage = defineType({
  name: "soberKvinnerPage",
  title: "Sober Kvinner",
  type: "document",
  groups: [
    { name: "hero", title: "Toppseksjon", default: true },
    { name: "intro", title: "Introduksjon" },
    { name: "media", title: "Bilder" },
    { name: "cta", title: "Bli medlem" },
  ],
  fields: [
    defineField({
      name: "heroHeading",
      title: "Hovedoverskrift",
      type: "string",
      group: "hero",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "heroIntro",
      title: "Ingress",
      type: "text",
      rows: 3,
      group: "hero",
      validation: (rule) => rule.max(300),
    }),
    imageWithAlt("heroImage", "Hovedbilde", "hero"),
    defineField({
      name: "heroImageUrl",
      title: "Lenke fra hovedbildet",
      type: "url",
      group: "hero",
      description:
        "Valgfritt. Med en adresse her blir hovedbildet klikkbart og går hit.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "heroImageLabel",
      title: "Tekst på bildeknappen",
      type: "string",
      group: "hero",
      description: 'Valgfritt. Standard er "Les mer".',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "introHeading",
      title: "Overskrift",
      type: "string",
      group: "intro",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "introBody",
      title: "Tekst",
      type: "blockContent",
      group: "intro",
    }),
    defineField({
      name: "highlights",
      title: "Punkter",
      type: "array",
      group: "intro",
      of: [textSection],
      validation: (rule) => rule.max(4),
    }),
    imageListWithAlt(
      "images",
      "Bilder",
      "Opptil fire bilder som vises nederst på siden.",
      "media",
    ),
    defineField({
      name: "ctaHeading",
      title: "Overskrift",
      type: "string",
      group: "cta",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "ctaBody",
      title: "Tekst",
      type: "text",
      rows: 3,
      group: "cta",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "ctaUrl",
      title: "Lenke",
      type: "url",
      group: "cta",
      description: "Valgfritt. Uten lenke brukes medlemslenken.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
  ],
  preview: { prepare: () => ({ title: "Sober Kvinner" }) },
});

/**
 * The merch page is a single picture that links to the shop, which lives on
 * another site. There is no product list here on purpose.
 */
export const merchPage = defineType({
  name: "merchPage",
  title: "Merch",
  type: "document",
  groups: [
    { name: "main", title: "1. Merch", default: true },
    { name: "cta", title: "2. Bli medlem" },
  ],
  fields: [
    /* ------------------------------------------------------------ Merch ---- */
    defineField({
      name: "heading",
      title: "Overskrift",
      type: "string",
      group: "main",
      description: "La stå tom for å bruke standardteksten.",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "intro",
      title: "Ingress",
      type: "text",
      rows: 3,
      group: "main",
      validation: (rule) => rule.max(300),
    }),
    imageWithAlt("image", "Bilde", "main"),
    defineField({
      name: "shopUrl",
      title: "Lenke til nettbutikken",
      type: "url",
      group: "main",
      description:
        "Bildet over blir en lenke hit. Uten lenke vises bildet uten at det kan klikkes.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "linkLabel",
      title: "Tekst på knappen",
      type: "string",
      group: "main",
      description: 'Valgfritt. Standard er "Gå til nettbutikken".',
      validation: (rule) => rule.max(40),
    }),

    /* -------------------------------------------------------- Bli medlem --- */
    defineField({
      name: "ctaHeading",
      title: "Overskrift",
      type: "string",
      group: "cta",
      description:
        'Den mørkegrønne seksjonen nederst på siden. Standard er "Støtt arbeidet".',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "ctaBody",
      title: "Tekst",
      type: "text",
      rows: 3,
      group: "cta",
      description:
        "Selve knappen peker til lenken du setter under Innstillinger.",
      validation: (rule) => rule.max(300),
    }),
  ],
  preview: { prepare: () => ({ title: "Merch" }) },
});
