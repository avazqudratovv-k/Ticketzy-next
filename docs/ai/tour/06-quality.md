# 06 Quality

**What this file covers.** How the frontend tries to be accessible and responsive, what tests and scripts exist, what CI does, what a production build needs (environment and configuration), performance notes, and, at the end, **Questions and oddities**: things that look inconsistent, dead, risky or unclear, each with a file path. Nothing was run during this tour; statements about results of checks come from the project's own logs (`docs/ai/FRONTEND_COMPLETED_TASKS.md`, `CLEANUP_AUDIT.md`) and are labelled as such.

---

## 1. Accessibility approach

Rules are written in `AGENTS.md` ("Design rules") and enforced by habit and by manual axe runs, not by an automated test.

| Topic | What the code does | Where |
|---|---|---|
| Contrast | At least 4.5:1 text, 3:1 large text and UI parts, in both themes; light theme has darker `--ink-subtle`, `--border-control` (3:1) for control borders. Checked with axe and by calculation over images (F248, F327). | `scss/tokens.css` |
| Skip link | First element in `LayoutBasic`: `<a class="tz-skip" href="#main">`; `<main id="main">` exists in both layouts. | `LayoutBasic.tsx`, `DashboardShell.tsx` |
| Focus ring | Every focusable element gets a transparent 2 px outline at 4 px offset that turns visible on `:focus-visible` (zero-specificity `:where`), eased in. | `scss/motion.scss` (F261) |
| Touch targets | Below 768 px and on `pointer: coarse`, controls are at least 44 px (`--control-md`). | `scss/responsive.scss` (F262, F328) |
| Blocked actions | `aria-disabled="true"` + class `tz-blocked`/`is-blocked` instead of `disabled`, so the button stays focusable and explains itself (`role="status"` text). `disabled` only while a request runs. | `TicketPanel.tsx`, `SeatSummary.tsx`, F326, F344 |
| Forms | `Field` sets `aria-invalid` and error text; after a failed submit `useFocusInvalid` focuses the first invalid control; server `VALIDATION_FAILED` fields show under their input. Forms rendered on the server adopt text typed before hydration (`useAdoptTypedValues`) and keep the submit button disabled until then. | `Field.tsx`, hooks |
| Live regions | Confirmation headline `role="status"` filled after mount; countdown announces only at 30/10/5/0 s; scan results `aria-live="polite"` (valid) or `role="alert"`; chart bars have labels. | `confirmation.tsx`, `Countdown.tsx`, `ScanResult.tsx` |
| Seat map | SVG `role="img"`; keyboard-operable alternative: section list + seat grid of `<button aria-pressed>` with row/seat labels. | `SeatPicker.tsx`, `SectionList.tsx` |
| Dialogs and drawers | MUI `Dialog`/`Drawer`/`Popover` for focus trap, Escape, focus return. The mobile dashboard drawer sets `inert` on the main area while open and returns focus to its opener. | `DashboardShell.tsx` |
| Status without colour | Badges and scan results always have an icon or text, never colour alone. | `StatusBadge`, `ScanResult`, `PayoutStatusChip` |
| Language | `<html lang>` is set by Next from the locale; Korean text uses `word-break: keep-all`. | `_document.tsx` comment, `scss/app.scss` |
| Reduced motion | One block at the end of `scss/motion.scss` (`@media (prefers-reduced-motion: reduce)`) sets animations/transitions to 0.01 ms, stops loops and parallax; JS motion checks `prefersReducedMotion()` (rail peek). | `motion.scss`, `usePrefersReducedMotion.ts` |
| Headings | Every page has an `h1` (`StateBlock as="h1"` on `/sell`, F272); axe found `heading-order` on event cards once (design audit row 28). | |
| Automated check | **None in the repo.** axe-core was injected from a CDN in a Chrome tab during work; nothing was added to `package.json` (F248). The project notes that the main pages passed (see `FRONTEND_COMPLETED_TASKS.md` Prompt 10a and `DESIGN_AUDIT.md`). | |

## 2. Responsive rules

- Breakpoints actually used in the SCSS (counted by media-query text): `min-width: 768px` (32 uses), `1024px` (31), `640px`, `1280px`, `1200px`, `480px`; `max-width: 479px`, `767px`, `1023px`. Container queries: `container dash` at 900/940 px for dashboards and `container acct` at 820 px for account pages (F192, F194), because those areas have a sidebar and their width is not the window width.
- Phone patterns: seat picker summary becomes a fixed bottom sheet below 1024 px; event page has a sticky buy bar (`TicketBar`); header controls shrink (language shows only the globe below 480 px; theme toggle moves below 390 px, F325); dashboards use a drawer sidebar below 1024 px; tables become wrapped rows; tab strips scroll sideways by design (F196).
- Hero is capped (`min(560px, 68vh)`) at 1280 px and wider (F329); event list at 390 px keeps result count and Sort on one row (F330).
- No layout shift: `EventImage` has fixed `width`/`height` (1200x800) and `sizes`; skeletons have the final size; rails and cards have minimum heights (F316); reveal animations use opacity/transform only.
- Method note: the Chrome test tab cannot be resized, so pages were checked inside same-origin iframes of width 390/768/1440 (F273, CLAUDE.md, memory note).

## 3. Tests and scripts

| Item | What it covers | Run |
|---|---|---|
| `yarn typecheck` | `tsc --noEmit`; strict mode, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` (`tsconfig.json`) | CI + local |
| `yarn lint` | `next lint` with `next/core-web-vitals`, `eqeqeq`, `no-console` (only `error` and `warn` allowed) | CI + local |
| `yarn i18n:check` (`scripts/i18n-check.js`) | (1) key parity of ko/ru/uz against en with plural suffixes folded; `{{placeholder}}` parity; empty values; warns when a non-English value equals English. (2) Every static `t('key')` / `t('ns:key')` in `libs` and `pages` exists in en; template keys like `t(\`status.${x}\`)` are checked by prefix. (3) For every page, walks its imports and requires that every namespace used by those files is listed in the page's `serverSideTranslations` call (this caught raw keys such as `pagination.compact` after a hard load). Exit code 1 on problems. | CI + local |
| `yarn check:return-to` (`scripts/check-return-to.js`) | Compiles `libs/safeReturnTo.ts` in memory with the installed TypeScript and checks about 20 good values and about 30 bad ones (`//evil.com`, tab/newline tricks, `%09`, `%5c`, double and triple encoding, `javascript:`, 3000-character paths), plus array input uses the first value. | CI + local |
| Unit / integration / e2e tests | **None** in this repo (no test files or runner found). | |
| Manual browser checks | Described per task in `docs/ai/FRONTEND_COMPLETED_TASKS.md`; scratch mock GraphQL server and scratch builds on port 3100 (F297, F306). | manual |

Backend tests, for comparison (read only to know what exists): many `*.spec.ts` files next to the code in `/Users/kenneth/ticketzy/apps/ticketzy-api/src/libs` and `components` (for example `commission.spec.ts`, `refund-policy.spec.ts`, `order-expiry.spec.ts`, `payout.spec.ts`, `qr-token`-related and demo consistency specs). The frontend does not duplicate them.

## 4. CI

`.github/workflows/ci.yml` (the only workflow), job `check` on `ubuntu-latest`, triggers on every `push` and `pull_request`:

1. `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, Yarn cache)
2. `yarn install --frozen-lockfile`
3. `yarn typecheck`, `yarn lint`, `yarn i18n:check`, `yarn check:return-to`
4. `yarn build` with dummy values: `NEXT_PUBLIC_API_GRAPHQL_URL=http://localhost:3007/graphql`, `NEXT_PUBLIC_API_WS_URL=ws://localhost:3007`, `NEXT_PUBLIC_API_URL=http://localhost:3007`, `NEXT_PUBLIC_SITE_URL=https://example.test`. The build needs no running backend: pages are static or fetch in the browser, and `serverQuery` returns `null` when the API is unreachable.

No deploy step, no test step, no axe step.

## 5. Build and environment requirements for production

- `next.config.js` exports a function of the phase. In `PHASE_PRODUCTION_BUILD` **and** when `process.argv` contains `build`, `requireEnv()` throws if any of the four required names is empty: `NEXT_PUBLIC_API_GRAPHQL_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`. It also **warns** when a value contains `localhost` or `127.0.0.1`. `NEXT_PUBLIC_CONTACT_EMAIL` is optional.
- Because `NEXT_PUBLIC_*` values are inlined at build time, changing the API address requires a new build. In production `SITE_URL` has no localhost fallback (`libs/site.ts`).
- The backend must allow the site origin in CORS and WebSocket (the backend allows CORS only from configured origins; during scratch builds on port 3100 the work used a `rewrites` proxy for `/graphql`, F306).
- Hosting is a placeholder in the README (`<hosting provider>`). The backend may sleep; the wake note covers it.
- `robots.txt` and `sitemap.xml` are generated by the server at request time and need the backend to list events (cached an hour: `s-maxage=3600`, `stale-while-revalidate=86400` on the sitemap).
- Files `.env.local` and `.env.development` exist locally (git-ignored) and were not read.

## 6. Performance notes

- **Code splitting** with `next/dynamic` (`ssr: false` + skeleton): `AssistantWidget` (`LayoutBasic`), `SeatMap` (`SeatPicker`), `Scanner` (check-in page), `VenueEditor` (venue pages), `EventEditor` (event pages), `SalesChart` (organizer home), `BarChart` (analytics), `EventLayoutPreview` (admin event). `qrcode` and `html5-qrcode` are imported lazily inside the components that need them.
- **Images:** `next/image` with a custom loader (`libs/images.ts`): picsum URLs can be resized by URL; other URLs are used as they are (no Next optimizer because it would need `sharp` and a host allow-list for every organizer-supplied URL). `sizes` strings per place (`CARD_SIZES`, hero, detail).
- **Fonts:** `next/font/google` with `display: swap`; Noto Sans KR `preload: false`.
- **Network:** queries use `cache-and-network` or `network-only` widely, and there is no cache `typePolicies`, so many revisits refetch. Polling: seat map every 3 s per open seat page (paused when hidden), notification count every 30 s per tab, organizer/admin conversation list every 10 s while the socket is down or 30 s while up. Some screens load whole lists in pages of 100 (`usePagedQuery`, venues, attendees) because the server lacks filters.
- **Rendering:** `SectionSeats` is memoized; `useSeatMap` keeps the same object when the data signature is unchanged so the SVG does not re-render every 3 s; CSS-only motion, only transform/opacity.
- **Server cost:** `getServerSideProps` is used on many pages that only need translations (see O-9); it makes those pages server-rendered per request instead of static.

---

## 7. Questions and oddities

Numbering is stable; other files refer to O-1 to O-9. "Looks wrong" means not proven wrong, only inconsistent with something else in the repo. Each item names where to look.

**O-1. `trailingSlash: true` in `next-i18next.config.js` versus F241.** `next-i18next.config.js` sets `trailingSlash: true`, but Next reads `trailingSlash` from `next.config.js` (which does not set it), and F241 in `docs/ai/DECISIONS.md` says the site does not use trailing slashes. The option is probably ignored by Next; verify which URL form the deployed site serves. Files: `next-i18next.config.js`, `next.config.js`, `libs/site.ts` `cleanPath`.

**O-2. An approved organizer's open tab keeps the old status.** `GET_MEMBER` is run only in `libs/auth/index.ts` (`loadProfile`) at session start; nothing refetches the profile when a notification says the account was approved. The pending banner and disabled "Create event" can remain until reload or sign-in. Files: `libs/auth/index.ts`, `libs/hooks/useAuth.ts`, `libs/components/common/PendingBanner.tsx`. Unclear whether intended.

**O-3. Statuses that exist but are never set.** Backend `TicketStatus.CANCELLED` is never assigned by backend code (only filtered in `be:components/ai/ai-tools.service.ts`) yet the frontend has a `cancelled` ticket state (`libs/account/tickets.ts`, `TICKET_BADGE`). `PaymentStatus.INITIATED` is only a schema default (`be:libs/schemas/Payment.model.ts`). `MemberStatus.DELETE` has no operation that sets it. `PaymentProvider` lists STRIPE/PAYME/CLICK/MANUAL but only `MockPaymentProvider` exists.

**O-4. Commission rules copied in several places.** `libs/organizer/commission.ts` (`COMMISSION_TIERS`, `commissionState`) and `libs/admin/commission.ts` (`COMMISSION_TIERS`, `tierRate`, `effectiveRate`) are two frontend copies of the backend `be:libs/commission.ts`; comments in both point to a "libs/commission.ts" that does not exist in this repo. If the backend rates change, three places must be edited.

**O-5. Dead or unused code.** Detected with a small import/export scan (not part of the repo): `libs/components/layout/LayoutFull.tsx` is not imported anywhere; exports never used elsewhere: `isDailyLimit` (`libs/aiErrors.ts`), `isCategory` (`libs/events.ts`), `isMine` (`libs/messaging/format.ts`), `SeatLike` (`libs/organizer/checkin.ts`), `organizerCheckInUrl` and `organizerProfileUrl` (`libs/routes.ts`), `defaultTimezone` (`libs/venues/timezones.ts`), `usageOf` (`libs/venues/useVenueData.ts`), `ModerationFlagType` (`libs/admin/types.ts`). `pages/account/join.tsx` only redirects to login. The frontend never calls backend `checkInPreview`, `refundOrderByAdmin`, `updateEventByAdmin`, `removeEventByAdmin` (not found in `apollo/`; the first two are mentioned in 01 flows).

**O-6. Stale decision texts.** `docs/ai/DECISIONS.md` F11 and F29 say `NEXT_PUBLIC_API_WS_URL` is not read, but `libs/messaging/socket.ts` `connect` reads it and `next.config.js` requires it. F87 says nickname limits 3 to 12 while `libs/fieldErrors.ts` `FIELD_LIMITS.memberNick` is 3 to 50 (later change; F348 context). F5 says login documents are stale; they are current. `AGENTS.md` still describes `libs/components/layout/Backdrop.tsx` and others correctly. Treat the highest F-number as truth (rule 1 of AGENTS.md).

**O-7. Duplicated constants that can drift from the server.** `libs/site.ts` `SEAT_HOLD_SECONDS = 30` and `MAX_SEATS_PER_ORDER = 8` are used in help text, while the real values come from `GetSeatConfig` (server env `SEAT_HOLD_SECONDS` can be 1 to 3600). Venue limits (`libs/venues/model.ts` `LIMITS`), field limits (`libs/fieldErrors.ts`), message limit 2000 (`libs/messaging/format.ts`), assistant limits (`libs/assistant/errors.ts`) and many exact server message strings (`libs/seats/errors.ts`, `libs/organizer/checkin.ts`, `libs/account/refund.ts`) are copies; a changed backend sentence silently becomes the "generic error" or "unknown outcome".

**O-8. Token in `localStorage`, no refresh.** `libs/auth/token.ts` stores the JWT where any script can read it; the backend token lasts 1 day and there is no renewal, so a buyer in the middle of a 30-second hold can be signed out at expiry (handled by `useSessionWatch`, but still a rough edge). Not a bug found, a design risk to mention in an interview.

**O-9. Mixed `getServerSideProps` / `getStaticProps` for translation-only pages.** Checkout, seats, confirmation, tickets, orders, settings, notifications, `account/saved`, `admin/events/[id]`, organizer venue/event detail pages use `getServerSideProps` although they only load translations, while similar pages use `getStaticProps`. Probably historical (these routes have dynamic `[id]` segments and no `getStaticPaths`, which would force `getServerSideProps` or `fallback` handling); not documented as a decision.

**O-10. `getAllMembersByAdmin` is a Mutation.** In the backend resolver (`be:components/member/member.resolver.ts`) a list read is declared as `@Mutation`; the frontend has to call it with `client.mutate` (`pages/admin/members/index.tsx`, F147). Apollo does not cache it and mutations are never retried or tracked by the wake note.

**O-11. Code style leftovers.** `libs/components/Top.tsx` has `import` lines after the `NAV_CATEGORIES` constant. `useUnsavedGuard` uses `window.confirm` (a blocking browser dialog) although inline confirmations are preferred elsewhere (F48); this blocks browser automation. `apollo/client.ts` comment says "the chat WebSocket will send it in its first `auth` message instead", which is now implemented.

**O-12. Seat map polling load.** Every open seat page requests the whole non-free seat list every 3 s (`libs/hooks/useSeatMap.ts`), plus the checkout page polls it too while an order is pending. With many viewers on one big venue this is a high request rate for a free-tier backend; the backend rate limiter is in-memory per process (`be:libs/rate-limit.ts`, decision #104), so it is not shared across instances. Not measured here.

**O-13. Venue double-booking race.** `be:components/event/event.service.ts` `assertVenueFree` is check-then-write; the code comment itself says two simultaneous requests could both pass (no transaction support, decision #83). Admin approval re-checks, which narrows but does not remove the window.

**O-14. Stale comment in refund code.** The docstring of `RefundService.refundOrdersForCancelledEvent` says "Nothing goes back on sale", while decision #110 and `releaseStock` now release seats and stock for cancelled events too (`be:components/refund/refund.service.ts`).

**O-15. Fixed Seoul offset in the date filter.** `libs/format.ts` `dayBoundaryIso` appends `+09:00` regardless of the viewer's or the venue's zone (F37, intended: platform default Seoul). Events in other time zones can be off by hours at the edges of a filtered day.

**O-16. Rendering-time decisions to confirm.** `pages/events/[id]/index.tsx` waits for `authReady` before its first query, so a cold page shows its skeleton until the profile request finishes (up to the 20 s query timeout on a sleeping backend). Intended (F33: views and like state depend on the token) but costly on cold starts.

**O-17. `docs/ai/schema.json` age.** The file is dated 9 October while later decisions (F190, F346) mention schema changes; it is a dump, not generated in CI, and may not match the live backend. Hand-written types in `libs/types/` rely on the developer re-fetching it.

**O-18. Cancelled-event refunds and used tickets.** For a cancelled event the backend refunds `USED` tickets too (`RefundService.assess`, `markTicketsRefunded`), so an organizer's check-in counts and revenue figures can drop after cancellation; the organizer pages compute figures from PAID orders (F137) and therefore follow. Not a bug, but easy to misexplain.

---

## 8. End of tour

Files in this tour: `00-overview.md`, `01-flows.md`, `02-state-and-rules.md`, `03-routes.md`, `04-state-and-data.md`, `05-components.md`, `06-quality.md`. Sources not read line by line are named in the file where they matter (for example the end of `03-routes.md`); the backend was read only where a frontend flow ends.
