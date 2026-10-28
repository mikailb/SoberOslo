import "server-only";

import { revalidatePath } from "next/cache";
import type { SanityClient } from "next-sanity";

import { siteConfig, surpriseContent } from "@/lib/site";

import { UserError } from "./activities";
import { newKey } from "./portableText";

const PAGE_ID = "surprisePage";
const DRAFT_ID = `drafts.${PAGE_ID}`;

export const SURPRISE_TEXT_FIELDS = ["heading", "intro"] as const;

export type SurpriseTextField = (typeof SURPRISE_TEXT_FIELDS)[number];

export type IdeaInput = { title: string; note?: string };

type RawIdea = { _key: string; title?: string | null; note?: string | null };

type RawSurprisePage = { _id: string; _rev: string; ideas?: RawIdea[] | null } & Partial<
  Record<SurpriseTextField, string | null>
>;

const pageUrl = `${siteConfig.url.replace(/\/$/, "")}/oslo-run`;

function revalidateSurprisePage() {
  try {
    revalidatePath("/oslo-run");
  } catch (error) {
    console.error("[mcp] Kunne ikke oppdatere /oslo-run:", error);
  }
}

const normalise = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");

async function loadVersions(client: SanityClient) {
  const docs = await client.fetch<RawSurprisePage[]>(
    `*[_id in [$id, $draftId]]{
      _id, _rev, ${SURPRISE_TEXT_FIELDS.join(", ")},
      "ideas": ideas[]{ _key, title, note }
    }`,
    { id: PAGE_ID, draftId: DRAFT_ID },
  );

  return {
    published: docs.find((doc) => doc._id === PAGE_ID) ?? null,
    draft: docs.find((doc) => doc._id === DRAFT_ID) ?? null,
  };
}

/**
 * Creates the page on first write, with the built-in ideas already in the
 * list. Otherwise adding one idea would replace the six the site shows today.
 */
async function ensurePage(client: SanityClient) {
  const versions = await loadVersions(client);
  if (versions.published) return versions;

  await client.createIfNotExists({
    _id: PAGE_ID,
    _type: "surprisePage",
    heading: surpriseContent.heading,
    intro: surpriseContent.intro,
    ideas: surpriseContent.ideas.map((idea) => ({
      _type: "idea",
      _key: newKey(),
      title: idea.title,
      note: idea.note,
    })),
  });
  return loadVersions(client);
}

function describeIdea(idea: RawIdea) {
  return { key: idea._key, title: idea.title ?? "", note: idea.note ?? null };
}

export async function getSurprisePage(client: SanityClient) {
  const { published, draft } = await loadVersions(client);

  if (!published) {
    return {
      existsInSanity: false,
      note: "Overrask meg-siden er ikke opprettet i Sanity ennå, så nettsiden viser de innebygde ideene under. Siden opprettes med disse ideene ved første endring, så ingenting forsvinner.",
      url: pageUrl,
      standardTexts: { heading: surpriseContent.heading, intro: surpriseContent.intro },
      ideas: surpriseContent.ideas.map((idea) => ({ key: null, ...idea })),
      hasUnpublishedDraftInStudio: !!draft,
    };
  }

  const ideas = (published.ideas ?? []).map(describeIdea);
  return {
    existsInSanity: true,
    url: pageUrl,
    note: ideas.length
      ? "Nettsiden trekker én tilfeldig idé fra listen hver gang noen skraper."
      : "Listen er tom, så nettsiden viser de innebygde ideene.",
    texts: Object.fromEntries(
      SURPRISE_TEXT_FIELDS.map((field) => [field, published[field] ?? null]),
    ),
    ideaCount: ideas.length,
    ideas,
    hasUnpublishedDraftInStudio: !!draft,
  };
}

export async function updateSurpriseTexts(
  client: SanityClient,
  set: Partial<Record<SurpriseTextField, string>>,
  clearFields: SurpriseTextField[],
) {
  const values = Object.fromEntries(
    Object.entries(set).filter(([, value]) => value !== undefined && value !== ""),
  );

  const conflicting = clearFields.filter((field) => field in values);
  if (conflicting.length) {
    throw new UserError(`Kan ikke både endre og tømme samme felt: ${conflicting.join(", ")}.`);
  }
  if (Object.keys(values).length === 0 && clearFields.length === 0) {
    throw new UserError("Ingen endringer oppgitt. Si hvilke tekster som skal endres.");
  }

  const { published, draft } = await ensurePage(client);
  const transaction = client.transaction();
  for (const doc of [published, draft]) {
    if (!doc) continue;
    transaction.patch(doc._id, (patch) => {
      let next = patch;
      if (Object.keys(values).length) next = next.set(values);
      if (clearFields.length) next = next.unset(clearFields);
      return next;
    });
  }
  await transaction.commit();
  revalidateSurprisePage();

  return { changedFields: Object.keys(values), clearedFields: clearFields, url: pageUrl };
}

/**
 * Adds several ideas at once. Ideas whose title is already on the list, or
 * repeated within the same call, are skipped and reported back.
 */
export async function addIdeas(
  client: SanityClient,
  input: IdeaInput[],
  position: "first" | "last",
) {
  const { published, draft } = await ensurePage(client);
  const existing = new Set(
    (published?.ideas ?? draft?.ideas ?? []).map((idea) => normalise(idea.title)),
  );

  const added: { key: string; title: string; note: string | null }[] = [];
  const skipped: string[] = [];
  const items: { _type: "idea"; _key: string; title: string; note?: string }[] = [];

  for (const idea of input) {
    const name = normalise(idea.title);
    if (existing.has(name)) {
      skipped.push(idea.title);
      continue;
    }
    existing.add(name);
    const key = newKey();
    items.push({
      _type: "idea",
      _key: key,
      title: idea.title,
      ...(idea.note ? { note: idea.note } : {}),
    });
    added.push({ key, title: idea.title, note: idea.note ?? null });
  }

  if (!items.length) {
    throw new UserError(
      `Alle ideene finnes allerede på listen: ${skipped.join(", ")}. Ingenting er lagt til.`,
    );
  }

  const transaction = client.transaction();
  for (const doc of [published, draft]) {
    if (!doc) continue;
    const hasIdeas = (doc.ideas ?? []).length > 0;
    transaction.patch(doc._id, (patch) => {
      const next = patch.setIfMissing({ ideas: [] });
      return position === "first" && hasIdeas
        ? next.insert("before", "ideas[0]", items)
        : next.append("ideas", items);
    });
  }
  await transaction.commit();
  revalidateSurprisePage();

  return {
    added,
    skippedAsDuplicates: skipped,
    totalIdeas: existing.size,
    url: pageUrl,
  };
}

function findIdea(ideas: RawIdea[], ref: string): RawIdea {
  const wanted = ref.trim();
  const byKey = ideas.find((idea) => idea._key === wanted);
  if (byKey) return byKey;

  const byTitle = ideas.filter((idea) => normalise(idea.title) === normalise(wanted));
  if (byTitle.length === 1) return byTitle[0];
  if (byTitle.length > 1) {
    throw new UserError(`Flere ideer heter «${ref}». Bruk ideens key fra get_surprise_ideas.`);
  }
  throw new UserError(
    `Fant ikke ideen «${ref}». Bruk get_surprise_ideas for å se ideene og deres key.`,
  );
}

async function versionsWithIdea(client: SanityClient, ref: string) {
  const { published, draft } = await loadVersions(client);
  if (!published && !draft) {
    throw new UserError(
      "Ideene ligger ikke i Sanity ennå. Legg til en idé eller endre en tekst først, så opprettes siden med de innebygde ideene.",
    );
  }
  const idea = findIdea(published?.ideas ?? draft?.ideas ?? [], ref);
  const docs = [published, draft].filter(
    (doc): doc is RawSurprisePage =>
      !!doc && (doc.ideas ?? []).some((item) => item._key === idea._key),
  );
  return { idea, docs };
}

const ideaPath = (key: string, field?: string) =>
  `ideas[_key=="${key}"]${field ? `.${field}` : ""}`;

export async function updateIdea(
  client: SanityClient,
  ref: string,
  changes: Partial<IdeaInput>,
  clearNote: boolean,
) {
  const values = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined && value !== ""),
  );

  if (clearNote && "note" in values) {
    throw new UserError("Kan ikke både endre og fjerne den morsomme teksten.");
  }
  if (Object.keys(values).length === 0 && !clearNote) {
    throw new UserError("Ingen endringer oppgitt. Si hva som skal endres på ideen.");
  }

  const { idea, docs } = await versionsWithIdea(client, ref);
  const key = idea._key;

  if (typeof values.title === "string") {
    const all = docs[0]?.ideas ?? [];
    const clash = all.find(
      (item) => item._key !== key && normalise(item.title) === normalise(values.title as string),
    );
    if (clash) throw new UserError(`Det finnes allerede en idé som heter «${clash.title}».`);
  }

  const transaction = client.transaction();
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => {
      let next = patch;
      if (Object.keys(values).length) {
        next = next.set(
          Object.fromEntries(
            Object.entries(values).map(([field, value]) => [ideaPath(key, field), value]),
          ),
        );
      }
      if (clearNote) next = next.unset([ideaPath(key, "note")]);
      return next;
    });
  }
  await transaction.commit();
  revalidateSurprisePage();

  return {
    key,
    title: (values.title as string | undefined) ?? idea.title,
    changedFields: Object.keys(values),
    clearedNote: clearNote,
    url: pageUrl,
  };
}

export async function removeIdea(client: SanityClient, ref: string, confirmTitle: string) {
  const { idea, docs } = await versionsWithIdea(client, ref);

  if (normalise(confirmTitle) !== normalise(idea.title)) {
    throw new UserError(
      `Navnet stemmer ikke. For å fjerne må ideen gjentas nøyaktig: «${idea.title}». Ingenting er fjernet.`,
    );
  }

  const transaction = client.transaction();
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => patch.unset([ideaPath(idea._key)]));
  }
  await transaction.commit();
  revalidateSurprisePage();

  const remaining = (docs[0]?.ideas ?? []).length - 1;
  return {
    key: idea._key,
    title: idea.title,
    removed: true,
    remainingIdeas: remaining,
    note:
      remaining === 0
        ? "Listen er nå tom, så nettsiden viser de innebygde ideene."
        : undefined,
    url: pageUrl,
  };
}
