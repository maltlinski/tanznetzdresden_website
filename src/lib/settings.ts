/**
 * Vereinsdaten aus src/settings/verein.json – zentral gepflegt (auch über das CMS).
 * Das Schema bricht den Build ab, wenn Pflichtangaben fehlen.
 */
import { z } from 'astro/zod';
import raw from '../settings/verein.json';

const schema = z.object({
  name: z.string(),
  legalName: z.string(),
  claim: z.string(),
  description: z.string(),
  founded: z.number(),
  address: z.object({ street: z.string(), zip: z.string(), city: z.string() }),
  phone: z.string(),
  emails: z.object({ kontakt: z.email(), vorstand: z.email(), datenschutz: z.email() }),
  register: z.object({
    court: z.string(),
    number: z.string(),
    representatives: z.string(),
    representationNote: z.string(),
    contentResponsible: z.string(),
    taxNote: z.string(),
  }),
  social: z.object({ instagram: z.string(), telegram: z.string() }),
  stats: z.array(z.object({ value: z.string(), label: z.string() })),
  training: z.object({
    rhythm: z.string(), rhythmNote: z.string(), fee: z.string(), feeNote: z.string(),
    place: z.string(), placeAddress: z.string(),
  }),
  membership: z.object({ fee: z.string(), feeNote: z.string(), applicationPdf: z.string(), statutesPdf: z.string() }),
  map: z.object({ lat: z.number(), lon: z.number(), note: z.string().optional() }),
  press: z.object({ contact: z.string(), role: z.string() }),
  partners: z.array(z.string()),
  newsletter: z.object({ action: z.string(), note: z.string().optional() }),
});

export const verein = schema.parse(raw);
export type Verein = typeof verein;
