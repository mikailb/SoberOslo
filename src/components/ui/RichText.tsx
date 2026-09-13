import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "next-sanity";
import Link from "next/link";

import { isExternalHref, safeLinkHref } from "@/lib/urls";

/**
 * Renders Portable Text from Sanity.
 *
 * Everything becomes React elements, so CMS content can never inject markup or
 * scripts. Link targets are validated first, which drops `javascript:` and
 * other unwanted protocols before they reach the page.
 */

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => (
      <h2 className="display-md mt-12 mb-4 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-10 mb-3 font-display text-xl font-medium first:mt-0 sm:text-2xl">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-green pl-5 font-display text-xl leading-snug text-green-ink italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-5 list-disc space-y-2 pl-5 marker:text-green">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-5 list-decimal space-y-2 pl-5 marker:text-green">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-ink">{children}</strong>
    ),
    em: ({ children }) => <em>{children}</em>,
    link: ({ value, children }) => {
      const href = safeLinkHref(value?.href);
      if (!href) return <>{children}</>;

      // A mailto address is an ordinary anchor, not a route to navigate to.
      if (href.startsWith("mailto:")) {
        return (
          <a
            href={href}
            className="link-underline font-medium text-green underline decoration-green/30 underline-offset-4 hover:decoration-green"
          >
            {children}
          </a>
        );
      }

      if (isExternalHref(href)) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline font-medium text-green underline decoration-green/30 underline-offset-4 hover:decoration-green"
          >
            {children}
          </a>
        );
      }

      return (
        <Link
          href={href}
          className="font-medium text-green underline decoration-green/30 underline-offset-4 hover:decoration-green"
        >
          {children}
        </Link>
      );
    },
  },
};

type RichTextProps = {
  value?: PortableTextBlock[] | null;
  className?: string;
};

export function RichText({ value, className = "" }: RichTextProps) {
  if (!value?.length) return null;

  return (
    <div
      className={`space-y-5 text-[1.0625rem] leading-[1.68] text-muted ${className}`}
    >
      <PortableText value={value} components={components} />
    </div>
  );
}
