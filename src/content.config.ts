/**
 * Inhalts-Sammlungen (Content Collections).
 * Jede Sammlung ist ein Ordner unter src/content/ mit Markdown- oder YAML-Dateien.
 * Die Schemas prüfen beim Build, ob alle Pflichtfelder gesetzt sind – Tippfehler
 * fallen so sofort auf, statt still auf der Website zu landen.
 * Bearbeiten: direkt in den Dateien oder über das CMS unter /admin.
 *
 * Englisch: Felder mit Endung _en (z. B. teaser_en). Fehlen sie, erscheint
 * auf der englischen Seite der deutsche Text.
 */
import { defineCollection, reference, type SchemaContext } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { routes, type RouteKey } from './lib/i18n';
import { GALERIE_WERTE, OFFEN_WERTE } from './lib/profil-felder';

/**
 * „Auf der Website anzeigen“ (Redaktion). false = ausgeblendet: bleibt in der Datei, die Lader filtern es heraus
 * (src/lib/sichtbar.ts, docs/redaktion.md#ausblenden). Fehlt das Feld, ist der Eintrag sichtbar.
 */
const sichtbar = z.boolean().default(true);
/** Wortliste, in der einzelne Einträge ausgeblendet sein können: Text oder { text, sichtbar: false } */
const worte = z.array(z.union([z.string(), z.object({ text: z.string(), sichtbar })]));

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/, 'Format: JJJJ-MM-TT HH:MM (Ortszeit Dresden)');

const termine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/termine' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    /** Beginn in Dresdner Ortszeit, z. B. "2026-10-15 19:30" */
    start: localDateTime,
    /** Ende (optional, für den Kalender-Export) */
    end: localDateTime.optional(),
    venue: z.string(),
    /** Anzeige der Uhrzeit, falls abweichend (z. B. "11:00–15:00 Uhr") */
    timeLabel: z.string().optional(),
    timeLabel_en: z.string().optional(),
    /** Eintritt, z. B. "Eintritt frei" oder "Tickets über das Societaetstheater" (Tanzkalender, Terminseite) */
    eintritt: z.string().optional(),
    eintritt_en: z.string().optional(),
    category: z.enum(['Bühne', 'Training', 'Diskurs']),
    teaser: z.string(),
    teaser_en: z.string().optional(),
    /**
     * Mitwirkende aus dem Netzwerk – erscheinen auf deren Profil. Kürzel aus personen.yaml oder Adresse
     * eines freigegebenen Mitgliederprofils (deshalb kein reference(): die kommen erst beim Build aus Supabase).
     */
    people: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Kürzel wie „vorname-nachname“')).default([]),
    /** Externer Link (Tickets, Anmeldung …) – erscheint als Button auf der Terminseite */
    link: z.url().optional(),
    /** Passender News-Beitrag (Dateiname ohne .md aus src/content/news/de/), z. B. "studio-round-9" */
    news: z.string().optional(),
    /** Gehört zu einem Format (Dateiname ohne .md aus src/content/formate/). `keep-up` = Workshop im Profitrainings-Kalender */
    format: reference('formate').optional(),
    draft: z.boolean().default(false),
  }),
});

const routeKey = z.enum(Object.keys(routes) as [RouteKey, ...RouteKey[]]);

/**
 * Link auf der Formate-Seite: zu einem News-Beitrag, einer Seite der Website, einer Datei
 * (unter public/, z. B. "downloads/pressespiegel.pdf") oder einer Adresse außerhalb – genau eins davon.
 */
const formatLink = z
  .object({
    text: z.string(),
    text_en: z.string().optional(),
    /** Dateiname ohne .md aus src/content/news/de/ */
    news: z.string().optional(),
    seite: routeKey.optional(),
    datei: z.string().optional(),
    url: z.url().optional(),
    sichtbar,
  })
  .refine((l) => [l.news, l.seite, l.datei, l.url].filter(Boolean).length === 1, 'Genau ein Ziel: news, seite, datei oder url');

/** Rubriken der Formate (erste = Badge); die Filter „Ich möchte …“ fassen sie zusammen (src/lib/formate.ts) */
export const formatRubriken = ['buehne', 'training', 'diskurs', 'stadt', 'residenz'] as const;

const formate = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/formate' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      title_en: z.string().optional(),
      order: z.number(),
      since: z.string(),
      since_en: z.string().optional(),
      /** ein bis zwei Sätze: Startseite und Kopf der Formate-Seite */
      summary: z.string(),
      summary_en: z.string().optional(),
      /** ausführlich: Formate-Seite (sonst summary) */
      text: z.string().optional(),
      text_en: z.string().optional(),
      /** ohne Angabe: Bühne */
      rubriken: z
        .array(z.enum(formatRubriken))
        .default([])
        .transform((r): (typeof formatRubriken)[number][] => (r.length ? r : ['buehne'])),
      image: image(),
      alt: z.string(),
      alt_en: z.string().optional(),
      /** Eckdaten unter dem Text, z. B. Ort, Partner, Projektleitung */
      fakten: z.array(z.object({ label: z.string(), label_en: z.string().optional(), wert: z.string(), wert_en: z.string().optional(), sichtbar })).default([]),
      links: z.array(formatLink).default([]),
      /** Format ist beendet: „Laufzeit“ statt „Seit“, statt des nächsten Termins der Rückblick */
      beendet: z.boolean().default(false),
      /** Rückblick (News-Beitrag) für beendete Formate */
      rueckblick: z.string().optional(),
      /** Eigene Seite des Formats (Route aus src/lib/i18n.ts), z. B. "profitraining" */
      seite: routeKey.optional(),
      sichtbar,
    }),
});

/** Abgeschlossene Projekte im Archiv der Formate-Seite. Reihenfolge = Anzeige. */
const projekte = defineCollection({
  loader: file('./src/content/formate-archiv/projekte.yaml'),
  schema: z.object({
    titel: z.string(),
    /** z. B. "2011–2018" */
    jahre: z.string(),
    art: z.string(),
    art_en: z.string().optional(),
    text: z.string(),
    text_en: z.string().optional(),
    /** Partner, mit „ · “ getrennt */
    partner: z.string().optional(),
    partner_en: z.string().optional(),
    links: z.array(formatLink).default([]),
    sichtbar,
  }),
});

/** Chronik „Seit 2010 in Bewegung“: je Jahr ein oder mehrere Ereignisse */
const chronik = defineCollection({
  loader: file('./src/content/formate-archiv/chronik.yaml'),
  schema: z.object({
    punkte: worte.min(1),
    punkte_en: worte.optional(),
    sichtbar,
  }),
});

/**
 * Ausgaben des Tanzkalenders (Monatsplakat 2024–2026). id = erster Monat, z. B. "2026-04".
 * Plakat und PDF liegen nach `npm run tanzkalender:laden` in src/assets/tanzkalender/ und
 * public/downloads/tanzkalender/; bis dahin zeigt die Seite die Dateien der alten Website.
 */
const tanzkalenderAusgaben = defineCollection({
  loader: file('./src/content/formate-archiv/tanzkalender.yaml'),
  schema: z.object({
    /** Monate der Ausgabe (1–12), z. B. [7, 8] für Juli/August */
    monate: z.array(z.number().int().min(1).max(12)).min(1),
    /** Plakat und PDF auf der alten Website (Quelle zum Laden) */
    bild: z.url(),
    pdf: z.url(),
    /** Doppelplakat (doppelt so breit) */
    breit: z.boolean().default(false),
    /** im Kopf der Seite zeigen (drei Ausgaben) */
    kopf: z.boolean().default(false),
    sichtbar,
  }),
});

/**
 * KEEP UP (Profitraining, /profitraining/): Dozent:innen im Foto-Mosaik und Trainingswochen im Kalender.
 * Workshops sind normale Termine mit `format: keep-up`.
 */
const keepUpDozentinnen = defineCollection({
  loader: file('./src/content/keep-up/dozentinnen.yaml'),
  /** Name, Profil und Foto kommen aus dem Profil der Person (gleiches Kürzel) */
  schema: z.object({
    /** Schwerpunkt im Unterricht, z. B. Contemporary */
    stil: z.string(),
    stil_en: z.string().optional(),
    /** zwei bis drei Sätze zum Unterricht */
    text: z.string(),
    text_en: z.string().optional(),
    sichtbar,
  }),
});

const keepUpWochen = defineCollection({
  loader: file('./src/content/keep-up/wochen.yaml'),
  schema: z.object({
    dozent: reference('keepUpDozentinnen'),
    tage: z.array(z.enum(['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'])).min(1),
    zeit: z.string().regex(/^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}$/, 'Format: 10:00–11:30').default('10:00–11:30'),
    ort: z.string().optional(),
    sichtbar,
  }),
});

const personen = defineCollection({
  loader: file('./src/content/personen.yaml'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      pronouns: z.string().optional(),
      /** mitglied = Mitglied:in, trainer = Trainer:in */
      roles: z.array(z.enum(['mitglied', 'trainer'])).min(1),
      /** Funktion im Vorstand / Koordinationsteam (optional) */
      vorstand: z.string().optional(),
      vorstand_en: z.string().optional(),
      /** Profiltext (öffentlich). Absätze mit Leerzeile trennen. */
      bio: z.string().optional(),
      bio_en: z.string().optional(),
      /** Schwerpunkte, z. B. Choreografie, Contemporary, Somatics */
      tags: z.array(z.string()).default([]),
      /** Porträt, Pfad relativ zu dieser Datei, z. B. ../assets/personen/name.jpg */
      photo: image().optional(),
      photoCredit: z.string().optional(),
      /** Ausschnitt des Porträts: Fokuspunkt „x% y%“ (src/lib/bild-zuschnitt.ts) */
      photoFocus: z.string().regex(/^\d{1,3}% \d{1,3}%$/).optional(),
      website: z.url({ protocol: /^https?$/ }).optional(),
      instagram: z.string().optional(),
      vimeo: z.url({ protocol: /^https?$/ }).optional(),
      /** öffentliche Kontaktadresse (wird verschlüsselt ausgegeben) */
      email: z.email().optional(),
      /** Tätigkeit, z. B. „Tänzerin und Choreografin“ */
      profession: z.string().optional(),
      profession_en: z.string().optional(),
      /** Basis, z. B. „Dresden-Neustadt“ */
      base: z.string().optional(),
      /** ein Satz über die eigene Arbeit; was nach einem Doppelpunkt steht, wird hervorgehoben */
      pitch: z.string().optional(),
      pitch_en: z.string().optional(),
      /** offen für (src/lib/profil-felder.ts) */
      openFor: z.array(z.enum(OFFEN_WERTE)).default([]),
      /** Stücke und Projekte */
      works: z.array(z.object({ year: z.coerce.string(), title: z.string(), place: z.string().optional(), sichtbar })).default([]),
      /** Angaben im Abschnitt „Über“ */
      education: z.string().optional(),
      techniques: z.string().optional(),
      languages: z.string().optional(),
      regions: z.string().optional(),
      height: z.string().optional(),
      available: z.string().optional(),
      /** Galerie: Fotos in src/assets/personen/ */
      gallery: z.array(z.object({ photo: image(), caption: z.string().optional(), caption_en: z.string().optional(), credit: z.string().optional(), fokus: z.string().regex(/^\d{1,3}% \d{1,3}%$/).optional(), ganz: z.boolean().optional(), sichtbar })).default([]),
      galleryLayout: z.enum(GALERIE_WERTE).default('filmstreifen'),
      /** auf der Startseite zeigen */
      featured: z.boolean().default(true),
      sichtbar,
    }),
});

const seiten = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seiten' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.string().optional(),
  }),
});

const orte = defineCollection({
  loader: file('./src/content/kooperation/orte.yaml'),
  schema: z.object({
    name: z.string(),
    /** kurze Beschriftung auf der Karte */
    kurz: z.string().optional(),
    rolle: z.string(),
    rolle_en: z.string().optional(),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    /** Straße und Ort, z. B. "Bautzner Straße 107, 01099 Dresden" (Tanzkalender: unter dem Ort) */
    adresse: z.string().optional(),
    /** Ausgangspunkt des Netzes (magenta) */
    sitz: z.boolean().default(false),
    /** ids anderer Orte, zu denen eine Linie gezogen wird */
    verbunden: z.array(z.string()).default([]),
    url: z.url().optional(),
    sichtbar,
  }),
});

const partner = z.object({
  name: z.string(),
  rolle: z.string(),
  rolle_en: z.string().optional(),
  url: z.url().optional(),
  sichtbar,
});

const partnergruppen = defineCollection({
  loader: file('./src/content/kooperation/gruppen.yaml'),
  schema: z.object({
    titel: z.string(),
    titel_en: z.string().optional(),
    partner: z.array(partner).min(1),
    sichtbar,
  }),
});

/**
 * News / Journal. Ein Beitrag = eine Datei in src/content/news/de/<adresse>.md,
 * die englische Fassung (optional) liegt unter src/content/news/en/<adresse>.md und
 * braucht nur die übersetzten Felder (title, teaser, facts, quote, alt + Text).
 * Die Darstellung ergibt sich aus den Feldern: mit `deadline` → Ausschreibung,
 * mit `quote` → Stimme, mit `image` → Foto, sonst Text.
 */
export const newsCategories = ['Netzwerk', 'Ausschreibung', 'Training', 'Verein', 'Rückblick', 'Stimme'] as const;
/** Datum als „2026-10-01“ (YAML macht daraus ein Date – beides wird zu Text vereinheitlicht) */
const isoDate = z
  .union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: JJJJ-MM-TT')])
  .transform((d) => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)));
const newsTranslatable = (image: SchemaContext['image']) => ({
  title: z.string(),
  teaser: z.string(),
  /** „Auf einen Blick“ neben dem Text */
  facts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  /** Für Beiträge der Kategorie „Stimme“: das Zitat in der Übersicht */
  quote: z.object({ text: z.string(), who: z.string(), role: z.string().optional() }).optional(),
  image: image().optional(),
  alt: z.string().optional(),
  /** Ohne Titelbild: Netz-Kopf mit Magenta-Knoten – kleine Zeile und Angabe (z. B. „Ausgabe“ · „#6 · 26. November“) */
  nodeKicker: z.string().optional(),
  nodeValue: z.string().optional(),
});
/** Kopf der Beitragsseite (Entwurf News v3): auto = Vollbild, Hochkant-Fotos bekommen den Hochkant-Kopf */
export const newsHeroes = ['auto', 'vollbild', 'hochkant', 'split', 'typo'] as const;
/** Farbfläche des Netz-Kopfs (Beiträge ohne Titelbild) */
export const newsThemes = ['purple', 'cyan', 'tint'] as const;
const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news/de' }),
  schema: ({ image }) =>
    z
      .object({
        ...newsTranslatable(image),
        date: isoDate,
        category: z.enum(newsCategories),
        /** Wer den Text geschrieben hat */
        author: z.string(),
        hero: z.enum(newsHeroes).default('auto'),
        heroTheme: z.enum(newsThemes).default('purple'),
        /** Bildausschnitt des Fotos, z. B. "50% 30%" (waagerecht, senkrecht) */
        imageFocus: z.string().regex(/^\d{1,3}% \d{1,3}%$/, 'Format: 50% 30%').optional(),
        /** Bewerbungsfrist – macht den Beitrag zur Ausschreibung */
        deadline: isoDate.optional(),
        /** Groß oben auf der News-Seite und auf der Startseite (sonst der neueste Beitrag mit Foto) */
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
      }),
});
const newsEn = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news/en' }),
  schema: ({ image }) => z.object(newsTranslatable(image)).partial(),
});

export const collections = { termine, formate, projekte, chronik, tanzkalenderAusgaben, keepUpDozentinnen, keepUpWochen, personen, seiten, orte, partnergruppen, news, newsEn };
