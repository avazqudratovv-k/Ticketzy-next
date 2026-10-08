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
