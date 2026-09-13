import { isSanityConfigured } from "@/sanity/env";
import Studio from "./Studio";

/**
 * The editor interface, served at /studio.
 *
 * Sign-in is handled entirely by Sanity: only people invited to the project can
 * open it. There is no password or token in this repository, and the page is
 * kept out of search engines (see robots.ts).
 */
export const dynamic = "force-static";

export default function StudioPage() {
  if (!isSanityConfigured) {
    return (
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: "36rem",
          margin: "0 auto",
          padding: "4rem 1.5rem",
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Sanity er ikke koblet til ennå
        </h1>
        <p>
          Legg inn <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> og{" "}
          <code>NEXT_PUBLIC_SANITY_DATASET</code> i <code>.env.local</code>, og
          start serveren på nytt. Oppskriften står i README.
        </p>
      </div>
    );
  }

  return <Studio />;
}
