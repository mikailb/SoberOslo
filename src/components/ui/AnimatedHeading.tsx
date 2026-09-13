import type { CSSProperties } from "react";

type AnimatedHeadingProps = {
  text: string;
  as?: "h1" | "h2";
  className?: string;
  /** Milliseconds before the first word appears. */
  delay?: number;
  /** Milliseconds between words. */
  step?: number;
};

/**
 * A headline whose words fade up one after another.
 *
 * Pure CSS, rendered on the server: no JavaScript ships for this. The keyframes
 * are switched off by `prefers-reduced-motion`, which leaves the text in place.
 * Screen readers read the whole heading normally, since it is still one string
 * of text with ordinary spaces between the words.
 */
export function AnimatedHeading({
  text,
  as: Tag = "h1",
  className = "",
  delay = 0,
  step = 70,
}: AnimatedHeadingProps) {
  // An empty heading from the CMS renders nothing at all, rather than an
  // empty line that still takes up space.
  if (!text.trim()) return null;

  const words = text.split(" ");

  return (
    <Tag className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            className="inline-block"
            style={
              {
                animation:
                  "so-fade-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) both",
                animationDelay: `${delay + index * step}ms`,
              } as CSSProperties
            }
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
