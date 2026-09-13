import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { navigation } from "@/lib/site";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

type HeaderProps = {
  membershipUrl: string;
  organisationName: string;
};

export function Header({ membershipUrl, organisationName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-[var(--header-height)] items-center justify-between gap-6">
          <Link
            href="/"
            className="group flex items-baseline gap-1.5 font-display text-xl font-medium tracking-tight text-ink sm:text-[1.375rem]"
          >
            {organisationName}
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-coral transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-150"
            />
          </Link>

          <nav aria-label="Hovedmeny" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="group relative block rounded-full px-3.5 py-2 text-[0.9375rem] text-muted transition-colors hover:text-ink"
                    activeClassName="!text-ink font-medium"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3.5 bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-coral transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-data-[active=true]:scale-x-100"
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
              className="hidden rounded-full bg-green px-5 py-2.5 text-[0.9375rem] font-medium text-white transition-colors duration-200 hover:bg-green-deep md:inline-flex"
            >
              Bli medlem
            </a>
            <MobileNav items={navigation} membershipUrl={membershipUrl} />
          </div>
        </div>
      </Container>
    </header>
  );
}
