import { getCollection } from 'astro:content';

/** Teams in display order (lead institution first). */
export async function getTeams() {
  return (await getCollection('teams')).sort((a, b) => a.data.order - b.data.order);
}

/** Use cases in display order. */
export async function getUseCases() {
  return (await getCollection('useCases')).sort((a, b) => a.data.order - b.data.order);
}

/** News, newest first. */
export async function getNews() {
  return (await getCollection('news')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
