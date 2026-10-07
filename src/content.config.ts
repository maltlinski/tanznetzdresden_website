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
import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

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
    /** Mitwirkende aus dem Netzwerk (ids aus personen.yaml) – erscheinen auf deren Profil */
    people: z.array(reference('personen')).default([]),
    /** Externer Link (Tickets, Anmeldung …) */
    link: z.url().optional(),
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

export const collections = { termine, formate, personen, seiten };
