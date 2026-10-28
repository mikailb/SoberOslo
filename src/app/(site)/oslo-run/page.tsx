import type { Metadata } from "next";
import Image from "next/image";

import { MembershipCTA } from "@/components/MembershipCTA";
import { OsloRun } from "@/components/oslo-run/OsloRun";
import { getSettings } from "@/lib/content";
import { surpriseContent } from "@/lib/site";

export const metadata: Metadata = {
  title: "Oslo Run",
  description:
    "Spill Oslo Run: løp langs havnepromenaden, samle Sober Oslo-logoer og se hvor langt du kommer.",
  alternates: { canonical: "/oslo-run" },
};

export default async function OsloRunPage() {
  const settings = await getSettings();

  return (
    <>
      {/* -------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden pb-[42%] sm:aspect-[5/1] sm:pb-0">
        {/* The whole panorama, uncropped and across the full width, with the
            sky from the game above it. On a phone it is cropped a little
            instead, so it does not turn into a thin strip, and the text sits
            on the sky above it rather than on the city. */}
        <Image
          src="/images/oslo-run/bg-sky.png"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover object-[0%_50%]"
        />
        <div className="absolute inset-x-0 bottom-0 aspect-[20/9] sm:[aspect-ratio:2017/265] sm:[mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%)]">
          <Image
            src="/images/oslo-run/hero-oslo.webp"
            alt="Oslo sett fra fjorden, med Akershus, Rådhuset og Operaen"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[60%_100%] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_45%)] sm:object-[50%_100%] sm:[mask-image:none]"
          />
        </div>
        {/* The sky fades into the page at the top, so the picture does not
            run straight into the menu. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2/5"
          style={{
            background:
              "linear-gradient(180deg, rgba(248, 237, 221, 1) 0%, rgba(248, 237, 221, 0.7) 35%, rgba(248, 237, 221, 0) 100%)",
          }}
        />

        {/* A short line on the sky, above the city. */}
        <div className="relative mx-auto max-w-xl px-5 pt-6 text-center sm:pt-[3%]">
          <p className="eyebrow text-[0.65rem] text-green sm:text-xs">Oslo Run</p>
          <h1 className="mt-1 font-display text-2xl leading-tight font-medium tracking-[-0.02em] text-ink sm:mt-1.5 sm:text-4xl">
            {surpriseContent.heroHeading}
          </h1>
          <p className="mt-1 text-sm text-ink/80 sm:text-base">
            {surpriseContent.heroIntro}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------- Oslo Run card */}
      <section className="relative z-10 pt-4 sm:pt-5">
        <div className="mx-auto w-[calc(100%-24px)] max-w-[1200px] sm:w-[calc(100%-48px)]">
          <OsloRun />
        </div>
      </section>

      <div className="mt-4">
        <MembershipCTA
          membershipUrl={settings.membershipUrl}
          heading={surpriseContent.ctaHeading}
          body={surpriseContent.ctaBody}
          compact
        />
      </div>
    </>
  );
}
