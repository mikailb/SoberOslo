import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import type { CmsImage } from "@/sanity/types";

type ImageSectionProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  image?: CmsImage | null;
  seed: string;
  action?: ReactNode;
  /** Puts the picture on the left instead of the right. */
  reverse?: boolean;
  tone?: "cream" | "sage" | "green";
  className?: string;
};

const TONES = {
  cream: {
    section: "",
    heading: "text-ink",
    body: "text-muted",
    eyebrow: "text-green",
  },
  sage: {
    section: "bg-sage",
    heading: "text-green-ink",
    body: "text-green-ink/75",
    eyebrow: "text-green",
  },
  green: {
    section: "bg-green-deep",
    heading: "text-white",
    body: "text-white/75",
    eyebrow: "text-sage-deep",
  },
} as const;

/** A picture beside a short piece of text. Used on several pages. */
export function ImageSection({
  eyebrow,
  title,
  children,
  image,
  seed,
  action,
  reverse = false,
  tone = "cream",
  className = "",
}: ImageSectionProps) {
  const colors = TONES[tone];

  return (
    <section className={`${colors.section} ${className}`}>
      <Container size="wide" className="py-20 sm:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className={reverse ? "lg:order-2" : ""}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-sage">
              <Media
                image={image}
                seed={seed}
                alt={image?.alt ?? ""}
                sizes="(min-width: 1024px) 46vw, 92vw"
                width={1400}
              />
            </div>
          </Reveal>

          <Reveal delay={100} className={reverse ? "lg:order-1" : ""}>
            <div className="max-w-xl">
              {eyebrow ? (
                <p className={`eyebrow mb-4 ${colors.eyebrow}`}>{eyebrow}</p>
              ) : null}
              {title ? (
                <h2 className={`display-md ${colors.heading}`}>{title}</h2>
              ) : null}
              <div className={`lede mt-5 space-y-4 ${colors.body}`}>
                {children}
              </div>
              {action ? <div className="mt-8">{action}</div> : null}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
