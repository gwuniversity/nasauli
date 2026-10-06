import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNews } from '~/lib/content';
import { site } from '~/lib/site';

export async function GET(context: APIContext) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const items = await getNews();
  return rss({
    title: `${site.name}: News`,
    description: site.description,
    site: new URL(`${base}/`, context.site),
    items: items.map((i) => ({
      title: i.data.title,
      description: i.data.summary,
      pubDate: i.data.date,
      link: i.data.link?.startsWith('http') ? i.data.link : `${base}${i.data.link ?? '/news'}`,
      categories: [i.data.kind],
    })),
  });
}
