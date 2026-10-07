# TanzNetzDresden e.V. — Design System

A complete corporate-identity system for **TanzNetzDresden e.V. (TNDD)** — a registered
association (*eingetragener Verein*) that networks and amplifies the **free / independent
dance scene in Dresden**. The system is in German. It exists so members, the public-relations
working group, designers, and agents can produce on-brand print documents, web/social
material, animated reels, and decks — fast, and without diluting the identity.

> **One sentence:** A sharp, sans-serif vocabulary for the free dance scene — Magenta as the
> dance impulse, dark Purple as the anchor, Cyan as breathing room; rectangles only, no
> rounded corners.

---

## What TNDD is

- **Org:** TanzNetzDresden e.V. — a network/association, not a venue or a company.
  Sitz: Pfotenhauer Straße 59 HH, 01307 Dresden · kontakt@tanznetzdresden.de · +49 1577 1520 512.
- **Mission:** Connect and strengthen Dresden's independent dance practitioners
  (*Tanzschaffende* / *Akteur:innen*) through formats, discourse, residencies and advocacy.
  Self-described as *„dezentrale Kulturinstitution und Bildungsort“*.
- **Scale & history:** Active **über 15 Jahre** (founded ~2010); **over 70 dance practitioners**
  in the network. Awards: Sächsischer Initiativpreis für Kunst und Kultur, Förderpreis der
  Landeshauptstadt Dresden.
- **Vorstand / Koordinationsteam (elected 2026):** **Alina Lucifero** (regionale Kooperationen,
  Öffentlichkeitsarbeit, Projektleitung Studio Round), **Rika Yotsumoto** (Finanzen, AG-Koordination,
  Projektleitung KEEP UP), **Justine Rouquart** (Mitgliederverwaltung, Projektleitung POP UP,
  Bodies & Textiles), **Malte Leonard Herz** (überregionale Kooperationen, Projektleitung
  Dresdance Gala, vision:danceable). Press/Öffentlichkeitsarbeit: Thomas Natzschka (Honorarkraft,
  seit 2022); newsletter with Yamile Navarro.
- **Recurring formats** (use as real copy): **Studio Round** (open showing + moderated talk;
  überregional with Tanznetz Freiburg & ID Frankfurt since 2024 via NPN-Impulsförderung),
  **POP UP** (since 2019; POP UP exchange since 2022), **KEEP UP Training** (since 2022 —
  Profitraining 3–5× weekly at **TENZA**, plus workshops), **vision:danceable** (Kurzstückreihe
  at the Societaetstheater, since 2024, with 4 rooms company & about blank collective),
  **Welttanztag** (29 April — Tanz im öffentlichen Raum), **Bodies & Textiles** (new 2027, with
  Wir Gestalten Dresden & Slow Fashion Festival), **Dresdance Gala** participation. AGs (working
  groups) carry the work: POP UP, Welttanztag, Studio Round, vision:danceable, Bodies & Textiles,
  Dresdance, Newcomer:innen, Elternschaft in Tanz, Sharing.
- **Audience:** dance practitioners & members; the wider Dresden public; funders, city offices
  and cultural partners (Amt für Kultur und Denkmalschutz, Nationales Performance Netz, Villa
  Wigman für Tanz, TENZA, Zentralwerk, Dachverband Tanz Deutschland, TanzAllianzen, Palucca
  Hochschule für Tanz).
- **Handles:** `@tanznetzdresden` · `tanznetzdresden.de`

## Source materials (provided)

Read these from the project filesystem; do not assume the reader can open them, but keep them
on record:

- `uploads/ci.css` — **the original single-source-of-truth CI stylesheet** (TNDD Design System
  v1.1, May 2026). Tokens, A4 page scaffold, and every print/digital component live here. This
  design system is the structured, compiler-readable re-authoring of that file.
- `uploads/CI-Kurzanleitung.html` — the human-facing CI quick guide + template index (the
  "rules on one page": colors, type, logo do/don'ts, voice).
- `uploads/Vorlage - Fließtext (2-spaltig).html` — a worked print template (2-column body page
  with margin column) used to verify the body/marginalia system.
- `uploads/TanzNetzDresden-Insta-Videos-standalone.html` — a bundled React reel generator
  (Instagram 1080×1920 intros + announcement layouts + a "Vorstand"/board format). The
  **vector logo** (`assets/tndd-logo.svg`, `tndd-mark.svg`, `tndd-word.svg`) and the animation
  vocabulary were extracted from this file.
- `uploads/TanzNetzDresden_Foerderantrag_2027_neu.docx` — the **real Förderantrag 2027**
  (institutional funding application to the Landeshauptstadt Dresden). Source of the current
  facts above, the **official logo PNG**, four pieces of **real stage photography**
  (→ `assets/photos/`), and the **Open Sans binaries** (→ `assets/fonts/`). Full extracted text:
  `uploads/extracted/document-text.txt`.

Original CI hierarchy referenced by the source: a master *TNDD Design System v1.1* document plus
`.docx` Word templates (Cover, Inhaltsverzeichnis, Kapitel-Opener, Fließtext, Pull-Quote,
Personen-Raster, Anschreiben/Brief, Rechnung, Mitgliedsantrag, Pressemitteilung, Protokoll) and
digital templates (Newsletter, Web-Hero, Social, E-Mail, Signatur). We were given the CSS +
two HTML previews + the reel bundle, not the `.docx` binaries or the master spec document.

---

## CONTENT FUNDAMENTALS — voice & copy

The brand writes in **German**, in a **clear, decisive, people-first** register. It sounds like
an engaged collective talking plainly — not like an office, and not like marketing.

**Person & address**
- **We-form (Wir-Form).** The association speaks as "wir": *"Die Studio Round wird seit 2021
  vom TanzNetzDresden organisiert."* Members are named, not abstracted.
- **Name the people, not the function.** Use **„Tanzschaffende"**, **„Akteur:innen"**,
  **„Künstler:innen"** — never dry role nouns where a human word exists.
- **Gender-inclusive colon spelling (Doppelpunkt):** `Akteur:innen`, `Künstler:innen`,
  `Tänzer:innen`. This is a load-bearing identity signal — keep it.

**Tone & texture**
- **Concrete numbers and places.** *"acht Ausgaben", "über 70 Tanzschaffende", "29. April",
  "Villa Wigman, Dresden", "Berlin, München, Leipzig… Finnland und Nigeria."* Specifics over
  adjectives.
- **One thought per paragraph. No justified text (kein Blocksatz).** Short, load-bearing
  sentences. German hyphenation on (`hyphens: auto`).
- **Decisive, warm, a little kinetic.** The CI guide literally opens: *"Klar und entschlossen"*
  (clear and decisive). Motion words fit the subject (Auftakt, Impuls, Bewegung).

**Hard nos**
- **No Behördendeutsch** (bureaucratic German), no passive stacks.
- **No buzzwords, no "Vereinslyrik"** (clubby/flowery association-speak).
- **No emoji. Ever.** Not in print, web, social, or reels.

**Casing & micro-typography**
- Headlines: sentence/phrase case, often broken across lines with a **Magenta-colored second
  line** for emphasis (`.pink`).
- **Mono tags / kickers are UPPERCASE** with wide tracking (e.g. `FREIE TANZSZENE`,
  `WIR STELLEN VOR · 2026`). Used as eyebrows and captions.
- German typographic quotes **„…"** (low-high), not straight quotes. Pull-quotes open with a big
  Magenta **„**.
- **Strong/emphasis = Magenta**, not bold-black: `<strong>` renders in Magenta within body text.
- Dates in German long form: *"Sa · 14. Juni 2026"*, *"29. April 2026"*. Middot `·` is the
  house separator for meta lines.

**Example fragments (reusable register)**
- Eyebrow: `FREIE TANZSZENE` · `DRESDEN · SEIT 2010`
- Headline + pink line: *"Ein Vokabular für die **freie Tanzszene.**"*
- Stat block: **8** — *Ausgaben Studio Round* · *"seit 2021 — lokal, national und international
  besetzt."*
- Reel claim: *"Die freie Tanzszene Dresdens"* / *"Über 70 Tanzschaffende"* / *"Eine Stadt. Ein
  Netz."*

---

## VISUAL FOUNDATIONS

The whole system is built from **flat color and sharp rectangles**. Depth and energy come from
**hard geometric cuts (the "Keil"/wedge), kinetic entrances, and decisive color blocking** — not
from shadows, gradients, glows, or rounded softness.

**Color**
- Three brand colors with fixed jobs: **Cyan `#48C6D7` = Auftakt** (upbeat — banners, fields,
  breathing room), **Magenta `#DA1A6A` = Akzent / die Stimme** (the voice — markers, accents,
  emphasis), **Purple/Dunkellila `#2E1A4D` = Anker** (anchor — headlines, dark bands, CTAs).
- **Rule: max. two brand colors dominant** on any surface. **Magenta is never a large-area
  background** — it appears as squares, thin rules, seams, the wedge edge, emphasized words.
- Neutrals are a **purple-tinted ink ramp** (`--ink`, `--ink-soft`, `--ink-muted`) on warm-cool
  paper whites (`--paper`, `--tint`). No pure grey.
- Common pairings: Purple field + Cyan/White text; Cyan field + Purple text; Paper + Purple
  headlines + Magenta accents.

**Type**
- **Work Sans** display, **800/700**, very tight tracking (`-0.02…-0.03em`), line-height down to
  `0.92–1.0` for big headlines. **Open Sans** body at 1.6 line-height. **JetBrains Mono** for
  tags, captions, tokens, dates — UPPERCASE, tracking `0.18–0.22em`.
- Headlines are **big and confident** (web H1 72px, cover 56px, social 56px). Mono tags are
  small (12px) and quiet.

**Shape & the "Keil" (wedge)**
- **Corner radius is 0 everywhere.** This is the single most important visual rule. Buttons,
  cards, chips, badges, photos, bands — all sharp.
- The **Keil** is the signature motif: a diagonal cut. As a **bottom bar**
  (`polygon(0 0, 72% 0, 100% 100%, 0 100%)`) under hero/social fields, and as a **clipped
  corner** (`polygon(0 0,100% 0,100% 88%,88% 100%,0 100%)`) on photo cards. Magenta seams and
  wedge edges add the "dance impulse."
- The **square marker** (Magenta, ~10px) is a recurring unit — it precedes mono tags and headers
  as the "voice" dot.

**Backgrounds**
- **Flat color fields**, not images-as-default. Full-bleed Purple or Cyan bands; paper white for
  documents. **No gradients, no textures, no patterns** (except the dashed placeholder fill on
  empty template slots). Photography appears as **full-bleed or wedge-clipped hero** blocks, not
  as faded background washes.
- Imagery vibe: **real stage photography — dark grounds, sculptural theatrical light, bodies in
  motion** (see `assets/photos/`). Full-color, contemporary; when it sits under text it gets a
  Purple lower-third band (`rgba(46,26,77,0.9)`) — not a gradient scrim. Crop photos into sharp
  blocks or Keil-clipped corners, never feathered or rounded.

**Borders, rules, cards**
- **Hairline rules** `1px var(--rule)` divide content; **3px Magenta top-border or left-rule**
  marks people-cards, callouts, margin columns. Headers/footers sit on `1–2px` purple/rule lines.
- Cards are **flat**: white surface, hairline or a Magenta accent edge, **no drop shadow, no
  rounding**. The only real shadow in the system (`--shadow-sheet`) is the on-screen "sheet of
  paper" effect for A4 previews on the dark workspace — it is a workspace metaphor, not a card
  style.

**Motion (reels / web)**
- **Quick and decisive**, easeOutExpo-style (`cubic-bezier(0.16,1,0.3,1)`). Words **slide in from
  off-screen** along the horizontal, accents **scale up** from an edge, photos **clip-wipe**
  left→right, wedges **translate** in. **No bounce, no spring, no infinite decorative loops** on
  content. Exits are short ease-in cuts. Rhythm is "rhythmic cuts" timed like an Auftakt.

**Interaction states (web/UI)**
- **Hover:** the primary action shifts **Purple → Magenta** (color change, not lift). Ghost
  buttons gain a Magenta border. Links go Cyan→Magenta.
- **Press:** a small `translateY(1px)` nudge. No scale-down, no shadow.
- **Focus:** Magenta ring/outline.
- **Transparency & blur:** used sparingly — a Purple lower-third at ~90% opacity over photos.
  No frosted-glass/backdrop-blur as a style.

**Layout**
- Strong **margin/grid discipline** from the A4 system (28/24/22/22mm). Running headers & footers
  with a page number in a **Magenta chip**. Two-column body + a narrow **margin column**
  (stats, pull-quotes, cross-refs) is the workhorse document layout. Social is 1080-grid with an
  84px margin.

---

## ICONOGRAPHY

TNDD is **near-iconless by design** — the identity is carried by **geometry, not pictograms**.

- **The square "voice" marker** (Magenta rectangle) is the primary "icon": it precedes tags,
  section titles, and list bullets. List bullets are **short Magenta dashes/rules**, not dots or
  glyphs.
- **The Keil/wedge** and flat color blocks do the work icons would do elsewhere.
- **The logo** is the one true mark: TNDD block-lettering + `TANZNETZDRESDEN` wordmark. It is a
  single vector unit (`assets/tndd-logo.svg`), recolorable via `currentColor` / SVG `fill`.
  Variants: `tndd-mark.svg` (block letters only), `tndd-word.svg` (wordmark only). Only four
  color treatments are sanctioned: Purple/White, Magenta/Tint, White/Purple, Purple/Cyan. Never
  rotate, distort, add effects, or set the logo on a large Magenta field.
- **No emoji, no unicode-glyph icons** in content. Arrows (`→ ↓`) and the middot (`·`) appear in
  navigational/meta contexts and are acceptable functional marks.
- If a UI genuinely needs functional icons (e.g. a web nav, form affordances), use a **thin,
  geometric, square-cut line set** with **0 corner radius** to match the marks. **Lucide**
  (CDN, 2px stroke, square linecaps via `stroke-linecap:square`) is the closest off-the-shelf
  match and is the recommended substitute. **⚠ Substitution flag:** the brand ships no icon font
  of its own — Lucide is our recommendation, not an official TNDD asset. Confirm with the user
  before leaning on icons; the brand prefers the marker/wedge geometry.

---

## Fonts — note

**Open Sans (body) is self-hosted** — real binaries extracted from the official Förderantrag
live in `assets/fonts/` and are declared via `@font-face` in `tokens/fonts.css`. **Work Sans
(display) and JetBrains Mono (tags)** still load from Google Fonts — both are genuine,
open-source brand fonts, but we have no local binaries for them yet. **⚠** For a fully
offline build, send Work Sans + JetBrains Mono files and we'll swap the remaining `@import`.

---

## Index / manifest

**Root**
- `styles.css` — single entry point (imports only). Link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible wrapper.

**Tokens** (`tokens/`)
- `fonts.css` · `colors.css` · `typography.css` · `spacing.css`
- `base.css` — minimal element defaults (body = Open Sans + ink, headings = Work Sans,
  code = mono). Mirrors the original ci.css `body` rule; no resets, no margins.

**Assets** (`assets/`)
- `tndd-logo.svg` (full), `tndd-mark.svg` (block letters), `tndd-word.svg` (wordmark) — all
  `currentColor`-recolorable. `tndd-logo-black.png` — the official raster logo from the
  Förderantrag. `tndd-logo.js` inlines the logo into plain HTML
  (`<span class="tndd-logo" data-part="full">`).
- `photos/` — real stage photography: `duo-orange-blue.jpg`, `duo-silhouette-stage.jpg`,
  `headstand-solo.jpg`, `ensemble-curtain-call.jpg`.
- `fonts/` — self-hosted Open Sans (regular/bold/italic/boldItalic).

**Foundations / specimen cards** (`guidelines/`) — Design System tab, groups *Colors · Type ·
Spacing · Brand*.

**Components** (`components/`) — reusable React primitives (group *Components*):
- `core/` — **Button**, **Tag**, **Badge**, **Logo**.
- `forms/` — **Input**, **Checkbox**, **Switch**.
- `layout/` — **Card**, **KeilBar**, **PageBand**.
- Each has a `.jsx`, a `.d.ts` (props contract) and a `.prompt.md` (what & when).

**UI kits** (`ui_kits/`):
- `website/` — the public TanzNetzDresden site (sticky header, hero with real stage photo in a
  Keil frame, formats grid, programme list + dark stats band, footer, interactive join modal).
- `social/` — the 1080 social toolkit: **Square** (1:1), **Story** (9:16), **Vorstand** (2×2
  board with the real 2026 board), with a format switcher.
- `print/` — the **Förderantrag 2027** as an A4 document recreation: cover, 2-column body page
  with margin column, Vorstand people grid. Print-ready (Cmd/Ctrl+P).

**Slides** (`slides/`) — 16:9 deck specimens built from the CI: **Title**, **Section**, **Data**,
**Quote**.

> Namespace for `@dsCard` / UI-kit HTML: `window.TanzNetzDresdenDesignSystem_cacd0a`.
> Starting points: **Logo**, **Button**, **Card**, **PageBand**, plus the **Website** and
> **Social** screens.
