import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { navigation, siteConfig } from "@/lib/site";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

type HeaderProps = {
  membershipUrl: string;
  organisationName: string;
};

export function Header({ membershipUrl, organisationName }: HeaderProps) {
  return (
    <>
      {/* The slogan sits above everything, in the brand orange. It scrolls away
          with the page while the menu below stays put. */}
      <p className="bg-coral py-2 text-center text-[0.8125rem] font-semibold tracking-[0.08em] text-ink uppercase sm:text-sm">
        {siteConfig.slogan}
      </p>

      <header className="sticky top-0 z-50 border-b-2 border-ink/10 bg-cream shadow-[0_1px_0_rgba(35,31,32,0.04)]">
        <Container size="wide">
          <div className="flex h-[var(--header-height)] items-center justify-between gap-6">
            <Link
              href="/"
              className="group flex items-baseline gap-1.5 font-display text-[1.5rem] leading-none font-semibold tracking-tight text-ink sm:text-[1.75rem]"
            >
              {organisationName}
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-coral transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-150"
              />
            </Link>

            <nav aria-label="Hovedmeny" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      className="group relative block rounded-full px-3.5 py-2 text-base font-medium text-muted transition-colors hover:text-ink"
                      activeClassName="!text-ink"
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3.5 bottom-1 h-[3px] origin-left scale-x-0 rounded-full bg-coral transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-data-[active=true]:scale-x-100"
                      />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-1">
              <a
                href={membershipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden rounded-full bg-ink px-6 py-3 text-[0.9375rem] font-semibold text-cream transition-colors duration-200 hover:bg-green md:inline-flex"
              >
                Bli medlem
              </a>
              <MobileNav items={navigation} membershipUrl={membershipUrl} />
            </div>
          </div>
        </Container>
      </header>
    </>
  );
}
