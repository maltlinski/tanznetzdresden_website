/**
 * Kalender-Abo nur für KEEP UP (Profitraining): Trainingstage und Workshops, mit den veröffentlichten
 * Beschreibungen aus Intern → KEEP UP. Abonnierbar unter /profitraining.ics, z. B. in Google Kalender.
 */
import type { APIRoute } from 'astro';
import { getTermine } from '../lib/content';
import { getKeepUp } from '../lib/keep-up';
import { icsResponse } from '../lib/ics';
import { url } from '../lib/i18n';

export const GET: APIRoute = async ({ site }) =>
  icsResponse((await getTermine()).filter((t) => t.data.format?.id === 'keep-up'), {
    site,
    feed: true,
    name: 'KEEP UP · Profitraining',
    pageUrl: (t) => url('de', 'termine', `${t.id}/`),
    trainings: (await getKeepUp('de')).trainings,
    trainingUrl: url('de', 'profitraining'),
  });
