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
    /** Research thrusts, summarized from the annual reports. */
    thrusts: z
      .array(
        z.object({
          title: z.string(),
          body: z.string(),
          useCase: reference('useCases').optional(),
          partners: z.array(reference('teams')).default([]),
        }),
      )
      .default([]),
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
    /** Proposal task numbers this use case advances, e.g. "1.1". */
    tasks: z.array(z.string().regex(/^[1-3]\.[1-3]$/)).default([]),
    order: z.number(),
    /** Headline results from published or accepted work only. */
    highlights: z
      .array(z.object({ value: z.string(), label: z.string(), team: reference('teams') }))
      .default([]),
  }),
});

const figures = defineCollection({
  loader: file('src/data/figures.yaml'),
  schema: ({ image }) =>
    z.object({
      src: image(),
      alt: z.string(),
      caption: z.string(),
      teams: z.array(reference('teams')),
      useCases: z.array(reference('useCases')).default([]),
      /** Diagrams drawn on black keep their own background in both themes. */
      dark: z.boolean().default(false),
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
      /** Optional position within a role group; otherwise sorted by last name. */
      order: z.number().optional(),
      /** e.g. "Summer 2026 intern" for community-college interns. */
      cohort: z.string().optional(),
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
    status: z.enum(['published', 'accepted', 'conditionally-accepted']),
    kind: z.enum(['journal', 'conference', 'workshop', 'thesis']),
    teams: z.array(reference('teams')),
    useCases: z.array(reference('useCases')).default([]),
    doi: z.string().optional(),
    url: z.url().optional(),
    /** Shown in "Selected publications" on the homepage. */
    featured: z.boolean().default(false),
  }),
});

const demos = defineCollection({
  loader: file('src/data/demos.yaml'),
  schema: z
    .object({
      title: z.string(),
      summary: z.string(),
      /** Self-hosted clip: public/videos/<video>.mp4 (+ .jpg poster), from `npm run encode-demos`. */
      video: z.string().regex(/^[a-z0-9-]+$/).optional(),
      /** Or a YouTube video, played inline via the privacy-enhanced embed. */
      youtubeId: z.string().regex(/^[\w-]{11}$/).optional(),
      /** loop: short, silent, autoplays while visible. player: full video with controls. */
      mode: z.enum(['loop', 'player']).default('player'),
      kind: z.enum(['simulation', 'real-world', 'dashboard']).optional(),
      shown: z.enum(['year-1-review', 'year-2-review']).optional(),
      teams: z.array(reference('teams')),
      useCase: reference('useCases').optional(),
      featured: z.boolean().default(false),
    })
    .refine((d) => Boolean(d.video) !== Boolean(d.youtubeId), { message: 'Set exactly one of `video` or `youtubeId`.' }),
});

const tools = defineCollection({
  loader: file('src/data/tools.yaml'),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['simulator', 'dataset', 'software']),
    summary: z.string(),
    teams: z.array(reference('teams')),
    useCases: z.array(reference('useCases')).default([]),
    /** Public link. Omit when the resource is not publicly released. */
    url: z.url().optional(),
  }),
});

const outreach = defineCollection({
  loader: file('src/data/outreach.yaml'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      audience: z.enum(['community-college', 'graduate', 'undergraduate', 'high-school', 'k-12']),
      when: z.string(),
      summary: z.string(),
      teams: z.array(reference('teams')),
      /** Blurred copies only (see scripts/blur-photos.mjs) until consent is confirmed. */
      photos: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      order: z.number(),
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
    /** Optional "Read more" target: a site path (/research/remote-id) or a full URL. */
    link: z.string().optional(),
  }),
});

export const collections = { teams, useCases, figures, people, publications, demos, tools, outreach, news };
