import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import type { SanityClient } from "next-sanity";

import { todayIso } from "@/sanity/fetch";
import { siteConfig } from "@/lib/site";

import { blocksToText, newKey, textToBlocks } from "./portableText";
import { slugCandidates, slugify } from "./slug";
import { checkTimes, type ClearableField } from "./validation";

/**
 * Everything the ChatGPT tools do to activities in Sanity.
 *
 * Documents created here are published straight away. When an activity also
 * has an unpublished draft open in the Studio, every change is written to the
 * draft as well, so the next Publish in the Studio does not undo it.
 */

export class UserError extends Error {}

export type ActivityInput = {
  title: string;
  shortDescription: string;
  date: string;
  location: string;
  startTime?: string;
  endTime?: string;
  price?: string;
  category: string;
  isPublished: boolean;
  description?: string;
  practicalInfo?: string;
  registrationUrl?: string;
};

export type ActivityChanges = Partial<ActivityInput> & {
  clearFields?: ClearableField[];
};

const DRAFT_PREFIX = "drafts.";
const baseId = (id: string) =>
  id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id;

const activityUrl = (slug: string | null | undefined) =>
  slug ? `${siteConfig.url.replace(/\/$/, "")}/activities/${slug}` : null;

/* ------------------------------------------------------------- Reading --- */

const summaryProjection = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  date,
  startTime,
  endTime,
  location,
  category,
  price,
  isPublished
}`;

const fullProjection = /* groq */ `{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  isPublished,
  category,
  shortDescription,
  description,
  practicalInfo,
  date,
  startTime,
  endTime,
  location,
  price,
  registrationUrl,
  "coverImage": coverImage{ alt, "url": asset->url },
  "gallery": gallery[]{ _key, alt, "url": asset->url }
}`;

type RawSummary = {
  _id: string;
  title?: string;
  slug?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  category?: string | null;
  price?: string | null;
  isPublished?: boolean | null;
};

type RawActivity = RawSummary & {
  _updatedAt: string;
  shortDescription?: string | null;
  description?: unknown;
  practicalInfo?: unknown;
  registrationUrl?: string | null;
  coverImage?: { alt?: string | null; url?: string | null } | null;
  gallery?: { _key: string; alt?: string | null; url?: string | null }[] | null;
};

/**
 * Collapses published and draft versions into one entry per activity. The
 * published version wins, because that is what the website shows.
 */
function mergeVersions<T extends { _id: string }>(docs: T[]) {
  const byId = new Map<string, { doc: T; ids: string[]; hasDraft: boolean; isLive: boolean }>();

  for (const doc of docs) {
    const id = baseId(doc._id);
    const isDraft = doc._id.startsWith(DRAFT_PREFIX);
    const entry = byId.get(id);

    if (!entry) {
      byId.set(id, { doc, ids: [doc._id], hasDraft: isDraft, isLive: !isDraft });
      continue;
    }

    entry.ids.push(doc._id);
    if (isDraft) entry.hasDraft = true;
    else {
      entry.doc = doc;
      entry.isLive = true;
    }
  }

  return [...byId.entries()].map(([id, entry]) => ({ id, ...entry }));
}

function describeSummary(
  id: string,
  doc: RawSummary,
  isLive: boolean,
  hasDraft: boolean,
) {
  const visible = isLive && doc.isPublished === true && !!doc.slug;
  return {
    id,
    title: doc.title ?? "(uten tittel)",
    slug: doc.slug ?? null,
    date: doc.date ?? null,
    startTime: doc.startTime ?? null,
    endTime: doc.endTime ?? null,
    location: doc.location ?? null,
    category: doc.category ?? null,
    price: doc.price ?? null,
    isPublished: doc.isPublished === true,
    visibleOnWebsite: visible,
    status: visible
      ? "Synlig på nettsiden"
      : !isLive
        ? "Kun utkast i Studio (ikke publisert)"
        : "Skjult på nettsiden",
    hasUnpublishedDraftInStudio: hasDraft,
    url: activityUrl(doc.slug),
  };
}

export async function listActivities(
  client: SanityClient,
  options: { includePast: boolean; category?: string; limit: number },
) {
  const today = todayIso();
  const filters = [`_type == "activity"`];
  if (!options.includePast) filters.push(`date >= $today`);
  if (options.category) filters.push(`category == $category`);

  const docs = await client.fetch<RawSummary[]>(
    `*[${filters.join(" && ")}] | order(date ${options.includePast ? "desc" : "asc"}) ${summaryProjection}`,
    { today, category: options.category ?? null },
  );

  const activities = mergeVersions(docs)
    .slice(0, options.limit)
    .map(({ id, doc, isLive, hasDraft }) => describeSummary(id, doc, isLive, hasDraft));

  return { today, count: activities.length, activities };
}

/** Finds an activity by document id (with or without `drafts.`) or by slug. */
async function findActivity(client: SanityClient, ref: string) {
  const id = baseId(ref.trim());
  const docs = await client.fetch<RawActivity[]>(
    `*[_type == "activity" && (_id in [$id, $draftId] || slug.current == $slug)] ${fullProjection}`,
    { id, draftId: `${DRAFT_PREFIX}${id}`, slug: ref.trim() },
  );

  const matches = mergeVersions(docs);
  if (matches.length === 0) {
    throw new UserError(
      `Fant ingen aktivitet med id eller slug «${ref}». Bruk list_activities for å finne riktig id.`,
    );
  }
  if (matches.length > 1) {
    throw new UserError(
      `Flere aktiviteter passer til «${ref}». Bruk dokument-id fra list_activities.`,
    );
  }
  return matches[0];
}

export async function getActivity(client: SanityClient, ref: string) {
  const { id, doc, ids, isLive, hasDraft } = await findActivity(client, ref);

  return {
    today: todayIso(),
    activity: {
      ...describeSummary(id, doc, isLive, hasDraft),
      shortDescription: doc.shortDescription ?? "",
      description: blocksToText(doc.description),
      practicalInfo: blocksToText(doc.practicalInfo),
      registrationUrl: doc.registrationUrl ?? null,
      coverImage: doc.coverImage?.url
        ? { url: doc.coverImage.url, alt: doc.coverImage.alt ?? "" }
        : null,
      gallery: (doc.gallery ?? [])
        .filter((image) => image.url)
        .map((image) => ({ key: image._key, url: image.url, alt: image.alt ?? "" })),
      updatedAt: doc._updatedAt,
    },
    documentIds: ids,
  };
}

/* ------------------------------------------------------------- Writing --- */

async function uniqueSlug(
  client: SanityClient,
  title: string,
  date: string,
  ownId?: string,
): Promise<string> {
  const candidates = slugCandidates(slugify(title), date);
  const taken = new Set(
    await client.fetch<string[]>(
      `*[_type == "activity" && slug.current in $candidates && !(_id in $own)].slug.current`,
      {
        candidates,
        own: ownId ? [ownId, `${DRAFT_PREFIX}${ownId}`] : [],
      },
    ),
  );

  const free = candidates.find((candidate) => !taken.has(candidate));
  if (!free) throw new UserError("Fant ingen ledig nettadresse for denne tittelen.");
  return free;
}

/**
 * Refreshes the pages that list or show activities so a change is visible at
 * once instead of after the normal 60-second cache.
 */
export function revalidateActivityPages(slug?: string | null) {
  const paths: [string, ("page" | "layout")?][] = [
    ["/"],
    ["/activities"],
    ["/activities/[slug]", "page"],
    ["/(site)/activities/[slug]", "page"],
    ["/sitemap.xml"],
  ];
  if (slug) paths.push([`/activities/${slug}`]);

  for (const [path, type] of paths) {
    try {
      revalidatePath(path, type);
    } catch (error) {
      console.error(`[mcp] Kunne ikke oppdatere ${path}:`, error);
    }
  }
}

function pastDateWarning(date: string | undefined) {
  return date && date < todayIso()
    ? "Merk: datoen har allerede vært, så aktiviteten vises under «Tidligere aktiviteter»."
    : undefined;
}

export async function createActivity(client: SanityClient, input: ActivityInput) {
  const id = randomUUID();
  const slug = await uniqueSlug(client, input.title, input.date);

  const document = {
    _id: id,
    _type: "activity",
    title: input.title,
    slug: { _type: "slug", current: slug },
    isPublished: input.isPublished,
    category: input.category,
    shortDescription: input.shortDescription,
    date: input.date,
    location: input.location,
    ...(input.startTime ? { startTime: input.startTime } : {}),
    ...(input.endTime ? { endTime: input.endTime } : {}),
    ...(input.price ? { price: input.price } : {}),
    ...(input.description ? { description: textToBlocks(input.description) } : {}),
    ...(input.practicalInfo ? { practicalInfo: textToBlocks(input.practicalInfo) } : {}),
    ...(input.registrationUrl ? { registrationUrl: input.registrationUrl } : {}),
  };

  await client.create(document);
  revalidateActivityPages(slug);

  return {
    id,
    slug,
    url: activityUrl(slug),
    visibleOnWebsite: input.isPublished,
    warning: pastDateWarning(input.date),
  };
}

export async function updateActivity(
  client: SanityClient,
  ref: string,
  changes: ActivityChanges,
) {
  const found = await findActivity(client, ref);
  const { clearFields = [], description, practicalInfo, ...plain } = changes;

  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(plain)) {
    if (value !== undefined && value !== "") set[key] = value;
  }
  if (description) set.description = textToBlocks(description);
  if (practicalInfo) set.practicalInfo = textToBlocks(practicalInfo);

  const conflicting = clearFields.filter((field) => field in set);
  if (conflicting.length) {
    throw new UserError(
      `Kan ikke både endre og tømme samme felt: ${conflicting.join(", ")}.`,
    );
  }
  if (Object.keys(set).length === 0 && clearFields.length === 0) {
    throw new UserError("Ingen endringer oppgitt. Si hvilke felt som skal endres.");
  }

  const nextStart = clearFields.includes("startTime")
    ? null
    : ((set.startTime as string | undefined) ?? found.doc.startTime);
  const nextEnd = clearFields.includes("endTime")
    ? null
    : ((set.endTime as string | undefined) ?? found.doc.endTime);
  const timeProblem = checkTimes(nextStart, nextEnd);
  if (timeProblem) throw new UserError(timeProblem);

  const transaction = client.transaction();
  for (const documentId of found.ids) {
    transaction.patch(documentId, (patch) => {
      let next = patch;
      if (Object.keys(set).length) next = next.set(set);
      if (clearFields.length) next = next.unset(clearFields);
      return next;
    });
  }
  await transaction.commit();
  revalidateActivityPages(found.doc.slug);

  return {
    id: found.id,
    slug: found.doc.slug ?? null,
    url: activityUrl(found.doc.slug),
    changedFields: Object.keys(set),
    clearedFields: clearFields,
    note:
      "title" in set
        ? "Nettadressen (slug) er beholdt, så gamle lenker fortsetter å virke."
        : undefined,
    warning: pastDateWarning(set.date as string | undefined),
  };
}

export async function setVisibility(
  client: SanityClient,
  ref: string,
  isPublished: boolean,
) {
  const found = await findActivity(client, ref);

  const transaction = client.transaction();
  for (const documentId of found.ids) {
    transaction.patch(documentId, (patch) => patch.set({ isPublished }));
  }
  await transaction.commit();
  revalidateActivityPages(found.doc.slug);

  return {
    id: found.id,
    title: found.doc.title,
    isPublished,
    visibleOnWebsite: isPublished && found.isLive,
    url: activityUrl(found.doc.slug),
  };
}

export async function deleteActivity(
  client: SanityClient,
  ref: string,
  confirmTitle: string,
) {
  const found = await findActivity(client, ref);
  const normalise = (value: string | undefined) =>
    (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");

  if (normalise(confirmTitle) !== normalise(found.doc.title)) {
    throw new UserError(
      `Tittelen stemmer ikke. For å slette må tittelen gjentas nøyaktig: «${found.doc.title}». Ingenting er slettet.`,
    );
  }

  const transaction = client.transaction();
  for (const documentId of found.ids) transaction.delete(documentId);
  await transaction.commit();
  revalidateActivityPages(found.doc.slug);

  return { id: found.id, title: found.doc.title, deleted: true };
}

export async function attachImage(
  client: SanityClient,
  ref: string,
  image: { body: Buffer; mime: string; ext: string },
  target: "cover" | "gallery",
  alt: string,
) {
  const found = await findActivity(client, ref);

  const asset = await client.assets.upload("image", image.body, {
    filename: `${found.doc.slug ?? found.id}-${Date.now()}.${image.ext}`,
    contentType: image.mime,
  });
  const reference = { _type: "reference", _ref: asset._id };

  const transaction = client.transaction();
  for (const documentId of found.ids) {
    transaction.patch(documentId, (patch) =>
      target === "cover"
        ? patch.set({ coverImage: { _type: "image", asset: reference, alt } })
        : patch
            .setIfMissing({ gallery: [] })
            .append("gallery", [{ _type: "image", _key: newKey(), asset: reference, alt }]),
    );
  }
  await transaction.commit();
  revalidateActivityPages(found.doc.slug);

  return {
    id: found.id,
    target,
    imageUrl: asset.url,
    replacedPreviousCover: target === "cover" && !!found.doc.coverImage?.url,
    url: activityUrl(found.doc.slug),
  };
}
