# Improvement plan (after v0)

These come from a full review of v0: every page at desktop and phone width, in light and dark
mode, plus the code. They're grouped by how much they depend on other people.

## Phase A: Quick wins (no outside input needed) ✅ done, October 5, 2026

| # | Area | Improvement |
|---|---|---|
| A1 | Accuracy | The "Peer-reviewed publications" label counts a thesis and a conditionally accepted article. Relabel it as "Publications" and adjust the Publications page intro |
| A2 | Dark mode | Report figures sit in bright white frames that glare in dark mode. Soften the frame and slightly dim the images |
| A3 | Outreach | Programs with a single photo show one oversized blurred image. Use a shorter frame |
| A4 | Mobile | On team pages, investigators appear only after all the research thrusts. Show them first on small screens |
| A5 | Navigation | Add breadcrumbs (Research › UC-03, Teams › Vanderbilt) to detail pages |
| A6 | Figures | Clicking a figure opens the raw image in a new tab. Open an in-page viewer with the caption instead, closed with Esc or a click outside |
| A7 | Homepage | Publications don't appear on the homepage at all. Add a "Selected publications" section, chosen with a `featured` flag |
| A8 | Sharing | Every page shares the same preview image. Give use-case and team pages their own, taken from their first figure |
| A9 | SEO | Add structured data (JSON-LD): the research project and its funder on the homepage, papers on the Publications page, breadcrumbs on detail pages |
| A10 | Publications | Add a "Copy citation" button to each paper |
| A11 | Cross-linking | Show related tools and datasets on use-case and team pages |
| A12 | News | News items can't link anywhere. Add an optional link ("Read more") and fill it in where a paper or page exists |
| A13 | Feeds | Add an RSS feed for news |
| A14 | Maintenance | Run type and content checks plus an internal link check in CI before every deploy. Replace repeated inline spacing styles with a utility class |
| A15 | 404 | The decorative radar rings overlap the text on phones. Hide them on small screens |

## Phase B: Content (needs PIs or the project team)

- Demo videos (inline YouTube) and Demo Day date and details
- Team overviews in each PI's own words; corrections to the research-thrust summaries
- Headshot approvals, plus photos for Amundson and Herencia-Zapana; higher-resolution photos for Gupta, Ghasemi, and Shirkhodaie
- Outreach photo consent, so the photos can be shown unblurred
- Advisory board members
- Links to media coverage (FlyTrap at NDSS 2026), invited-talk recordings if any, and the MirageMarker paper link
- An optional "Opportunities" section (positions, internships) and an optional "Vision" section
- Long-term contact address and the custom domain

## Phase C: Larger features (worth deciding on)

- **Site-wide search** (Pagefind: static and privacy-friendly), useful as publications and news grow
- **Custom diagrams per use case** in place of the low-resolution report figures: light/dark-aware SVG schematics in the site's visual language
- **Highlighting project members in author lists**, linked to their team pages (needs a name-matching table)
- **BibTeX export** for one paper or the whole list
- **Privacy-friendly analytics** (e.g., Plausible or GoatCounter), if the team wants traffic numbers for reports
- **A use-case explorer** linking the map, teams, and use cases interactively
