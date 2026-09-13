import { defineCliConfig } from "sanity/cli";

import { dataset, projectId } from "./src/sanity/env";

/**
 * Used by the `sanity` command line tool, for example when adding an allowed
 * origin: `npx sanity cors add https://soberoslo.no --credentials`
 */
export default defineCliConfig({
  api: { projectId, dataset },
  studioHost: "sober-oslo",
});
