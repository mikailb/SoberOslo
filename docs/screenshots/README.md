# Skjermbilder

Legg bildefilene i denne mappen. Filnavnene under er de som README-en i rota
peker på, så bruker du disse navnene vises bildene automatisk.

| Filnavn             | Viser                |
| ------------------- | -------------------- |
| `forside.png`       | Forsiden             |
| `aktiviteter.png`   | Aktivitetsoversikten |
| `aktivitet.png`     | En enkelt aktivitet  |
| `sober-kvinner.png` | Sober Kvinner        |
| `mobil.png`         | Forsiden på mobil    |

Vil du legge til flere, kopier en linje i skjermbilde-delen av README-en i rota
og bytt filnavn og tekst.

## Slik tar du dem

1. Start siden med `npm run dev` og åpne `http://localhost:3000`
2. Zoom til 100 prosent, altså `Ctrl` og `0` i Chrome
3. Trykk `F12`, så `Ctrl` `Shift` `P`, skriv **screenshot** og velg
   **Capture full size screenshot** for hele siden
4. For mobilbildet: trykk `Ctrl` `Shift` `M` først og velg iPhone i menyen øverst

## Et par råd

- **Bredde rundt 1400 piksler** er nok. Større filer gjør bare repoet tungt.
- **PNG for skjermbilder.** JPG gir stygge kanter rundt tekst.
- **Hold dem under 500 kB hver.** Er de større, kjør dem gjennom
  [squoosh.app](https://squoosh.app) først.
- **Ikke ha personopplysninger i bildet.** Lukk andre faner, og pass på at
  e-postadresser eller navn i Sanity ikke er synlige.
