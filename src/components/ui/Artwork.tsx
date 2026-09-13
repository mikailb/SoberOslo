/**
 * Placeholder artwork.
 *
 * Shown wherever the CMS has no photo yet. Rather than a grey box, it draws a
 * small abstract composition in the Sober Oslo palette, picked deterministically
 * from a seed so the same activity always gets the same picture.
 *
 * It is plain inline SVG: no images to download, and it scales to any size.
 */

const PALETTES = [
  { ground: "#dce7db", ink: "#14624a", accent: "#e4633c" },
  { ground: "#f7ddd2", ink: "#14624a", accent: "#e4633c" },
  { ground: "#14624a", ink: "#dce7db", accent: "#f7ddd2" },
  { ground: "#bcd0ba", ink: "#0e4535", accent: "#e4633c" },
  { ground: "#0e4535", ink: "#bcd0ba", accent: "#f7ddd2" },
  { ground: "#f6f3ec", ink: "#14624a", accent: "#e4633c" },
] as const;

function hash(seed: string): number {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return value;
}

type ArtworkProps = {
  seed: string;
  className?: string;
};

export function Artwork({ seed, className }: ArtworkProps) {
  const key = hash(seed || "sober-oslo");
  const palette = PALETTES[key % PALETTES.length];
  const variant = Math.floor(key / PALETTES.length) % 6;

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="400" height="300" fill={palette.ground} />
      {renderVariant(variant, palette)}
    </svg>
  );
}

function renderVariant(
  variant: number,
  palette: (typeof PALETTES)[number],
): React.ReactNode {
  switch (variant) {
    case 0:
      return (
        <>
          <circle cx="290" cy="105" r="118" fill={palette.ink} />
          <circle cx="105" cy="215" r="62" fill={palette.accent} />
        </>
      );
    case 1:
      return (
        <>
          <path
            d="M40 280a160 160 0 0 1 320 0"
            fill="none"
            stroke={palette.ink}
            strokeWidth="34"
          />
          <path
            d="M100 280a100 100 0 0 1 200 0"
            fill="none"
            stroke={palette.accent}
            strokeWidth="26"
          />
        </>
      );
    case 2:
      return (
        <>
          <circle cx="150" cy="150" r="105" fill={palette.ink} />
          <circle
            cx="265"
            cy="150"
            r="105"
            fill={palette.accent}
            opacity="0.85"
          />
        </>
      );
    case 3:
      return (
        <>
          <path d="M0 300 L170 60 L340 300 Z" fill={palette.ink} />
          <path d="M180 300 L300 130 L420 300 Z" fill={palette.accent} />
          <circle cx="318" cy="66" r="34" fill={palette.accent} />
        </>
      );
    case 4:
      return (
        <>
          <rect x="0" y="0" width="400" height="150" fill={palette.ink} />
          <circle cx="200" cy="150" r="76" fill={palette.accent} />
          <circle cx="200" cy="150" r="34" fill={palette.ground} />
        </>
      );
    default:
      return (
        <>
          <path
            d="M0 190q100-120 200 0t200 0v110H0z"
            fill={palette.ink}
          />
          <circle cx="300" cy="80" r="46" fill={palette.accent} />
        </>
      );
  }
}
