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

const roleRank = ['pi', 'site-pi', 'co-i', 'staff', 'postdoc', 'phd', 'ms', 'undergrad', 'intern'] as const;

const lastName = (name: string) => name.trim().split(/\s+/).at(-1)?.toLowerCase() ?? '';

/** People in display order: by team, then seniority, then explicit `order`, then last name. */
export async function getPeople() {
  const order = new Map((await getTeams()).map((t, i) => [t.id, i]));
  const people = await getCollection('people');
  return people.sort(
    (a, b) =>
      (order.get(a.data.team.id) ?? 99) - (order.get(b.data.team.id) ?? 99) ||
      roleRank.indexOf(a.data.role) - roleRank.indexOf(b.data.role) ||
      (a.data.order ?? 100) - (b.data.order ?? 100) ||
      lastName(a.data.name).localeCompare(lastName(b.data.name)),
  );
}

export const isInvestigator = (role: string) => role === 'pi' || role === 'site-pi' || role === 'co-i';

export async function getFigures(filter: { team?: string; useCase?: string }) {
  return (await getCollection('figures')).filter(
    (f) =>
      (!filter.team || f.data.teams.some((t) => t.id === filter.team)) &&
      (!filter.useCase || f.data.useCases.some((u) => u.id === filter.useCase)),
  );
}

/** Publications, newest first, then by title. */
export async function getPublications(filter: { team?: string; useCase?: string } = {}) {
  return (await getCollection('publications'))
    .filter(
      (p) =>
        (!filter.team || p.data.teams.some((t) => t.id === filter.team)) &&
        (!filter.useCase || p.data.useCases.some((u) => u.id === filter.useCase)),
    )
    .sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

export function publicationHref(p: { data: { doi?: string; url?: string } }) {
  return p.data.doi ? `https://doi.org/${p.data.doi}` : p.data.url;
}
