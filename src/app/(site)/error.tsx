"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * Shown when a page fails to render.
 *
 * Visitors get a plain Norwegian explanation and a way onwards. The error
 * itself only goes to the console, never onto the page: stack traces and
 * internal messages are not something a visitor should see.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sober-oslo] Siden kunne ikke vises:", error);
  }, [error]);

  return (
    <Container size="wide" className="py-28 sm:py-40">
      <p className="eyebrow text-green">Beklager</p>
      <h1 className="display-lg mt-5 max-w-2xl text-ink">Noe gikk galt her</h1>
      <p className="lede mt-6 max-w-xl text-muted">
        Siden kunne ikke lastes akkurat nå. Prøv en gang til, eller gå til
        oversikten over aktiviteter.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button onClick={reset} size="lg">
          Prøv på nytt
        </Button>
        <Button href="/activities" variant="secondary" size="lg">
          Se aktiviteter
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Til forsiden
        </Button>
      </div>
    </Container>
  );
}
