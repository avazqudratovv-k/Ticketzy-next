# Nestar and Ticketzy frontends compared

Date: 2026-10-13. Read-only on Nestar. No application code changed here. Decision log entry: F337.

## Which Nestar

| Candidate | Result |
|---|---|
| `/Users/kenneth/nestar-next` | **Used.** `package.json` has Next 14.2.0, `@apollo/client`, `apollo-upload-client`, MUI 5, next-i18next, `subscriptions-transport-ws`. Pages Router. Git history is Nestar's (last commit: WebSocket chat client). |
| `/Users/kenneth/nestar-client` | Not used. It is a **0-byte file**, not a folder. There is no `package.json`. |

Ticketzy was migrated from `nestar-next` (F1 to F13). Same Next version, same Apollo, same MUI.

How this was done: both trees were read file by file (client, auth, `_app`, `_document`, layouts, theme, alerts, one list page, one upload form). Counts come from `grep` over `libs`, `pages`, `apollo`, `scss`. Nestar's `.env*` files were **not** read (project rule); env names come from `process.env` use in code.

Size for context:

| | Nestar | Ticketzy |
|---|---|---|
| Apollo documents | 4 files, 1,300 lines | 14 files, 2,452 lines |
| `any` (type escapes) | 274 | about 45 (corrected, was 47: one grep matched the word in comments; 32 are `getStaticProps`, 2 in a dead file) |
| `@ts-ignore` | 32 | 0 |
| `console.*` calls | 79 | 3 |
| `useTranslation` files | 3 | 139 |
| `aria-*` uses | 27 | 771 |
| `@media` rules | 1 | 137 |
| `prefers-reduced-motion` | 0 | 10 |

Words used below: **Kept** = same idea, same code shape. **Extended** = same base, more added. **Replaced** = different approach.

---

## 1. Folder structure

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| `pages/` | Domain pages: `property`, `agent`, `community`, `mypage`, `cs`, `_admin/*` (admin under an underscore folder) | `events`, `checkout`, `orders`, `tickets`, `account`, `organizer/*`, `admin/*`, SEO pages (`sitemap.xml`, `robots.txt`), `404`, `500` | Kept the Pages Router. Replaced all domain pages (F1 to F4). |
| `libs/components/` | Flat by feature, plus `Top`, `Footer`, `Chat` | Grouped by feature (`events`, `seats`, `organizer/*`, `admin`, `messages`, `common`, `states`, `layout`) | Extended. |
| `libs/` (logic) | `auth/index.ts`, `sweetAlert.ts`, `config.ts`, `enums/`, `hooks/useDeviceDetect.ts` | Domain folders (`seats`, `venues`, `organizer`, `messaging`, `account`, `admin`), 18 hooks, `errors.ts`, `routes.ts`, `seo.ts`, `format.ts` | Extended. `useDeviceDetect` was deleted (see 6). |
| `libs/types/` | One folder per entity (`property`, `comment`, `like`, ...) | 4 flat files (`event`, `member`, `account`, `assistant`) | Replaced (the entities were deleted in prompt 0). |
| `apollo/` | `client.ts`, `store.ts`, `user/`, `admin/` | Same, plus `resilience.ts`, `organizer/`, `messaging.ts`, `payouts.ts`, `user/fragments.ts` | Extended. |
| `scss/` | `pc/` and `mobile/` trees (one SCSS file per component per device), `reset.scss`, `variables.scss`, `MaterialTheme/` | One file per area (`layout`, `events`, `seats`, ...), `tokens.css`, `tokens.json`, `motion.scss`, `responsive.scss`, `MaterialTheme/index.ts` | Replaced (see 5). |
| Tooling dirs | none | `scripts/i18n-check.js`, `design/`, `docs/ai/`, `.agents/`, `.claude/` | Added. |

Why: the Nestar domain no longer exists, so its folders went (F1 to F4). The `pc`/`mobile` split was dropped when the layouts became one shell (F3). Not chosen: keeping the Nestar tree and renaming files; it would have kept two copies of every style.

---

## 2. Apollo setup

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Client factory | `initializeApollo` / `useApollo`, singleton in browser, `ssrMode` | Same code shape | **Kept** |
| Link chain | `errorLink`, `tokenRefreshLink`, then `split(subscription ? wsLink : authLink.concat(upload))` | `errorLink`, `trackLink`, `retryLink`, `authLink`, `timeoutLink`, `uploadLink` | **Replaced** (no split, no refresh link) |
| Upload | `createUploadLink` for all HTTP | Same, plus `fetch` wrapper and `apollo-require-preflight` header | **Extended** |
| Auth header | `authLink` reads `localStorage` token, logs every request with `console.warn` | `authLink` reads token, no logging | **Kept**, log removed |
| Error handling | `onError` opens a SweetAlert for every GraphQL error unless the text contains "input" | `onError` only logs in development; callers get `parseApiError` (`{ code, message }`) and decide what to show | **Replaced** |
| Token refresh | `TokenRefreshLink` whose `fetchAccessToken` returns `null` (a stub that does nothing) | Removed; `apollo-link-token-refresh` is not installed | **Replaced** (nothing to refresh, see 3) |
| Subscriptions | `WebSocketLink` (`subscriptions-transport-ws`), token in the URL `?token=...` and in `connectionParams`, `reconnect: false`, a wrapper class that logs every message | No GraphQL subscription. Own `MessagingSocket` (`libs/messaging/socket.ts`): token in the first `auth` message, backoff, polling fallback, no logging | **Replaced** |
| Timeouts, retry | none | Query 20 s, mutation 60 s, uploads exempt; retry once for queries only (F293, F294) | **Added** |
| Pending tracking | none | `trackLink` + `pendingStore` feed the "server is waking up" note (F295) | **Added** |
| Cache | `new InMemoryCache()`, `resolvers: {}` (empty) | `new InMemoryCache()`, no `typePolicies` | **Kept** (both default) |
| Reactive vars | `userVar` (a 17-field object with empty strings), `themeVar` (unused), `socketVar` (raw `WebSocket`) | `userVar` (`MemberProfile \| null`), `authReadyVar`, messaging vars | **Replaced** |
| Query organisation | `apollo/user/query.ts` (618 lines) + `admin/`; pages call `useQuery` with `onCompleted` (29 uses) copying data into `useState`; `network-only` 25 times | Split by role/feature, shared `fragments.ts`; `onCompleted` 0 uses; `network-only` 27 times | **Extended** |
| Server side | The browser-only link means no query can run on the server; `initialApolloState` is passed but never filled | Same limit; `serverQuery` (plain anonymous `fetch`) for SEO tags only (F32) | **Kept** the limit, **extended** with a fetch helper |

Reasons:
- Error popups removed. The link used to show a popup for every error, so a page could not choose its own message. Callers now get `{ code, message }` and show translated text (F26, `libs/errors.ts`). Not chosen: keeping the global popup.
- Refresh link removed. The backend issues one token and has no refresh mutation, and the Nestar link never refreshed anything. Not chosen: keeping the stub "for later".
- WebSocket replaced. The backend chat uses its own `{ event, data }` protocol and an `auth` first message (backend decision #58, F29, F171 to F174). A token in a URL ends up in logs. Not chosen: `graphql-ws` / Apollo subscriptions (the server has no GraphQL subscriptions).
- Resilience links. A stuck request must end in an error state with Retry, and a slow server must be explained (F293 to F295). Not chosen: relying on the browser's default no-timeout fetch.

Weaker or copied:
- `useApollo(pageProps.initialApolloState)` in `_app.tsx` is still there and does nothing (no page returns `initialApolloState`). Remove it or fill it.
- Both repos use `network-only` almost everywhere (27 and 25 places). There is no cache design: no `typePolicies`, no merge for paginated lists. This is a shared weakness.

---

## 3. Auth

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Token storage | `localStorage['accessToken']` | Same key, wrapped in `try/catch` (`libs/auth/token.ts`) | **Kept** |
| Login field | `memberNick` + password | `memberEmail` (trimmed, lower-cased) + password (F5) | **Replaced** (backend changed) |
| Claims | Whole JWT decoded into `userVar` (17 fields) | Token has `_id` + `memberType` only; the profile comes from `getMember` (`startSession`) | **Replaced** |
| Reactive user | `userVar` filled by `updateUserInfo` in each layout's effect | `userVar` + `authReadyVar`, filled once by `restoreSession` in `_app` | **Replaced** |
| Ready flag | none (guards read `user.memberType !== ADMIN` before the token is decoded; `LayoutAdmin` uses a local `loading` state) | `authReadyVar` so guards and the header do not flash the wrong state | **Added** |
| Route guards | Admin layout only: `router.push('/')` if not ADMIN, renders `null`. Other pages unguarded in the layout | `useRequireAuth(roles)` / `withAuth`: login redirect with `returnTo`, role redirect to the member's own home (F23, F31) | **Extended** |
| Expired token | Not checked. `isTokenValidOrUndefined` returns `true` always; the 401 branch in `onError` is empty | `isExpired()` on load; `useSessionWatch` every 5 s on seat and checkout pages only (F71) | **Extended**, partly |
| Rejected token | Not handled | `restoreSession` clears the session only on UNAUTHENTICATED, FORBIDDEN, BAD_REQUEST; a network failure keeps it (F28) | **Added** |
| Sign out | Remove key, reset `userVar`, **`window.location.reload()`** | `clearSession()`: remove key, `userVar(null)`, `resetStore()` (F296). No reload | **Replaced** |
| Multi-tab | Writes `login`/`logout` keys, no listener | `storage` listener re-runs `restoreSession` | **Extended** |
| Login errors | Reads `err.graphQLErrors[0].message`; a network error has no first item and throws a `TypeError` | `parseApiError` handles GraphQL, network and unknown errors | **Replaced** |

Reasons:
- No reload on sign-out: a reload threw away all state and flashed the page; `resetStore()` refetches active queries instead (F296). `clearStore()` was tried first and left pages on a skeleton. Not chosen: `clearStore()`, reload.
- Email login and two-claim token follow the backend (F5, backend #25).
- Token still in `localStorage` (F24: "as asked"). Not chosen: an httpOnly cookie. It needs backend support (cookie issue, CSRF) and was out of scope. XSS can read the token in both apps.

Weaker:
- **Expiry during a session is only watched on seats and checkout.** On other pages an expired token shows up as an API error from the next request. I did not find a global "401 ends the session" rule. Moving `useSessionWatch` into `_app` (while a token exists) is the fix; it needs a decision first.
- `libs/auth/index.ts` exports `logOut = clearSession` as an alias, kept only for old callers.

---

## 4. i18n

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Library | next-i18next 14, `i18n` block in `next.config.js` | Same | **Kept** |
| Languages | `en`, `kr`, `ru` | `en`, `ko`, `ru`, `uz` | **Extended** (F7, F8) |
| Locale detection | off | off; saved choice in `localStorage['locale']` redirects once on load (F27) | **Kept**, extended |
| Namespaces | 1 (`common.json`) | 11 per language (`common`, `events`, `checkout`, `organizer`, `admin`, ...) | **Extended** |
| Use in UI | `useTranslation` in 3 files; most screen text is hard-coded English (banner titles, alerts, buttons) | `useTranslation` in 139 files; AGENTS rule 6 says all text is translated | **Replaced** |
| Checks | none | `yarn i18n:check`: key parity, `{{placeholders}}`, keys used in code exist, page lists the namespaces it uses | **Added** |
| Dev reload | none | `reloadOnPrerender` in development (F53) | **Added** |
| `<html lang>` | Fixed `lang="en"` in `_document` | Next sets it from the locale (comment in `_document`) | **Replaced** |
| Server messages | Shown as sent | Known messages mapped to keys (F26); unknown ones shown as sent | **Extended** |

Reasons: `kr` is not the ISO code for Korean (`ko`); old saved `kr` falls back to `en` (F8). Uzbek is the project's home language (F7). The parity check exists because a missing namespace showed raw keys after a hard load (see the script header). Not chosen: a translation SaaS or runtime key extraction.

Weaker: server messages that are not in `KNOWN_MESSAGES` appear in English in all four languages (the API answers English only). Backend error codes mapped to keys would fix it.

---

## 5. Styling

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| SCSS | Per component, `pc/` and `mobile/` trees; `variables.scss` has only the font | One file per area; global rules by `tz-` class | **Replaced** |
| Tokens | None (hex values in SCSS and in `MaterialTheme/index.ts`) | `scss/tokens.css` (CSS variables) + `tokens.json` (MUI palette source), F14 | **Added** |
| MUI | `ThemeProvider` with a **light** theme object; `themeVar` unused | `ThemeModeProvider`: `getTheme(mode)` reads `tokens.json`, other values are `var(--token)` | **Extended** |
| Dark mode | none | Default dark, light by `data-theme` on `<html>`, set by an inline script before paint (F15) | **Added** |
| Fonts | `@import url(...)` of Google Fonts in SCSS (Poppins, 9 weights) | `next/font/google` (Onest, Noto Sans KR, JetBrains Mono) | **Replaced** |
| Motion | `animate.css` + SweetAlert classes | `scss/motion.scss` with `--ease-*`, `--dur-*`; transform and opacity only; reduced-motion respected | **Replaced** |
| Hard-coded colors | Everywhere (`#e92C28`, `#212121`, ...) | Banned in page styles (AGENTS design rules) | **Replaced** |
| Layout shift | Not handled | Reserved image sizes, skeletons keep final size (F316) | **Added** |

Reasons: a dark default with a switch needs one source of colour values, or the SCSS and MUI drift apart (F14). Colours come from CSS variables so the page changes theme without waiting for React. Not chosen: MUI `CssVarsProvider` (still experimental in MUI 5 at the time), a CSS-in-JS theme only (flash on load), `prefers-color-scheme` only (the brief says dark by default, F15).

Weaker / left over:
- **`animate.css` and `sweetalert2` are still in `package.json`**, used only by `libs/sweetAlert.ts`, which nothing imports (F256, F12). Dead weight and a dead file.
- Two sources for tokens (`tokens.json` and `tokens.css`) must be edited together (F14 says so; no check enforces it). A small script that compares them would remove the risk.
- `design/` has its own copy of tokens (`design/tokens`, `design/design-system`). Which copy wins is written in AGENTS, but there are three copies of the files.

---

## 6. Pages Router patterns

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Rendering | `getStaticProps` on every page, only for translations; all data fetched in the browser | Same for most pages (~30). `getServerSideProps` where the server must know something: SEO tags (`events/[id]`, `events/[id]/seats`, `organizers/[id]`), `sitemap.xml`, `robots.txt`, and pages behind a login | **Kept** and **extended** (F32) |
| Data fetching | `useQuery` + `onCompleted` + `useState` copy | `useQuery` data used directly; `authReadyVar` gate on the event page (F33) | **Replaced** |
| Layout wrapper | HOC `withLayoutBasic(Component)`; reads `router.pathname` to pick banner title and image (a `switch` over routes) | HOC kept; one shell (`tz-app`, skip link, `Top`, `PendingBanner`, `Footer`, assistant); no per-route banner (F3) | **Kept** the HOC, **replaced** the content |
| Device split | `useDeviceDetect` reads `navigator.userAgent`, then the layout renders a **different tree** for mobile and desktop | CSS media queries and `pointer: coarse` (F262); no UA sniffing | **Replaced** |
| Per-page `<Head>` | Fixed title "Nestar" | `Seo.tsx` component with canonical, hreflang | **Extended** |
| Error pages | none | `404`, `500`, `ErrorBoundary`, `ErrorScreen` | **Added** |
| Typing of props | `({ locale }: any)` | Same `: any` pattern copied into ~30 pages | **Copied, should change** |

Reasons:
- Data in the browser: the member token lives in `localStorage`, which the server cannot see, and views and like state depend on the member (F32). Not chosen: cookie-based auth with full SSR.
- UA sniffing removed: it renders the wrong tree for a tablet, a resized window and the first server render (the `device` state starts as `'desktop'`). Media queries serve all widths with one tree. No dedicated F-number exists for removing it; F3 covers the layout merge. This entry (F337) records it.

Weaker / copied:
- `getStaticProps = async ({ locale }: any)` and `withLayoutBasic = (Component: any)` are Nestar's, copied about 30 times. Use `GetStaticProps` and `ComponentType`. One shared helper for `serverSideTranslations(locale, [...])` would remove the repetition.
- Pages that are `getStaticProps` but behind a login still ship a static shell and decide in the browser (F31: nothing shown until allowed). Fine for this app, but no server redirect exists for them.

---

## 7. Forms, uploads, error and loading states, toasts

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Forms | Controlled inputs with `useState`; no `<form>`/`onSubmit` anywhere (0 uses) | 21 `onSubmit` uses; shared `Field`; `useAdoptTypedValues` (text typed before hydration); `useUnsavedGuard` (4 uses) | **Extended** |
| Uploads | `axios.post` with a hand-built `operations`/`map` multipart body and the token read from a variable | `apollo-upload-client` mutations (`Upload!`); no timeout on multipart bodies (F293) | **Replaced** |
| Loading | A `loading` flag in some pages; no skeleton component | Skeletons that keep final size, `aria-busy`, `StateBlock`, `WakeNote` after 4 s | **Added** |
| Errors | One SweetAlert per GraphQL error (from the link); `console.log` in `catch` blocks | Page-level error state with Retry; inline field errors; `ErrorBoundary` | **Replaced** |
| Toasts | SweetAlert2 (`sweetTopSmallSuccessAlert` etc.), used in at least 13 files; some call `window.location.reload()` after the toast | No toast system: inline `tz-alert--success` messages, slide in 300 ms (F256) | **Replaced** |
| Confirm dialogs | `sweetConfirmAlert`, `sweetLoginConfirmAlert` | Inline confirm panels | **Replaced** |

Reasons:
- Popups removed because a timed popup is easy to miss, takes focus unpredictably and cannot be tested by role or text; an inline message stays in the page and is announced (F256, F327 to F335 for the live-region work). Not chosen: MUI `Snackbar`/`notistack` (Nestar had `notistack` in `package.json` but did not use it; a toast still disappears on a timer).
- `axios` for uploads dropped (F2): `apollo-upload-client` was already installed and the Apollo link adds the auth header and the preflight header for free.

Weaker:
- The "no toast" rule means a result that appears off-screen (a save at the bottom of a long page) relies on the inline alert being visible. Tab order and `role="status"` cover screen readers; sighted users on small screens depend on scroll position. I did not test this case.
- `sweetAlert.ts` is dead code (see 5).

---

## 8. Accessibility and responsive

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Landmarks / skip link | none seen | `main#main`, skip link, `Top`, `Footer` | **Added** |
| ARIA | 27 `aria-*` uses; 140 `alt=` | 771 `aria-*` uses; blocked buttons use `aria-disabled`; live regions; drawer dialogs with focus return | **Added** |
| Contrast | Not checked | 4.5:1 / 3:1 rule, checked with axe in both themes (F248) | **Added** |
| Touch targets | Not checked | 44 px minimum below 768 px and `pointer: coarse` (F262, F328, F336) | **Added** |
| Focus ring | MUI default | Visible ring on all controls | **Added** |
| Reduced motion | Not handled (0 uses) | Animation off or a short fade (10 uses in SCSS/libs) | **Added** |
| Responsive | `@media` 1 rule; two SCSS trees; UA sniff | 137 `@media` rules; checked at 320, 390, 768, 1024, 1440 (F273) | **Replaced** |
| Rails | `react-slick`, `swiper` (carousel libraries) | Native scroll with `scroll-snap`, no autoplay (F315) | **Replaced** |

Reasons: libraries for carousels brought autoplay and focus traps with them; native scrolling needs no library and works with the keyboard when the track is focusable (F315). Not chosen: Swiper with `a11y` module.

Weaker:
- **Checks are manual.** There is no automated axe run in CI or in a test; results live in `FRONTEND_COMPLETED_TASKS.md`. A regression is found only on the next audit. axe is loaded from a CDN in the browser (F248); adding `@axe-core/playwright` needs approval (AGENTS rule 5).
- Not tested with a screen reader (F335 says so for the confirmation page).

---

## 9. Tooling

| Part | Nestar | Ticketzy | Verdict |
|---|---|---|---|
| Package manager | README shows npm, yarn and pnpm (create-next-app text); `yarn.lock` exists | Yarn only (AGENTS) | **Kept**, made strict |
| Scripts | `dev`, `build`, `start`, `lint`, `changelog` | Adds `typecheck`, `i18n:check` | **Extended** |
| TypeScript | 4.6.2, `strict`, 274 `any`, 32 `@ts-ignore` | `^5.4.5`, `strict`, about 45 `any`, 0 `@ts-ignore` | **Extended** |
| ESLint | `eslint-config-next` 12.1.0 (a Next 12 config on Next 14); no `.eslintrc` file found | `eslint-config-next` 14.2.0, `.eslintrc.json` = `next/core-web-vitals` | **Extended**, still minimal |
| Prettier | `.prettierrc` with tabs, single quotes, width 120 | Identical file | **Kept** |
| Tests | none | none (no `test` script, no `.github`) | **Kept** (gap) |
| Env | `REACT_APP_*` copied into `process.env` via `next.config.js` `env:`; no `.env.example` | `NEXT_PUBLIC_*` (F10), `.env.example` lists names, no `env:` block | **Replaced** |
| Env files | `.env.development` and `.env.local` are git-ignored | `.env*` is git-ignored and only `.env.example` is tracked (corrected: the first version said "same", but `.env.production` and `.env.test` were not ignored until C5-6 was fixed); never read by tools (AGENTS rule 4) | **Extended** |
| Docs | `README.md` (create-next-app text), `CHANGELOG.md` | `AGENTS.md`, `CLAUDE.md`, `docs/ai/*`, skills | **Added** |
| Dependencies | about 65 (three.js, valtio, react-slick, swiper, moment, chart.js, toast-ui, ...) | 19 (F2, F12, F13) | **Replaced** |

Reasons: `REACT_APP_*` is a Create React App name; Next only exposes `NEXT_PUBLIC_*` natively, so the `env:` copy is not needed (F10). Dependencies were cut to what the imports use (F2). Not chosen: keeping unused packages "in case".

Weaker / copied:
- **`CHANGELOG.md` is Nestar's** (86 KB, links to `SBekzod/nestar-next`, version 2.2.0) and `package.json` still says `"version": "2.2.0"`, `"license": "ITC"` and has the `changelog` script. Nothing in Ticketzy's history is in it.
- `.prettierrc` has `"extends": "eslint:recommended"`. That is not a Prettier option. There is no `format` script or Prettier check, so the file does nothing today.
- No tests of any kind. `yarn lint`, `yarn typecheck` and `yarn i18n:check` are the only gates, and they run by hand.
- Root `SKILLS.md` is a stub next to `docs/ai/SKILLS.md` (noted in F322).
- `tsconfig` target is `es5` (Nestar's value). Next compiles with SWC, so it only affects type checking of newer built-ins.

---

## Summary

### Top 5 divergences

| # | Divergence | Reason (ref) | Not chosen |
|---|---|---|---|
| 1 | Errors go back to the caller as `{ code, message }`; no global popup in the link | A page needs its own translated message (F26) | Global SweetAlert in `onError` |
| 2 | Chat socket: plain WebSocket, token in the first `auth` message, backoff and polling fallback | Backend protocol (backend #58, F29, F171 to F174) | `subscriptions-transport-ws` with token in URL |
| 3 | Sign-out uses `resetStore()`, no reload; one `restoreSession` with `authReadyVar` | Keeps the page alive, no flash (F296, F28, F31) | `clearStore()`, `window.location.reload()` |
| 4 | Two themes from Volt tokens (CSS variables + `tokens.json` for MUI), dark default | One source for colours, instant theme switch (F14, F15) | Light-only MUI theme with hex values |
| 5 | One responsive shell with media queries instead of UA sniffing and `pc`/`mobile` trees | One tree for all widths; checked at five widths (F3, F262, F273) | `useDeviceDetect` and two SCSS trees |

Also notable: request deadlines and retry (F293, F294), i18n parity checks and the fourth language `uz` (F7), inline messages in place of SweetAlert (F256).

### Top 5 weaknesses found

| # | Weakness | Where | Suggested next step |
|---|---|---|---|
| 1 | **Session expiry is watched only on seat and checkout pages**; no global 401 handling | `useSessionWatch` used in `SeatPicker` and `checkout/[orderId]` only | Decide whether `_app` should watch while a token exists (F337 open question) |
| 2 | **Nestar files and metadata left in the repo**: `CHANGELOG.md` (86 KB, Nestar URLs), version `2.2.0`, license `ITC`, `changelog` script | root | Replace or remove, set a real version and license |
| 3 | **Dead dependencies and file**: `sweetalert2`, `animate.css`, `libs/sweetAlert.ts` | `package.json`, `libs/` | Delete the file and both packages (approval needed to change `package.json`) |
| 4 | **No automated tests**, no CI; accessibility results are manual | repo | Ask before adding a runner (rule 5) |
| 5 | **Nestar typing habits copied**: `: any` on `getStaticProps` in about 30 pages, `Component: any` in layouts, about 45 `any` in total; dead `initialApolloState`; invalid `extends` in `.prettierrc` | `pages/*`, layouts, `_app.tsx`, `.prettierrc` | Shared translation-props helper with real types |

Other gaps: token in `localStorage` (shared with Nestar, needs backend cookies to change), default cache without `typePolicies` and `network-only` almost everywhere, two token files that must be kept in step by hand, English-only server messages.

### Not verified

- **Nestar runtime behavior.** Nothing was run. Statements about Nestar come from reading code, not from a running app.
- **Nestar `.env*` contents.** Not read (rule 4); variable names come from `process.env` use in code.
- **Backend side.** I did not open the `ticketzy` repo. Backend decision numbers (#25, #58) are quoted from the comments in this repo.
- **Global 401 behavior in Ticketzy.** I searched for a handler and found none outside `useSessionWatch`; I did not exercise an expired token on each page.
- **Whether `sweetalert2`/`animate.css` are imported dynamically** or by a string: a grep for the package names found them only in `libs/sweetAlert.ts`; I did not run a bundle analysis.
- **Counts** (`any`, `aria-`, `@media`, ...) are plain `grep` totals over `libs`, `pages`, `apollo`, `scss`. They show direction, not exact quality; `aria-` counts include repeats and `alt=` counts do not include `next/image` props named differently.
- **Reasons without an F-number** (UA sniffing removal, the `pc`/`mobile` SCSS split, `axios` for uploads beyond F2) are my reading of the code and the nearest decisions, not text from the log.
- **MUI `CssVarsProvider` status** is quoted from memory, not checked against the installed version.
