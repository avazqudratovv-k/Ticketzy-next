# Ticketzy frontend: guide for AI coding tools and humans

Ticketzy is the web client of a portfolio ticketing site for concerts, football matches and comedy shows (no real payments). It was migrated from `nestar-next`; keep the existing architecture, do not rewrite the app, improve the UI in small steps.

## Stack and roles

- Next.js 14 (Pages Router), React 18, TypeScript, Apollo Client (GraphQL only), MUI 5 + Emotion, SCSS + CSS variables, next-i18next. Yarn only (no npm, no pnpm).
- Backend: separate repo `ticketzy` (NestJS, GraphQL), `http://localhost:3007/graphql`. Its notes are in `ticketzy/docs/ai` (BACKEND_MIGRATION.md, DECISIONS.md, FRONTEND_MIGRATION.md); read them for backend rules, do not edit them from here.
- Roles: USER buys. ORGANIZER needs admin approval (signs in as PENDING until then). ADMIN is created by the backend seed only.
- Buying is buyer-only: signed-in ORGANIZER and ADMIN see the buy control blocked (`libs/buyerGate.ts`, F290).

## Commands

```bash
yarn install
yarn dev            # http://localhost:3000
yarn build
yarn lint           # next lint
yarn typecheck      # tsc --noEmit
yarn i18n:check     # locale parity, placeholders, keys used in code, namespaces per page
```

Scratch builds (testing a changed copy, mock API) run on port 3100. Never start a second server on 3000.

## Working rules

1. Analyze before editing. Read `docs/ai/DECISIONS.md` first (frontend log, F-numbers); it wins over any older note.
2. Make small, incremental changes; do not remove working logic unless it is replaced safely.
3. Each decision gets the next F-number in `docs/ai/DECISIONS.md`. After a task add an entry to `docs/ai/FRONTEND_COMPLETED_TASKS.md` (what changed, how it was verified, what was not tested).
4. Do not commit unless asked. Never read `.env*` files or print secrets; `.env.example` lists the variables.
5. No new libraries without asking. Keep GraphQL/Apollo integration.
6. All user-visible text goes through i18n in `en`, `ko`, `ru` and `uz` (`public/locales/<lang>/<namespace>.json`).
7. Before reporting done run `yarn typecheck`, `yarn lint`, `yarn i18n:check`; for UI changes also check light and dark and run axe.

## Design rules

- Colors, type, spacing and radii come from the Volt tokens in `scss/tokens.css` (`tokens.json` carries the MUI palette values; keep both in step, F14). No hard-coded colors in page styles.
- Motion uses `--ease-*` and `--dur-*` (UI 120 to 300 ms, success up to 600 ms); animate transform and opacity only; nothing waits on an animation. Motion is in `scss/motion.scss`.
- Respect `prefers-reduced-motion`: switch animation off or reduce it to a short fade.
- Text contrast at least 4.5:1 (3:1 for large text and UI parts) in both themes; check with axe and calculate it over images and backdrop marks.
- No layout shift: reserve space for images (`width`/`height`), skeletons keep the final size, reveals use opacity/transform.
- Rails are native: `overflow-x: auto` + `scroll-snap-type`, no carousel library, no autoplay (F315).
- Dark is the default theme, light via `data-theme="light"` on `<html>`; every new style needs both.
- Controls are at least 44 px on touch screens (F262) and keep a visible focus ring; blocked buttons use `aria-disabled`, not `disabled`.
- Reuse existing `tz-` classes and components before adding new ones.

## Key files

- `libs/homeFeatured.ts`: ranking of the home hero event (pool size, sales window).
- `libs/components/layout/Backdrop.tsx`: decorative ticket marks; route list `BACKDROP_ROUTES`, fainter `--soft` routes for subtle text (F320). Faintness comes from CSS `opacity` only.
- `libs/seatAvailability.ts`: the only place for the "few left" and "selling fast" thresholds.
- `libs/hooks/useAdoptTypedValues.ts`: copies text typed before hydration into form state; use it on server-rendered forms.
- `apollo/client.ts` and `apollo/resilience.ts`: link chain with timeouts (queries 20 s, mutations 60 s), retry for queries only.
- `libs/auth/index.ts`: on sign-out use `resetStore()`, never `clearStore()` (clearStore leaves active queries stuck in loading, F296).

## Skills

Skills live in `.agents/skills` and are linked into `.claude/skills`; `skills-lock.json` records them. The list, uses and overrides are in `docs/ai/SKILLS.md`. `DECISIONS.md` and the design tokens override any skill. A skill script that downloads or runs a program needs explicit approval each time.
