# Ticketzy frontend: cleanup and risk audit

Date: 2026-10-13. **Report only. No application code, `package.json`, locale or config file was changed.** Inputs: `docs/ai/NESTAR_FRONTEND_COMPARISON.md`, F337 in `docs/ai/DECISIONS.md`, `docs/ai/DESIGN_AUDIT.md`. No `.env*` file was read (names come from `process.env` use in code and from `.env.example` keys only).

Method: `grep` and import scans over `libs`, `pages`, `apollo`, `scss`, `public`; small Node scripts (kept in the scratchpad, not in the repo) for unused files, unused exports and unused SCSS classes; a scratch copy of the repo (port 3000 untouched) for `yarn build`, `yarn lint`, `yarn typecheck`, `yarn i18n:check`; the Chrome test tab on the running dev server for the console on home and the event page.

Severity: **high** = can hurt a visitor or the demo, or is a real vulnerability; **medium** = real cost or risk, not urgent; **low** = tidiness. Size: **small** = under an hour, one or a few files; **medium** = a few hours or a mechanical change in many files; **large** = a day or more, or needs a decision/new library.

Baseline (scratch copy, `public/img` and `design/` left out): `yarn build` OK (128 pages), `yarn lint` clean, `yarn typecheck` clean, `yarn i18n:check` OK.

Corrections to the comparison doc found while auditing:
- It says Nestar `any` count is compared with "47 in Ticketzy"; the real `any` usages are about 45 (one grep also matched the word "any" in comments). Of those, 32 are `getStaticProps` and 2 are in a dead file.
- It does not mention that `public/img` (43 MB) is entirely unused (C1-5), that `@mui/icons-material` is unused (C1-2), that `.env.production` is not git-ignored (C5-6), or the `returnTo` tab-character bypass (C8-1).

---

## C1. Dead code and unused dependencies

Each row was checked by grep for the name, the import path and (for assets) the file name, outside `node_modules`, `.next`, `docs`, `design`.

| ID | Item | Path | Severity | Evidence | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C1-1 | `sweetalert2`, `animate.css` and the file that uses them | `package.json`, `libs/sweetAlert.ts`, `libs/config.ts` (`Messages`) | medium | Only `libs/sweetAlert.ts:1-2` imports them; nothing imports `sweetAlert.ts` (11 exports, all unused). `Messages` in `config.ts` is used only by `sweetAlert.ts:102`. Not in the bundle, but installed, has 2 `any`, 3 unused locals, and a `window.location.reload()` | Delete `libs/sweetAlert.ts`, `Messages`, remove both packages (`yarn remove`, needs approval for `package.json`/`yarn.lock`) | small |
| C1-2 | `@mui/icons-material` unused | `package.json` | medium | 0 imports in `libs`, `pages`, `apollo`; icons come from `phosphor-react` (112 files). Large install (thousands of files) | `yarn remove @mui/icons-material` | small |
| C1-3 | `standard-version` and the `changelog` script | `package.json`, README `yarn changelog` row | medium | Only used by the `changelog` script that rewrites the Nestar `CHANGELOG.md` (see C2-1) | Remove package, script and README row (with C2-1) | small |
| C1-4 | `prettier` installed, never run | `package.json`, `.prettierrc` | low | No `format` script, no CI step, config has an invalid key (C5-1). Code is tab-indented as the config says, so the style is followed by hand | Either add `format`/`format:check` scripts or remove the package and file; recommend adding the script | small |
| C1-5 | **`public/img` is 100 % unused and Nestar-branded** | `public/img/**` (90 files, 43 MB) | medium | No reference to `/img/` anywhere in code or SCSS. Contains `apartmentMain.png`, `banner/properties.png`, `banner/agents.webp`, `banner/types/{apartment,villa,house}.webp`, `banner/cities/*.webp` (9 Korean cities), `banner/header1-3.svg`, `joinBg.svg` (11 MB), `aboutBanner.svg` (4 MB), `icons/{bed,shower,garden,room,electricity,investment,...}.svg`, `icons/brands/*` (cisco, amazon, spotify...), `logo/{logoText,logoWhite,favicon}.svg` (**the old Nestar logo files**), `profile/{agent,girl,defaultUser}`, `flag/lang*.{png,svg}`, `events/{BUSAN,DAEGU,INCHEON,SEOUL}.webp`, `event.svg` (6 MB). The live logo is `public/favicon.svg`. Git pack is 89 MiB | `git rm -r public/img` (first ask the owner whether any file should be kept as a placeholder). Old copies stay in git history; if repo size matters, rewrite history is a separate decision | small |
| C1-6 | create-next-app leftovers | `public/next.svg`, `public/vercel.svg` | low | 0 references | Delete | small |
| C1-7 | Unused layout wrapper | `libs/components/layout/LayoutFull.tsx` | low | 0 imports (only mentioned in docs). It re-exports `withLayoutBasic` | Delete the file | small |
| C1-8 | Exports used nowhere | `libs/admin/types.ts` `ModerationFlagType`; `libs/events.ts` `isCategory`; `libs/messaging/format.ts` `isMine`; `libs/organizer/checkin.ts` `SeatLike`; `libs/routes.ts` `organizerCheckInUrl`, `organizerProfileUrl`; `libs/venues/timezones.ts` `defaultTimezone`; `libs/venues/useVenueData.ts` `usageOf` | low | Whole-word search over `libs`, `pages`, `apollo` finds no other use | Delete them (check each is not about to be used) | small |
| C1-9 | About 100 `export`s that are only used inside their own file | e.g. `libs/organizer/analytics.ts` (5), `libs/venues/model.ts` (5), `libs/seats/types.ts` (3), `apollo/*` field fragments (10) | low | Same scan, "used locally" | Leave. Removing `export` is cosmetic; do it only when a file is touched anyway | small |
| C1-10 | `logOut` alias of `clearSession` | `libs/auth/index.ts` (last line) | low | Not dead: still used by `AccountMenu.tsx:56` and `pages/sell.tsx` (so not dead). F337 calls it an alias for old callers | Rename the two callers to `clearSession`, drop the alias | small |
| C1-11 | Unused SCSS | `scss/layout.scss:167` `.tz-lang`, `:243` `.tz-account` | low | Of 488 classes, only these two have no match in `libs`/`pages` (the code uses `tz-lang--segmented`, which is a different selector). Another 9 classes are probably dynamic (`home__cat`, `seat--selected`, `adm-row`...) and were not removed from the count | Delete the two blocks after a visual check of the header | small |
| C1-12 | `design/` export is committed | `design/**` (244 files, 31 MB; HTML and PNG mock-ups, a second `tokens.css`/`tokens.json`) | low | Not imported by the app. `design/design-system/tokens.css` and `tokens.json` differ from `scss/tokens.css`/`tokens.json` (the AGENTS rule says `scss/` wins) | Keep if it is the design reference; otherwise move to a separate repo or release asset. Add a note in `design/README.md` that `scss/tokens.*` wins | small |
| C1-13 | `i18next` is a direct dependency used for one type | `package.json`; `libs/components/messages/labels.ts:1` (`TFunction`) | low | It is also a dependency of `next-i18next`, so removing it is risky | Keep. No action | n/a |
| C1-14 | Packages that look unused but are needed | `@emotion/react`, `@emotion/styled` (MUI peers), `graphql` (Apollo peer), `react-i18next` (next-i18next peer), `sass` (the `.scss` files) | n/a | 0 direct imports, but required at runtime | Keep. Listed so nobody removes them | n/a |

Not verified: unused keys inside `public/locales/*` (`yarn i18n:check` only finds missing keys, not extra ones), and unused GraphQL fields inside documents. No unused GraphQL document exports were found.

---

## C2. Nestar leftovers

| ID | Item | Path | Severity | Evidence | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C2-1 | `CHANGELOG.md` is Nestar's | `CHANGELOG.md` (86 KB) | medium | 650 mentions of "nestar"; compare links go to `SBekzod/nestar-next`; latest entry `2.2.0 (2024-05-10)`; nothing from Ticketzy | Delete it (git history is the log; `docs/ai/FRONTEND_COMPLETED_TASKS.md` is the human log), or replace with a short real one | small |
| C2-2 | Version `2.2.0` | `package.json` | low | Inherited from Nestar | Set `0.1.0` (or `1.0.0`) | small |
| C2-3 | License `"ITC"`, no `LICENSE` file | `package.json`, repo root | medium | `ITC` is not an SPDX id; there is no license file, and the README has no license section. A public portfolio repo without a license is "all rights reserved" | Pick MIT (or `UNLICENSED` + `"private": true`, already set) and add the file; owner decision | small |
| C2-4 | Package name and description | `package.json` | low | `"name": "ticketzy-next"` is fine. There is **no** `description`, `repository`, `author` or `keywords` | Add a one-line description and repository URL | small |
| C2-5 | `changelog` script | `package.json` | low | See C1-3 | Remove | small |
| C2-6 | README | `README.md` | low | No Nestar text left apart from the intentional link to the comparison doc (line 148). Screenshots table points to files that do not exist (`docs/screenshots/*.png`, marked as placeholders). No license section | Add real screenshots or remove the table; add the license line | small |
| C2-7 | Comments and docs | `.gitignore:37` `# nestar specifiv` (typo, covers `.vscode/`, `/build`, `/.idea`); `AGENTS.md:3` (intentional, "migrated from nestar-next") | low | No other "nestar" in `libs`, `pages`, `apollo`, `scss` (only false hits on `marginInlineStart`) | Rename the comment to `# editor and build output`; keep AGENTS wording | small |
| C2-8 | Nestar code habits that remain | `getStaticProps = async ({ locale }: any)` (32 pages), `withLayoutBasic = (Component: any)`, dead `initialApolloState`, `Messages` constants, `logOut` alias | medium | See C4, C5, C1 | Covered by those sections | n/a |
| C2-9 | Root `SKILLS.md` stub | `SKILLS.md` | low | One line pointing to `docs/ai/SKILLS.md` (F322) | Delete or keep; harmless | small |

Checked and clean: no Nestar domain words (`property`, `agent`, `Poppins`, `REACT_APP_`) in code; the `userVar` is typed; the Nestar WebSocket link is gone.

---

## C3. Session expiry (401 and expired token)

How it works today, by surface:

| ID | Surface | Behavior today | Gap | Severity |
|---|---|---|---|---|
| C3-1 | App load (`pages/_app.tsx`, `libs/auth/index.ts` `restoreSession`) | Token in `localStorage` is decoded; if `exp` has passed it is removed silently and the visitor is a guest. If the server rejects it (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_REQUEST`) `clearSession()` runs. Network failure keeps the session | No message: the visitor just appears signed out. `FORBIDDEN` and `BAD_REQUEST` also end the session, which is broader than "expired" | medium |
| C3-2 | Apollo link (`apollo/client.ts:36-46`) | `errorLink` only logs in development. There is no `UNAUTHENTICATED` branch. `retryLink` retries network errors only | An expired token during a session is never detected at the link | high |
| C3-3 | Seat picker and checkout (`SeatPicker.tsx:60`, `pages/checkout/[orderId].tsx:51`, `libs/hooks/useSessionWatch.ts`) | Every 5 s and on window focus the token's own `exp` is checked; expired -> `clearSession()` -> `useRequireAuth` redirects to `/account/login?returnTo=...`. `libs/seats/errors.ts:36` maps `UNAUTHENTICATED` to `errors.session` | Only these two pages. Redirect has no "your session expired" text | medium |
| C3-4 | All other signed-in pages: `/orders`, `/tickets`, `/account/*`, `/settings`, `/notifications`, `/organizer/*`, `/admin/*` (guards: `libs/auth/guards.tsx`, `DashboardShell`) | `useRequireAuth` looks only at `userVar` (set once at load). After the token expires `userVar` stays set, so the page stays open; queries return `UNAUTHENTICATED` and each page shows its own error state with Retry (from code; **not exercised** with a real expired token). Retry cannot succeed | Visitor is stuck in a signed-in-looking UI that fails; sign-out or reload is the only way out | high |
| C3-5 | Messaging socket (`libs/messaging/socket.ts:19,142`) | Close code 4401 sets `refused` and the app falls back to polling | Does not end the session; polling queries fail with `UNAUTHENTICATED` (see C3-4) | medium |
| C3-6 | Assistant (`libs/assistant/errors.ts:34`) | `UNAUTHENTICATED` shows "not allowed" text | Local only | low |
| C3-7 | Multi-tab (`pages/_app.tsx:48-55`) | `storage` event re-runs `restoreSession` | Works | n/a |
| C3-8 | Login page after redirect | `returnTo` honoured (`useRedirectIfSignedIn`) | No `reason`/`expired` parameter, nothing to show | medium |

**Proposal: one global handler.**
1. New `libs/auth/sessionExpired.ts` exporting `handleSessionExpired()`: runs once (module flag, reset on next sign-in); does nothing if no token is stored; calls `clearSession()` (remove token, `userVar(null)`, `resetStore()`, per F296 never `clearStore()`); then `Router.replace(loginUrl(currentPath, 'expired'))` using the `next/router` singleton; a guest on a public page is not redirected (only a page behind a guard goes to login; public pages simply become signed-out).
2. In `apollo/client.ts` `errorLink`: if any GraphQL error has code `UNAUTHENTICATED` **and** a token is stored **and** the operation is not `login`/`signupUser`/`signupOrganizer` (wrong password is also an auth error), call `handleSessionExpired()`. Do not do it for `FORBIDDEN` (role problem, not expiry). Do this before the development-only logging guard (today the function returns early outside development).
3. `useSessionWatch` moves to `_app.tsx` (enabled while a token exists), so the local `exp` check covers every page; remove the two page-level calls.
4. `libs/messaging/socket.ts`: on close code 4401 call `handleSessionExpired()`.
5. Login page shows a short translated line (`role="status"`, class `tz-alert`) when `?reason=expired`.
6. Add `auth:errors.sessionExpired` in `en`, `ko`, `ru`, `uz`; extend `loginUrl(returnTo, reason?)`; add a decision F-number.

Exact files to change:

| File | Change |
|---|---|
| `libs/auth/sessionExpired.ts` (new) | the handler |
| `apollo/client.ts` | `errorLink` calls it; restructure the development-only return |
| `libs/auth/index.ts` | (optional) `restoreSession` uses the same path with the reason when the stored token is expired |
| `libs/routes.ts` | `loginUrl(returnTo, reason)` |
| `pages/_app.tsx` | call `useSessionWatch(Boolean(token))` |
| `libs/hooks/useSessionWatch.ts` | call `handleSessionExpired()` instead of `clearSession()` |
| `libs/components/seats/SeatPicker.tsx`, `pages/checkout/[orderId].tsx` | remove their own `useSessionWatch()` call |
| `libs/messaging/socket.ts` | 4401 -> handler |
| `pages/account/login.tsx` and `libs/components/auth/LoginForm.tsx` | read `reason`, show message |
| `public/locales/{en,ko,ru,uz}/auth.json` | new key |
| `docs/ai/DECISIONS.md` | new F-number (answers the open question in F337) |

Size: **medium** (about 10 files, one new). Risk to test: sign-in with a wrong password must not trigger it; two requests failing together must redirect once; the sign-out path (`resetStore`) must not loop.

---

## C4. Type safety (`any`)

About 45 real `any` in `libs`, `pages`, `apollo` (comments excluded). The bigger problem is **implicit** `any`: 99 `useQuery`/`useMutation`/`useLazyQuery` calls and 51 `client.query`/`client.mutate` calls, of which exactly 1 passes a type argument, so `data` is `any` almost everywhere.

Grouped:

| ID | Group | Files | Count | Severity | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C4-1 | `getStaticProps = async ({ locale }: any)` | 32 files in `pages/` (all pages listed by `grep "locale }: any" pages`). `pages/account/join.tsx:10` also passes `locale` without the `?? 'en'` fallback | 32 | medium | One helper `libs/i18nProps.ts`: `export const withTranslations = (ns: string[]): GetStaticProps => async ({ locale }) => ({ props: { ...(await serverSideTranslations(locale ?? 'en', ns)) } })`; each page becomes one line. `yarn i18n:check` reads the `serverSideTranslations` call per page, so its parser must learn the helper (or keep the call inline and only type the argument: `({ locale }: GetStaticPropsContext)`) | medium |
| C4-2 | Untyped Apollo results (implicit `any`) | 43 files use `useQuery`/`useMutation`; 51 `client.query/mutate` calls | ~150 sites | high | Incremental: pass `<Data, Vars>` at the sites that read nested fields, using the interfaces already in `libs/types/*`; start with `GET_EVENT`, `GET_EVENTS`, `GET_MEMBER`, orders. Full typing would use graphql-codegen (new dependency: ask first) | large |
| C4-3 | Page wrappers | `libs/components/layout/LayoutBasic.tsx:15-16` (`Component: any`, `props: any`); `libs/components/dashboard/DashboardShell.tsx:195` (`ComponentType<any>`) | 3 | medium | `<P extends object>(Component: ComponentType<P>)` returning `(props: P) => JSX.Element`; pass `displayName` through | small |
| C4-4 | SSR query results | `pages/events/[id]/index.tsx:57` `serverQuery<{ getEvent: any }>`; `pages/organizers/[id].tsx:29` `serverQuery<{ getMember: any }>` | 2 | medium | Use `Event` from `libs/types/event.ts` and `MemberProfile` (or a `Pick`) | small |
| C4-5 | Messaging socket payloads | `libs/messaging/socket.ts:15` `Listener = (data: any)`, `:148` `data?: any` | 2 | medium | Discriminated union keyed by `event` (types already in `libs/messaging/types.ts`) | small |
| C4-6 | Admin orders mapping | `pages/admin/orders/index.tsx:67` `(event: any)` | 1 | low | Type the `getEventsByAdmin` row | small |
| C4-7 | Apollo plumbing | `apollo/resilience.ts:32` `input: any` (use `RequestInfo \| URL`); `apollo/client.ts:68` `initialState: any` (use `NormalizedCacheObject \| null`, or delete with C5-2) | 2 | low | as stated | small |
| C4-8 | Generic element clone | `libs/components/organizer/editor/fields.tsx:24` `ReactElement<any>` | 1 | low | `ReactElement<Record<string, unknown>>` | small |
| C4-9 | Dead file | `libs/sweetAlert.ts` (2) | 2 | low | Removed by C1-1 | small |
| C4-10 | Lint escapes | 20 `eslint-disable` comments, 17 are `react-hooks/exhaustive-deps`; 0 `@ts-ignore` | 20 | low | Review when each file is touched; the `no-throw-literal` one is in `useUnsavedGuard.ts:31` (intentional route-cancel throw) | small |

**The 10 most harmful, in order:**

| # | Where | Why harmful |
|---|---|---|
| 1 | All `useQuery`/`useMutation` results (C4-2), e.g. `GET_EVENT` readers | A renamed field or a null is not caught by `yarn typecheck`; this is where runtime errors hide |
| 2 | `pages/events/[id]/index.tsx:57` `getEvent: any` | Feeds SEO tags and page props on the most visited page |
| 3 | `libs/components/layout/LayoutBasic.tsx:15-16` | Wraps almost every page; page props lose their types |
| 4 | `pages/organizers/[id].tsx:29` `getMember: any` | Public SSR data from the API |
| 5 | `libs/components/dashboard/DashboardShell.tsx:195` | Wraps every organizer/admin page |
| 6 | `libs/messaging/socket.ts:15,148` | Untrusted network payloads handled as `any` |
| 7 | 32 x `getStaticProps({ locale }: any)` | `locale` can be `undefined`; `join.tsx` passes it unguarded |
| 8 | `pages/admin/orders/index.tsx:67` | Admin data mapping |
| 9 | `apollo/resilience.ts:32` | Shared fetch wrapper |
| 10 | `apollo/client.ts:68` | Cache restore argument |

Also worth knowing: `loadProfile` in `libs/auth/index.ts` casts `data.getMember as MemberProfile`; the two `as` casts in `libs/errors.ts` are guarded.

---

## C5. Config problems

| ID | Item | Path | Severity | Evidence | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C5-1 | Invalid Prettier key | `.prettierrc` | low | `"extends": "eslint:recommended"` is an ESLint idea; Prettier ignores it (or errors on newer versions). Other keys are valid | Delete the line; add a `format:check` script (C1-4) | small |
| C5-2 | `initialApolloState` is dead | `pages/_app.tsx:38`, `apollo/client.ts:60-68` | low | No page returns `initialApolloState`; `pageProps.initialApolloState` is always `undefined` | `useApollo()` without argument; `initializeApollo()` keeps the restore only if SSR ever fills it | small |
| C5-3 | ESLint is only `next/core-web-vitals` | `.eslintrc.json` | medium | No `no-explicit-any`, no `no-console`, no unused-variable rule (tsc finds 9 unused locals/params when asked: `GeneralPicker.tsx:5` `Button`, `libs/format.ts:179`, `pages/admin/events/[id].tsx:61`, `pages/checkout/[orderId].tsx:76`, `pages/events/[id]/index.tsx:24,86`, plus the dead `sweetAlert.ts`). `@typescript-eslint/eslint-plugin` is **not installed** (only the parser) | Turn on in `tsconfig`: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` (10 errors to fix first). ESLint: `eqeqeq`, `no-console` (allow `error`), and `@typescript-eslint/no-explicit-any` as `warn` after asking to add the plugin | small (tsconfig), medium (plugin) |
| C5-4 | `tsconfig` strictness | `tsconfig.json` | low | `strict: true` is on (good). Not on: `noUncheckedIndexedAccess` (85 errors if enabled), `noFallthroughCasesInSwitch` (0 errors, safe now). `target: es5` (Nestar value; Next compiles with SWC), `allowJs: true` with no JS in `include`, a commented-out `suppressImplicitAnyIndexErrors` line | Enable `noFallthroughCasesInSwitch` now; plan `noUncheckedIndexedAccess` per folder; set `target` `es2017`; drop `allowJs` and the comment | small |
| C5-5 | Env names read in code | `libs/config.ts:1`, `apollo/client.ts:25`, `libs/serverFetch.ts`, `libs/messaging/socket.ts`, `libs/site.ts` | low | Read: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_GRAPHQL_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NODE_ENV`. **All five are in `.env.example`; no undocumented variable found.** But: `config.ts:1` builds `` `${process.env.NEXT_PUBLIC_API_URL}` `` so an unset value becomes the string `"undefined"` and upload URLs turn into `undefined/uploads/...`; an unset `NEXT_PUBLIC_API_GRAPHQL_URL` makes the upload link post to the site's own origin; only 2 of 5 variables have a comment in `.env.example` | One `libs/env.ts` that reads each variable once, throws at build/start when required ones are missing, and is the only place using `process.env`; comment all five in `.env.example` | small |
| C5-6 | **`.env.production` is not git-ignored** | `.gitignore:27-46` | medium | Ignored: `.env*.local`, `.env.development`, `.env.local`, `.env`. Not ignored: `.env.production`, `.env.test`. A deploy file with a real URL or a key would be committed by `git add .` | Replace the block with `.env*` and `!.env.example` | small |
| C5-7 | No security headers | `next.config.js` | medium | Only `reactStrictMode` and i18n. See C8-5 | Add `headers()` | small |
| C5-8 | Outdated browser data | build log | low | "Browserslist: caniuse-lite is outdated" on every build | `npx update-browserslist-db@latest` (downloads; needs approval; touches `yarn.lock`) | small |
| C5-9 | Node and Yarn not pinned | `package.json` | low | No `engines` or `packageManager`; AGENTS says "Yarn only" but nothing enforces it. Local Node is 24, Next 14.2 supports 18/20 | Add `engines.node` (`>=18.17`) and `packageManager` | small |
| C5-10 | Two token files must be edited by hand | `scss/tokens.css`, `scss/tokens.json` | low | F14 says keep both in step; no check | A 20-line `scripts/tokens-check.js` comparing the palette values, run from `yarn i18n:check`-style script | small |
| C5-11 | Oversized page data | build log | medium | `next build` warns "data for page ... exceeds 128 kB": `/admin` 201 kB, `/admin/messages` 210 kB, `/admin/orders` 219 kB, `/admin/events` 241 kB, plus 12 organizer pages at 131-175 kB | Cause is `serverSideTranslations` embedding whole namespaces (`admin`, `organizer`, ...) into every page. Split the biggest namespaces by page (`admin.events`, `admin.orders`) or load them only on those pages | medium |

---

## C6. Console warnings and performance

Observed in the Chrome test tab on the running dev server (console tracking starts at the first read, so warnings printed during the very first load may be missed). The checkout page needs a live seat hold, a state-changing action, so it was **not opened**; its findings come from code and the build output.

| ID | Item | Path | Severity | Evidence | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C6-1 | Next/Image aspect-ratio warning on home | `libs/components/events/EventImage.tsx:33-45` + the parent's CSS | low | Logged once on home: image "has either width or height modified, but not the other" for an uploaded event image (`http://localhost:3007/uploads/event/117d6047-...jpg`). Component passes `width=1200 height=800` and CSS sets only one side | Add `height: auto` (or `width: auto`) in the rule that sizes `.tz-media img`; check the hero and card rules | small |
| C6-2 | Favicon preload ("preloaded but not used") | `libs/components/common/Logo.tsx:21` | low | `Logo` always sets `priority`, which writes `<link rel="preload" href="/favicon.svg" as="image">` for a 28 px SVG. The home page has that preload plus two with an **empty `href`**. Not reproduced as a console message in this run (Chrome only warns when the preloaded image is not used within a few seconds, e.g. when `Logo` is hidden at that width), but the cause is in the code | Remove `priority` from `Logo` (it is tiny and cached); keep `priority` only for the LCP event image | small |
| C6-3 | LCP priority on the picsum hero image | `EventImage` `eager` -> `priority`; `libs/images.ts` | low | Not reproduced here (the dev data uses uploaded files from `:3007`, not picsum). Code path: every `eager` card gets `priority`; picsum URLs go through `resizingLoader` (`.jpg` suffix, width from `sizes`), so the preload `href` and the `<img>` `srcset` can differ and Chrome logs "preloaded but not used" | Use `priority` only for the first hero image; `fetchPriority="high"` instead of `priority` where two images are eager; confirm in a production build with picsum data | small |
| C6-4 | Heavy first load for every page | build output | medium | Shared JS 263 kB (`_app` 132 kB); every page's First Load JS is 259-283 kB; shared CSS 51.5 kB with all 16 SCSS files loaded globally from `_app.tsx`. `MessagingLifecycle` and `AssistantLifecycle` are mounted for every visitor, guests included | Lazy-load what a guest never needs (messaging code behind a signed-in organizer/admin check, `dynamic()` for `AssistantLifecycle`); check with `@next/bundle-analyzer` (new dev dependency, ask) | medium |
| C6-5 | Large images in `public` | `public/img/**` | medium | 43 MB, but unused (C1-5), so no runtime cost | Delete | small |
| C6-6 | SSR calls without a deadline | `libs/serverFetch.ts`, `libs/seo.ts` `sitemapXml` | medium | `serverQuery` has no timeout. On a cold Render backend, `getServerSideProps` for `/events/[id]`, `/organizers/[id]` and `sitemap.xml` (up to 20 sequential fetches) can hang for up to a minute, and the page waits instead of showing the skeleton plus wake note | `AbortController` with ~8 s; return `null` on timeout (callers already handle `null`) | small |
| C6-7 | Dev-only logging | `apollo/client.ts:36-46` | low | Logs GraphQL/network errors in development only. Home and event page produced no error lines | none | n/a |

Dev console results: home: 1 warning (C6-1), no errors. Event detail (`/events/6ac90a50...`): no warnings or errors captured. Checkout: not opened.

---

## C7. UI consistency leftovers

`tz-blocked` (F326) exists only as `.MuiButton-root.tz-blocked` (`scss/layout.scss:610`), so it works on MUI `Button` only. Used today by: `SeatSummary.tsx:96` (Continue), `EventEditor.tsx:310` (Back, first step), `EventEditor.tsx:323` (Save), `pages/organizer/profile.tsx:255,267` (Save, Discard). Every other `disabled` control below keeps the native `disabled` look (greyed, not focusable, contrast not guaranteed).

Rule: `disabled` stays for a request in flight; a control with "nothing to do yet" should be `tz-blocked` + `aria-disabled`. Listed are the second kind.

| ID | Control | Path:line | Condition | Severity | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C7-1 | **Venue editor Save / Create** | `libs/components/organizer/venues/VenueEditor.tsx:172` | `disabled={saving \|\| (!dirty && Boolean(venue))}` mixes in-flight and "no changes" | medium | Same pattern as `EventEditor.tsx:323`: `disabled={saving}`, `className={!saving && !dirty && venue ? 'tz-blocked' : undefined}`, `aria-disabled`, ignore click | small |
| C7-2 | Event editor "Submit for review" | `EventEditor.tsx:340` | `disabled={saving \|\| (!event && !dirty)}` | medium | Same | small |
| C7-3 | Submit dialog confirm | `libs/components/organizer/SubmitDialog.tsx:68` | `disabled={loading \|\| blocked}` (`blocked` = problems found) | low | `tz-blocked` for `blocked`, `disabled` for `loading` | small |
| C7-4 | Translate button | `libs/components/organizer/editor/StepTranslations.tsx:89` | `disabled={busy \|\| saving \|\| !titleReady}` | low | same split | small |
| C7-5 | Sign in / Sign up submit | `libs/components/auth/LoginForm.tsx:69`, `SignupForm.tsx:196` | `disabled={busy \|\| !hydrated}` | low | `!hydrated` is a pre-hydration state and lasts milliseconds; leave | n/a |
| C7-6 | Message send | `libs/components/messages/Composer.tsx:93` | `disabled={empty \|\| sending}` | low | split | small |
| C7-7 | Assistant send | `libs/components/assistant/AssistantWidget.tsx:186,298` | `disabled={empty && !error}` / `!canSend` (plain `<button>`) | low | A plain-button variant of the class (`.tz-blocked` currently targets MUI only) | small |
| C7-8 | Pagination previous / next | `libs/components/events/Pagination.tsx:41,74` | `disabled={page <= 1}` / `page >= pageCount` | low | Edge buttons; keep disabled or use `aria-disabled` so keyboard focus is not lost when paging to the last page | small |
| C7-9 | Venue editor toolbar: undo, redo, add section, templates, duplicate, delete, rotate, section fields | `VenueEditor.tsx:317-330`, `SectionPanel.tsx` (about 20 controls), `TimezonePicker.tsx:71` | `disabled={locked}` / `!history.canUndo` | low | `locked` is a whole-form state (events pin the layout), shown with a banner; leave as is. Undo/redo are "nothing to do yet": `tz-blocked` on the two buttons | small |
| C7-10 | Event editor fields when read-only | `StepDetails.tsx:19,28,49`, `StepTickets.tsx:70-123`, `StepTranslations.tsx:175,178`, `StepVenue.tsx:128,175,188,210` | `disabled={readOnly}` / `fieldset disabled` | low | State, not an action; leave. Check text contrast of disabled inputs in both themes (not measured) | small |
| C7-11 | Steppers and counters | `GeneralPicker.tsx:112,116` (less/more), `SeatMap.tsx:266,272` and `LayoutCanvas.tsx:187,193` (zoom), `VenueImages.tsx:100,103` / `StepImages.tsx:137,140` (move earlier/later), `SectionPanel.tsx:55,71` | at limit | low | Plain `<button>` at their limit; fine, but a disabled button loses focus for keyboard users; consider `aria-disabled` | small |
| C7-12 | Scanner buttons | `libs/components/organizer/checkin/Scanner.tsx:97,111` | `cameras.length < 2` / `disabled \|\| phase === 'starting'` | low | `cameras.length < 2` is "nothing to do": hide it instead | small |
| C7-13 | Dialog and in-flight buttons (OK) | `CancelDialog`, `ReasonDialog`, `MarkPaidDialog`, `CommissionDialog`, `RefundPanel`, `PayBar`, `OrganizerDrawer`, `MessageOrganizer`, `LikeButton`, `Comments`, `SeatPicker`, `FollowButton` | `disabled={loading/busy/sending}` | n/a | Correct use of `disabled` (request in flight) | n/a |

**Follow button (verified in `libs/components/events/FollowButton.tsx`, used on `pages/events/[id]/index.tsx:343` and `pages/organizers/[id].tsx:127`):**

| Viewer | What they see |
|---|---|
| Signed out | Outlined "Sign in to follow" link button to login with `returnTo`, plus the follower count |
| USER (buyer), not the organizer | Working Follow / Following toggle (optimistic, restored on failure) |
| ORGANIZER | No button; a hint line ("buyers only", `follow.buyersOnly`); if it is their own page, the "own" hint |
| ADMIN | No button; the same "buyers only" hint |

The backend would let any member follow (the code comment cites F211); the UI deliberately offers it to buyers only. No inconsistency found. Minor: the hint is plain text and does not say where to find the buyer account; and the skeleton `span.follow--skel` shows until `ready`, so organizer/admin accounts briefly see a skeleton, then the hint (no layout shift was measured).

---

## C8. Security and privacy (frontend)

| ID | Item | Path | Severity | Evidence | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C8-1 | **`returnTo` check can be bypassed with a tab/newline** | `libs/routes.ts:27-31` `safeReturnTo`, used by `useRedirectIfSignedIn.ts:19` | high (open redirect after login; needs a crafted link, no user data leaked by itself) | The check requires a leading `/`, no `//`, no backslash. A value of `/<TAB>/evil.com` (query `returnTo=%2F%09%2Fevil.com`) passes, but the URL parser removes tab/CR/LF, so `new URL('/\t/evil.com', origin).host` is `evil.com` (checked in Node). Next's router treats a non-local URL as a hard navigation. Not exercised in the browser end to end | Reject any control character: `/[\u0000-\u001f\u007f]/`; better, resolve with `new URL(path, 'http://x')` and require `host === 'x'`, then return `pathname + search + hash`. Same helper for `safeEventReturn` (it already has a strict regex, so safe) | small |
| C8-2 | Token in `localStorage` | `libs/auth/token.ts`, `apollo/client.ts` | medium | Any XSS can read `accessToken` and take over the account until it expires. Today's XSS surface is small (no `dangerouslySetInnerHTML` on user data, React escapes text, see C8-3), which lowers the likelihood. **Would cookies be realistic?** An httpOnly cookie needs (1) backend changes: `Set-Cookie` on login, CORS with credentials, CSRF defense (the Apollo `apollo-require-preflight` header already helps), cookie auth on the WebSocket; (2) the API and the site on the same registrable domain, or `SameSite=None; Secure`, which Safari and Chrome third-party-cookie rules increasingly block (site on Vercel or similar, API on `onrender.com`). For a portfolio demo with simulated payments this is **not realistic now**; the cheaper steps are a strict CSP (C8-5), short token lifetime (backend), and the global expiry handler (C3) | Document the risk in the README "Known limitations"; do C8-5; revisit only if the backend adds cookie auth | small (docs), large (cookies) |
| C8-3 | `dangerouslySetInnerHTML` | `pages/_document.tsx:21` | low | Only one use, with two constant strings (theme and session flags). Not user data. It forces `'unsafe-inline'` or a hash/nonce in a CSP | Keep; when adding CSP, use the script's SHA-256 hash | small |
| C8-4 | User input rendered | event titles/descriptions, comments (`Comments.tsx`), member names, assistant replies (`libs/assistant/richText.tsx`) | low | All rendered as React text. The assistant parser only builds links through `safeLink` (own routes or `https:` URLs; no `javascript:`/`data:`/`http:`) with `rel="noopener noreferrer"`. Event image URLs are arbitrary `https` URLs supplied by organizers/backend and are loaded by the visitor's browser (tracking-pixel and mixed-content possibility; `http:` images would be blocked on an https site) | Optional: restrict image hosts in the backend or with CSP `img-src` | small |
| C8-5 | No CSP or security headers | `next.config.js` | medium | No `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (the check-in page needs `camera=(self)`), `frame-ancestors`. `X-Powered-By: Next.js` is on | Add `headers()` with `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self)`, `frame-ancestors 'none'`, `poweredByHeader: false`; then a report-only CSP first (connect to the API host + `ws:`/`wss:` host, `img-src` for the API and picsum, `style-src 'unsafe-inline'` for Emotion) | medium |
| C8-6 | Unvalidated redirects elsewhere | `libs/i18n.ts:31`, `pages/_app.tsx:61`, `EventEditor.tsx:165`, `MessageOrganizer.tsx:39` | low | All use fixed paths or `router.asPath` of the current page; `returnTo` is URL-encoded on the way out. `VenueEditor` uses `returnTo` only after `safeEventReturn` (strict regex). Only C8-1 is a gap | none beyond C8-1 | n/a |
| C8-7 | External URLs | `richText.tsx:35`, `events/[id]/index.tsx:320`, `organizer/profile.tsx:165` | low | `target="_blank"` with `rel="noopener noreferrer"` except `organizer/profile.tsx:165`, which opens the app's own public profile URL (same origin; `noopener` is implied for same-origin only by convention) | Add `rel="noopener"` for consistency | small |
| C8-8 | Logging | `apollo/client.ts:42,44` (development only), `ErrorBoundary.tsx:25` (`console.error` with the render error object) | low | No token, password or profile is logged. `ErrorBoundary` logs in production too, which is usual; the error object could include a GraphQL message | Keep; send to an error service if one is added | n/a |
| C8-9 | Other storage | `sessionStorage` (assistant chat, seat retry info, event-editor draft, clock skew), `localStorage` (locale, theme, demo-notice dismissal) | low | The event-editor draft and the assistant chat sit in `sessionStorage` (cleared when the tab closes). On a shared computer, the assistant chat keeps the previous member's messages until the tab closes; `libs/assistant/store.ts` stores an `owner` and so can drop them on member change (not verified) | Clear assistant and draft storage in `clearSession()` | small |
| C8-10 | Sign-up validation | `SignupForm.tsx` | low | Client checks are for convenience; the backend must enforce. Not reviewed here (backend repo) | none | n/a |

---

## C9. Missing basics for a public demo

| ID | Item | Path | Status | Severity | Proposed fix | Size |
|---|---|---|---|---|---|---|
| C9-1 | "No emails are sent" notice | `public/locales/*/common.json` `demo.notice`, `libs/components/common/DemoNotice.tsx` | Missing. The notice says only "payments are simulated, no real money is charged". Nothing tells a visitor that no confirmation, ticket or password-reset email will arrive. The help text says password reset is not available (`help.json:139`) and the contact address "may not be monitored" (`help.json:163`) | medium | Extend `demo.notice` (4 languages) and show the same sentence at sign-up and on the order confirmation page: "No emails are sent. Your tickets are in My tickets." | small |
| C9-2 | Page titles | `libs/components/common/Seo.tsx`, `LayoutBasic.tsx:21-24` | Good: every public page sets `<Seo>`; terms/privacy via `LegalDocument`. Gaps: `LayoutBasic` sets a default `<title>Ticketzy</title>` plus a non-standard `<meta name="title">`; `pages/account/join.tsx` (redirect page) has no `Seo`; dashboard pages set a title via `DashboardShell`/`EventEditor`/`VenueEditor` | low | Delete the `meta name="title"`; add `<Seo noindex>` to `join.tsx` | small |
| C9-3 | Meta descriptions | `Seo.tsx` | Optional prop; present on home, FAQ, about, legal, event pages. Login, signup and account pages pass `noindex` | low | Check `pages/events/index.tsx`, `contact.tsx`, `sell.tsx` each pass `description` | small |
| C9-4 | 404 / 500 | `pages/404.tsx`, `pages/500.tsx`, `ErrorBoundary`, `ErrorScreen` | Present, translated, `noindex`. `500.tsx` is static, so it works without the API. There is no `pages/_error.tsx` (Next falls back to `500` for SSR errors in production) | n/a | none | n/a |
| C9-5 | robots / sitemap | `pages/robots.txt.tsx`, `pages/sitemap.xml.tsx`, `libs/seo.ts`, `libs/site.ts` | Present: private prefixes disallowed in all four languages, sitemap with hreflang alternates, events paged (max 20 x 100). Cached 1 h. Falls back to static pages if the API is down | low | Add a timeout (C6-6). Check `STATIC_PATHS` lacks `/sell` (public page) | small |
| C9-6 | `NEXT_PUBLIC_SITE_URL` | `libs/site.ts:1` | Falls back to `http://localhost:3000`. If not set in production, canonical, hreflang, sitemap and Open Graph URLs all point at localhost, silently | medium | In production builds (`NODE_ENV === 'production'`) throw or log a loud error when it is unset or contains `localhost` (inside the C5-5 env module) | small |
| C9-7 | `NEXT_PUBLIC_CONTACT_EMAIL` | `libs/site.ts:4`, `pages/contact.tsx:34-39` | Falls back to `hello@ticketzy.demo`, a reserved-looking but unregistered domain; the page already says it is a sample | low | Fine for the demo; set a real inbox or hide the mailto when unset | small |
| C9-8 | Cold-start message | `libs/hooks/useWakeNote.ts`, `WakeNote.tsx`, `common.json` `wakeNote` | Present: after 4 s of a pending request while a skeleton is on screen, "Waking up the server, this can take up to a minute on the demo." Shown once per page load. Gaps: it appears only where `WakeNote` is mounted (`LayoutBasic`, `DashboardShell`); server-rendered pages block on `serverQuery` with no deadline (C6-6) so the wake note cannot show; query timeout is 20 s, so a 60 s cold start ends in an error state before the server wakes (retry then works) | medium | Raise the first query's timeout (or retry once on timeout) while `pendingStore` reports a wake; add the deadline in C6-6 | small |
| C9-9 | Web manifest and icons | `public/site.webmanifest`, `favicon.*`, `apple-touch-icon.png`, `icon-192/512.png`, `og-default.png` | Present (og image 18 KB) | n/a | none | n/a |
| C9-10 | Cookie / consent banner | n/a | None needed: only `localStorage` for token, theme, locale | n/a | State "no tracking cookies" in Privacy sample text if true | small |
| C9-11 | Screenshots | `README.md:15-24` | Link to files that do not exist | low | Add images or remove the table | small |

---

## C10. Tests and CI

What exists: **no tests of any kind**, no test runner in `package.json`, no `.github/` folder, no CI. The gates are `yarn typecheck`, `yarn lint`, `yarn i18n:check`, run by hand (all pass today). Accessibility (axe) and responsive checks are manual and recorded in `FRONTEND_COMPLETED_TASKS.md`.

| ID | Item | Severity | Proposal | Size |
|---|---|---|---|---|
| C10-1 | No CI | high (for a portfolio repo, a red/green badge is the first thing a reviewer looks at) | `.github/workflows/ci.yml` (below) | small |
| C10-2 | No unit tests | medium | Pure functions that are cheap to test and have caused bugs: `safeReturnTo` (C8-1), `isExpired`, `parseApiError`, `libs/seatAvailability.ts` thresholds, `libs/homeFeatured.ts` ranking, `libs/format.ts`, `libs/venues/model.ts` validation. Runner: Vitest (new dev dependency, ask) or Node's built-in `node --test` with `tsx`/ts transpile (also new). Without a new dependency: none | medium |
| C10-3 | No browser smoke tests | medium | 5-10 Playwright tests (new dev dependency, ask), listed below | medium |
| C10-4 | No automated axe | medium | `@axe-core/playwright` inside the smoke tests, light and dark (needs approval, AGENTS rule 5) | small |

**Smallest useful CI (no new dependency):**

```yaml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: yarn typecheck
      - run: yarn lint
      - run: yarn i18n:check
      - run: yarn build
        env:
          NEXT_PUBLIC_API_GRAPHQL_URL: http://localhost:3007/graphql
          NEXT_PUBLIC_API_WS_URL: ws://localhost:3007
          NEXT_PUBLIC_API_URL: http://localhost:3007
          NEXT_PUBLIC_SITE_URL: https://example.test
```

(The build needs no backend: pages are static or fetch in the browser; `serverQuery` returns `null` when the API is down. Verified in this audit's scratch build with the backend running; not verified with it off.) The Browserslist warning (C5-8) is harmless in CI.

**Smoke tests (Playwright, run against `yarn build && yarn start -p 3100` with a mocked GraphQL route or the seeded backend started by a second job step):**

1. Home renders hero, a rail, no console errors.
2. `/events` filters write to the URL.
3. Event detail renders title and ticket panel for a seeded event.
4. Sign-in with a seed buyer, then `/orders` loads; wrong password shows the inline error (guards C3).
5. Expired-token redirect: set a past-`exp` token in `localStorage`, open `/orders`, expect login with the expired message (after C3).
6. Organizer and admin see the Follow hint, not the button (C7).
7. `returnTo=%2F%09%2Fevil.com` stays on the site (C8-1).
8. 404 page renders with the right status.
9. Language switch keeps the path, `<html lang>` changes.
10. axe on home, events, login in dark and light: zero serious violations.

Tests 4-6 need the backend with seed data, so run them in a second job that checks out the `ticketzy` repo and seeds MongoDB (service container); tests 1-3, 7-9 can run against mocked routes.

---

## Counts

| Severity | Count |
|---|---|
| high | 5 |
| medium | 32 |
| low | 54 |

(6 rows with severity "n/a" (C1-14, C3-7, C7-13, C9-4, C9-9, C9-10) record things that were checked and are fine; they are not counted. Total 91 findings.)

## What was not tested

- Checkout page in the browser (needs a live seat hold); the dev console there was not read.
- An expired token on each page (C3-4 is read from code, not run).
- The `returnTo` tab bypass end to end in a browser (C8-1 checked with Node's URL parser and Next's `isLocalURL` use in `router.js`, not run through the login form).
- The favicon preload and picsum LCP warnings did not appear in this run (C6-2, C6-3 are from code).
- A production build with the backend off; a bundle analyzer; unused keys in `public/locales`; contrast of disabled inputs; the dependency tree for unused transitive packages; the git history size contribution of `public/img` beyond the 89 MiB pack total.
- Backend rules (not opened).
