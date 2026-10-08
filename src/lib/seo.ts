import { site } from './site';

/** schema.org BreadcrumbList for a trail of { label, href } (href relative to the site root). */
export function breadcrumbLd(trail: { label: string; href: string }[], siteUrl: URL | undefined, base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: new URL(`${base.replace(/\/$/, '')}${c.href}`, siteUrl).href,
    })),
  };
}

export function projectLd(siteUrl: URL | undefined, partners: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ResearchProject',
    name: site.name,
    description: site.description,
    url: siteUrl?.href,
    funder: {
      '@type': 'GovernmentOrganization',
      name: 'NASA Aeronautics Research Mission Directorate',
      url: 'https://www.nasa.gov/aeronautics/',
    },
    member: partners.map((name) => ({ '@type': 'Organization', name })),
    email: site.contactEmail,
  };
}
