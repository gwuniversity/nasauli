# Updating the project website: a guide for site PIs

This site is the official public website of the NASA ULI project *Securing High-Density Urban
Airspaces*. Most of it was drafted from the Year 1 and Year 2 annual reports. A few parts are
best written by each team, and those are listed below.

**The easiest option: email your updates to Iman Sharifi (i.sharifi@gwu.edu).** You don't need
to touch any files. If you're comfortable with GitHub, you can also edit the files yourself
(see [Editing on GitHub](#editing-on-github)).

## What we need from each team

| Item | Where it appears | What to send |
|---|---|---|
| **Team overview** | Top of your team page | A short paragraph (60–120 words) in your own words |
| **Headshots** | People page, team page | Approval of the photo we used, or a better one (square, at least 400 × 400 px) |
| **Research thrusts** | Team page | Corrections to the summaries we drafted from the reports |
| **People** | People page, team page | Additions, removals, role changes, and spelling fixes for students, postdocs, and staff |
| **Publications** | Publications, team, and use-case pages | New papers once **published or accepted** (title, authors, venue, year, DOI or link) |
| **Demo videos** | Demos page, use-case pages, homepage | A YouTube link, a one-line title, and one or two sentences of description |
| **News** | News page, homepage | Awards, talks, events, and media coverage (date, title, two sentences) |
| **Photos of people** | Outreach page | Confirmation that consent was obtained. Until then, photos stay blurred |

Project-level items (the advisory board and Demo Day details) come from the project PI.

### Ground rules

- **No unpublished work.** Papers that are under review or not yet available are not listed. A
  paper can be added once it has been accepted.
- **No confidential details.** No phone numbers, budget or contract information, or internal
  personnel matters.
- **Attacks are described briefly.** Explain what was found and why it matters, never
  step-by-step methods.
- **Photos of people need consent.** Unconsented photos are blurred before they're added.

## Where things live

All content is in plain text files. Each file has a fixed format, and a mistake stops the build
with a clear error message rather than breaking the live site.

| Content | File |
|---|---|
| Team descriptions, research thrusts, overview | `src/data/teams.yaml` |
| People | `src/data/people.yaml` |
| Publications | `src/data/publications.yaml` |
| Demo videos | `src/data/demos.yaml` |
| Tools and datasets | `src/data/tools.yaml` |
| Report figures | `src/data/figures.yaml` (images in `src/assets/figures/`) |
| Outreach programs | `src/data/outreach.yaml` |
| Use-case pages | `src/content/use-cases/*.md` |
| News items | `src/content/news/*.md` (one file per item) |
| Headshots | `src/assets/people/<person-id>.jpg` |

### Examples

**Team overview** (`src/data/teams.yaml`, under your team):

```yaml
  overview: Our group studies … In this project we focus on …
```

**A person** (`src/data/people.yaml`). `role` is one of `site-pi`, `co-i`, `postdoc`, `phd`, `ms`,
`undergrad`, `intern`, `staff`:

```yaml
- { id: jane-doe, name: Jane Doe, team: purdue, role: phd }
```

Set `alumni: true` when someone leaves. Their name then moves to "Former members".

**A publication** (`src/data/publications.yaml`). `status` is `published`, `accepted`, or
`conditionally-accepted`; `kind` is `journal`, `conference`, `workshop`, or `thesis`:

```yaml
- id: doe-2027-example
  title: An Example Paper Title
  authors: [J. Doe, V. Gupta]
  venue: IEEE Transactions on Automatic Control
  year: 2027
  status: accepted
  kind: journal
  teams: [purdue]
  useCases: [airspace-coordination]   # optional, see the list below
  doi: 10.1109/tac.2027.1234567       # or  url: https://…
```

**A demo video** (`src/data/demos.yaml`). Videos play on our own page, so visitors never leave
the site:

```yaml
- id: remote-id-hardware-demo
  title: Remote ID spoofing detection on real radios
  summary: One or two sentences on what the video shows.
  youtubeId: dQw4w9WgXcQ        # the 11 characters after "v=" in the YouTube link
  teams: [vanderbilt]
  useCase: remote-id            # optional
  featured: true                # optional; also shows it on the homepage
```

**A news item** (a new file in `src/content/news/`, e.g. `2027-03-best-paper.md`):

```markdown
---
title: Best paper award at Example Conference 2027
date: 2027-03-15
kind: milestone          # milestone | event | publication | talk | outreach
summary: Two sentences describing the news.
teams: [ut-austin]
---
```

### IDs to use

- **Teams:** `gwu`, `vanderbilt`, `purdue`, `ut-austin`, `uc-irvine`, `tsu`, `collins`, `nvcc`
- **Use cases:** `vision-landing` (UC-01), `separation-assurance` (UC-02), `remote-id` (UC-03),
  `atc-voice` (UC-04), `control-link` (UC-05), `emergency-landing` (UC-06),
  `airspace-coordination` (UC-07), `secure-architecture` (UC-08)

## Editing on GitHub

1. Open the file on GitHub and click the pencil icon (**Edit this file**).
2. Make your change, following the examples above. Indentation matters in `.yaml` files.
3. Click **Commit changes…**, choose **Create a new branch … and start a pull request**, and
   submit it.
4. A maintainer reviews the pull request and merges it. The site then updates automatically.

## Previewing locally (optional)

Requires Node.js 22.12 or newer:

```sh
npm install
npm run dev
```

Open http://localhost:4321. In this local preview, every section still waiting for content is
highlighted with a **PENDING** label naming who it's waiting on. Visitors to the live site don't
see these labels.
