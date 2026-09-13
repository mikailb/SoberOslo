import { formatFullDate, formatTimeRange, machineDateTime } from "@/lib/format";
import { categoryLabels } from "@/lib/site";
import type { Activity } from "@/sanity/types";

type ActivityMetaProps = {
  activity: Pick<
    Activity,
    "date" | "startTime" | "endTime" | "location" | "price" | "category"
  >;
  tone?: "dark" | "light";
};

/** Date, time, place and price, shown as a definition list on detail pages. */
export function ActivityMeta({ activity, tone = "dark" }: ActivityMetaProps) {
  const time = formatTimeRange(activity.startTime, activity.endTime);
  const category = activity.category
    ? categoryLabels[activity.category]
    : null;

  const rows = [
    {
      term: "Dato",
      value: (
        <time dateTime={machineDateTime(activity.date, activity.startTime)}>
          {formatFullDate(activity.date)}
        </time>
      ),
    },
    time ? { term: "Tid", value: time } : null,
    activity.location ? { term: "Sted", value: activity.location } : null,
    activity.price ? { term: "Pris", value: activity.price } : null,
    category ? { term: "Type", value: category } : null,
  ].filter(Boolean) as { term: string; value: React.ReactNode }[];

  const labelClass = tone === "light" ? "text-white/60" : "text-muted";
  const valueClass = tone === "light" ? "text-white" : "text-ink";
  const lineClass = tone === "light" ? "border-white/15" : "border-line";

  return (
    <dl className={`divide-y ${lineClass} border-y ${lineClass}`}>
      {rows.map((row) => (
        <div
          key={row.term}
          className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3.5"
        >
          <dt className={`eyebrow w-20 shrink-0 ${labelClass}`}>{row.term}</dt>
          <dd className={`text-[0.9375rem] ${valueClass}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
