# 00 Overview

**What this file covers.** This is the first of seven files that describe the Ticketzy **frontend** repository (`/Users/kenneth/ticketzy-next`) so that a teacher who cannot see the code can teach it to its owner. It explains what the project is for, the technology stack with exact installed versions, every top-level folder, how to run and check it, the environment variable names, a glossary of words used in this repo, and a table of all decision files. Files 01 and 02 explain flows and rules (they also describe what the backend repo `/Users/kenneth/ticketzy` does, because a flow ends in its database). Files 03 to 06 are specific to this frontend repo. Every claim names a file; where the code looks odd the point is collected in "Questions and oddities" at the end of `06-quality.md`.

How this tour was made: only code and docs were read (`AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ai/*`, then source). No `.env*` file was opened; variable names come from `.env.example`, `next.config.js` and `process.env` usages in the code. Nothing was run, built or committed. Where the tour says "the backend does X", it was read in `/Users/kenneth/ticketzy/apps/ticketzy-api/src/...`.

---

## 1. Purpose

Ticketzy is a **portfolio** website for selling tickets to concerts, football matches and comedy shows. It is not a company. **No real money moves**: payment, refund and payout are simulated (`README.md`, "Known limitations"; backend `components/payment/mock-payment.provider.ts`).

Three kinds of people use it (called **roles**, enum `MemberType` in `libs/enums/member.enum.ts`):

| Role | Can do |
|---|---|
| `USER` (buyer) | Browse events, pick seats, pay (simulated), get QR tickets, refund, like (heart on cards and the event page) and comment. |
| `ORGANIZER` | Create venues and seat layouts, create events and ticket types, submit events for approval, check people in with QR, see sales and payouts, chat with admins. Must be approved by an admin first. |
| `ADMIN` | Approve organizers and events, cancel events (which refunds buyers), manage commission, record payouts, see orders and members. Created only by a backend seed script. |

This repository is **only the web client**. The server (NestJS + GraphQL + MongoDB) lives in the separate repo `ticketzy`. The project was migrated from an older project called Nestar (`nestar-next`); the first decisions F1 to F13 record that cleanup.

## 2. Stack

Versions below are the **installed** ones read from `node_modules/<pkg>/package.json`; `package.json` has looser ranges (for example `"@apollo/client": "^3.5.10"`, installed 3.8.3). `yarn.lock` pins them.

| Piece | Installed version | What it is, in beginner words |
|---|---|---|
| Next.js | 14.2.0 | React framework. Uses the **Pages Router**: each file in `pages/` is a URL. Does server rendering, static generation and the build. |
| React | 18.2.0 | UI library. Components are functions that return markup. |
| TypeScript | 5.9.3 (`^5.4.5` declared) | JavaScript with types; `yarn typecheck` runs `tsc --noEmit`. `strict`, `noUnusedLocals`, `noUnusedParameters` are on (`tsconfig.json`). |
| Apollo Client | 3.8.3 | GraphQL client with a normalized cache. All server data goes through it. |
| `graphql` | 15.8.0 | Parser used by Apollo (`gql` tagged strings). |
| `apollo-upload-client` | 17.0.0 | Makes the HTTP link able to send files (multipart) for image upload. |
| MUI (`@mui/material`) | 5.14.9 | Component library (buttons, dialogs, popover, select). Themed in `scss/MaterialTheme/index.ts`. |
| Emotion | `@emotion/react` 11.11.1 | CSS-in-JS engine MUI needs. |
| Sass | 1.67.0 | SCSS files in `scss/`. |
| next-i18next / i18next / react-i18next | 14.0.3 / 21.10.0 / 11.18.6 | Translation system, 4 languages. |
| `html5-qrcode` | 2.3.8 | Camera QR **scanner** (organizer check-in). |
| `qrcode` | 1.5.4 | QR **renderer** (draws the ticket QR as an image). |
| `jwt-decode` | 3.1.2 | Reads the expiry and id from the login token in the browser (does not verify it). |
| `phosphor-react` | 1.4.1 | Icon set. |
| ESLint / Prettier | 8.57.1 / 2.7.1 | Lint and format. Prettier: tabs, single quotes, width 120 (`.prettierrc`). |
| Node | CI uses 20 (`.github/workflows/ci.yml`); the machine used for the work had 24.15.0; `package.json` has no `engines` field. | |
| Package manager | **Yarn only** (`AGENTS.md`). `yarn.lock` is committed. | |

No chart library, no carousel library, no state library (Redux etc.), no test framework: charts are hand-made SVG (F228), rails are native scrolling (F315), state is Apollo reactive variables and React state.

**Backend (read for cross-checks only):** NestJS, GraphQL (code-first), MongoDB via Mongoose, JWT (1 day, `components/auth/auth.module.ts`: `signOptions: { expiresIn: '1d' }`), bcrypt passwords, WebSocket gateway for chat, a separate "batch" Nest app for timed jobs. Default API address in dev: `http://localhost:3007/graphql` (`AGENTS.md`).

## 3. Repository layout (frontend)

Top level of `/Users/kenneth/ticketzy-next` (git tracks about 872 files):

```
ticketzy-next/
├── AGENTS.md            Guide for AI tools and humans: stack, roles, commands, working rules, design rules.
├── CLAUDE.md            Imports AGENTS.md; adds Claude Code notes (skills, browser checks, report format).
├── README.md            Public description, features, setup, env table, known limitations.
├── CHANGELOG.md         One entry: 0.1.0.
├── SKILLS.md            One line pointing to docs/ai/SKILLS.md.
├── LICENSE              MIT.
├── package.json         Scripts and dependencies (name ticketzy-next, version 0.1.0, private).
├── yarn.lock            Locked dependency versions.
├── next.config.js       reactStrictMode, i18n from next-i18next.config.js, and the production-build env check.
├── next-i18next.config.js  Locales en/ko/ru/uz, default en, localeDetection off, trailingSlash true (see oddity O-1).
├── tsconfig.json        Strict TypeScript; includes **/*.ts(x).
├── .eslintrc.json       next/core-web-vitals + eqeqeq + no-console (error/warn allowed).
├── .prettierrc          Formatting rules.
├── .gitignore / .gitattributes
├── .env.example         Variable NAMES with comments (values are placeholders). Other .env* files exist locally and are git-ignored; they were not read.
├── skills-lock.json     Pins installed AI "skills" (source repo + hash).
├── next-env.d.ts, tsconfig.tsbuildinfo, .next/, node_modules/   Generated (not source).
├── .github/workflows/ci.yml   The only CI workflow (details in 06-quality.md).
├── .agents/skills/      Installed AI skill packs (emil-design-eng, frontend-design, impeccable, review-animations,
│                        ui-ux-pro-max, vercel-react-best-practices, web-design-guidelines, webapp-testing).
├── .claude/             Claude Code settings; skills/ has symlinks to .agents/skills plus the two project skills
│                        ticketzy-ui and ticketzy-frontend-workflow.
├── apollo/              GraphQL layer (documents + client). See 04-state-and-data.md.
│   ├── client.ts        Builds the Apollo client and its link chain.
│   ├── resilience.ts    Timeout, retry and "server is waking up" tracking links.
│   ├── store.ts         Reactive variables (signed-in user, auth ready, messaging state).
│   ├── messaging.ts     Chat queries and mutations.
│   ├── payouts.ts       Payout queries and mutation.
│   ├── user/            query.ts, mutation.ts, fragments.ts (buyer and public operations).
│   ├── organizer/       query.ts, mutation.ts, orders.ts, sales.ts, venue.ts.
│   └── admin/           query.ts, mutation.ts.
├── design/              Design export from the designer: tokens, components.css, pages.css, HTML mock-ups and PNGs.
│                        Reference only; its components.css/pages.css are NOT imported (F17).
├── docs/ai/             Decision log (DECISIONS.md), completed-task log, audits, schema.json (introspection dump of
│   └── tour/            the backend GraphQL schema), and these tour files.
├── libs/                All app code that is not a route. Subfolders:
│   ├── components/      React components by feature (account, admin, assistant, auth, common, dashboard, events,
│   │                    layout, messages, notifications, organizer, payouts, seats, states, static) + Top.tsx, Footer.tsx.
│   ├── hooks/           Shared hooks (useAuth, usePagedQuery, useSeatMap, useEventFilters, ...).
│   ├── auth/            Token storage, session start/stop, session-expiry handler, route guards.
│   ├── messaging/       WebSocket client, conversation store, thread hook.
│   ├── seats/           Seat-map maths, hold clock, checkout helpers, error mapping.
│   ├── venues/          Layout model, undo history, templates, editor hooks.
│   ├── organizer/       Event form model/validation, analytics, check-in, attendees, etc.
│   ├── admin/           Admin list/URL-state helpers, error mapping, types.
│   ├── account/         Buyer-side helpers (tickets state, refund messages, ics file, notifications).
│   ├── assistant/       AI chat store, error codes, safe text renderer.
│   ├── theme/           ThemeModeProvider (dark/light + MUI theme).
│   ├── types/           Hand-written TypeScript types for GraphQL results.
│   ├── enums/           member.enum.ts.
│   └── *.ts             Single-purpose modules: routes, errors, fieldErrors, format, events, salesWindow, homeFeatured,
│                        seatAvailability, buyerGate, safeReturnTo, seo, site, serverFetch, i18n, images, config, aiErrors,
│                        payouts, venueConflict.
├── pages/               One file per URL (Pages Router). See 03-routes.md.
├── public/              favicon/icons/manifest/og-default.png and locales/<lang>/<namespace>.json (11 files per language).
├── scripts/             i18n-check.js and check-return-to.js (Node scripts, no dependencies).
└── scss/                tokens.css (+tokens.json), MaterialTheme/index.ts, and one .scss per area (about 9,900 lines total).
```

Size (lines of TS/TSX/SCSS counted during the tour): `apollo` about 2,500, `libs` about 19,600, `pages` about 9,400, `scss` about 9,900.

## 4. How to run and check

All commands from `package.json` (Yarn only):

| Command | What it does |
|---|---|
| `yarn install` | Install dependencies (CI uses `--frozen-lockfile`). |
| `yarn dev` | `next dev`, http://localhost:3000. Needs the backend running at the GraphQL URL in `.env.local`. |
| `yarn build` / `yarn start` | Production build / serve it. `yarn build` throws if a required env variable is missing (`next.config.js`, `requireEnv`). |
| `yarn lint` | `next lint`. |
| `yarn typecheck` | `tsc --noEmit`. |
| `yarn i18n:check` | `scripts/i18n-check.js`: locale key parity, `{{placeholder}}` parity, keys used in code exist, each page loads the namespaces its components use. |
| `yarn check:return-to` | `scripts/check-return-to.js`: tests `libs/safeReturnTo.ts` against lists of good and bad values. |

Working rules that affect how you test (from `AGENTS.md`): scratch builds run on port **3100**, never start a second server on 3000; no commits unless asked; no new libraries without asking; all user-visible text goes through i18n in four languages; before reporting done run typecheck, lint, i18n:check (and for UI changes check light and dark and run axe).

To get data: start the backend, then its seed commands (`npm run seed` for the first admin, `npm run seed:demo` for demo members, venues, events and orders; README.md). The README names two demo e-mails (`buyer@ticketzy.demo`, `organizer@ticketzy.demo`); passwords come from the seed output and are not in the repo.

There are **no automated unit/e2e tests** in this repo (no `*.test.*`, `*.spec.*`, jest/playwright/cypress config found). The checks are the five commands above plus manual browser/axe checks described in `docs/ai/FRONTEND_COMPLETED_TASKS.md`.

## 5. Environment variables (names only)

Read at **build time** and copied into the browser bundle (any `NEXT_PUBLIC_*`), so they are public and must never hold secrets (`.env.example` comment, README).

| Name | Meaning | Where read | Required in production build? |
|---|---|---|---|
| `NEXT_PUBLIC_API_GRAPHQL_URL` | GraphQL endpoint of the backend. | `apollo/client.ts` (`createUploadLink`), `libs/serverFetch.ts` | Yes (`next.config.js`) |
| `NEXT_PUBLIC_API_WS_URL` | WebSocket address of the backend (organizer/admin chat). | `libs/messaging/socket.ts` (`connect`) | Yes |
| `NEXT_PUBLIC_API_URL` | Backend base address; used to turn a stored upload path like `uploads/...` into a full image URL. | `libs/config.ts`, used by `libs/components/events/EventImage.tsx` | Yes |
| `NEXT_PUBLIC_SITE_URL` | Public address of this site: canonical links, hreflang, sitemap, robots. | `libs/site.ts` (`SITE_URL`) | Yes (in dev falls back to `http://localhost:3000`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Mailbox on the contact page; default `hello@ticketzy.demo`. | `libs/site.ts` (`CONTACT_EMAIL`) | No |
| `NODE_ENV` | Set by Next. `development` turns on Apollo error logging; `production` removes the localhost fallback of `SITE_URL`. | `apollo/client.ts`, `libs/site.ts` | (Next sets it) |

Backend variable names seen in backend code (not verified against the backend `.env.example`, listed because the frontend docs mention their effects): `SEAT_HOLD_SECONDS` (default 30, 1 to 3600; `libs/env.validation.ts`), `PAYMENT_MODE` (`simulated` or `disabled`), `QR_SECRET` (signs QR tokens), `SECRET_TOKEN` (JWT secret, per backend decision #26), `MONGO_DEV` / `MONGO_PROD`, `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and `ADMIN2_*`), `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_MODEL`, `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_PER_MINUTE`, `AI_DAILY_CAP`, `PORT`, `PORT_API`.

## 6. Glossary

| Term | Meaning in this repo |
|---|---|
| **Pages Router** | Next.js style where `pages/events/[id]/index.tsx` is the URL `/events/<id>`. `[id]` is a dynamic segment. |
| `getStaticProps` / `getServerSideProps` | Next functions that run on the server before the page is sent. Here they almost only load **translations** (`serverSideTranslations`); data is fetched later in the browser by Apollo (F32). Exception: the event page and organizer page also fetch SEO tags on the server (`libs/serverFetch.ts`). |
| **GraphQL** | Query language over one HTTP endpoint. A **query** reads, a **mutation** writes, a **subscription** pushes (not used here; chat uses a raw WebSocket). Documents are written with `gql` in `apollo/`. |
| **Apollo link** | A step in the chain every request passes through (`apollo/client.ts`: error, track, retry, auth, timeout, upload). |
| **Reactive variable** | Apollo's small global state box (`makeVar`) readable in React with `useReactiveVar`. Used for the signed-in user (`userVar`), chat store, assistant chat. |
| **Namespace** | One translation JSON file per language, e.g. `public/locales/en/checkout.json`. A page lists the ones it needs in `serverSideTranslations(locale, [...])`. |
| **Locale** | `en`, `ko`, `ru`, `uz`. Event text has a separate set of **translations** stored on the event (`eventTranslations`, codes `EN KO RU UZ`). |
| **Volt** | Name of the visual design (dark background, lime accent `#c8f53c`). Tokens in `scss/tokens.css`. |
| **`tz-` classes** | Shared CSS class prefix (`tz-btn-danger`, `tz-alert`, `tz-skel`). Other prefixes belong to areas: `org-` (organizer), `adm-` (admin), `acct` (account), `pg-` (auth pages), `seatmap`, `picker`. |
| **Skeleton** | Grey placeholder block (`.tz-skel`) shown while loading, sized like the final content to avoid layout shift. |
| **StateBlock** | Component (`libs/components/states/StateBlock.tsx`) for empty/error states: icon, title, text, actions. |
| **Venue** | A place with an address, a time zone and optionally a **layout** (sections). Created by organizers. |
| **Layout / section** | JSON stored on a venue: list of sections (`key`, `name`, `kind` SEATED or STANDING, `rows`, `seatsPerRow`, `x`, `y`, `rotation`, `spacing`, `tierKey`) drawn on a 1000 x 700 canvas. |
| **Tier / `tierKey`** | A label connecting a layout section to a **ticket type** (price group). One ticket type per tier per event. |
| **Seating type** | `RESERVED` (pick a seat) or `GENERAL` (just a quantity). Field `seatingType` on the event. |
| **EventSeat** | One database row per physical seat of one event (status AVAILABLE, HELD, SOLD). Created when an admin approves a RESERVED event. |
| **Hold** | Temporary claim on seats for `SEAT_HOLD_SECONDS` (default 120 s since backend #125), at most 8 seats. |
| **Order** | A purchase: lines (ticket type, quantity, price), amounts, status. Created in `PENDING_PAYMENT`. |
| **Ticket** | One per seat (or per purchased quantity), with a code and a signed `qrToken`. |
| **Check-in** | Gate scan that turns a ticket `VALID` into `USED`. |
| **Commission** | Platform fee taken **from the organizer's payout**, not added to the buyer price (10 percent base, 7 from 5 completed events, 5 from 20). |
| **Payout** | Organizer's net money for one event, due 3 days after the event ends; "paid" is a manual admin record. |
| **returnTo** | Query parameter holding the page to return to after login; only same-site paths pass `safeReturnTo`. |
| **F-number** | Entry number in `docs/ai/DECISIONS.md` (F1 to F350). `#NN` in code comments is a backend decision number. |
| **aria-disabled button** | A button that looks blocked but stays focusable and explains itself on click (rule in `AGENTS.md`; class `tz-blocked`, F326). |
| **Lazy expiry** | Backend expires stale orders/holds when someone reads them, not only on the timed job (see 02). |
| **Wake note** | Banner "demo server is waking up" shown when queries are slow, because the free backend host sleeps. |

## 7. Decision files and what each decision range says

### 7.1 Frontend repo (`/Users/kenneth/ticketzy-next/docs/ai`)

| File | Lines | What it is |
|---|---|---|
| `DECISIONS.md` | 456 | Numbered log F1 to F350 (table: decision, why, open question). **It wins over any older note.** Ranges below. |
| `FRONTEND_COMPLETED_TASKS.md` | 953 | Chronological task log (49 sections "Prompt N"): what changed, how verified, what was not tested. |
| `CLEANUP_AUDIT.md` | 320 | Risk/cleanup audit of 2026-10-13 (rows C1 to C9, many marked FIXED by F338 to F345). |
| `DESIGN_AUDIT.md` | 348 | Visual/responsive/accessibility audit (Prompt D1, 32 rows). |
| `NESTAR_FRONTEND_COMPARISON.md` | 273 | What was kept, extended or replaced compared with `nestar-next` (F337). |
| `UI_PATTERNS.md` | 99 | Shared UI patterns, e.g. z-index layer order. |
| `SKILLS.md` | 31 | The installed AI skills and which Ticketzy rules override them. |
| `schema.json` | | Introspection dump of the backend GraphQL schema (dated 9 Oct; may be older than the backend). |

F-number ranges in `DECISIONS.md` (one line each; read the row for detail):

| Range | Summary |
|---|---|
| F1 to F13 | Migration cleanup from Nestar: docs location, removed packages/pages, enums aligned to backend, `uz` locale was a copy of English, env variable rename. |
| F14 to F19 | Theme and layout: tokens drive MUI palette, dark default, media queries instead of container queries, brand is the word Ticketzy, layouts collapsed into one shell. |
| F20 to F30 | Sign-up/sign-in design choices, post-login landing by role, session cleared only on auth errors, dead links on purpose then, chat socket not built yet. |
| F31 to F53 | Public pages: data fetched in the browser, event detail rules, categories (4 slugs), Seoul-midnight date filter, page size 12, comments and likes, header changes. |
| F54 to F62 | Seat/checkout flow rules: failed payment means new hold + new order, one-step Continue, server state is truth after reload, clock skew, leaving releases hold. |
| F63 to F72 | Seat map: geometry, tier colours, zoom, SVG with accessible list+grid alternative, locked tiers, error mapping, session watch, confirmation data. |
| F73 to F76 | Order routes, demo payment with a "simulate failure" checkbox, seat picker bottom sheet below 1024 px, service fee shown as "Included". |
| F77 to F92 | Buyer account: routes, order/ticket data workarounds, notifications, refunds mirror the server, ticket states, QR always black on white, avatar rules, button styles. |
| F93 to F111 | Organizer event editor: six steps, fields not built, edit locks by status, ticket types in KRW, AI translate, image upload one by one, zoned date inputs, dashboard, unsaved guard, first-login E11000 note. |
| F112 to F123 | Venue layout editor: lock rule, section geometry, limits, canvas bounds, shared drawing with buyers, undo/redo 100 steps, server error placement, time zones list. |
| F124 to F136 | Event time block, end-time default, multi-day convention, sale-window validation, backend messages mapped. |
| F137 to F146 | Organizer earnings, sales chart, orders per event, cancel dialog, check-in by `qrToken` (and, since F351, by ticket code), scan outcomes, html5-qrcode scanner. |
| F147 to F170 | Admin console: members, empty-list errors, overview figures, event approvals, AI check panel, refund retry, organizer approvals, commission override and clear, orders filters, member error codes. |
| F171 to F190 | Messaging: one shared socket, rooms, polling fallback, previews, limits, read receipts, notification links, admin-starts-conversation. |
| F191 to F196 | Desktop layout fixes for order page and dashboards (container queries on account and dashboard areas). |
| F197 to F209 | AI assistant widget: where it shows, state in a reactive var + sessionStorage, history, timeouts, error mapping, own safe text parser, cards. |
| F210 to F219 | (Follow/unfollow was removed in F362.) Role-aware footer and avatar menu, redirect when already signed in. |
| F220 to F235 | Organizer attendees, payouts, analytics, profile pages and their data limits. |
| F236 to F249 | Static pages (FAQ, about, contact, terms, privacy), error boundary, SEO tags, noindex, robots/sitemap pages, icons, accessibility checks. |
| F250 to F263 | Motion tokens and rules (CSS only), reduced motion, route transition, countdown ring, count-up, hero drift, focus ring, 44 px touch targets. |
| F264 to F274 | `i18n:check`, admin overview queries, console warnings, `useIsomorphicLayoutEffect`, image component, lazy loading, review-step markup, scroll reveal. |
| F275 to F287 | Live demand badges not built then; input adoption before hydration; "No data found" audit; payouts UI; seat-availability badges; console cleanup. |
| F288 to F292 | Logo component; buyer-only purchase UI and direct-URL redirect. |
| F293 to F296 | Request deadlines, query retry, wake note, root cause of stuck skeleton (`clearStore`). |
| F297 to F312 | Mock-API test method; sales-window logic and live unlock; venue double-booking refusal and admin conflict warning. |
| F313 to F321 | Home hero rule, category rails, native rail, backdrop marks, one status tag, peek animation. |
| F322 to F337 | AI guide files, design and dashboard audits, mobile/accessibility fixes, Nestar comparison. |
| F338 to F345 | Audit follow-ups: global session-expiry handler, server fetch deadline, env check, `safeReturnTo`, licence/metadata, hand-written types, `tz-blocked`, stricter checks. |
| F346 to F350 | Alignment with backend #90 to #99, paid splash, field errors from `VALIDATION_FAILED`, deployment prep notices, AI errors by code. |

### 7.2 Backend repo (`/Users/kenneth/ticketzy/docs/ai`, read for cross-checks; not edited)

| File | Lines | What it is |
|---|---|---|
| `DECISIONS.md` | 125 | Numbered log #1 to #115. |
| `COMPLETED_TASKS.md` | 689 | Task log. |
| `CLEANUP_AUDIT.md` | 469 | Backend audit (rows `C3-nn` referenced by decisions #90+). |
| `BACKEND_MIGRATION.md`, `FRONTEND_MIGRATION.md` | 45, 48 | Migration notes for each side. |
| `NESTAR_COMPARISON.md`, `NEXT_STEPS.md`, `PROMPTS.md`, `SKILLS.md` | 117, 80, 46, 25 | Comparison, to-do, prompt history, skills. |

Backend decision ranges (summaries from the first words of each row; not every row was read in full):

| Range | Summary |
|---|---|
| #1 to #9 | Migration method: rename layer first, git mv, no logic change, lint without fix. |
| #10 to #21 | Domain: old catalog becomes Event + Venue + TicketType; seller becomes ORGANIZER; enums; indexes; `auths` dropped. |
| #22 to #30 | Notifications best-effort; roles set by server; login by e-mail; JWT holds `_id` and `memberType`, 1 day; env validation; board deleted; follow rules (removed again, F362); public visibility. |
| #31 to #34 | Organizer approval operations, commission override, audit log, organizer must be ACTIVE to sell. |
| #35 to #40 | Event statuses and transitions, organizer edit rules, public visibility constant, admin transitions are conditional updates, `completedEvents` batch. |
| #41 to #44 | Venue layout, `tierKey`, `EventSeat`, public seat map. |
| #45 to #57 | Holds, orders, commission, payment provider, tickets and QR, batch expiry, layout lock, check-in order, refunds, refund deadline, cancelled-event refunds, `soldQuantity` accounting. |
| #58 to #59 | Messaging and socket rules; notification guard for restricted accounts. |
| #60 to #63, #85 to #87, #111, #114, #115 | AI features, provider swap, timeouts/retry, Gemini fallbacks, `ai:check`, price tool. |
| #62, #108, #109, #112 | Demo seed (through real services), guards, consistency checks, South Korea data and images. |
| #64 to #75 | Login error codes, small fixes, comment length 500, seat picker input forms, `eventData` on orders, organizer area, sale-window validation, admin safety, second admin. |
| #76 to #79 | Payouts (mock record, status computed), `markPayoutPaidByAdmin`, seat counts on events. |
| #80 to #84 | Buyer-only purchase, venue double-booking and conflict warnings. |
| #88, #89 | Guide files, Nestar comparison. |
| #90 to #107 | Hardening from the audit: public member fields, list limits, `PAYMENT_MODE`, admin password rule, audit entries, KRW only, ranking jobs, error mapping, upload auth, CI, ports, empty lists, lazy expiry, production config, rate limits, AI daily cap, security headers/CORS/health, indexes. |
| #110 to #115 | Cancelled-event refunds release stock, Gemini fixes, validation fields in errors (`VALIDATION_FAILED`), coded "no seat map", Gemini model chain. |

Next: `01-flows.md`.
