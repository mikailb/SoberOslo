import type { SchemaTypeDefinition } from "sanity";

import { activity } from "./activity";
import { blockContent } from "./blockContent";
import {
  aboutPage,
  activitiesPage,
  homePage,
  merchPage,
  soberKvinnerPage,
  surprisePage,
} from "./pages";
import { siteSettings } from "./siteSettings";

export const schemaTypes: SchemaTypeDefinition[] = [
  activity,
  merchPage,
  surprisePage,
  homePage,
  activitiesPage,
  aboutPage,
  soberKvinnerPage,
  siteSettings,
  blockContent,
];
