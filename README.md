# Sober Oslo

Nettsiden til Sober Oslo. Bygget med Next.js, Tailwind CSS og Sanity CMS.

The website is in Norwegian; the code and these notes are in English.

---

## Skjermbilder

Bildefilene ligger i [`docs/screenshots/`](docs/screenshots/). Legg dem inn med
navnene under, så vises de her av seg selv. Mappen har en egen veiledning med
filnavn, anbefalt størrelse og hvordan du tar bildene.

<!-- Slett kommentartegnene rundt en linje når filen er lagt inn. -->

<!-- ![Forsiden](docs/screenshots/forside.png) -->

<!-- ![Aktivitetsoversikten](docs/screenshots/aktiviteter.png) -->

<!-- ![En enkelt aktivitet](docs/screenshots/aktivitet.png) -->

<!-- ![Sober Kvinner](docs/screenshots/sober-kvinner.png) -->

<!-- ![Forsiden på mobil](docs/screenshots/mobil.png) -->

---

## For editors

Everything on the site is edited at **`/studio`** on the live domain, for example
`https://soberoslo.no/studio`. Sanity handles the sign-in, so you log in with the
account you were invited with. No other password exists.

The menu on the left has seven things, in the order the visitor meets them:

| Menu item           | What it controls                                                  |
| ------------------- | ----------------------------------------------------------------- |
| **Aktiviteter**     | Every activity: date, place, text, pictures, sign-up              |
| **Forsiden**        | Every heading and text on the home page, in six tabs              |
| **Aktivitetssiden** | The headings on the activities overview, in three tabs            |
| **Om oss**          | The About page, in four tabs                                      |
| **Sober Kvinner**   | The Sober Kvinner page, in four tabs                              |
| **Merch**           | The picture, the shop address it links to, and the membership box |
| **Innstillinger**   | Name, membership link, contact details, social media, footer      |

### The rule to remember

**An empty field means no text on the website.** Clear a heading and the heading
is gone from the page, not replaced by something else. Nothing is required, so
you decide what the page shows.

Two exceptions, both so nothing ends up broken:

- **Button labels** keep their standard wording, because a button with no words
  on it is broken rather than empty. Clear the footer's membership label and the
  whole button disappears instead.
- **Addresses** keep their standard value, so a button never points nowhere.

Every field says what its standard wording is, so you can copy it back in if you
change your mind.

### A few other things worth knowing

- **Nothing is live until you press Publish.** Drafts stay hidden.
- **To hide an activity without deleting it**, switch off _Publisert på
  nettsiden_.
- **Past activities move by themselves.** The day after an activity happens it
  leaves the upcoming list and appears under _Tidligere aktiviteter_.
- **If there are no upcoming activities, the site says so.** It never invents
  any.
- **Pictures must be JPG, PNG or WebP.** SVG is rejected when you upload,
  because the website cannot show it.
- **Bildebeskrivelse** next to each picture is what a blind visitor hears. Leave
  it empty only when the picture is pure decoration.
- **The "Bli medlem" buttons** all point at _Innstillinger → Lenke til
  medlemskap_. Change it there once and it changes everywhere.
- **Social media is a list you control.** Add a row for each channel you have,
  with the name and the address. Delete a row to remove it from the footer.
- **Every page has a Bli medlem tab** for the dark green box at the bottom.
- **The merch page is one picture that links to the shop**, which is a separate
  site. There is no product list to maintain.
- Changes appear on the website within a minute.

---

## For developers

### Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Sanity values
npm run dev
```

The site runs at `http://localhost:3000` and the editor at
`http://localhost:3000/studio`.

**The site runs without Sanity.** With no project id set, every page falls back
to the starter content in `src/lib/site.ts`, so the design can be reviewed
before the CMS exists. Once a project id is set, the CMS is the only source: the
starter activities can never appear on a connected site.

### Connecting Sanity

1. Create a project at [sanity.io/manage](https://sanity.io/manage) and note the
   project id.
2. Put the id and dataset in `.env.local`.
3. Allow the origins that need to reach the API, and nothing more:

   ```bash
   npx sanity cors add http://localhost:3000 --credentials
   npx sanity cors add https://soberoslo.no --credentials
   ```

4. Invite the Sober Oslo editors from the project's Members tab.

There is no write token in this project, and none is needed: content is read
from the public CDN and the Studio authenticates each editor directly with
Sanity.

Note that the dataset is public. The website hides unpublished activities, but
anyone who queries the API directly can read them, so do not stage anything
sensitive in a draft.

### Environment variables

| Variable                         | Required | Notes                                    |
| -------------------------------- | -------- | ---------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | yes      | Public value, not a secret               |
| `NEXT_PUBLIC_SANITY_DATASET`     | yes      | Usually `production`                     |
| `NEXT_PUBLIC_SANITY_API_VERSION` | no       | Defaults to `2024-10-01`                 |
| `NEXT_PUBLIC_SITE_URL`           | no       | Used for canonical links and the sitemap |

All four are public by design. **Never add a secret with a `NEXT_PUBLIC_`
prefix**, as those are compiled into the browser bundle.

`NEXT_PUBLIC_SITE_URL` must be the real domain in production. Left unset it
defaults to `https://soberoslo.no`; pointing it at localhost would put localhost
addresses in the sitemap and in every canonical link.

### Deploying to Vercel

Import the repository, add the environment variables above, and deploy. No other
configuration is needed. Remember to add the Vercel domain as a Sanity CORS
origin.

### How content resolves

`src/lib/content.ts` is the only place the CMS is read. Two helpers decide what a
page shows:

- `textFrom(document)` returns the editor's value once the document exists in
  Sanity, empty included. The built-in wording is used only when the document
  has never been created.
- `listFrom(document)` does the same for lists.

Pages then guard on empty strings, so a cleared field removes the element rather
than leaving a blank line behind.

### Project layout

```
src/
  app/
    (site)/            the public website, with header and footer
      error.tsx        branded error page, no technical detail shown
      not-found.tsx    404 inside the site
    (studio)/studio/   Sanity Studio, its own root layout
    globals.css        design tokens, typography, motion
  components/
    layout/            header, mobile menu, footer
    ui/                container, button, headings, reveal, marquee, media,
                       show-more grid, placeholder artwork
    activities/        cards, grid, meta, category filter
    media/             gallery with lightbox
    ImageLink.tsx      one large picture that links to another site
    MembershipCTA.tsx  the dark green box at the bottom of every page
  lib/
    site.ts            navigation, brand values, starter content
    content.ts         reads the CMS and decides what each page shows
    format.ts          Norwegian dates and times
    urls.ts            validates links that come from the CMS
  sanity/
    schemaTypes/       the document types editors see
      imageRules.ts    rejects SVG uploads
    structure.ts       the Studio menu
    queries.ts         GROQ queries
    fetch.ts           reads Sanity, and today's date in Oslo time
sanity.config.ts       Studio configuration
```

### Design system

Tokens live at the top of `src/app/globals.css` and are used through Tailwind
classes such as `bg-cream`, `text-ink` and `text-green`.

| Token | Value     | Use                                   |
| ----- | --------- | ------------------------------------- |
| cream | `#f6f3ec` | Page background                       |
| paper | `#fffcf5` | Cards and the footer                  |
| ink   | `#16191a` | Body text                             |
| muted | `#5d6460` | Secondary text (5.5:1 on cream)       |
| green | `#14624a` | Primary brand colour (6.6:1 on cream) |
| sage  | `#dce7db` | Quiet section backgrounds             |
| coral | `#e4633c` | Highlights, used sparingly            |

Type is Fraunces for headings and Inter for everything else, both self-hosted by
`next/font`.

Motion is deliberately small: a fade-and-unblur on scroll (`Reveal`), a staggered
headline (`AnimatedHeading`), a slow photo marquee, and hover states around 2–3%.
All of it is switched off by `prefers-reduced-motion`, and a `<noscript>` rule
shows every revealed element when JavaScript is unavailable.

### Accessibility notes

- One `h1` per page, `lang="nb"`, a skip link, and a visible focus ring
  everywhere.
- The picture viewer is a modal with a focus trap, Escape to close, and arrow
  keys to move between pictures. It is rendered into `document.body` so it
  always covers the screen.
- The photo marquee pauses on hover and on keyboard focus, which is what
  WCAG 2.2.2 asks for. A visible pause button would be more discoverable but
  would change the design.
- `button` is given `cursor: pointer` in `globals.css`, because Tailwind 4 leaves
  buttons on the default arrow.

### Dates

`todayIso()` in `src/sanity/fetch.ts` returns today in **Europe/Oslo**, not UTC.
Servers run on UTC, so using UTC would keep yesterday's activity listed as
upcoming between midnight and 01:00 or 02:00 Norwegian time.

### Security

- No database, no API routes, no visitor accounts, no analytics or cookies.
- No secrets: every environment variable is a public Sanity identifier.
- CMS text is rendered as React elements through Portable Text. There is no
  `dangerouslySetInnerHTML` anywhere, so content cannot inject markup.
- Links from the CMS are validated in `src/lib/urls.ts`. Only `http(s)` and
  `mailto` survive, and an internal path is resolved against a stand-in origin so
  shapes like `//evil.com` and `/\evil.com` cannot escape to another domain.
  External links carry `rel="noopener noreferrer"`.
- Images may only load from `cdn.sanity.io` (`next.config.ts`), and SVG uploads
  are rejected in the schema rather than enabling `dangerouslyAllowSVG`.
- Security headers are set in `next.config.ts`: a Content Security Policy,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security` and `frame-ancestors 'none'`.

The script policy still allows `'unsafe-inline'`, because the App Router emits
inline bootstrap scripts. Tightening that means adding a middleware that issues a
nonce per request, which also makes every page render dynamically. Given that no
untrusted HTML is ever rendered here, the trade was not worth it.

Video support was removed from the site. The Content Security Policy still lists
YouTube, Vimeo and the Sanity file CDN under `frame-src` and `media-src`. Nothing
uses them now, so they can be dropped whenever someone is in that file.

`agentRules: false` in `next.config.ts` stops Next.js from writing `AGENTS.md`
and `CLAUDE.md` into the project root on every `next dev`.

### Known dependency warnings

`npm audit` reports 15 issues, one of them high. All of them are the same
package, `js-yaml@3.13.1`, reached only through the Sanity command line tool:

```
sanity -> @sanity/cli -> @vercel/frameworks -> js-yaml
```

It is not reachable from the website. Next.js file tracing includes 2545 files in
the deployed server and `js-yaml` is not among them, so it ships nowhere and runs
never. There is no upstream fix: the newest `@vercel/frameworks` still pins that
exact version, and `npm audit fix --force` would **downgrade** `sanity` a whole
major version, which breaks the Studio. Do not run it.

If a clean audit is wanted, pin the patched release for that one path only:

```json
"overrides": {
  "@vercel/frameworks": { "js-yaml": "3.15.2" }
}
```

A bare `"js-yaml": "^3.15.2"` would also drag ESLint's `js-yaml@4` down to 3.x
and break linting, so the nesting matters.

### Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm start       # serve the production build
npm run lint    # ESLint
```
