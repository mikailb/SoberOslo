import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Innstillinger",
  type: "document",
  groups: [
    { name: "general", title: "Generelt", default: true },
    { name: "contact", title: "Kontakt og sosiale medier" },
  ],
  fields: [
    defineField({
      name: "organisationName",
      title: "Navn på organisasjonen",
      type: "string",
      group: "general",
      initialValue: "Sober Oslo",
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "tagline",
      title: "Slagord",
      type: "string",
      group: "general",
      description: "Kort setning som vises sammen med navnet i søkeresultater.",
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: "description",
      title: "Kort beskrivelse",
      type: "text",
      rows: 3,
      group: "general",
      description: "Vises i bunnteksten og i søkeresultater.",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "membershipUrl",
      title: "Lenke til medlemskap",
      type: "url",
      group: "general",
      description:
        'Alle "Bli medlem"-knappene på nettsiden peker hit. Bytt her når skjemaet er klart.',
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "contactEmail",
      title: "E-postadresse",
      type: "string",
      group: "contact",
      validation: (rule) =>
        rule.email().error("Skriv en gyldig e-postadresse."),
    }),
    defineField({
      name: "instagramUrl",
      title: "Instagram",
      type: "url",
      group: "contact",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "facebookUrl",
      title: "Facebook",
      type: "url",
      group: "contact",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "tiktokUrl",
      title: "TikTok",
      type: "url",
      group: "contact",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Innstillinger for nettsiden" }),
  },
});
