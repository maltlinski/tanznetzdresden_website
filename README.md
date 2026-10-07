# TanzNetzDresden – Website

Website des **TanzNetzDresden e.V.**, des Netzwerks der freien Tanzszene in Dresden.
Gebaut mit [Astro](https://astro.build) nach dem TNDD-Designsystem (Entwurf aus Claude Design, Runde 3a).

**Eine Stadt. Ein Netz.** Die Startseite öffnet mit einer Netz-Animation: Punkte verknüpfen sich, dann brechen
zwei Bühnenfotos durch das Netz.

## Was die Website kann

| Bereich | Was | Wo |
|---|---|---|
| Startseite | Netz-Hero, Termine mit Filter, Formate, Training, Netzwerk, Mitgliedschaft, Newsletter | `src/views/HomeView.astro` |
| **Zweisprachig** | Deutsch und Englisch (`/en/…`), Sprachumschalter, hreflang | `src/lib/i18n.ts` |
| Tanzkalender | alle Termine nach Monaten, Filter, **Kalender-Abo (.ics)** | `/termine/`, `/termine.ics` |
| **Profile** | eigene Seite je Künstler:in, Suche und Filter; Mitglieder pflegen selbst, Vorstand gibt frei | `/netzwerk/` |
| Verein | Vorstand, Arbeitsgruppen, alle Mitglieder:innen | `/verein/` |
| Mitglied werden | Vorteile, Ablauf, Beitrag, Antrag | `/mitglied-werden/` |
| Kontakt | Kontakt, Vorstand, Presse, Termin einreichen, Karte | `/kontakt/` |
| Rechtliches | Impressum (§ 5 DDG), Datenschutzerklärung (DSGVO) | `/impressum/`, `/datenschutz/` |
| **Förderhinweis** | Logos/Text der Förderer auf jeder Seite (Publizitätspflicht Stadt Dresden) | `verein.json` → `funders` |
| **Spenden** | Überweisung mit GiroCode (QR für Banking-Apps), optional Online-Spende, druckbarer Spendennachweis bis 300 € | `/spenden/` |
| **Transparenz** | 10 Angaben nach Initiative Transparente Zivilgesellschaft | `/transparenz/` |
| **Barrierefreiheit** | Erklärung mit Meldemöglichkeit, Seite in Leichter Sprache | `/barrierefreiheit/`, `/leichte-sprache/` |
| Statistik (optional) | Matomo (cookielos) oder Plausible, nur mit Einwilligung | `verein.json` → `analytics` |
| **Einwilligung** | eigener Consent-Manager nach TDDDG, Zwei-Klick-Lösung für Karten/Videos | `src/settings/consent.ts` |
| **Bot-Schutz** | E-Mail-Adressen verschlüsselt, Entschlüsselung per Proof-of-Work im Browser | `src/components/ProtectedEmail.astro` |
| **Interner Bereich** | Login (Passwort oder Link), eigenes Profil, Mitgliederverzeichnis, Dokumente | `/intern/` (Supabase) |
| Redaktion | Inhalte im Browser bearbeiten, ohne Code | `/admin/` (Sveltia CMS) |

Außerdem: keine Tracking-Cookies, keine Google-Fonts-Anfragen (Schriften liegen lokal), automatisch optimierte
Bilder (WebP, responsive), Sitemap, Open-Graph-Vorschau, strukturierte Daten, Tastaturbedienung, „Reduzierte
Bewegung“ wird respektiert, automatische Tests inklusive Barrierefreiheit (axe, WCAG 2.1 AA).

## Schnellstart (Entwicklung)

Voraussetzung: Node.js 22 (siehe `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # prüft Typen & Inhalte, baut nach dist/
npm test           # Playwright-Tests (vorher bauen)
```

Optional `.env` aus `.env.example` anlegen (für den internen Bereich).

## Projektstruktur

```
design/               Designsystem aus Claude Design – die Website liest Farben, Schriften, Logo direkt von hier
src/
  content/            Inhalte: Termine, Formate, Personen, Rechtstexte (Markdown/YAML)
  content.config.ts   Schemas der Inhalte (Pflichtfelder werden beim Build geprüft)
  settings/           Vereinsdaten (verein.json), Einwilligungen, Arbeitsgruppen
  components/
    sections/         Abschnitte der Startseite, Header, Footer
    ui/               Designsystem-Bausteine: Tag, Button, Badge, KeilBar, Logo
  layouts/            Seitenrahmen (Base, Page, Intern)
  views/              Inhalt jeder Seite (einmal für beide Sprachen)
  pages/              Jede Datei = eine URL (de/ und en/ binden die Views ein)
  scripts/            Browser-Code: Netz-Animation, Consent, E-Mail-Schutz, interner Bereich
  styles/             globale Styles, Schriften, bewusste Abweichungen vom Designsystem
  assets/             Fotos (werden beim Build optimiert)
public/admin/         CMS
supabase/migrations/  Datenbank für den internen Bereich
tests/                Playwright-Tests
docs/                 Anleitungen
```

## Anleitungen

- [Design ändern](design/README.md): Designsystem aus Claude Design übernehmen
- [Inhalte bearbeiten](docs/inhalte.md): Termine, Formate, Personen, Texte, CMS
- [Profile](docs/profile.md): öffentliche Profile, Freigabe, sofortige Aktualisierung
- [Deutsch und Englisch](docs/mehrsprachigkeit.md): Übersetzen, neue Seiten in beiden Sprachen
- [Interner Bereich einrichten](docs/intern.md): Supabase, Einladungen, Rollen
- [Veröffentlichen](docs/deployment.md): GitHub Pages, eigene Domain, Hosting in der EU
- [Vor dem Livegang](docs/livegang.md): Checkliste Recht & Inhalte
- [Weiterentwickeln](docs/entwicklung.md): Konventionen, Designsystem, neue Seiten und Dienste
