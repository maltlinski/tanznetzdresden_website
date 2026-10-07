/**
 * Inhalts-Sammlungen (Content Collections).
 * Jede Sammlung ist ein Ordner unter src/content/ mit Markdown- oder YAML-Dateien.
 * Die Schemas prüfen beim Build, ob alle Pflichtfelder gesetzt sind – Tippfehler
 * fallen so sofort auf, statt still auf der Website zu landen.
 * Bearbeiten: direkt in den Dateien oder über das CMS unter /admin.
 */
import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/, 'Format: JJJJ-MM-TT HH:MM (Ortszeit Dresden)');

const termine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/termine' }),
  schema: z.object({
    title: z.string(),
    /** Beginn in Dresdner Ortszeit, z. B. "2026-10-15 19:30" */
    start: localDateTime,
    /** Ende (optional, für den Kalender-Export) */
    end: localDateTime.optional(),
    venue: z.string(),
    /** Anzeige der Uhrzeit, falls abweichend (z. B. "11:00–15:00 Uhr") */
    timeLabel: z.string().optional(),
    category: z.enum(['Bühne', 'Training', 'Diskurs']),
    teaser: z.string(),
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
      order: z.number(),
      since: z.string(),
      summary: z.string(),
      image: image(),
      alt: z.string(),
    }),
});

const personen = defineCollection({
  loader: file('./src/content/personen.yaml'),
  schema: z.object({
    name: z.string(),
    /** mitglied = Mitglied:in, trainer = Trainer:in */
    roles: z.array(z.enum(['mitglied', 'trainer'])).min(1),
    /** Funktion im Vorstand / Koordinationsteam (optional) */
    vorstand: z.string().optional(),
    website: z.url().optional(),
    instagram: z.string().optional(),
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
