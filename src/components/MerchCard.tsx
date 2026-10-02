import { Media } from "@/components/ui/Media";
import { safeExternalUrl } from "@/lib/urls";
import type { MerchProduct } from "@/sanity/types";

type MerchCardProps = {
  product: MerchProduct;
};

/**
 * One product on the merch page.
 *
 * Presentation only. There is no cart or checkout here: a product with an
 * address becomes a link to the shop, and one without is just a picture and a
 * price. Nothing is sold from this site.
 */
export function MerchCard({ product }: MerchCardProps) {
  const name = product.name?.trim();
  if (!name) return null;

  const url = product.soldOut ? null : safeExternalUrl(product.url);
  const description = product.description?.trim();
  const price = product.price?.trim();

  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-sage">
        <Media
          image={product.image}
          seed={product._key}
          alt={product.image?.alt ?? ""}
          sizes="(min-width: 1024px) 30vw, 45vw"
          width={800}
          className={
            url
              ? "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              : undefined
          }
        />
        {product.soldOut ? (
          <p className="absolute top-3 left-3 rounded-full bg-cream/95 px-3 py-1 text-xs font-medium text-ink">
            Utsolgt
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg leading-snug font-medium text-ink transition-colors group-hover:text-green sm:text-xl">
            {name}
          </h3>
          {price ? (
            <p className="shrink-0 text-sm text-muted">{price}</p>
          ) : null}
        </div>

        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </>
  );

  if (!url) {
    return <article className="flex h-full flex-col">{body}</article>;
  }

  return (
    <article className="h-full">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col rounded-[1.25rem] focus-visible:outline-offset-4"
      >
        {body}
      </a>
    </article>
  );
}
