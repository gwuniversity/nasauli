# Launch checklist

This covers the Phase 5 quality results, what's still needed before the public launch, how to run
a PI review round, and how to connect the custom domain.

## Quality results (October 5, 2026)

Checked on the production build:

| Check | Result |
|---|---|
| Accessibility (axe-core: WCAG 2.1 A/AA and best practices; all 25 pages, light and dark) | 0 violations |
| Lighthouse, mobile (home, use case, team, people, publications, news, outreach) | Performance 99–100 · Accessibility 100 · Best practices 100 · SEO 100 |
| Layout shift (CLS) | 0 on all tested pages (fonts are preloaded) |
| Console errors and failed requests (all pages, both themes) | None |
| Horizontal overflow at 390 px | None |
| Internal links (589) | All resolve; also verified under the GitHub Pages sub-path |
| External links (47) | All resolve. AIAA and IEEE block automated checks, so their 16 DOIs were confirmed through the doi.org registry instead |
| Reduced motion | The hero shows a static "spoofer localized" frame |
| Keyboard | The skip link is the first Tab stop; focus is visible throughout |
| No JavaScript | All content is visible |

Also in place: a custom 404 page, `robots.txt`, a sitemap, canonical URLs, an Open Graph and
Twitter preview image (`public/og-image.png`), and an Apple touch icon.

## Before the public launch

**Approvals**
- [ ] Each site PI reviews their team page, use cases, people, and publications (see "PI review round" below).
- [ ] PIs approve their headshots or send replacements. Notes:
  - [ ] Alfred Chen: the university photo is marked "© UC Regents". Get permission or a replacement.
  - [ ] Kwabena Konadu: the photo comes from a GMU news article.
  - [ ] Vijay Gupta, Mahsa Ghasemi, Amir Shirkhodaie: the official photos are low resolution (about 180 px).
  - [ ] Isaac Amundson, Heber Herencia-Zapana: no photo yet; they show as initials.
- [ ] Photo consent for the outreach photos. Until then they stay blurred, and only the blurred copies are in the repo.
- [ ] Final sign-off from the project PI, Peng Wei.

**Content still pending.** These sections are hidden on the live site; in a review build they're highlighted.
- [ ] Team overviews (all 8 teams)
- [ ] Advisory board members
- [ ] Demo videos (`src/data/demos.yaml`), including featured ones for the homepage
- [ ] Demo Day date and details
- [ ] A link for MirageMarker (IROS 2026) once one is public
- [ ] Spelling to confirm: "Stanley Zheng" and "Maheed Hatem Most Ahmed" (see `src/data/people.yaml`)

**Settings**
- [x] Contact addresses set in `src/lib/site.ts`: project inquiries go to pwei@gwu.edu, website questions to i.sharifi@gwu.edu.

## PI review round

1. In the GitHub repository, go to **Settings → Secrets and variables → Actions → Variables** and add
   `PUBLIC_SHOW_PENDING` = `true`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run the **Deploy to GitHub Pages** workflow by hand. The review site is published at
   `https://<user>.github.io/NASA-ULI-Web-App/`, and every section waiting for content shows a
   highlighted **PENDING** label naming who owns it.
4. Send PIs the link together with [CONTRIBUTING.md](../CONTRIBUTING.md).
5. For the public launch, delete the `PUBLIC_SHOW_PENDING` variable and redeploy.

> The review site is publicly reachable by anyone who has the URL. Only content that is fine to be
> public is in the repo, but search engines may index it before launch.

## Connecting the custom domain

The deploy workflow reads the site URL and base path from GitHub Pages, so **no code changes are needed**.

1. In **Settings → Pages → Custom domain**, enter the domain (for example `uli-airspace.example.edu`).
2. At the DNS provider, create the records GitHub shows:
   - a subdomain: a `CNAME` record pointing to `<user>.github.io`;
   - an apex domain: `A` records for GitHub Pages' IP addresses, plus an optional `www` CNAME.
3. Wait for DNS to propagate, then tick **Enforce HTTPS**.
4. Redeploy. Links, the sitemap, `robots.txt`, canonical URLs, and the preview image switch to the
   new domain automatically.

**Hosting at GWU instead:** build with the final URL and upload the `dist/` folder to any static web server.

```sh
SITE_URL=https://example.gwu.edu BASE_PATH=/ npm run build
```
