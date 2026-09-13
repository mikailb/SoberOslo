import type { ReactNode } from "react";

type MarqueeProps = {
  children: ReactNode;
  /** Seconds for one full pass. Longer is calmer. */
  duration?: number;
  /** Names the strip for screen readers and for the pause hint. */
  label?: string;
  className?: string;
};

/**
 * A slow horizontal strip that pauses on hover.
 *
 * The content is rendered twice so the loop is seamless; the second copy is
 * hidden from screen readers. With reduced motion the animation stops and the
 * strip becomes an ordinary scrollable row.
 */
export function Marquee({
  children,
  duration = 70,
  label = "Bildestripe",
  className = "",
}: MarqueeProps) {
  return (
    // Focusable so the strip can be reached with Tab. Focus pauses it, which is
    // the keyboard equivalent of hovering and what WCAG 2.2.2 requires.
    <div
      tabIndex={0}
      role="group"
      aria-label={`${label}. Bildene ruller av seg selv, og stopper mens dette feltet har fokus.`}
      className={`so-marquee relative overflow-hidden ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="so-marquee-track flex w-max"
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        <div className="flex gap-4 pr-4 sm:gap-6 sm:pr-6">{children}</div>
        <div className="flex gap-4 pr-4 sm:gap-6 sm:pr-6" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
