/**
 * Kalender-Feed (iCalendar, RFC 5545). Abonnierbar unter /termine.ics –
 * Kalender-Apps holen sich neue Termine dann automatisch.
 */
import type { APIRoute } from 'astro';
import { getTermine } from '../lib/content';
import { icsResponse } from '../lib/ics';
import { url } from '../lib/i18n';

export const GET: APIRoute = async ({ site }) =>
  icsResponse(await getTermine(), { site, feed: true, pageUrl: (t) => url('de', 'termine', `${t.id}/`) });
