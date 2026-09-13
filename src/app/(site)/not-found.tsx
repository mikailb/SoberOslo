import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container size="wide" className="py-28 sm:py-40">
      <p className="eyebrow text-green">404</p>
      <h1 className="display-lg mt-5 max-w-2xl text-ink">
        Denne siden fant vi ikke
      </h1>
      <p className="lede mt-6 max-w-xl text-muted">
        Lenken kan være utdatert, eller aktiviteten kan ha blitt tatt bort. Prøv
        oversikten over aktiviteter i stedet.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button href="/activities" size="lg">
          Se aktiviteter
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Til forsiden
        </Button>
      </div>
    </Container>
  );
}
