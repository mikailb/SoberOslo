import Link from "next/link";
import type { ReactNode } from "react";

import { isExternalHref } from "@/lib/urls";

type Variant = "primary" | "secondary" | "accent" | "quiet" | "onDark";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[background-color,color,border-color,transform,box-shadow] duration-200 " +
  "ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-green text-white hover:bg-green-deep shadow-[0_1px_2px_rgba(8,40,31,0.18)] hover:shadow-[0_6px_18px_rgba(8,40,31,0.18)]",
  secondary:
    "border border-ink/20 bg-transparent text-ink hover:border-ink/45 hover:bg-ink/[0.04]",
  accent: "bg-coral text-ink hover:bg-[#d9552e]",
  quiet: "bg-sage text-green-ink hover:bg-sage-deep",
  onDark:
    "border border-white/30 bg-transparent text-white hover:border-white/70 hover:bg-white/10",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-7 py-3.5 text-base",
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

type ButtonProps = CommonProps & {
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  ariaLabel?: string;
};

/**
 * The one button in the system. Renders a Next link for internal paths, a
 * safely-attributed anchor for external ones, and a real button otherwise.
 */
export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  onClick,
  ariaLabel,
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (href && isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={ariaLabel}
      >
        {children}
        <ExternalIcon />
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="opacity-70"
    >
      <path
        d="M6 3h7v7M13 3 4 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
