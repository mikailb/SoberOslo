import "server-only";

import { createClient, type SanityClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

const token = process.env.SANITY_WRITE_TOKEN?.trim() ?? "";

export const isWriteClientConfigured = projectId.length > 0 && token.length > 0;

export const writeClient: SanityClient | null = isWriteClientConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token,
      useCdn: false,
      perspective: "raw",
    })
  : null;
