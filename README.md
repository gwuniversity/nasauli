# NASA ULI: Securing High-Density Urban Airspaces — Website

Official website for the NASA University Leadership Initiative project *Securing High-Density Urban
Airspaces* (award 80NSSC24M0070). Built with [Astro](https://astro.build) as a static site.

See [docs/PLAN.md](docs/PLAN.md) for decisions and the phased build plan.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # http://localhost:4321 — pending sections show as highlighted TODOs
npm run build    # static output in dist/
npm run preview  # serve the production build
npm run check    # type-check and validate content
```

## Where content lives

| Content | File |
|---|---|
| Partner institutions | `src/data/teams.yaml` |
| People (PIs, co-Is, students) | `src/data/people.yaml` |
| Publications (published/accepted only) | `src/data/publications.yaml` |
| Demo videos (YouTube) | `src/data/demos.yaml` |
| Aviation use cases | `src/content/use-cases/*.md` |
| News & events | `src/content/news/*.md` |
| Site-wide text, nav, headline numbers | `src/lib/site.ts` |

Every collection has a schema in `src/content.config.ts`; a malformed entry fails the build.
Optional fields that a site PI is expected to provide render as a `<Pending>` placeholder:
highlighted in development (or with `PUBLIC_SHOW_PENDING=true`), a quiet note in production.

## Confidential material

`reports/` and `private/` are git-ignored and must never be committed. Photos of people who have
not given consent are blurred before they are added to the repository.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`
(enable Pages → Source: GitHub Actions in the repository settings).
