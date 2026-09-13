import Link from "next/link";

import { categoryLabels } from "@/lib/site";
import type { ActivityCategory } from "@/sanity/types";

type CategoryFilterProps = {
  /** Categories that actually have upcoming activities. */
  available: ActivityCategory[];
  active: ActivityCategory | null;
};

/**
 * Category pills.
 *
 * They are ordinary links with a query parameter, so filtering happens on the
 * server and works without JavaScript. Only categories with something in them
 * are offered.
 */
export function CategoryFilter({ available, active }: CategoryFilterProps) {
  if (available.length < 2) return null;

  const options: { value: ActivityCategory | null; label: string }[] = [
    { value: null, label: "Alle" },
    ...available.map((value) => ({ value, label: categoryLabels[value] })),
  ];

  return (
    <nav aria-label="Filtrer aktiviteter">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.value === active;
          return (
            <li key={option.value ?? "all"}>
              <Link
                href={
                  option.value
                    ? `/activities?kategori=${option.value}`
                    : "/activities"
                }
                aria-current={isActive ? "true" : undefined}
                scroll={false}
                className={`inline-flex rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
                  isActive
                    ? "border-green bg-green text-white"
                    : "border-ink/15 text-muted hover:border-ink/35 hover:text-ink"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
