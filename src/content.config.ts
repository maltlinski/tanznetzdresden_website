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

const formate = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/formate' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      title_en: z.string().optional(),
      order: z.number(),
      since: z.string(),
      since_en: z.string().optional(),
      summary: z.string(),
      summary_en: z.string().optional(),
      image: image(),
      alt: z.string(),
      alt_en: z.string().optional(),
      /** Eigene Seite des Formats (Route aus src/lib/i18n.ts), z. B. "profitraining" */
      seite: z.enum(Object.keys(routes) as [RouteKey, ...RouteKey[]]).optional(),
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
  }),
});

const keepUpWochen = defineCollection({
  loader: file('./src/content/keep-up/wochen.yaml'),
  schema: z.object({
    dozent: reference('keepUpDozentinnen'),
    tage: z.array(z.enum(['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'])).min(1),
    zeit: z.string().regex(/^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}$/, 'Format: 10:00–11:30').default('10:00–11:30'),
    ort: z.string().optional(),
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
      website: z.url().optional(),
      instagram: z.string().optional(),
      vimeo: z.url().optional(),
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
      works: z.array(z.object({ year: z.coerce.string(), title: z.string(), place: z.string().optional() })).default([]),
      /** Angaben im Abschnitt „Über“ */
      education: z.string().optional(),
      techniques: z.string().optional(),
      languages: z.string().optional(),
      regions: z.string().optional(),
      height: z.string().optional(),
      available: z.string().optional(),
      /** Galerie: Fotos in src/assets/personen/ */
      gallery: z.array(z.object({ photo: image(), caption: z.string().optional(), caption_en: z.string().optional(), credit: z.string().optional() })).default([]),
      galleryLayout: z.enum(GALERIE_WERTE).default('filmstreifen'),
      /** auf der Startseite zeigen */
      featured: z.boolean().default(true),
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
    /** Ausgangspunkt des Netzes (magenta) */
    sitz: z.boolean().default(false),
    /** ids anderer Orte, zu denen eine Linie gezogen wird */
    verbunden: z.array(z.string()).default([]),
    url: z.url().optional(),
  }),
});

const partner = z.object({
  name: z.string(),
  rolle: z.string(),
  rolle_en: z.string().optional(),
  url: z.url().optional(),
});

const partnergruppen = defineCollection({
  loader: file('./src/content/kooperation/gruppen.yaml'),
  schema: z.object({
    titel: z.string(),
    titel_en: z.string().optional(),
    partner: z.array(partner).min(1),
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
});
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

export const collections = { termine, formate, keepUpDozentinnen, keepUpWochen, personen, seiten, orte, partnergruppen, news, newsEn };
