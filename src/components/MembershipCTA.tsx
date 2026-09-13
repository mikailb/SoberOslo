import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

type MembershipCTAProps = {
  membershipUrl: string;
  heading?: string;
  body?: string;
  /** Shows a second, quieter link to the activities overview. */
  showActivitiesLink?: boolean;
};

/** The recurring "Bli medlem" block used near the bottom of most pages. */
export function MembershipCTA({
  membershipUrl,
  heading = "Vil du bli med?",
  body = "Medlemskap koster lite, tar to minutter og gir deg invitasjon til alt vi arrangerer. Du kan også bare møte opp på en aktivitet først.",
  showActivitiesLink = true,
}: MembershipCTAProps) {
  return (
    <section className="bg-green-deep text-white">
      <Container size="wide" className="py-20 sm:py-28">
        <Reveal>
          <div className="relative overflow-hidden">
            {/* Quiet decorative shape, hidden from screen readers. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="pointer-events-none absolute -top-20 -right-16 hidden h-72 w-72 text-white/[0.07] lg:block"
            >
              <circle cx="100" cy="100" r="100" fill="currentColor" />
            </svg>

            <div className="relative max-w-2xl">
              <p className="eyebrow mb-5 text-sage-deep">Medlemskap</p>
              {/* Empty values come from a cleared field in Sanity, and mean the
                  editor wants no heading or no text here. */}
              {heading ? (
                <h2 className="display-lg text-white">{heading}</h2>
              ) : null}
              {body ? <p className="lede mt-6 text-white/75">{body}</p> : null}

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button href={membershipUrl} variant="accent" size="lg">
                  Bli medlem
                </Button>
                {showActivitiesLink ? (
                  <Button href="/activities" variant="onDark" size="lg">
                    Se aktiviteter
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
