import { defineArrayMember, defineType } from "sanity";

/**
 * The rich-text format used for longer descriptions.
 *
 * Deliberately small: paragraphs, two heading levels, lists, bold, italic and
 * links. Nothing that lets an editor paste raw HTML or scripts into the site.
 */
export const blockContent = defineType({
  name: "blockContent",
  title: "Tekst",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Avsnitt", value: "normal" },
        { title: "Mellomtittel", value: "h3" },
        { title: "Sitat", value: "blockquote" },
      ],
      lists: [
        { title: "Punktliste", value: "bullet" },
        { title: "Nummerert liste", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Fet", value: "strong" },
          { title: "Kursiv", value: "em" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Lenke",
            fields: [
              {
                name: "href",
                type: "url",
                title: "Adresse",
                validation: (rule) =>
                  rule
                    .required()
                    .uri({ scheme: ["http", "https", "mailto"] })
                    .error("Bruk en adresse som starter med https://"),
              },
            ],
          },
        ],
      },
    }),
  ],
});
