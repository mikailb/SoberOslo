"use client";

import { Children, useState, type ReactNode } from "react";

type ShowMoreGridProps = {
  children: ReactNode;
  /** Grid classes for the list itself. */
  className: string;
  /** How many items to show before folding. */
  collapsedCount?: number;
  /** Fills in "Vis alle 20 …". */
  itemNoun: string;
};

/**
 * A list that folds after a set number of items.
 *
 * The items are rendered on the server and passed in as children, so only this
 * small wrapper runs in the browser. Nothing is removed from the page when
 * folded, so the fold costs nothing on first load.
 */
export function ShowMoreGrid({
  children,
  className,
  collapsedCount = 8,
  itemNoun,
}: ShowMoreGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const items = Children.toArray(children);
  const isFoldable = items.length > collapsedCount;
  const visible =
    isFoldable && !isExpanded ? items.slice(0, collapsedCount) : items;

  return (
    <>
      <ul className={className}>{visible}</ul>

      {isFoldable ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/45 hover:bg-ink/[0.04]"
          >
            {isExpanded ? "Vis færre" : `Vis alle ${items.length} ${itemNoun}`}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}
