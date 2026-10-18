import "server-only";

import { revalidatePath } from "next/cache";
import type { SanityClient } from "next-sanity";

import { merchContent, siteConfig } from "@/lib/site";

import { UserError } from "./activities";
import { newKey } from "./portableText";
import type { DownloadedImage } from "./toolHelpers";

/**
 * Everything the ChatGPT tools do to the merch page.
 *
 * The page is one document with the fixed id `merchPage`: some page texts and
 * a list of products. Products are found by their `_key`, or by name.
 *
 * Changes go to the published document, and to the Studio draft too when one
 * is open, so the next Publish in the Studio does not undo them.
 */

const PAGE_ID = "merchPage";
const DRAFT_ID = `drafts.${PAGE_ID}`;

export const MERCH_TEXT_FIELDS = [
  "heading",
  "intro",
  "shopUrl",
  "linkLabel",
  "productsHeading",
  "ctaHeading",
  "ctaBody",
] as const;

export type MerchTextField = (typeof MERCH_TEXT_FIELDS)[number];

export const PRODUCT_CLEARABLE_FIELDS = ["description", "price", "url", "image"] as const;

export type ProductClearableField = (typeof PRODUCT_CLEARABLE_FIELDS)[number];

export type ProductInput = {
  name?: string;
  description?: string;
  price?: string;
  url?: string;
  soldOut?: boolean;
};

type RawProduct = {
  _key: string;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  url?: string | null;
  soldOut?: boolean | null;
  image?: { alt?: string | null; url?: string | null } | null;
};

type RawMerchPage = { _id: string; _rev: string; products?: RawProduct[] | null } & Partial<
  Record<MerchTextField, string | null>
>;

const pageUrl = `${siteConfig.url.replace(/\/$/, "")}/merch`;

function revalidateMerchPage() {
  try {
    revalidatePath("/merch");
  } catch (error) {
    console.error("[mcp] Kunne ikke oppdatere /merch:", error);
  }
}

async function loadVersions(client: SanityClient) {
  const docs = await client.fetch<RawMerchPage[]>(
    `*[_id in [$id, $draftId]]{
      _id, _rev, ${MERCH_TEXT_FIELDS.join(", ")},
      "products": products[]{
        _key, name, description, price, url, soldOut,
        "image": image{ alt, "url": asset->url }
      }
    }`,
    { id: PAGE_ID, draftId: DRAFT_ID },
  );

  return {
    published: docs.find((doc) => doc._id === PAGE_ID) ?? null,
    draft: docs.find((doc) => doc._id === DRAFT_ID) ?? null,
  };
}

/**
 * Makes sure the published page exists before anything is written to it.
 *
 * Once the page exists, an empty field means "no text" on the website. A new
 * page is therefore filled with the standard wording first, so that changing
 * one field does not wipe out every other text on the page.
 */
async function ensurePage(client: SanityClient) {
  const versions = await loadVersions(client);
  if (versions.published) return versions;

  await client.createIfNotExists({
    _id: PAGE_ID,
    _type: "merchPage",
    heading: merchContent.heading,
    intro: merchContent.intro,
    productsHeading: merchContent.productsHeading,
    ctaHeading: merchContent.ctaHeading,
    ctaBody: merchContent.ctaBody,
  });
  return loadVersions(client);
}

function describeProduct(product: RawProduct) {
  return {
    key: product._key,
    name: product.name ?? "",
    description: product.description ?? null,
    price: product.price ?? null,
    url: product.url ?? null,
    soldOut: product.soldOut === true,
    image: product.image?.url
      ? { url: product.image.url, alt: product.image.alt ?? "" }
      : null,
  };
}

export async function getMerchPage(client: SanityClient) {
  const { published, draft } = await loadVersions(client);
  const page = published ?? draft;

  if (!published) {
    return {
      existsInSanity: false,
      note: "Merch-siden er ikke opprettet i Sanity ennå, så nettsiden viser standardtekstene. Den opprettes med standardtekstene ved første endring.",
      url: pageUrl,
      standardTexts: {
        heading: merchContent.heading,
        intro: merchContent.intro,
        productsHeading: merchContent.productsHeading,
        ctaHeading: merchContent.ctaHeading,
        ctaBody: merchContent.ctaBody,
        linkLabel: merchContent.linkLabel,
      },
      products: (page?.products ?? []).map(describeProduct),
      hasUnpublishedDraftInStudio: !!draft,
    };
  }

  return {
    existsInSanity: true,
    url: pageUrl,
    note: "Tomme tekstfelt vises ikke på nettsiden. Unntak: tom knappetekst (linkLabel) gir «Gå til nettbutikken». Uten shopUrl vises en merknad i stedet for knappen.",
    texts: Object.fromEntries(
      MERCH_TEXT_FIELDS.map((field) => [field, published[field] ?? null]),
    ),
    products: (published.products ?? []).map(describeProduct),
    hasUnpublishedDraftInStudio: !!draft,
  };
}

export async function updateMerchTexts(
  client: SanityClient,
  set: Partial<Record<MerchTextField, string>>,
  clearFields: MerchTextField[],
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
  revalidateMerchPage();

  return {
    changedFields: Object.keys(values),
    clearedFields: clearFields,
    url: pageUrl,
  };
}

/** Finds one product by key, or by name when that is unambiguous. */
function findProduct(products: RawProduct[], ref: string): RawProduct {
  const wanted = ref.trim();
  const byKey = products.find((product) => product._key === wanted);
  if (byKey) return byKey;

  const normalise = (value: string | null | undefined) =>
    (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");
  const byName = products.filter((product) => normalise(product.name) === normalise(wanted));

  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    throw new UserError(
      `Flere produkter heter «${ref}». Bruk produktets key fra get_merch_page.`,
    );
  }
  throw new UserError(
    `Fant ikke produktet «${ref}». Bruk get_merch_page for å se produktene og deres key.`,
  );
}

/** The page versions that contain the product, so a patch never misses. */
async function versionsWithProduct(client: SanityClient, ref: string) {
  const { published, draft } = await loadVersions(client);
  const product = findProduct(published?.products ?? draft?.products ?? [], ref);
  const docs = [published, draft].filter(
    (doc): doc is RawMerchPage =>
      !!doc && (doc.products ?? []).some((item) => item._key === product._key),
  );
  return { product, docs };
}

const productPath = (key: string, field?: string) =>
  `products[_key=="${key}"]${field ? `.${field}` : ""}`;

export async function addProduct(
  client: SanityClient,
  input: Required<Pick<ProductInput, "name">> & ProductInput,
  position: "first" | "last",
) {
  const { published, draft } = await ensurePage(client);
  const key = newKey();
  const product = {
    _type: "product",
    _key: key,
    name: input.name,
    soldOut: input.soldOut ?? false,
    ...(input.description ? { description: input.description } : {}),
    ...(input.price ? { price: input.price } : {}),
    ...(input.url ? { url: input.url } : {}),
  };

  const transaction = client.transaction();
  for (const doc of [published, draft]) {
    if (!doc) continue;
    const hasProducts = (doc.products ?? []).length > 0;
    transaction.patch(doc._id, (patch) => {
      const next = patch.setIfMissing({ products: [] });
      return position === "first" && hasProducts
        ? next.insert("before", "products[0]", [product])
        : next.append("products", [product]);
    });
  }
  await transaction.commit();
  revalidateMerchPage();

  return { key, name: input.name, position, url: pageUrl };
}

export async function updateProduct(
  client: SanityClient,
  ref: string,
  changes: ProductInput,
  clearFields: ProductClearableField[],
  moveTo?: "first" | "last",
) {
  const values = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined && value !== ""),
  );

  const conflicting = clearFields.filter((field) => field in values);
  if (conflicting.length) {
    throw new UserError(`Kan ikke både endre og tømme samme felt: ${conflicting.join(", ")}.`);
  }
  if (Object.keys(values).length === 0 && clearFields.length === 0 && !moveTo) {
    throw new UserError("Ingen endringer oppgitt. Si hva som skal endres på produktet.");
  }

  const { product, docs } = await versionsWithProduct(client, ref);
  const key = product._key;

  const transaction = client.transaction();
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => {
      let next = patch;
      if (Object.keys(values).length) {
        next = next.set(
          Object.fromEntries(
            Object.entries(values).map(([field, value]) => [productPath(key, field), value]),
          ),
        );
      }
      if (clearFields.length) {
        next = next.unset(clearFields.map((field) => productPath(key, field)));
      }
      return next;
    });
  }
  await transaction.commit();

  // Moving rewrites the order of the whole list, so it is done afterwards on
  // fresh data and refused if someone changed the page in between.
  if (moveTo) {
    const reorder = client.transaction();
    for (const id of [PAGE_ID, DRAFT_ID]) {
      const doc = await client.getDocument<{ _rev: string; products?: { _key: string }[] }>(id);
      const items = doc?.products ?? [];
      const item = items.find((entry) => entry._key === key);
      if (!doc || !item) continue;

      const others = items.filter((entry) => entry._key !== key);
      reorder.patch(id, (patch) =>
        patch
          .ifRevisionId(doc._rev)
          .set({ products: moveTo === "first" ? [item, ...others] : [...others, item] }),
      );
    }
    await reorder.commit();
  }

  revalidateMerchPage();

  return {
    key,
    name: (values.name as string | undefined) ?? product.name,
    changedFields: Object.keys(values),
    clearedFields: clearFields,
    movedTo: moveTo ?? null,
    note:
      values.soldOut === true || (product.soldOut && values.soldOut === undefined)
        ? "Utsolgte produkter vises med merket «Utsolgt» og lenker ikke til butikken."
        : undefined,
    url: pageUrl,
  };
}

export async function removeProduct(client: SanityClient, ref: string, confirmName: string) {
  const { product, docs } = await versionsWithProduct(client, ref);

  const normalise = (value: string | null | undefined) =>
    (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");
  if (normalise(confirmName) !== normalise(product.name)) {
    throw new UserError(
      `Navnet stemmer ikke. For å fjerne må produktnavnet gjentas nøyaktig: «${product.name}». Ingenting er fjernet.`,
    );
  }

  const transaction = client.transaction();
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => patch.unset([productPath(product._key)]));
  }
  await transaction.commit();
  revalidateMerchPage();

  return { key: product._key, name: product.name, removed: true, url: pageUrl };
}

export async function setProductImage(
  client: SanityClient,
  ref: string,
  image: DownloadedImage,
  alt: string,
) {
  const { product, docs } = await versionsWithProduct(client, ref);

  const asset = await client.assets.upload("image", image.body, {
    filename: `merch-${product._key}-${Date.now()}.${image.ext}`,
    contentType: image.mime,
  });

  const transaction = client.transaction();
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) =>
      patch.set({
        [productPath(product._key, "image")]: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
          alt,
        },
      }),
    );
  }
  await transaction.commit();
  revalidateMerchPage();

  return {
    key: product._key,
    name: product.name,
    imageUrl: asset.url,
    replacedPreviousImage: !!product.image?.url,
    url: pageUrl,
  };
}
