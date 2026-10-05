# Website Plan — NASA ULI: Securing High-Density Urban Airspaces

Official public website for the project (award 80NSSC24M0070). Source material: the Year 1 and
Year 2 annual reports (kept locally in `reports/`, never committed).

## Decisions

| Topic | Decision |
|---|---|
| Structure | Modeled on safeaviationautonomy.stanford.edu (Home · Research · Teams · People · Demos · Publications · News · Outreach · About) |
| Visual direction | "Airspace": aeronautical-chart look in light mode, night-radar look in dark mode; flight-strip style use-case cards; restraint and big numbers à la Zipline/Wing |
| Theme | Light and dark mode; **light is the default** (not system-driven); choice remembered per visitor |
| Logos | None required. Institutions are set as typographic wordmarks; NASA support is stated in text |
| Videos | YouTube, embedded and played inline on our pages (privacy-enhanced, click-to-load) |
| Photos | PIs with photos; students/postdocs listed by name only; outreach photos blurred before commit until consent is confirmed |
| Excluded | UEI/EIN, phone numbers, contract/funding admin, in-review or unavailable papers, step-by-step attack details |
| Named | NASA technical monitors, invited speakers |
| Contact | i.sharifi@gwu.edu (temporary) |
| PI-owned content | Sections marked "pending" are left for site PIs to fill; they render as a quiet placeholder in production and a highlighted TODO in development |
| Stack | Astro (static), YAML/Markdown content collections with schemas, GitHub Pages (custom domain later) |

## Phases

### Phase 1 — Foundation & homepage ✅
- Astro project, build config, GitHub Pages deploy workflow
- Design system: color tokens (light/dark), type scale, spacing, grid, theme toggle
- Site shell: header/nav, mobile menu, footer with NASA acknowledgment + disclaimer
- Content model and schemas: teams, use cases, people, publications, demos, news
- Pending-content mechanism for PI-owned sections
- Homepage: animated airspace hero, mission, three technical challenges, key numbers, use-case strips, team map, latest news
- Placeholder pages for every nav item so links resolve

### Phase 2 — Research, use cases, teams, people ✅
- Research page (TCs, tasks, redrawn framework diagram)
- Eight use-case pages with figures from the reports
- Eight team pages (focus, highlights, PI cards, student lists)
- People page (PIs with photos, students/postdocs by name, alumni, advisory-board placeholder)

### Phase 3 — Publications, demos, media ✅
- Publications data (published/accepted only) with year/team/use-case filters
- Demos page with inline YouTube player; public tools and datasets
- Media pipeline: figure optimization, face-blur script for outreach photos

### Phase 4 — News, outreach, about, PI handoff ✅
- News & events, invited talks, annual meetings, Demo Day
- Outreach page
- About page (project facts, timeline, acknowledgment, contact)
- `CONTRIBUTING.md` guide so PIs can fill their sections

### Phase 5 — QA & launch (QA ✅ · launch pending approvals and domain; see LAUNCH.md)
- Accessibility (WCAG AA), mobile, performance, link checking
- PI review and sign-off by the project PI
- Custom domain
