"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { NavLink } from "./NavLink";

type MobileNavProps = {
  items: readonly { href: string; label: string }[];
  membershipUrl: string;
};

/**
 * The small-screen menu.
 *
 * Opens a full-height panel, keeps keyboard focus inside it while open, closes
 * on Escape or navigation, and returns focus to the toggle afterwards.
 */
export function MobileNav({ items, membershipUrl }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  /**
   * The menu remembers which page it was opened on. Comparing that with the
   * current page means it closes by itself after any navigation, including the
   * browser's back button, without an effect that re-renders the tree.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const isOpen = openedOn !== null && openedOn === pathname;

  const close = useCallback(() => setOpenedOn(null), []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>("a, button");
    focusable?.[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenedOn(null);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpenedOn(isOpen ? null : pathname)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
      >
        <span className="sr-only">{isOpen ? "Lukk meny" : "Åpne meny"}</span>
        <span aria-hidden="true" className="relative block h-4 w-6">
          <span
            className={`absolute left-0 block h-[2px] w-6 bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen ? "top-[7px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-[7px] block h-[2px] w-6 bg-current transition-opacity duration-200 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-[2px] w-6 bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen ? "top-[7px] -rotate-45" : "top-[14px]"
            }`}
          />
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 top-[var(--header-height)] z-40 bg-ink/20 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Kept mounted so it can slide, and made inert while closed so its
          links stay out of the tab order. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        inert={!isOpen}
        className={`fixed inset-x-0 top-[var(--header-height)] z-40 max-h-[calc(100dvh-var(--header-height))] overflow-y-auto border-b border-line bg-cream transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <nav aria-label="Hovedmeny" className="px-5 pt-2 pb-7">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href} className="border-b border-line/70">
                <NavLink
                  href={item.href}
                  onNavigate={close}
                  className="group flex items-center justify-between py-4 font-display text-2xl text-ink transition-colors"
                  activeClassName="text-green"
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-coral opacity-0 transition-opacity group-data-[active=true]:opacity-100"
                  />
                </NavLink>
              </li>
            ))}
          </ul>

          <a
            href={membershipUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-green px-6 py-3.5 font-medium text-white transition-colors hover:bg-green-deep"
          >
            Bli medlem
          </a>
        </nav>
      </div>
    </div>
  );
}
