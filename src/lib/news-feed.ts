/** RSS-Feed der News (RSS 2.0) – /news.xml und /en/news.xml. */
import { getNews, newsCategoryLabel } from './news';
import { getVerein } from './settings';
import { url, type Lang } from './i18n';
import { href } from './url';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function newsFeed(lang: Lang, site: URL | undefined): Promise<Response> {
  const v = getVerein(lang);
  const abs = (path: string) => new URL(path, site ?? 'https://tanznetzdresden.de').href;
  const posts = await getNews(lang);
  const items = posts
    .map((p) => {
      const link = abs(url(lang, 'news', `${p.id}/`));
      const [y, m, d] = p.date.split('-').map(Number);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(Date.UTC(y, m - 1, d, 8)).toUTCString()}</pubDate>
      <category>${esc(newsCategoryLabel[lang][p.category])}</category>
      <description>${esc(p.teaser)}</description>
    </item>`;
    })
    .join('\n');
  const self = abs(url(lang, 'news'));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(v.name)} – News</title>
    <link>${self}</link>
    <atom:link href="${abs(href(lang === 'de' ? 'news.xml' : 'en/news.xml'))}" rel="self" type="application/rss+xml" />
    <description>${esc(lang === 'de' ? 'Neues aus der freien Tanzszene in Dresden' : "News from Dresden's independent dance scene")}</description>
    <language>${lang}</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
