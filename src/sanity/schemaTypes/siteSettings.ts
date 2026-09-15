import { defineArrayMember, defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Innstillinger",
  type: "document",
  groups: [
    { name: "general", title: "Generelt", default: true },
    { name: "contact", title: "Kontakt og sosiale medier" },
    { name: "footer", title: "Bunntekst" },
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
      title: "Tekst under navnet",
      type: "text",
      rows: 3,
      group: "footer",
      description:
        "Avsnittet nederst på alle sider, under Sober Oslo-navnet. Tomt felt betyr ingen tekst.",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "footerNavHeading",
      title: "Overskrift over sidelenkene",
      type: "string",
      group: "footer",
      description: 'Standard er "Sider". Tomt felt betyr ingen overskrift.',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "footerContactHeading",
      title: "Overskrift over kontaktinfo",
      type: "string",
      group: "footer",
      description: 'Standard er "Kontakt". Tomt felt betyr ingen overskrift.',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "footerMembershipLabel",
      title: "Tekst på medlemsknappen",
      type: "string",
      group: "footer",
      description:
        'Standard er "Bli medlem". Er feltet tomt, vises ingen knapp i bunnteksten.',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "footerCopyrightNote",
      title: "Tekst etter årstallet",
      type: "string",
      group: "footer",
      description:
        'Kommer etter "© 2026 Sober Oslo.". Standard er "Frivillig organisasjon i Oslo."',
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: "footerNote",
      title: "Tekst nede til høyre",
      type: "string",
      group: "footer",
      description:
        'Standard er "Alle aktiviteter er alkoholfrie og åpne for alle."',
      validation: (rule) => rule.max(120),
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
      name: "socialLinks",
      title: "Sosiale medier",
      type: "array",
      group: "contact",
      description:
        "Legg til de kanalene dere faktisk har. Trykk på en rad og slett den for å fjerne den fra bunnteksten. Er listen tom, vises ingen sosiale medier.",
      of: [
        defineArrayMember({
          type: "object",
          name: "socialLink",
          title: "Lenke",
          fields: [
            defineField({
              name: "label",
              title: "Navn",
              type: "string",
              description:
                'Teksten som vises i bunnteksten, for eksempel "Instagram".',
              validation: (rule) => rule.required().max(30),
            }),
            defineField({
              name: "url",
              title: "Adresse",
              type: "url",
              description: "Må starte med https://",
              validation: (rule) => rule.required().uri({ scheme: ["https"] }),
            }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Innstillinger for nettsiden" }),
  },
});
