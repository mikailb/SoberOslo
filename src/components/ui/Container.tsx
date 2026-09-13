import type { ElementType, ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  as?: ElementType;
  /** `wide` for full-bleed sections, `narrow` for reading columns. */
  size?: "default" | "wide" | "narrow";
  className?: string;
};

const SIZES = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[88rem]",
} as const;

export function Container({
  children,
  as: Tag = "div",
  size = "default",
  className = "",
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full px-5 sm:px-8 ${SIZES[size]} ${className}`}>
      {children}
    </Tag>
  );
}
