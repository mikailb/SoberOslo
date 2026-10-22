"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { ScratchCard } from "./ScratchCard";

type Idea = { title: string; note?: string | null };

type SurpriseCardProps = {
  ideas: readonly Idea[];
  coverLabel: string;
  coverHint: string;
  resultEyebrow: string;
  againLabel: string;
};

/** A random index, different from `current` whenever there is a choice. */
function pickIndex(length: number, current?: number) {
  if (length < 2) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

const noSubscribe = () => () => {};

/**
 * The scratch card on /overrask-meg with its "another one" button.
 *
 * The plan is drawn at random in the browser. The server leaves the result
 * empty, since its own random pick would not match the browser's.
 */
export function SurpriseCard({
  ideas,
  coverLabel,
  coverHint,
  resultEyebrow,
  againLabel,
}: SurpriseCardProps) {
  const isClient = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const [index, setIndex] = useState(() => pickIndex(ideas.length));
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const idea = ideas[index];

  function again() {
    setIndex((current) => pickIndex(ideas.length, current));
    setRevealed(false);
    setRound((current) => current + 1);
  }

  return (
    <div className="flex flex-col items-center">
      <ScratchCard
        key={round}
        coverLabel={coverLabel}
        coverHint={coverHint}
        ariaLabel={`Skrapekort. Trykk Enter for å se ${resultEyebrow.toLowerCase()}.`}
        onReveal={() => setRevealed(true)}
        autoFocus={round > 0}
        className="aspect-[4/5] w-full max-w-2xl rounded-[1.75rem] shadow-[0_18px_50px_-20px_rgba(8,40,31,0.35)] sm:aspect-[3/2]"
      >
        <div className="flex h-full flex-col items-center justify-center bg-paper px-6 text-center sm:px-12">
          {isClient && idea ? (
            <>
              <p className="eyebrow text-green">{resultEyebrow}</p>
              <p className="display-lg mt-5 text-ink">{idea.title}</p>
              <div
                aria-hidden="true"
                className="mx-auto mt-6 h-1 w-10 rounded-full bg-coral"
              />
              {idea.note ? (
                <p className="lede mt-6 max-w-md text-muted">{idea.note}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </ScratchCard>

      {/* Same height before and after, so the page does not jump when the
          button replaces the hint. */}
      <div className="mt-8 flex min-h-14 items-center justify-center">
        {revealed ? (
          <Button size="lg" onClick={again}>
            {againLabel}
          </Button>
        ) : (
          <p className="text-sm text-muted">
            Bruker du tastatur? Velg kortet og trykk Enter.
          </p>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {revealed && idea
          ? `${resultEyebrow}: ${idea.title}. ${idea.note ?? ""}`
          : ""}
      </p>
    </div>
  );
}
