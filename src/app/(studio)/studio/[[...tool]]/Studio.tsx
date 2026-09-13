"use client";

import { NextStudio } from "next-sanity/studio";

import config from "../../../../../sanity.config";

/**
 * Sanity Studio runs entirely in the browser, so it is kept behind a client
 * boundary. That also keeps the Studio packages out of the server bundle.
 */
export default function Studio() {
  return <NextStudio config={config} />;
}
