---
name: ticketzy-ui
description: Use when changing or adding any Ticketzy UI (styles, components, pages, motion, themes) so it matches the Volt tokens, motion rules, contrast and backdrop rules.
---

# Ticketzy UI

`docs/ai/DECISIONS.md` and `scss/tokens.css` win over any other skill. Read the relevant F-numbers first.

## Tokens
- Colors, spacing, radii, shadows: CSS variables from `scss/tokens.css` (`--accent` is Volt `#c8f53c`, `--ink-*`, surfaces). `scss/tokens.json` feeds the MUI palette; change both together (F14). No hard-coded colors in page styles.
- Reuse the `tz-` classes (`tz-badge`, `tz-chip`, `tz-tag`) and components in `libs/components/common` before adding new ones.

## Motion
- `--ease-standard|out|in|emphasis`, `--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 300ms`, `--dur-success 600ms`.
- CSS only, transform and opacity only, nothing waits on an animation. Add the reduced-motion case in `scss/motion.scss` (off, or a short fade).

## Themes and contrast
- Dark is default; light is `data-theme="light"` on `<html>`. Check every change in both.
- Text at least 4.5:1 (3:1 large text, UI parts). Run axe (wcag2a, wcag2aa, wcag21aa, best-practice). axe cannot decide over images or marks: calculate those from fill, opacity and the page color (see Part X in FRONTEND_COMPLETED_TASKS.md).
- `--ink-subtle` on a light-theme backdrop mark is the tightest case (4.52:1 at opacity 0.07).

## Backdrop
- Marks appear only on routes in `BACKDROP_ROUTES` (`Backdrop.tsx`); seats, checkout, account, organizer and admin stay plain.
- Fainter light marks (`--soft`) on routes with subtle text. Faintness is CSS `opacity` on the SVG, never a filter, mask or one-color copy.

## Tags and badges
- Event card status tag: `.tz-tag` (`EventTag.tsx`), white on `rgba(13, 14, 10, .78)` in both themes, dot is decoration, the text carries the meaning.
- Seat badges use the thresholds in `libs/seatAvailability.ts` only.

## Adding a page
1. Page file in `pages/`, wrapped with `withLayoutBasic` (public/buyer) or `withOrganizerLayout` / `withAdminLayout`; `getStaticProps` with the namespaces it uses.
2. `Seo` component (title, description; `noindex` for private pages). Add public pages to `libs/seo.ts` sitemap only if they should be indexed.
3. Add the route to `BACKDROP_ROUTES` only if it is a public marketing/info page.
4. Styles in the area's SCSS file with existing tokens; layout reserves space (no layout shift), 44 px touch targets (F262), visible focus.
5. Native scroll-snap for rails; blocked controls use `aria-disabled`.
6. Check light, dark, 375 / 768 / 1440 px, reduced motion, axe.
