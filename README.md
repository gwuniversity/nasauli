# NASA ULI: Securing High-Density Urban Airspaces — Website

Official website for the NASA University Leadership Initiative project *Securing High-Density Urban
Airspaces*. Built with [Astro](https://astro.build) as a static site.

See [docs/PLAN.md](docs/PLAN.md) for decisions and the phased build plan, and
[CONTRIBUTING.md](CONTRIBUTING.md) for how site PIs update their sections, and
[docs/LAUNCH.md](docs/LAUNCH.md) for the launch checklist, PI review round, and custom domain.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # http://localhost:4321 — pending sections show as highlighted TODOs
npm run build    # static output in dist/
npm run preview  # serve the production build
npm run check    # type-check and validate content
npm run check:links  # after a build: verify every internal link resolves
```

## Homepage animation

The hero shows two versions of the animation, which visitors switch between with the small
**3D | 2D** button (their choice is remembered on their device):

- **3D** (default): a three.js city scene in `src/scripts/airspace3d.ts`, loaded once the page is idle.
- **2D**: the canvas animation in `src/scripts/airspace.ts`, also used automatically when WebGL isn't available.

To make 2D the default, set `heroAnimation = '2d'` in `src/lib/site.ts`. Both versions use
separation keeping: an aircraft slows down when another one is inside its protected zone ahead.
A frozen copy of the 2D version is in `archive/hero-2d-2026-10-08/`.

## Where content lives

| Content | File |
|---|---|
| Partner institutions | `src/data/teams.yaml` |
| People (PIs, co-Is, students) | `src/data/people.yaml` |
| Publications (published/accepted only) | `src/data/publications.yaml` |
| Demo videos (YouTube) | `src/data/demos.yaml` |
| Tools & datasets | `src/data/tools.yaml` |
| Outreach programs | `src/data/outreach.yaml` |
| Report figures | `src/data/figures.yaml` + `src/assets/figures/` |
| Aviation use cases | `src/content/use-cases/*.md` |
| News & events | `src/content/news/*.md` |
| Site-wide text, nav, headline numbers | `src/lib/site.ts` |

Every collection has a schema in `src/content.config.ts`; a malformed entry fails the build.
Optional fields that a site PI is expected to provide render as a `<Pending>` placeholder:
highlighted in development (or with `PUBLIC_SHOW_PENDING=true`), a quiet note in production.

## Adding a demo video

Demos play inline on the site. There are two ways to add one.

**From a video file (self-hosted).** Put the original in `demos/` (git-ignored), add an entry to
`scripts/demo-sources.json` (source path, `loop` or `player`, optional trim, crop, and time-lapse
`speed`), then run:

```sh
npm run encode-demos              # needs ffmpeg (brew install ffmpeg); only encodes new clips
```

This writes a compressed MP4 and a poster image to `public/videos/` and updates
`src/data/videos.json`. Then describe the clip in `src/data/demos.yaml` with `video: <id>`.
Keep self-hosted clips short (about 15 MB or less); GitHub Pages limits a site to 1 GB.

**From YouTube.** Use `youtubeId:` instead of `video:`. The video plays through the
privacy-enhanced embed and loads only when clicked:

```yaml
- id: remote-id-hardware-demo
  title: Remote ID spoofing detection on real radios
  summary: One or two sentences on what the video shows.
  youtubeId: dQw4w9WgXcQ   # or  video: <id> for a self-hosted clip
  mode: player             # player (controls) | loop (short, silent, autoplays while visible)
  kind: real-world         # simulation | real-world | dashboard
  teams: [vanderbilt]
  useCase: remote-id       # optional; also shows the video on that use-case page
  featured: true           # optional; shows it on the homepage
```

## Confidential material and photos

`reports/` and `private/` are git-ignored and must never be committed. Photos of people who have
not given consent are blurred before they are added to the repository: put originals in
`private/outreach/` and run `npm run blur-photos`, which writes blurred copies to
`src/assets/outreach/`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`
(enable Pages → Source: GitHub Actions in the repository settings).
