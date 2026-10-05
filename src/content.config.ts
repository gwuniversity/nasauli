import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Optional fields across these schemas are deliberately "PI-owned": when a value is missing,
// pages render a <Pending> placeholder instead of failing, so site PIs can fill them in later.

const techChallenge = z.enum(['TC1', 'TC2', 'TC3']);

const teams = defineCollection({
  loader: file('src/data/teams.yaml'),
  schema: z.object({
    name: z.string(),
    short: z.string(),
    /** Display order; the lead institution is 1. */
    order: z.number(),
    kind: z.enum(['university', 'industry', 'community-college']),
    city: z.string(),
    state: z.string(),
    // Used to place the institution on the team map.
    lat: z.number(),
    lon: z.number(),
    /** One-line description of the team's role in the project. */
    role: z.string(),
    focus: z.array(z.string()),
    useCases: z.array(reference('useCases')).default([]),
    website: z.url().optional(),
    /** Longer team overview, written by the site PI. */
    overview: z.string().optional(),
  }),
});

const useCases = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/use-cases' }),
  schema: z.object({
    code: z.string().regex(/^UC-\d{2}$/),
    title: z.string(),
    /** One sentence shown on cards. */
    summary: z.string(),
    threat: z.string(),
    teams: z.array(reference('teams')),
    challenges: z.array(techChallenge),
    order: z.number(),
  }),
});

const people = defineCollection({
  loader: file('src/data/people.yaml'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      team: reference('teams'),
      role: z.enum(['pi', 'site-pi', 'co-i', 'postdoc', 'phd', 'ms', 'undergrad', 'intern', 'staff']),
      title: z.string().optional(),
      /** Only PIs and co-Is carry photos; students are listed by name. */
      photo: image().optional(),
      website: z.url().optional(),
      alumni: z.boolean().default(false),
    }),
});

const publications = defineCollection({
  loader: file('src/data/publications.yaml'),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number().int(),
    // In-review work is intentionally not representable here.
    status: z.enum(['published', 'accepted']),
    teams: z.array(reference('teams')),
    useCases: z.array(reference('useCases')).default([]),
    doi: z.string().optional(),
    url: z.url().optional(),
  }),
});

const demos = defineCollection({
  loader: file('src/data/demos.yaml'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    youtubeId: z.string().regex(/^[\w-]{11}$/),
    teams: z.array(reference('teams')),
    useCase: reference('useCases').optional(),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['milestone', 'event', 'publication', 'talk', 'outreach']),
    summary: z.string(),
    teams: z.array(reference('teams')).default([]),
  }),
});

export const collections = { teams, useCases, people, publications, demos, news };
