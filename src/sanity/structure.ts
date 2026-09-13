import type { StructureResolver } from "sanity/structure";

/**
 * The left-hand menu in the editor.
 *
 * Activities and merch are lists. The four page documents exist once each, so
 * they open straight into the form instead of showing an empty list with a
 * "create" button.
 */
const SINGLETONS = [
  { id: "homePage", title: "Forsiden" },
  { id: "activitiesPage", title: "Aktivitetssiden" },
  { id: "aboutPage", title: "Om oss" },
  { id: "soberKvinnerPage", title: "Sober Kvinner" },
  { id: "merchPage", title: "Merch" },
  { id: "siteSettings", title: "Innstillinger" },
] as const;

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Sober Oslo")
    .items([
      S.listItem()
        .title("Aktiviteter")
        .child(
          S.documentTypeList("activity")
            .title("Aktiviteter")
            .defaultOrdering([{ field: "date", direction: "desc" }]),
        ),

      S.divider(),

      ...SINGLETONS.map((singleton) =>
        S.listItem()
          .title(singleton.title)
          .id(singleton.id)
          .child(
            S.document()
              .schemaType(singleton.id)
              .documentId(singleton.id)
              .title(singleton.title),
          ),
      ),
    ]);

/** Page documents should not be creatable or deletable from the editor. */
export const singletonTypes: ReadonlySet<string> = new Set<string>(
  SINGLETONS.map((item) => item.id),
);
