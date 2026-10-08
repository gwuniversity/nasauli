# Archived 2D hero animation (October 8, 2026)

A frozen copy of the homepage's 2D airspace animation, saved before the 3D version was built:
three drone fleets, circled-H vertiports, Remote ID spoofing → localization → rerouting, and the
status panel docked under the animation.

| File | Live location it was copied from |
|---|---|
| `Hero.astro` | `src/components/home/Hero.astro` |
| `airspace.ts` | `src/scripts/airspace.ts` |

## Easiest way back to 2D

The 2D animation is still part of the site. Set this in `src/lib/site.ts`:

```ts
export const heroAnimation = '2d';
```

## Full restore from this snapshot

Use this only if the live files were changed or lost:

```sh
cp archive/hero-2d-2026-10-08/Hero.astro src/components/home/Hero.astro
cp archive/hero-2d-2026-10-08/airspace.ts src/scripts/airspace.ts
```

This folder is outside `src/`, so it is never built into the website.
