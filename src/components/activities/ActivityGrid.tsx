import { Reveal } from "@/components/ui/Reveal";
import { ShowMoreGrid } from "@/components/ui/ShowMoreGrid";
import type { ActivitySummary } from "@/sanity/types";
import { ActivityCard } from "./ActivityCard";

type ActivityGridProps = {
  activities: ActivitySummary[];
  columns?: 2 | 3 | 4;
  /** The first row loads eagerly on pages where it is above the fold. */
  priorityCount?: number;
  /** Folds the list behind a "Vis alle" button once it gets long. */
  collapseAfter?: number;
};

const COLUMN_CLASSES = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

const SIZES = {
  2: "(min-width: 640px) 45vw, 92vw",
  3: "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw",
  4: "(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 92vw",
} as const;

export function ActivityGrid({
  activities,
  columns = 3,
  priorityCount = 0,
  collapseAfter,
}: ActivityGridProps) {
  const gridClass = `grid grid-cols-1 gap-x-6 gap-y-12 ${COLUMN_CLASSES[columns]}`;

  const items = activities.map((activity, index) => (
    <li key={activity._id} className="h-full">
      <Reveal delay={Math.min(index, 3) * 80} className="h-full">
        <ActivityCard
          activity={activity}
          sizes={SIZES[columns]}
          priority={index < priorityCount}
        />
      </Reveal>
    </li>
  ));

  if (collapseAfter) {
    return (
      <ShowMoreGrid
        className={gridClass}
        collapsedCount={collapseAfter}
        itemNoun="aktiviteter"
      >
        {items}
      </ShowMoreGrid>
    );
  }

  return <ul className={gridClass}>{items}</ul>;
}
