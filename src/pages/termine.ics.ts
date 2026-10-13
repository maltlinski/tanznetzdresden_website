/**
 * Kalender-Feed (iCalendar, RFC 5545). Abonnierbar unter /termine.ics –
 * Kalender-Apps holen sich neue Termine dann automatisch. Enthält wie der Tanzkalender
 * auch die Trainingstage von KEEP UP.
 */
import type { APIRoute } from 'astro';
import { getTermine } from '../lib/content';
import { getKeepUp } from '../lib/keep-up';
import { icsResponse } from '../lib/ics';
import { url } from '../lib/i18n';

export const GET: APIRoute = async ({ site }) =>
  icsResponse(await getTermine(), {
    site,
    feed: true,
    pageUrl: (t) => url('de', 'termine', `${t.id}/`),
    trainings: (await getKeepUp('de')).trainings,
    trainingUrl: url('de', 'profitraining'),
  });
