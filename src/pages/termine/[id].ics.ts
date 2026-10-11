/** Ein Termin zum Eintragen in den eigenen Kalender: /termine/<id>.ics */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTermine, type Termin } from '../../lib/content';
import { icsResponse } from '../../lib/ics';
import { url } from '../../lib/i18n';

export const getStaticPaths = (async () =>
  (await getTermine()).map((t) => ({ params: { id: t.id }, props: { t } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) =>
  icsResponse([(props as { t: Termin }).t], { site, pageUrl: (t) => url('de', 'termine', `${t.id}/`) });
