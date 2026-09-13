# Sober Oslo

Nettsiden til Sober Oslo. Bygget med Next.js, Tailwind CSS og Sanity CMS.

The website is in Norwegian; the code and these notes are in English.

---

## For editors

Everything on the site is edited at **`/studio`** on the live domain, for example
`https://soberoslo.no/studio`. Sanity handles the sign-in, so you log in with the
account you were invited with. No other password exists.

The menu on the left has five things:

| Menu item          | What it controls                                            |
| ------------------ | ----------------------------------------------------------- |
| **Aktiviteter**    | Every activity: date, place, text, pictures, video, sign-up |
| **Forsiden**       | Every heading and text on the home page, in six tabs        |
| **Aktivitetssiden** | The headings on the activities overview, in three tabs     |
| **Om oss**         | The About page                                              |
| **Sober Kvinner**  | The Sober Kvinner page                                      |
| **Merch**          | The picture on the merch page and the shop address it links to |
| **Innstillinger**  | Name, contact details, social links, membership link        |

A few things worth knowing:

- **Nothing is live until you press Publish.** Drafts stay hidden.
- **To hide an activity without deleting it**, switch off *Publisert på nettsiden*.
- **Past activities disappear from the list automatically** the day after they
  happen, and move down to *Tidligere aktiviteter*.
- **Videos are links, not files.** Paste a YouTube or Vimeo address. Other
  providers are rejected on purpose.
- **Bildebeskrivelse** next to each picture is what a blind visitor hears. Leave
  it empty only when the picture is pure decoration.
- **The "Bli medlem" buttons** all point at *Innstillinger → Lenke til
  medlemskap*. Change it there once and it changes everywhere.
- **The merch page is one picture that links to the shop**, which is a separate
  site. Set the picture and the address under *Merch*. There is no product list
  to maintain here.
- Changes appear on the website within a minute.

If a field is left empty, the site falls back to sensible built-in Norwegian
text, so the page never looks broken.

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
to the starter content in `src/lib/site.ts`, so you can work on the design
before the CMS exists.

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

### Environment variables

| Variable                         | Required | Notes                                   |
| -------------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | yes      | Public value, not a secret              |
| `NEXT_PUBLIC_SANITY_DATASET`     | yes      | Usually `production`                    |
| `NEXT_PUBLIC_SANITY_API_VERSION` | no       | Defaults to `2024-10-01`                |
| `NEXT_PUBLIC_SITE_URL`           | no       | Used for canonical links and the sitemap |

All four are public by design. **Never add a secret with a `NEXT_PUBLIC_`
prefix**, as those are compiled into the browser bundle.

### Deploying to Vercel

Import the repository, add the environment variables above, and deploy. No other
configuration is needed. Remember to add the Vercel domain as a Sanity CORS
origin.

### Project layout

```
src/
  app/
    (site)/            the public website, with header and footer
    (studio)/studio/   Sanity Studio, its own root layout
    globals.css        design tokens, typography, motion
  components/
    layout/            header, mobile menu, footer
    ui/                container, button, headings, reveal, marquee, media
    activities/        cards, grid, meta, category filter
    media/             gallery with lightbox, video embeds
  lib/
    site.ts            navigation, brand values, starter content
    content.ts         reads the CMS, falls back to starter content
    format.ts          Norwegian dates and times
    urls.ts            validates links that come from the CMS
    video.ts           YouTube and Vimeo link parsing
  sanity/
    schemaTypes/       the document types editors see
    structure.ts       the Studio menu
    queries.ts         GROQ queries
sanity.config.ts       Studio configuration
```

### Design system

Tokens live at the top of `src/app/globals.css` and are used through Tailwind
classes such as `bg-cream`, `text-ink` and `text-green`.

| Token   | Value     | Use                                   |
| ------- | --------- | ------------------------------------- |
| cream   | `#f6f3ec` | Page background                       |
| paper   | `#fffcf5` | Cards and the footer                  |
| ink     | `#16191a` | Body text                             |
| muted   | `#5d6460` | Secondary text (5.5:1 on cream)       |
| green   | `#14624a` | Primary brand colour (6.6:1 on cream) |
| sage    | `#dce7db` | Quiet section backgrounds             |
| coral   | `#e4633c` | Highlights, used sparingly            |

Type is Fraunces for headings and Inter for everything else, both self-hosted by
`next/font`.

Motion is deliberately small: a fade-and-unblur on scroll (`Reveal`), a staggered
headline (`AnimatedHeading`), a slow photo marquee, and hover states around 2–3%.
All of it is switched off by `prefers-reduced-motion`, and a `<noscript>` rule
shows every revealed element when JavaScript is unavailable.

### Security

- No database, no API routes, no visitor accounts, no analytics or cookies.
- No secrets: every environment variable is a public Sanity identifier.
- CMS text is rendered as React elements through Portable Text. There is no
  `dangerouslySetInnerHTML` anywhere, so content cannot inject markup.
- Links from the CMS are validated in `src/lib/urls.ts`; only `http(s)` and
  `mailto` survive. External links carry `rel="noopener noreferrer"`.
- Videos may only be embedded from YouTube and Vimeo, enforced both in the
  schema and again at render time.
- Images may only load from `cdn.sanity.io` (`next.config.ts`).
- Security headers are set in `next.config.ts`: a Content Security Policy,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security` and `frame-ancestors 'none'`.

The script policy still allows `'unsafe-inline'`, because the App Router emits
inline bootstrap scripts. Tightening that means adding a middleware that issues a
nonce per request, which also makes every page render dynamically. Given that no
untrusted HTML is ever rendered here, the trade was not worth it.

`npm audit` reports issues in `js-yaml` and `smol-toml`, both reached only
through the Sanity command line tool. They are build-time dependencies and do not
run on the website or in the Studio.

### Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm start       # serve the production build
npm run lint    # ESLint
```
