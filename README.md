# Ticketzy (frontend)

> **한국어 요약 (Korean summary)**
> Ticketzy는 콘서트, 축구, 코미디 이벤트를 위한 티켓 판매 사이트의 프런트엔드로, **포트폴리오용 데모 프로젝트**예요. 실제 회사가 아니고 실제 티켓을 판매하지 않으며, 결제와 정산은 모두 모의로 처리돼요. 구매자는 좌석 지도에서 좌석을 고르고(120초 홀드, 최대 8석), QR 티켓을 받고, 공연 전날 23:59(공연장 현지 시간)까지 환불할 수 있어요. 주최자는 공연장 좌석 배치를 만들고, 이벤트를 게시하고, QR로 체크인해요. 관리자는 주최자와 이벤트를 승인하고 수수료를 관리해요. 영어, 한국어, 러시아어, 우즈베크어와 라이트/다크 테마를 지원해요. 기술 스택은 Next.js(Pages Router), Apollo Client(GraphQL), MUI, SCSS, next-i18next이고 패키지 관리자는 Yarn만 사용해요. 실행하려면 백엔드(`http://localhost:3007`)를 켠 뒤 `yarn install`, `yarn dev`를 실행하세요.

Ticketzy is the web client of an event ticketing site for concerts, football matches and comedy shows. Buyers pick seats on a live map, pay and get QR tickets. Organizers design venues, publish events and check people in. Admins approve organizers and events and manage commission.

**This is a portfolio project.** Ticketzy is not a company and sells no real tickets. Payments, refunds and payouts are simulated: no real money is charged or sent. The Terms and Privacy pages are sample text, not legal advice.

The backend (NestJS, GraphQL, MongoDB) lives in a separate repository, `ticketzy`. This repository is only the frontend.

## Screenshots

Placeholders: add real images to `docs/screenshots/` and link them here.

| | |
|---|---|
| ![Home](docs/screenshots/home.png) <br> Home (placeholder) | ![Event detail](docs/screenshots/event.png) <br> Event detail (placeholder) |
| ![Seat picker](docs/screenshots/seats.png) <br> Seat picker (placeholder) | ![Checkout](docs/screenshots/checkout.png) <br> Checkout (placeholder) |
| ![Organizer dashboard](docs/screenshots/organizer.png) <br> Organizer dashboard (placeholder) | ![Venue editor](docs/screenshots/venue-editor.png) <br> Venue layout editor (placeholder) |

## Features

### Buyer

- Browse and filter events (category, city, date, price, search, sort); the filters live in the URL.
- Event page with images, translated title and description, ticket types, organizer, likes and comments.
- Seat picker: zoomable seat map, section list, seat grid operable with the keyboard, a hold of 120 seconds (server setting) and at most 8 seats per order, with a live countdown. Events without seat numbers use a ticket-type picker.
- Checkout with simulated payment, order confirmation, order history and per-order refunds until 23:59 on the day before the event in the venue time zone.
- Tickets with QR codes, a PDF download (one ticket per page, or all unused tickets at once), calendar file, saved events, followed organizers, notifications.
- Home page sections, an AI assistant widget, and four languages (English, Korean, Russian, Uzbek) with a light and a dark theme.

### Organizer

- Sign-up and verification flow, with a pending-account banner until an admin approves.
- Dashboard with sales, revenue chart, commission and payout figures; analytics, attendees and payouts pages.
- Event editor (details, translations, tickets, venue, images, review) and submit-for-approval; cancel an event with a reason.
- Venue layout editor on a canvas: sections, rows, standing areas, templates, undo and redo.
- QR check-in with the camera or a typed code; orders per event; public organizer profile.
- Real-time messaging with the admin team.

### Admin

- Approve, reject, suspend and reinstate organizers; approve, reject and cancel events (with seat generation on the backend).
- Members, orders, commission tiers and per-organizer overrides, audit-aware actions.
- Messaging with organizers.

## Tech stack and why

| Piece | Why |
|---|---|
| Next.js 14, Pages Router | File-based routes, static generation for translations, per-page head tags; the project was migrated from a Pages Router codebase, so the structure was kept. |
| React 18 + TypeScript | Typed props and GraphQL results; `yarn tsc --noEmit` is the gate after each phase. |
| Apollo Client (GraphQL) | The backend is GraphQL only; the cache, `refetch` and error handling are shared by every page. |
| MUI 5 (+ Emotion) | Accessible primitives for menus, dialogs, drawers and buttons, themed from the design tokens. |
| SCSS + CSS custom properties | `scss/tokens.css` holds the design tokens for the dark and light themes; page styles use the `tz-` and page-prefixed classes from the design export in `design/`. |
| next-i18next | One JSON namespace per page group in four languages, loaded per page. |
| Phosphor icons | Consistent icon set that matches the design. |
| `html5-qrcode`, `qrcode` | Camera scanning for check-in and QR rendering for tickets. |
| Native WebSocket | A single small socket for messaging, so no extra client library is needed. |
| Yarn | The only package manager used in this project. |

## Architecture

- **Pages** (`pages/`): one file per route. Each page wraps itself in a layout (`withLayoutBasic` for public and buyer pages, `withOrganizerLayout` / `withAdminLayout` for the dashboards) and loads its translation namespaces in `getStaticProps`.
- **Apollo** (`apollo/`): the client (`client.ts`) attaches the token and handles auth errors; queries, mutations and fragments are grouped by area (`user`, `organizer`, `admin`). Pages call `useQuery` and show an inline error state with a retry button when a query fails.
- **Auth** (`libs/auth/`): the JWT is kept in local storage, the profile is loaded with `getMember`, and `useRequireAuth` / `useRequireRole` guard pages and redirect with a safe `returnTo`.
- **i18n** (`public/locales/<lang>/<namespace>.json`, `libs/i18n.ts`): `en`, `ko`, `ru`, `uz`; the choice is remembered in local storage. Event titles and descriptions come translated from the API with a fallback to English.
- **Design tokens** (`scss/tokens.css`, `design/`): colors, type, spacing, radii and shadows as CSS variables. Dark is the default; `data-theme="light"` on `<html>` switches the theme (set before first paint by `_document.tsx`).
- **Seat map and layout editor** (`libs/components/seats/`, `libs/components/organizer/venues/`, `libs/venues/`, `libs/seats/`): the buyer map and the organizer editor share the layout model; the editor has undo and redo, templates and server-side validation messages.
- **Real-time messaging** (`libs/messaging/`): one WebSocket authenticated with the token in its first message, reconnect with backoff, and polling as a fallback while it is closed.
- **AI assistant** (`libs/assistant/`, `libs/components/assistant/`): a floating chat that calls the `askAssistant` mutation; the conversation is kept in session storage only.
- **SEO and static pages**: `libs/components/common/Seo.tsx` writes title, description, Open Graph, Twitter, canonical and hreflang tags; `pages/robots.txt.tsx` and `pages/sitemap.xml.tsx` serve `/robots.txt` and `/sitemap.xml` (built in `libs/seo.ts`). Private pages set `noindex`.
- **Errors**: `pages/404.tsx`, `pages/500.tsx` and a React error boundary around the page in `_app.tsx`.

## Setup and run

Yarn only (do not use npm or pnpm).

```bash
yarn install
cp .env.example .env.local   # then adjust the values
yarn dev                     # http://localhost:3000
```

The backend must be running (default `http://localhost:3007/graphql`). To fill it with demo data, run the seed commands of the backend repository (`npm run seed` for the first admin and `npm run seed:demo` for demo members, venues, events and orders).

### Environment variables

`NEXT_PUBLIC_*` values are copied into the browser bundle when you run `yarn build`, so set them in the build environment (or `.env.production`) before building, and never put a secret in one. `yarn build` stops with a message naming every required variable that is missing. In development the local values from `.env.example` are used; in production nothing falls back to localhost.

| Variable | Meaning | Production | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_GRAPHQL_URL` | GraphQL endpoint of the backend | required | `https://api.your-domain/graphql` |
| `NEXT_PUBLIC_API_WS_URL` | WebSocket address of the backend (messaging) | required | `wss://api.your-domain` |
| `NEXT_PUBLIC_API_URL` | Backend base address, used for uploaded image paths | required | `https://api.your-domain` |
| `NEXT_PUBLIC_SITE_URL` | Public address of this site: canonical links, hreflang, `sitemap.xml`, `robots.txt` | required | `https://your-domain` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Mailbox shown on the contact page; a sample address on a demo domain is shown without it | optional | `hello@your-domain` |

### Demo accounts

The backend demo seed creates these members (emails only):

- Buyer: `buyer@ticketzy.demo`
- Organizer: `organizer@ticketzy.demo`

Passwords come from the output of the backend seed command and are never committed to this repository. The first admin is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the backend `.env`.

### Scripts

| Script | What it does |
|---|---|
| `yarn dev` | Development server on port 3000 |
| `yarn build` | Production build |
| `yarn start` | Serve the production build |
| `yarn lint` | ESLint (`next lint`) |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn i18n:check` | Scans the locale files and the code for missing keys, placeholder mismatches and namespaces a page does not load |
| `yarn check:return-to` | Checks the `returnTo` redirect guard against a list of safe and unsafe values |

## Project structure

```
apollo/            Apollo client, queries, mutations, fragments (user, organizer, admin)
design/            Design export: tokens, components, page mock-ups
docs/ai/           Migration notes: DECISIONS.md, FRONTEND_COMPLETED_TASKS.md, GraphQL schema
libs/
  auth/            Token storage, session, route guards
  components/      UI by area: layout, common, events, seats, account, organizer, admin, messages, assistant, static
  hooks/           Shared hooks (auth, filters, URL state, unread counts)
  messaging/       WebSocket and conversation helpers
  seats/ venues/   Seat-map and venue-layout logic
  organizer/ admin/ account/   Page logic, formatting and error mapping per area
  site.ts, seo.ts  Site URL, locales and the rules quoted in the help pages; robots.txt and sitemap.xml builders
pages/             Routes (Pages Router), including robots.txt and sitemap.xml
public/            Icons, manifest, and locales/<lang>/<namespace>.json
scss/              Tokens and styles per area
```

## Key decisions

All decisions, with the reasons and the alternatives, are in [docs/ai/DECISIONS.md](docs/ai/DECISIONS.md); finished work is logged in [docs/ai/FRONTEND_COMPLETED_TASKS.md](docs/ai/FRONTEND_COMPLETED_TASKS.md). The backend rules the UI follows are described in the backend repository (`docs/ai/DECISIONS.md`): refunds until 23:59 on the day before the event in the venue time zone, a short seat hold, at most 8 seats per hold, and a commission that is taken from the organizer payout and never added to the buyer price.

## Working with AI tools

This repository is set up so AI coding tools and people follow the same rules.

- [AGENTS.md](AGENTS.md) is the main guide: stack, roles, commands, working rules, design rules and key files.
- [CLAUDE.md](CLAUDE.md) imports AGENTS.md and adds a few Claude Code notes.
- [docs/ai/NESTAR_FRONTEND_COMPARISON.md](docs/ai/NESTAR_FRONTEND_COMPARISON.md) compares this frontend with the Nestar frontend it was migrated from: what was kept, extended or replaced, and why.
- [docs/ai/DECISIONS.md](docs/ai/DECISIONS.md) is the numbered decisions log (F1, F2, ...) with the reason for each; [docs/ai/FRONTEND_COMPLETED_TASKS.md](docs/ai/FRONTEND_COMPLETED_TASKS.md) records what was done and how it was verified.
- Skills (reusable instruction packs) live in `.agents/skills`, are linked into `.claude/skills` and are pinned in `skills-lock.json`; [docs/ai/SKILLS.md](docs/ai/SKILLS.md) lists them. Two project skills, `ticketzy-ui` and `ticketzy-frontend-workflow`, encode this repo's own rules.
- Decisions and the design tokens override skills. Skill scripts that download or run programs need explicit approval each time, and work is not committed unless the owner asks.

## Known limitations

- Payments, refunds and payouts are simulated; there is no real payment provider.
- No password reset and no self-service account deletion.
- Admin pages need an admin account created through the backend seed.
- The sitemap and `robots.txt` are generated on request (cached for an hour) and need the backend to list events.
- The contact page shows a sample address unless `NEXT_PUBLIC_CONTACT_EMAIL` is set; there is no contact form on purpose.
- Terms and Privacy are sample text for a demo and not legal advice.
- Automated accessibility checks cover the main pages; see `docs/ai/FRONTEND_COMPLETED_TASKS.md` for the latest results and remaining items.

## Deployment

Placeholders, to be filled in when a host is chosen:

- Hosting: `<hosting provider>`
- Production URL: `<https://your-domain>` (set `NEXT_PUBLIC_SITE_URL` to it)
- API: `<https://api.your-domain/graphql>` and `<wss://api.your-domain>`
- Build command: `yarn build`; start command: `yarn start`
- Set the four required variables of the table above in the host's build environment (`NEXT_PUBLIC_*` values are read at build time).
- The backend may run on a free host that sleeps: the first requests can take up to a minute, and the site shows a dismissible "demo server is waking up" message meanwhile.

## License

MIT, see [LICENSE](LICENSE).
