import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  intro?: string;
  /** Optional link or button shown opposite the title on wide screens. */
  action?: ReactNode;
  align?: "start" | "center";
  tone?: "dark" | "light";
  as?: "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  intro,
  action,
  align = "start",
  tone = "dark",
  as: Tag = "h2",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col gap-6 ${
        centered
          ? "items-center text-center"
          : "md:flex-row md:items-end md:justify-between"
      } ${className}`}
    >
      <div className={`max-w-2xl ${centered ? "" : "flex-1"}`}>
        {eyebrow ? (
          <p
            className={`eyebrow mb-4 ${
              tone === "light" ? "text-sage-deep" : "text-green"
            }`}
          >
            {eyebrow}
          </p>
        ) : null}

        {/* An empty heading from the CMS means no heading, not an empty line. */}
        {title ? (
          <Tag
            className={`display-md ${
              tone === "light" ? "text-white" : "text-ink"
            }`}
          >
            {title}
          </Tag>
        ) : null}

        {intro ? (
          <p
            className={`lede mt-4 ${
              tone === "light" ? "text-white/75" : "text-muted"
            }`}
          >
            {intro}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
