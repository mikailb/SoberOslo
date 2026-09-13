"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  onNavigate?: () => void;
  className?: string;
  activeClassName?: string;
};

/** True for the exact page, or for anything below it (`/activities/…`). */
export function useIsActive(href: string): boolean {
  const pathname = usePathname();
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  children,
  onNavigate,
  className = "",
  activeClassName = "",
}: NavLinkProps) {
  const isActive = useIsActive(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      className={`${className} ${isActive ? activeClassName : ""}`}
    >
      {children}
    </Link>
  );
}
