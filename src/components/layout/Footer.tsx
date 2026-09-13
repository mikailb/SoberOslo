import Link from "next/link";

import { Container } from "@/components/ui/Container";
import type { ResolvedSettings } from "@/lib/content";
import { navigation } from "@/lib/site";
import { safeMailto } from "@/lib/urls";

type FooterProps = {
  settings: ResolvedSettings;
};

export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();
  const mailto = safeMailto(settings.contactEmail);

  const socials = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "Facebook", href: settings.facebookUrl },
    { label: "TikTok", href: settings.tiktokUrl },
  ].filter((item): item is { label: string; href: string } =>
    Boolean(item.href),
  );

  return (
    <footer className="border-t border-line bg-paper">
      <Container size="wide" className="py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="flex items-baseline gap-1.5 font-display text-2xl font-medium text-ink">
              {settings.name}
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-coral"
              />
            </p>
            <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-muted">
              {settings.description}
            </p>
          </div>

          <nav aria-label="Bunnmeny" className="md:col-span-3">
            <h2 className="eyebrow mb-5 text-muted">Sider</h2>
            <ul className="space-y-3">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link-underline text-[0.9375rem] text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="eyebrow mb-5 text-muted">Kontakt</h2>
            <ul className="space-y-3 text-[0.9375rem]">
              {mailto ? (
                <li>
                  <a href={mailto} className="link-underline text-ink">
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {socials.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <a
              href={settings.membershipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-[0.9375rem] font-medium text-ink transition-colors hover:border-ink/45 hover:bg-ink/[0.04]"
            >
              Bli medlem
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-7 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {settings.name}. Frivillig organisasjon i Oslo.
          </p>
          <p>Alle aktiviteter er alkoholfrie og åpne for alle.</p>
        </div>
      </Container>
    </footer>
  );
}
