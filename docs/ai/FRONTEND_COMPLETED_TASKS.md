# Frontend completed tasks

## Prompt 0: cleanup (2026-10-08)
Goal: turn the Nestar app into a clean, compiling shell for Ticketzy. No Ticketzy features yet. Not committed.

### Deleted
- Pages: `property`, `agent`, `community`, `member`, `mypage`, `cs`, `about`, `_admin` (all).
- Components: everything under `libs/components` except `Top`, `Footer`, `layout/*` and `admin/AdminMenuList` (rewritten as a placeholder). This includes `Chat`, `common/FiberContainer` and the homepage, property, agent, community, member, mypage, cs and admin sub-pages components.
- Types: all of `libs/types` except `customJwtPayload.ts`. Enums: board-article, comment, like, notice, notification, property, view, common.
- `libs/utils.ts` (only Nestar like handlers and an unused number formatter).
- Apollo: `apollo/admin/*`, `apollo/user/query.ts`; `apollo/user/mutation.ts` cut to `SIGN_UP` and `LOGIN`.
- Assets: `public/img/property`, `public/img/community`, `public/img/fiber` (FiberContainer only), `public/video` (Advertisement only).
- SCSS: page styles for homepage, property, agent, mypage, community, cs, about, account, member. Kept `variables`, `reset`, `app`, `MaterialTheme`, `pc/general`, `pc/admin`, `mobile/*`.
- Dependencies (53 deps, 10 devDeps), among them: react-scripts, valtio, styled-components, subscriptions-transport-ws, apollo-link-token-refresh, three, @react-three/*, @pmndrs/branding, @toast-ui/*, axios, @types/axios, moment, numeral, swiper, react-slick, chart.js, notistack, js-cookie. Each was re-checked with an import grep over `libs`, `pages`, `apollo`, `scss` and the config files.

### Changed
- `package.json`: name `ticketzy-next`, TypeScript `^5.4.5`, eslint `^8.57`, eslint-config-next `14.2.0`, added a `typecheck` script. Next, React, MUI and Apollo majors untouched.
- `.eslintrc.json` (`next/core-web-vitals`). `yarn lint` is clean.
- Env: `NEXT_PUBLIC_API_GRAPHQL_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_API_URL`. `next.config.js` no longer maps `REACT_APP_*`. `libs/config.ts` exports `NEXT_PUBLIC_API_URL`. `.env.example` added.
- `apollo/client.ts`: HTTP only (error link, Bearer auth link, upload link). Removed the WebSocket link, `LoggingWebSocket`, token refresh stub, `console.warn`, dead comment block, SweetAlert on errors (errors are logged in development only). `socketVar` removed from `apollo/store.ts`.
- i18n: locales `en, ko, ru, uz`, default `en`. `kr` renamed to `ko`; `uz` created with the same keys. Language menu in `Top` has `uz`; `langkr.png` renamed `langko.png`; `languz.svg` added.
- Layouts: `LayoutHome`, `LayoutBasic`, `LayoutFull` reduced to one shared shell (Head, Top, main, Footer). `LayoutAdmin` kept, `ts-ignore` removed.
- `Top` and `Footer` cleaned of Nestar links and copy. `_document` SEO text rebranded.
- `pages/index.tsx` and `pages/account/join.tsx` are placeholders.
- TypeScript: the original tsc error (in `pages/property/detail.tsx`) disappeared with the file; two errors introduced by my own edit were fixed. All `ts-ignore` removed (`_app`, `LayoutAdmin`, `MaterialTheme/styled`, Apollo client).

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (`/`, `/account/join`, 404). `yarn dev`: `/`, `/account/join`, `/ko`, `/uz`, `/ru` return 200 with the placeholder.

## Prompt 1: theme, layouts, Apollo and auth (2026-10-08)
Goal: Ticketzy theme and layouts from `design/`, Apollo auth, and login/signup against the real schema. Not committed.

### Schema
- `docs/ai/schema.json`: introspection of `http://localhost:3007/graphql`. Auth operations used, with their real names: `login(input: LoginInput{memberEmail, memberPassword})`, `signupUser` / `signupOrganizer(input: MemberInput{memberEmail, memberPassword, memberNick?, memberPhone?, memberFullName?})` (all return `Member` with `accessToken`), `getMember(memberId)`.
- Errors arrive as `{ code, message }` at the top level of each GraphQL error. Wrong password and a rejected/suspended account **both have code `UNAUTHENTICATED`**: only the message differs ("Incorrect email or password!" vs "Your account was not verified. Please contact support."), so the UI maps known messages and falls back to the server text.

### Theme
- `scss/tokens.css` and `tokens.json` copied from `design/tokens`, imported first in `_app`. Dark by default, `data-theme="light"` for light; toggle persisted in `localStorage` (`ticketzy-theme`) and applied before first paint by an inline script in `_document`.
- `scss/MaterialTheme/index.ts` is now `getTheme(mode)`: palette from `tokens.json`, component overrides (button, input, menu, checkbox, drawer, avatar...) use the CSS variables. `palette.type` fixed to `palette.mode`. `libs/theme/ThemeModeProvider.tsx` owns the mode.
- Fonts: Onest, Noto Sans KR, JetBrains Mono via `next/font/google`, exposed as `--font-onest` etc. and wired into `--font-sans` / `--font-mono` in `scss/app.scss`.
- New styles: `scss/app.scss` (base, fields, alert), `layout.scss` (navbar, footer, dashboard shell), `auth.scss`, `home.scss`. All read tokens only.

### Layouts and shell
- `Top`, `Footer` rebuilt from the design (brand with Volt dot, Events link, language menu, theme toggle, Log in / Sign up or avatar menu with role-based links; footer columns, legal line, segmented language switcher). Below 768px the links and auth buttons move into a menu.
- `LayoutBasic` is the public layout (skip link, `Top`, pending-organizer banner, `main`, `Footer`). `LayoutHome` and `LayoutFull` now re-export it.
- `LayoutAdmin.tsx` extended: default export `withAdminLayout`, named `withOrganizerLayout`, both built by `libs/components/dashboard/DashboardShell.tsx` (sidebar, mobile drawer, top bar, role badge, role guard). Nav items in `dashboard/nav.tsx`.
- Placeholder pages: `/organizer` and `/admin` (shell only), `/404`, `/account/join` (redirects to login).

### Apollo and auth
- `apollo/client.ts`: HTTP + upload link, Bearer auth link, error link without popups (dev logging only). Token helpers moved to `libs/auth/token.ts`.
- `libs/errors.ts`: `parseApiError` returns `{ code, message }` from Apollo errors; callers decide what to show.
- `libs/auth/index.ts` rewritten: `logIn`, `signUp(role, input)`, `restoreSession`, `clearSession`/`logOut` (no page reload). After login or signup the token is stored and the profile loaded with `getMember` into `userVar` (`MemberProfile | null`); `authReadyVar` says when the first restore finished. Session restore runs once in `_app` and on cross-tab `storage` events.
- `libs/auth/guards.tsx`: `useRequireAuth(roles?)`, `useRequireRole(...)`, `withAuth(Component, roles?)`. Logged out goes to `/account/login?returnTo=<path>`; wrong role goes to that member's home. `returnTo` accepts same-site paths only (`safeReturnTo`).
- Pages `/account/login` and `/account/signup` (role cards act as tabs, buyer / organizer). Server errors are shown inline; organizer signup ends in the "awaiting approval" panel; PENDING organizers see a banner in every layout.

### i18n
- Namespaces `common` and `auth` in en, ko, ru, uz, same keys in all four (checked by script). Old Nestar keys removed. Uzbek is real Latin text with `ʻ` (U+02BB).

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (fonts fetched). `yarn dev`: all routes 200.
- Browser against the live backend: wrong password (inline error), `buyer@ticketzy.demo` login (redirect home, avatar menu, session survives reload), logout without reload, `rejected@ticketzy.demo` ("Your account was not verified. Please contact support."), `pending@ticketzy.demo` (login with `returnTo`, organizer shell, banner, locked Create event), buyer opening `/organizer` (sent home), logged-out `/admin` (sent to login with `returnTo`), duplicate-email signup (translated error, nothing created), client-side validation, ru/ko/uz pages, dark/light with persistence across reload, 390px layouts (home, login, signup, organizer shell).
- **Not tested**: a successful signup (it would create a record in the dev database), the ADMIN shell (no admin credentials given), the language switcher menu click (languages were checked by URL), the `uz` shell and the footer segmented switcher visually.

### Left in place (unused now, safe to delete)
`scss/pc/`, `scss/mobile/`, `scss/reset.scss`, `scss/variables.scss`, `scss/MaterialTheme/{shadow,typography,styled}.ts`, `libs/components/admin/AdminMenuList.tsx`, `libs/hooks/useDeviceDetect.ts`, `libs/types/customJwtPayload.ts`. A bulk delete was blocked in this session, so nothing was removed. `libs/sweetAlert.ts` is also unused now but is kept for later phases.
