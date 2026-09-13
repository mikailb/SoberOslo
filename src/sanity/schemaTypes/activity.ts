import { defineArrayMember, defineField, defineType } from "sanity";

import { IMAGE_FORMAT_HINT, rejectSvgUpload } from "./imageRules";

export const activity = defineType({
  name: "activity",
  title: "Aktivitet",
  type: "document",
  groups: [
    { name: "main", title: "1. Om aktiviteten", default: true },
    { name: "when", title: "2. Tid og sted" },
    { name: "media", title: "3. Bilder" },
    { name: "signup", title: "4. Påmelding" },
  ],
  fields: [
    /* ------------------------------------------------------------- Om ----- */
    defineField({
      name: "title",
      title: "Tittel",
      type: "string",
      group: "main",
      description: "Navnet på aktiviteten. Vises som overskrift og på kortene.",
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: "slug",
      title: "Nettadresse",
      type: "slug",
      group: "main",
      description:
        "Lages automatisk fra tittelen. Endrer du den, slutter gamle lenker å virke.",
      options: { source: "title", maxLength: 80 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "isPublished",
      title: "Publisert på nettsiden",
      type: "boolean",
      group: "main",
      description: "Slå av for å skjule aktiviteten uten å slette den.",
      initialValue: true,
    }),
    defineField({
      name: "category",
      title: "Kategori",
      type: "string",
      group: "main",
      options: {
        list: [
          { title: "Sosialt", value: "social" },
          { title: "Friluft", value: "outdoors" },
          { title: "Kultur", value: "culture" },
          { title: "Trening", value: "sport" },
          { title: "Kurs", value: "workshop" },
          { title: "Sober Kvinner", value: "sober-kvinner" },
        ],
        layout: "radio",
      },
      initialValue: "social",
    }),
    defineField({
      name: "shortDescription",
      title: "Kort beskrivelse",
      type: "text",
      rows: 3,
      group: "main",
      description: "Én til to setninger. Vises på kortene i oversikten.",
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: "description",
      title: "Full beskrivelse",
      type: "blockContent",
      group: "main",
    }),
    defineField({
      name: "practicalInfo",
      title: "Praktisk informasjon",
      type: "blockContent",
      group: "main",
      description:
        "Hva man bør ta med, hvor man møtes, hvem som er vert. Vises i eget avsnitt.",
    }),

    /* ------------------------------------------------------ Tid og sted ---- */
    defineField({
      name: "date",
      title: "Dato",
      type: "date",
      group: "when",
      options: { dateFormat: "DD.MM.YYYY" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "startTime",
      title: "Starttid",
      type: "string",
      group: "when",
      description: "Skriv som 18:00",
      validation: (rule) =>
        rule
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: "klokkeslett" })
          .error("Skriv klokkeslett som 18:00"),
    }),
    defineField({
      name: "endTime",
      title: "Sluttid",
      type: "string",
      group: "when",
      description: "Valgfritt. Skriv som 21:00",
      validation: (rule) =>
        rule
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: "klokkeslett" })
          .error("Skriv klokkeslett som 21:00"),
    }),
    defineField({
      name: "location",
      title: "Sted",
      type: "string",
      group: "when",
      description: "For eksempel: Deichman Bjørvika, fjerde etasje",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "price",
      title: "Pris",
      type: "string",
      group: "when",
      description: 'Valgfritt. For eksempel "Gratis" eller "250 kr".',
      validation: (rule) => rule.max(40),
    }),

    /* --------------------------------------------------------- Bilder ----- */
    defineField({
      name: "coverImage",
      title: "Hovedbilde",
      type: "image",
      group: "media",
      description: `Det store bildet øverst på siden, og bildet på kortet i oversikten. ${IMAGE_FORMAT_HINT}`,
      options: { hotspot: true },
      validation: (rule) => rule.custom(rejectSvgUpload),
      fields: [
        defineField({
          name: "alt",
          title: "Bildebeskrivelse",
          type: "string",
          description:
            "Kort beskrivelse for de som bruker skjermleser. La stå tom hvis bildet bare er pynt.",
        }),
      ],
    }),
    defineField({
      name: "gallery",
      title: "Bildegalleri",
      type: "array",
      group: "media",
      description: `Bilder som vises nederst på siden. Åtte vises av gangen, resten bak en knapp. ${IMAGE_FORMAT_HINT}`,
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
      options: { layout: "grid" },
    }),

    /* -------------------------------------------------------- Påmelding --- */
    defineField({
      name: "registrationUrl",
      title: "Lenke til påmelding",
      type: "url",
      group: "signup",
      description:
        "Valgfritt. Er feltet tomt, står det på siden at man bare møter opp.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
  ],

  orderings: [
    {
      title: "Dato, nyeste først",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
    {
      title: "Dato, eldste først",
      name: "dateAsc",
      by: [{ field: "date", direction: "asc" }],
    },
  ],

  preview: {
    select: {
      title: "title",
      date: "date",
      location: "location",
      media: "coverImage",
      isPublished: "isPublished",
    },
    prepare({ title, date, location, media, isPublished }) {
      const day = date
        ? new Date(date).toLocaleDateString("nb-NO", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Uten dato";

      return {
        title: isPublished === false ? `${title} (skjult)` : title,
        subtitle: [day, location].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});
