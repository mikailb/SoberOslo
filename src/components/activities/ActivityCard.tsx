import Link from "next/link";

import { Media } from "@/components/ui/Media";
import {
  formatDateBadge,
  formatShortDate,
  formatTimeRange,
  machineDateTime,
} from "@/lib/format";
import { categoryLabels } from "@/lib/site";
import type { ActivitySummary } from "@/sanity/types";

type ActivityCardProps = {
  activity: ActivitySummary;
  priority?: boolean;
  sizes?: string;
};

export function ActivityCard({
  activity,
  priority = false,
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw",
}: ActivityCardProps) {
  const badge = formatDateBadge(activity.date);
  const time = formatTimeRange(activity.startTime, activity.endTime);
  const category = activity.category ? categoryLabels[activity.category] : null;

  return (
    <article className="h-full">
      <Link
        href={`/activities/${activity.slug}`}
        className="group flex h-full flex-col rounded-[1.25rem] focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-sage">
          <Media
            image={activity.coverImage}
            seed={activity.slug}
            alt={activity.coverImage?.alt ?? ""}
            sizes={sizes}
            priority={priority}
            width={900}
            className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />

          {badge ? (
            <p className="absolute top-3 left-3 rounded-xl bg-cream/95 px-2.5 py-1.5 text-center shadow-[0_1px_3px_rgba(8,40,31,0.12)] backdrop-blur-sm">
              <span className="block font-display text-lg leading-none font-medium text-ink">
                {badge.day}
              </span>
              <span className="mt-1 block text-[0.625rem] font-semibold tracking-[0.12em] text-muted uppercase">
                {badge.month}
              </span>
            </p>
          ) : null}

          {category ? (
            <p className="absolute top-3 right-3 rounded-full bg-green-ink/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {category}
            </p>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col pt-5">
          <h3 className="font-display text-xl leading-snug font-medium text-ink transition-colors group-hover:text-green sm:text-[1.375rem]">
            {activity.title}
          </h3>

          <p className="mt-2 text-sm text-muted">
            <time dateTime={machineDateTime(activity.date, activity.startTime)}>
              {formatShortDate(activity.date)}
              {time ? ` kl. ${time}` : ""}
            </time>
            <span aria-hidden="true"> · </span>
            {activity.location}
          </p>

          <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted">
            {activity.shortDescription}
          </p>

          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-green">
            Les mer
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
