/**
 * Vereinsdaten aus src/settings/verein.json – zentral gepflegt (auch über das CMS).
 * Das Schema bricht den Build ab, wenn Pflichtangaben fehlen.
 * Englische Texte stehen im Block "en" und überschreiben die deutschen.
 */
import { z } from 'astro/zod';
import raw from '../settings/verein.json';
import type { Lang } from './i18n';

const stat = z.object({ value: z.string(), label: z.string() });

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
  stats: z.array(stat),
  training: z.object({
    rhythm: z.string(), rhythmNote: z.string(), fee: z.string(), feeNote: z.string(),
    place: z.string(), placeAddress: z.string(),
  }),
  membership: z.object({ fee: z.string(), feeNote: z.string(), applicationPdf: z.string(), statutesPdf: z.string() }),
  map: z.object({ lat: z.number(), lon: z.number(), note: z.string().optional() }),
  press: z.object({ contact: z.string(), role: z.string() }),
  partners: z.array(z.string()),
  funders: z.array(
    z.object({ name: z.string(), name_en: z.string().optional(), url: z.string(), logo: z.string(), note: z.string().optional() }),
  ),
  fundingText: z.string(),
  analytics: z.object({ provider: z.enum(['', 'matomo', 'plausible']), url: z.string(), siteId: z.string(), note: z.string().optional() }),
  newsletter: z.object({ action: z.string(), note: z.string().optional() }),
  en: z
    .object({
      claim: z.string(),
      description: z.string(),
      stats: z.array(stat),
      fundingText: z.string(),
      training: z.object({ rhythmNote: z.string(), feeNote: z.string() }).partial(),
      membership: z.object({ fee: z.string(), feeNote: z.string() }).partial(),
      register: z.object({ representationNote: z.string(), taxNote: z.string() }).partial(),
      press: z.object({ role: z.string() }).partial(),
      partners: z.array(z.string()),
    })
    .partial(),
});

export const verein = schema.parse(raw);
export type Verein = typeof verein;

/** Vereinsdaten in der gewünschten Sprache (englische Felder überschreiben deutsche). */
export function getVerein(lang: Lang): Verein {
  if (lang === 'de' || !verein.en) return verein;
  const en = verein.en;
  return {
    ...verein,
    claim: en.claim ?? verein.claim,
    description: en.description ?? verein.description,
    stats: en.stats ?? verein.stats,
    fundingText: en.fundingText ?? verein.fundingText,
    partners: en.partners ?? verein.partners,
    training: { ...verein.training, ...en.training },
    membership: { ...verein.membership, ...en.membership },
    register: { ...verein.register, ...en.register },
    press: { ...verein.press, ...en.press },
    funders: verein.funders.map((f) => ({ ...f, name: f.name_en || f.name })),
  };
}
