import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { singletonTypes, structure } from "./src/sanity/structure";

/**
 * Sanity Studio, served from /studio on the same domain.
 *
 * Sanity handles sign-in, so there is no login code in this project and no
 * write token anywhere. Give editors access from sanity.io/manage.
 */
export default defineConfig({
  name: "sober-oslo",
  title: "Sober Oslo",
  basePath: "/studio",

  projectId,
  dataset,

  schema: {
    types: schemaTypes,
    // The page documents exist once each, so hide them from "create new".
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    // Editors can publish and undo changes on page documents, but not delete
    // or duplicate them, which would leave the website without content.
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType)
        ? actions.filter(({ action }) =>
            ["publish", "discardChanges", "restore"].includes(action ?? ""),
          )
        : actions,
  },

  plugins: [
    structureTool({ structure, title: "Innhold" }),
    // The query playground is a developer tool, so it stays out of production.
    ...(process.env.NODE_ENV === "development"
      ? [visionTool({ defaultApiVersion: apiVersion })]
      : []),
  ],
});
