import type { PortableTextBlock } from "next-sanity";

import type { Activity, ActivityCategory } from "@/sanity/types";

/* ==========================================================================
   Site basics
   ========================================================================== */

export const siteConfig = {
  name: "Sober Oslo",
  tagline: "Gode opplevelser. Klare minner.",
  description:
    "Sober Oslo er en frivillig organisasjon som lager sosiale møteplasser uten alkohol. Bli med på tur, trening, kultur og hyggelige kvelder i Oslo.",

  /**
   * Where every "Bli medlem" button points.
   *
   * Change it in one of two places:
   *   1. Sanity -> Innstillinger -> "Lenke til medlemskap" (no deploy needed)
   *   2. this line, which is the fallback used until that field is filled in
   */
  membershipUrl: "https://example.com/bli-medlem",

  contactEmail: "hei@soberoslo.no",

  /**
   * Only used before the settings exist in Sanity. After that the list under
   * Innstillinger -> Sosiale medier decides, including showing none at all.
   */
  social: [
    { label: "Instagram", url: "https://instagram.com/soberoslo" },
    { label: "Facebook", url: "https://facebook.com/soberoslo" },
  ],

  /** Used for absolute URLs in metadata. Override with NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://soberoslo.no",

  /**
   * The footer, which is the same on every page. All of it is editable under
   * Innstillinger -> Bunntekst in Sanity.
   */
  footer: {
    navHeading: "Sider",
    contactHeading: "Kontakt",
    membershipLabel: "Bli medlem",
    copyrightNote: "Frivillig organisasjon i Oslo.",
    note: "Alle aktiviteter er alkoholfrie og åpne for alle.",
  },
} as const;

export const navigation = [
  { href: "/", label: "Forside" },
  { href: "/activities", label: "Aktiviteter" },
  { href: "/sober-kvinner", label: "Sober Kvinner" },
  { href: "/about", label: "Om oss" },
  { href: "/merch", label: "Merch" },
] as const;

export const categoryLabels: Record<ActivityCategory, string> = {
  social: "Sosialt",
  outdoors: "Friluft",
  culture: "Kultur",
  sport: "Trening",
  workshop: "Kurs",
  "sober-kvinner": "Sober Kvinner",
};

/* ==========================================================================
   Starter content
   Shown until an editor adds the real thing in Sanity. Everything here can be
   overridden from the CMS without touching code.
   ========================================================================== */

/**
 * Builds Portable Text from plain paragraphs, so starter copy and CMS copy
 * render through exactly the same component.
 */
export function paragraphsToBlocks(paragraphs: string[]): PortableTextBlock[] {
  return paragraphs.map((text, index) => ({
    _type: "block",
    _key: `starter-${index}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `starter-${index}-0`, text, marks: [] }],
  })) as unknown as PortableTextBlock[];
}

/** Keeps the starter activities in the future however long the demo runs. */
function daysFromNow(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Defaults for the home page. Every one of these can be overridden in Sanity. */
export const homeContent = {
  heroEyebrow: "Frivillig fellesskap i Oslo",
  heroHeading: "Gode opplevelser. Klare minner.",
  heroIntro:
    "Vi lager sosiale møteplasser i Oslo der du kan bli kjent med folk, prøve noe nytt og dra hjem med klart hode. Alt vi gjør er helt uten alkohol.",

  activitiesEyebrow: "Hva skjer",
  activitiesHeading: "Kommende aktiviteter",
  activitiesIntro:
    "Alt er alkoholfritt, og du kan komme alene. De fleste gjør det.",
  activitiesEmptyText:
    "Ingen kommende aktiviteter akkurat nå. Nye aktiviteter legges ut fortløpende.",

  introHeading: "Et fellesskap, ikke et program",
  introBody:
    "Sober Oslo er drevet av frivillige som ville ha et sosialt liv uten alkohol. Vi arrangerer turer, trening, kultur og helt vanlige hyggekvelder, flere ganger i måneden, året rundt. Du trenger ingen forklaring på hvorfor du er her. Du trenger bare å møte opp.",
  stats: [
    { _key: "a", value: "40+", label: "arrangementer i året" },
    { _key: "b", value: "600", label: "medlemmer i Oslo" },
    { _key: "c", value: "0 kr", label: "for å bli med på første tur" },
  ],

  kvinnerBody:
    "Gruppen møtes hver måned, og det er alltid en vert til stede som tar imot deg i døra.",
  kvinnerButtonLabel: "Les om Sober Kvinner",

  galleryEyebrow: "Fellesskapet",
  galleryHeading: "Fra aktivitetene våre",
  galleryIntro: "Bilder fra turer, kvelder og kurs vi har arrangert.",
} as const;

/** Defaults for the activities overview. All of these can be set in Sanity. */
export const activitiesContent = {
  heroEyebrow: "Aktiviteter",
  heroHeading: "Noe å gjøre, noen å gjøre det med",
  heroIntro:
    "Vi arrangerer flere aktiviteter i måneden, året rundt. Alt er alkoholfritt, de fleste er gratis, og du trenger ikke kjenne noen fra før.",

  pastEyebrow: "Tidligere",
  pastHeading: "Det vi har gjort",
  pastIntro: "Bilder fra aktiviteter vi har arrangert.",
} as const;

export const aboutContent = {
  heroHeading: "Vi bygger et sosialt Oslo uten alkohol",
  heroIntro:
    "Sober Oslo er en frivillig organisasjon for alle som vil møte folk uten at alkohol står i sentrum. Vi er ikke et behandlingstilbud. Vi er et fellesskap.",
  missionHeading: "Hvorfor vi finnes",
  missionBody: [
    "Mye av det sosiale livet i Oslo skjer rundt et glass. Det gjør det unødvendig vanskelig å være med for alle som ikke drikker, enten det handler om helse, tro, treningsmål, graviditet, edruskap eller rett og slett lyst.",
    "Vi lager de møteplassene vi selv savnet: aktiviteter der innholdet samler folk, og der ingen trenger å forklare hva de har i glasset.",
  ],
  values: [
    {
      _key: "open",
      heading: "Åpent for alle",
      body: "Du trenger ingen historie, diagnose eller begrunnelse. Kommer du med godt humør, er du en av oss.",
    },
    {
      _key: "real",
      heading: "Ekte aktiviteter",
      body: "Turer, trening, kultur og mat. Vi lager ting folk faktisk har lyst til å bli med på, ikke møter om alkohol.",
    },
    {
      _key: "volunteer",
      heading: "Drevet av frivillige",
      body: "Alt planlegges av medlemmer på fritiden. Det holder terskelen lav og prisene nede.",
    },
    {
      _key: "safe",
      heading: "Trygge rammer",
      body: "Vi har verter på hvert arrangement, tydelige kjøreregler og null toleranse for utestengende oppførsel.",
    },
  ],
} as const;

export const soberKvinnerContent = {
  heroHeading: "Sober Kvinner",
  heroIntro:
    "En egen møteplass i Sober Oslo for kvinner som vil bli kjent med andre uten alkohol. Samme fellesskap, litt roligere ramme.",
  /** Label on the hero picture when it links somewhere. */
  heroImageLabel: "Les mer",
  introHeading: "Hva Sober Kvinner er",
  introBody: [
    "Sober Kvinner startet fordi flere ba om et sted der det var lettere å komme alene første gang. Gruppen møtes hver måned, til alt fra kaffe og lange samtaler til turer, yoga og middager.",
    "Alt er åpent for kvinner i alle aldre og livssituasjoner. Du kan komme én gang for å kjenne på stemningen, eller bli fast.",
  ],
  highlights: [
    {
      _key: "monthly",
      heading: "Fast møte hver måned",
      body: "Samme sted, samme tid. Du slipper å finne ut av noe nytt hver gang.",
    },
    {
      _key: "host",
      heading: "Alltid en vert",
      body: "En frivillig tar imot, presenterer folk for hverandre og passer på at ingen blir stående alene.",
    },
    {
      _key: "alone",
      heading: "Fint å komme alene",
      body: "De fleste kommer alene første gang. Det er helt vanlig, og det er lagt opp til det.",
    },
  ],
  ctaHeading: "Bli med på neste samling",
  ctaBody:
    "Meld deg inn i Sober Oslo, så får du invitasjon til alle samlingene i Sober Kvinner.",
} as const;

/**
 * The shop is a separate site, so this page is a picture that links to it.
 * Both the picture and the address are set in Sanity under Merch.
 */
export const merchContent = {
  heading: "Ting du kan gå med",
  intro:
    "Enkle plagg og ting laget for medlemmene våre. Overskuddet går rett tilbake til aktivitetene.",
  linkLabel: "Gå til nettbutikken",
  missingUrlNote:
    "Nettbutikken er ikke koblet til ennå. Legg inn adressen under Merch i Sanity.",
} as const;

const practicalBasics = [
  "Møt opp ti minutter før start, så rekker vi en kort presentasjonsrunde.",
  "Det er alltid en vert til stede. Ta kontakt hvis du kommer alene, det gjør de fleste.",
  "Aktiviteten er helt alkoholfri, og gratis å delta på hvis ikke annet står oppgitt.",
];

export const starterActivities: Activity[] = [
  {
    _id: "starter-ekeberg",
    title: "Kveldstur i Ekebergparken",
    slug: "kveldstur-i-ekebergparken",
    date: daysFromNow(5),
    startTime: "18:00",
    endTime: "20:30",
    location: "Ekebergparken, inngang Kongsveien",
    category: "outdoors",
    price: "Gratis",
    shortDescription:
      "Rolig kveldstur gjennom skulpturparken med utsikt over hele byen. Vi avslutter med kaffe.",
    description: paragraphsToBlocks([
      "Vi går den korte runden gjennom Ekebergparken i et tempo alle klarer, med noen stopp ved skulpturene underveis. Turen tar rundt halvannen time.",
      "Etterpå setter vi oss ned med kaffe og noe å bite i, for de som har lyst. Ingen påmelding, bare møt opp ved inngangen.",
    ]),
    practicalInfo: paragraphsToBlocks([
      ...practicalBasics,
      "Ta med gode sko og en jakke. Det blir kjøligere når sola går ned.",
    ]),
    registrationUrl: null,
    gallery: null,
  },
  {
    _id: "starter-brettspill",
    title: "Brettspillkveld på Deichman",
    slug: "brettspillkveld-pa-deichman",
    date: daysFromNow(9),
    startTime: "18:00",
    endTime: "21:00",
    location: "Deichman Bjørvika, fjerde etasje",
    category: "social",
    price: "Gratis",
    shortDescription:
      "Lave skuldre, mange spill og en enkel måte å bli kjent med nye folk på.",
    description: paragraphsToBlocks([
      "Vi tar med en koffert full av spill og setter oss ved de store bordene i fjerde etasje. Noen spiller hele kvelden, andre stikker innom en time.",
      "Du trenger ikke kunne spillene fra før. Vi forklarer reglene, og det er alltid et bord med noe enkelt på gang.",
    ]),
    practicalInfo: paragraphsToBlocks(practicalBasics),
    registrationUrl: null,
    gallery: null,
  },
  {
    _id: "starter-badstu",
    title: "Søndagsbadstu på Sukkerbiten",
    slug: "sondagsbadstu-pa-sukkerbiten",
    date: daysFromNow(14),
    startTime: "11:00",
    endTime: "13:00",
    location: "Sukkerbiten, Bjørvika",
    category: "sport",
    price: "250 kr",
    shortDescription:
      "To timer i badstua, med bading i fjorden for de som vil. Vi har hele badstua for oss selv.",
    description: paragraphsToBlocks([
      "Vi leier hele badstua, så det er bare folk fra Sober Oslo der. Du bestemmer selv hvor mange runder du tar, og om du vil ut i fjorden.",
      "Plassene fylles fort, så meld deg på i god tid. Betaling skjer ved påmelding.",
    ]),
    practicalInfo: paragraphsToBlocks([
      "Ta med badetøy, håndkle og eventuelt badesko.",
      ...practicalBasics.slice(0, 2),
    ]),
    registrationUrl: "https://example.com/pamelding",
    gallery: null,
  },
  {
    _id: "starter-sk-kaffe",
    title: "Sober Kvinner: kaffe og prat",
    slug: "sober-kvinner-kaffe-og-prat",
    date: daysFromNow(18),
    startTime: "17:30",
    endTime: "19:30",
    location: "Grünerløkka",
    category: "sober-kvinner",
    price: "Gratis",
    shortDescription:
      "Månedlig samling for kvinner i Sober Oslo. Fint å komme alene, det gjør de fleste.",
    description: paragraphsToBlocks([
      "Vi tar over bakrommet på kafeen og sitter rundt to store bord. Verten tar imot i døra og presenterer deg for de andre.",
      "Kvelden har ingen agenda utover å bli kjent. Kom når det passer, dra når du vil.",
    ]),
    practicalInfo: paragraphsToBlocks(practicalBasics),
    registrationUrl: null,
    gallery: null,
  },
  {
    _id: "starter-klatring",
    title: "Klatring for nybegynnere",
    slug: "klatring-for-nybegynnere",
    date: daysFromNow(23),
    startTime: "18:00",
    endTime: "20:00",
    location: "Oslo Klatresenter Torshov",
    category: "sport",
    price: "180 kr",
    shortDescription:
      "Buldrekurs for deg som aldri har klatret før. Instruktør og utstyr er inkludert.",
    description: paragraphsToBlocks([
      "En instruktør tar oss gjennom det helt grunnleggende: hvordan du står, hvordan du faller trygt, og hvordan du leser en rute.",
      "Etterpå klatrer vi fritt i halvannen time. Ingen forkunnskaper, og ingen forventning om at du skal opp den vanskeligste veggen.",
    ]),
    practicalInfo: paragraphsToBlocks([
      "Prisen inkluderer inngang, sko og instruktør.",
      ...practicalBasics.slice(0, 2),
    ]),
    registrationUrl: "https://example.com/pamelding",
    gallery: null,
  },
  {
    _id: "starter-film",
    title: "Filmkveld: nordisk kortfilm",
    slug: "filmkveld-nordisk-kortfilm",
    date: daysFromNow(30),
    startTime: "19:00",
    endTime: "21:30",
    location: "Vega Scene, Hausmanns gate",
    category: "culture",
    price: "120 kr",
    shortDescription:
      "Fem kortfilmer, en kort samtale etterpå og alkoholfri drikke i baren.",
    description: paragraphsToBlocks([
      "Vi har leid en sal og satt sammen et program med fem nordiske kortfilmer. Til sammen varer visningen rundt en time.",
      "Etterpå blir vi igjen i foajeen og snakker om det vi så, for de som har lyst.",
    ]),
    practicalInfo: paragraphsToBlocks(practicalBasics),
    registrationUrl: "https://example.com/pamelding",
    gallery: null,
  },
];

export function findStarterActivity(slug: string): Activity | undefined {
  return starterActivities.find((activity) => activity.slug === slug);
}
