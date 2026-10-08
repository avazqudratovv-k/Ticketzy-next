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

## Prompt 2: public pages (2026-10-08)
Goal: Home, events list, event detail, organizer profile and the shared pieces, against the real schema. Not committed.

### Operations used (exact names, from `docs/ai/schema.json`)
`getEvents(input: EventsInquiry)` (search: `text`, `categoryList`, `cityList`, `pricesRange`, `periodsRange`, `organizerId`; sort whitelist `createdAt, updatedAt, eventLikes, eventViews, eventRank, eventMinPrice, startAt`), `getEvent(eventId)`, `getTicketTypes(eventId)`, `getVenues` (for the city list), `getOrganizers`, `getMember` (organizer profile), `getComments(input)`, `createComment`, `updateComment` (status DELETE removes a comment), `likeTargetEvent`. Documents are in `apollo/user/query.ts`, `mutation.ts`, `fragments.ts` (`EVENT_CARD_FIELDS`).

### Added
- Pages: `/` (hero = most viewed event, three compact cards, category tiles, upcoming grid, Concerts / Football / Comedy sections, organizers and a sell-tickets block), `/events` (search, category, date range, city, price range, sort, numbered pagination, empty / error / skeleton states, filters as a collapsible panel below 1024px), `/events/[id]`, `/events/[id]/seats` (placeholder), `/organizers/[id]`.
- Shared: `EventCard` (+ row variant and skeletons), `EventImage`, `CategoryChip`, `Pagination`, `StateBlock` (empty / error), `Seo` (title, description, Open Graph, Twitter card, `noindex` for hidden pages), `LikeButton`, `Comments`, `TicketPanel`, `OrganizerAvatar`, `libs/format.ts` (price, date, time, zone name, refund day), `libs/events.ts` (categories, sort keys, `localizedEvent`, `saleState`), `libs/hooks/useEventFilters.ts` (URL query state), `libs/serverFetch.ts`.
- `scss/events.scss` (tokens only, light and dark).
- i18n: new `events` namespace in en, ko, ru, uz (same keys, plural forms where the language needs them). `common.json`: `nav` categories added, `footer` categories added, Nestar-era `home` block and the dead footer keys removed.
- Nav and footer: the top bar has Events, Concerts, Football, Comedy (the three categories only from 1024px); the footer links go to category filters. FAQ, Contact, About, Terms and Privacy links were removed (no pages).
- Event detail: image gallery, title and description in the active language (fallback EN, then the base fields), date and time in the venue's time zone with the zone name, venue block with "Open in maps", ticket types with KRW prices and availability, refund policy line (23:59 the day before, venue zone), organizer card, view / like / comment counts, like toggle, comments (list, post, delete own with an inline confirm), states for cancelled, ended, sold out, sales not started and sales closed.
- SEO: `getServerSideProps` on the detail and organizer pages fetches the title, description and image anonymously so the tags are in the HTML in the requested language; the removed static description in `_document` stopped duplicating the page one.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds.
- Browser against the live backend (dev server and a production start): home; list with `?q=comedy` (no title match, offers the Comedy category), category, city menu, sort, page 2 of a sort (page size temporarily 3, set back to 12), reload and shareable URLs; event detail in en, ko, ru, uz (date, price, refund text and plurals checked); like, comment, delete own comment as `buyer@ticketzy.demo`; cancelled (`Winter Ballad Tour: Hanbit`) and ended (`Spring Stand-Up Showcase`) events opened as `organizer@ticketzy.demo`; the same cancelled event logged out gives the "Event not found" state; organizer page; 390 and 768 px layouts (in iframes, the window cannot be resized below the screen) and the light theme.
- **Not tested**: sold-out and "sales not started" banners (no demo event is in that state; the logic is `saleState` in `libs/events.ts`), the 4-language organizer page, 768px after the final navbar fix, the share link of Open Graph in a real crawler, keyboard-only use of the filter panel.

### Backend behaviour found (not changed, backend is read-only)
- `getEvents`, `getEvent`, `getTicketTypes` show only APPROVED events to the public. CANCELLED and ENDED events are `NO_DATA_FOUND` for visitors and buyers; only the owner and admins can open them. The cancelled / ended states exist in the UI but a buyer never reaches them today.
- `getEvents` text search matches the base `eventTitle` only, not translated titles, categories or venues.
- `eventComments` is not lowered when a comment is deleted through `updateComment`; the page shows the live list total instead.
- `Member.memberEvents` counts every event of an organizer (12 for the demo organizer), not only the public ones (7).
- `eventRank` is 0 for all demo events, so "popular" uses `eventViews`.

## Prompt 3: seat picker, hold, checkout, confirmation (2026-10-08)
Goal: buy seats (RESERVED) or tickets (GENERAL) with the 30 second hold. Not committed.

### Small changes first
- Comment limit is now 500 (backend DECISIONS #66). The "Show all Comedy events" button and its `keywordCategory` code, and the `list.tryCategory` strings in all four languages, are removed (backend DECISIONS #65 search now covers translations, category, venue, city, organizer).
- `docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`.

### Operations used (exact names from the schema)
`getSeatConfig`, `getEventSeatMap(eventId)`, `holdSeats(eventId, seats: [SeatRefInput{sectionKey,row,number}])`, `releaseSeats(eventId)`, `createCheckout(input: {eventId, seatIds | items})`, `payOrder(orderId, simulate: SUCCESS | FAILURE)`, `cancelPendingOrder`, `getOrder`, `getMyOrders(orderStatus: PENDING_PAYMENT)`, `getMyTickets`, `getTicketTypes` (now with `tierKey`). Documents are in `apollo/user/query.ts` and `mutation.ts`.

### Added
- Pages: `/events/[id]/seats` (map for RESERVED, quantity selector for GENERAL), `/checkout/[orderId]`, `/orders/[orderId]/confirmation`, `/orders` (placeholder).
- `libs/seats/`: `types`, `layout` (geometry of the 1000x700 layout, tiers), `errors` (the ONE message-to-translation map), `clock` (server clock skew, countdown), `checkout` (hold then order), `retry`. `libs/hooks/useSeatMap` (polling), `useSessionWatch`.
- `libs/components/seats/`: `SeatMap` (SVG, zoom and pan), `SectionList` (+ `SeatGrid`, real buttons for keyboards), `SeatSummary` (sticky card, bottom sheet on phones), `Countdown`, `Steps`, `OrderSummary`, `SeatPicker`, `GeneralPicker`. `scss/seats.scss`.
- i18n: new `checkout` namespace in en, ko, ru, uz (same keys, plural forms per language, checked by script).

### Behaviour
- Seat map: seats drawn from `venueLayout` (rows x seatsPerRow, spacing, rotation); states available / selected / held (someone else) / mine (my hold) / sold / locked (ticket type not on sale); tooltip, wheel / pinch / button zoom, drag to pan, fit; STANDING sections are read-only ("Standing area, not sold online in this demo"); keyboard users pick a section from the list and get its seats as buttons.
- Polling every 3 s while the tab is visible, paused when hidden, immediate refresh on focus, stale answers ignored, back-off 3, 6, 12, 24, 30 s on errors; "Live" badge. A selected seat that becomes taken is dropped and named in an alert.
- Continue = `holdSeats` then `createCheckout`, then `/checkout/[orderId]`; double submit blocked. A conflict refreshes the map and names the seats that were lost. Max seats and hold seconds come from `getSeatConfig`.
- Countdown from the server deadline, corrected with `serverTime` (kept in sessionStorage for reloads). At 0 the selection is released in the UI with a message.
- Checkout: order summary, demo payment panel (disabled sample fields, "no real card data"), "Simulate a failed payment" checkbox, Pay. Success goes to the confirmation page. Failure shows a retry state; expiry shows an expired state; a hold replaced by another tab shows "no longer held".
- Reload: the seat page restores my held seats from `getEventSeatMap` (`mine`) and offers to resume a pending order; the checkout page reloads the order and seat names from the server.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds.
- Browser against the live backend as `buyer@ticketzy.demo`, with `crowd@ticketzy.demo` acting through the API: login redirect with returnTo; map render (hall, club, stadium with standing area and rotated sections); select and remove seats; seat conflict (crowd held a selected seat, message names it, seat dropped); poll update within 4 s when crowd held a seat; hold then checkout with countdown; failed payment, retry (new hold and order), successful payment and confirmation; reload mid-checkout (countdown continues, seat name restored); hold expiry on the seat page (message) and on the checkout page after a reload (expired state); two-tab case (same buyer held another seat: checkout shows "no longer held"); restore of held seats on the seat page after a reload; GENERAL event (quantity, checkout, failed payment, retry, success); token expiry (redirect to login with returnTo); mobile (500 px bottom sheet) and desktop; Korean.
- **Not tested**: ended and cancelled events (the backend hides them from buyers, so the page shows "Event not found"); sold-out section and "all seats gone" banners (no event in that state); `uz` and `ru` pages visually (keys are checked by script); light theme; pinch zoom (needs touch); a real keyboard-only run through the section list; the hold released on in-app navigation (written, not exercised).
- Test setup note: port 3000 already ran an old production build and the backend allows only that origin for CORS, so the checks ran on a second dev server (port 3100) from a scratch copy with a `/gql-proxy` rewrite. Nothing of that is in the repo.

## Prompt 4: buyer account area

### Added
- Account shell (`libs/components/account/AccountShell.tsx`, HOC `withAccount`, guarded with `useRequireAuth`): sidebar on desktop, scrolling tab strip on phones. Routes follow the design: `/tickets`, `/tickets/[ticketId]`, `/orders`, `/orders/[orderId]` (replaces the placeholder), `/notifications`, `/settings` (Profile), `/account/saved` (Likes, `getFavorites`), `/account/following` (`getMemberFollowings`). The avatar menu links (My tickets, Orders, Settings) now use `ROUTES`; a Notifications item was added.
- Orders: list with status filter (`orderStatus`), newest first, pagination, loading, empty and error states, venue-zone event date. Detail: event, tickets with seats and per-ticket state, total, payment line, refund panel.
- Tickets: Upcoming/Past tabs with counts (`getMyTickets(timeFilter)`), ticket cards, ticket detail with QR (`qrcode` library, drawn from the `qrToken` the backend returns, black on white), valid / used / refunded / cancelled / expired states, full-screen white scan view, "Add to calendar" (.ics built client-side, UTC times), ticket stepper for the other tickets of the order.
- Refund (`RefundPanel`): `getRefundQuote` for PAID orders (deadline in the venue zone with GMT offset, amount in KRW, reason when not eligible), confirmation dialog with the amount and an optional note, `requestRefund`, then refetch of order, tickets, quote and bell. Server messages are mapped to translations in `libs/account/refund.ts`; unknown messages show as sent.
- Notifications: bell in the header and in the organizer/admin top bar (`getUnreadNotificationCount` polled every 30 s while the tab is visible, stopped when hidden, refetch on return), dropdown with the latest 6, page with All/Unread, pagination, mark one (opening a row) and mark all as read.
- Profile: nickname, full name, phone, avatar (`imageUploader(target: "member")` then `updateMember`; PNG/JPG only, 5 MB, preview), member type and status, logout. Email is read-only.
- i18n: new `account` namespace and `bell`/`notifications` keys in `common`, en, ko, ru, uz (key parity checked by script, plural forms per language). Dates via `formatEventDate` (venue zone) or the new `formatViewerDate` (viewer zone, for purchase and notification times).
- `apollo/client.ts`: the upload link now sends `apollo-require-preflight: true`; without it Apollo Server's CSRF protection rejects multipart uploads (400).
- Dependency: `qrcode`, `@types/qrcode` (Yarn). `docs/ai/schema.json` re-fetched (no schema change since the last prompt).

### Operations used (exact names)
`getMyOrders`, `getOrder`, `getRefundQuote`, `requestRefund`, `getMyTickets`, `getTicket`, `getTicketTypes`, `getVenue` (aliased, one request), `getMyNotifications`, `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`, `getFavorites`, `getMemberFollowings`, `updateMember`, `imageUploader`.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (run in a scratch copy with `node_modules` linked, so the running dev server's `.next` was not touched).
- Browser on the real dev server (`http://localhost:3000`, light theme) as `buyer@ticketzy.demo`: orders list and detail; ticket list, detail and QR (the rendered image was decoded with the browser's `BarcodeDetector` and equals the backend token exactly); `.ics` content checked; full-screen QR; refund of an eligible order (22,000 KRW: dialog, success, order and ticket turned Refunded, a REFUND_COMPLETED notification arrived and the bell count rose); a not-eligible order (checked-in ticket: backend reason shown, no button); bell dropdown, open-to-read, Mark all as read, notifications page; profile edit with phone and an avatar upload (header avatar updated). 390 px was checked in a 390 px iframe of the same dev server (tickets, ticket detail, order detail, bell); Russian was checked on the order detail.
- **Not tested**: ko and uz pages visually (keys checked by script); dark theme; the "already refunded" outcome (the button is hidden for refunded orders, so only a race can reach it); the avatar type/size error messages; `/account/saved` and `/account/following` with data in a browser (they compile and the queries match the schema); pagination beyond one page of tickets (demo buyer has 14 tickets, page size 12, only page 1 of Upcoming was seen).

## Prompt 5: organizer events (2026-10-08)
Goal: organizer dashboard, events list, create and edit form with ticket types, translations and AI suggestions, submit for approval, cancel. Not committed.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql` (no change in the SDL since Prompt 4; the file is minified as before).

### Operations used (exact names)
`getMyEvents(input: OrganizerEventsInquiry{page, limit, sort, direction, search{eventStatus}})`, `getEvent`, `createEvent`, `updateEvent`, `submitEventForApproval`, `getTicketTypes`, `createTicketType`, `updateTicketType`, `getVenues`, `getVenue`, `translateEvent(input{eventId, targetLocales})`, `imageUploader(target: "event")`, `getMyEarnings`. Documents: `apollo/organizer/query.ts` and `mutation.ts`.

### Cleanup from Prompt 4
Order and ticket queries now read `eventData.venueData`; `useVenues`, `venuesByIdQuery` and the `getMyOrders` / tickets fallbacks for the order event are removed (F92).

### Added
- Pages: `/organizer` (dashboard), `/organizer/events`, `/organizer/events/new`, `/organizer/events/[id]/edit`.
- Libraries: `libs/organizer/` (`types`, `events` status and action rules, `form` validation and input builders, `useEventEditor`, `useListState`, `zoned`, `images`, `errors`), `libs/hooks/useUnsavedGuard`, `libs/components/organizer/` (status badge, blocked panel, submit and cancel dialogs, `editor/` with the six steps), `scss/organizer.scss`.
- i18n: `organizer` namespace in en, ko, ru, uz; `dashboard.createEventLocked_{pending,rejected,suspended}` in `common`.

### Behaviour
- List: status tabs with counts, search, sort, pagination, loading, empty, no-result and error states; row actions by status (edit or fix, view, submit or resubmit with a dialog, public page for APPROVED, cancel info for APPROVED); reject and cancel reasons shown in the row.
- Form: six steps, save draft at any step, unsaved-changes warning, inline validation that mirrors the DTO limits, server errors translated, tier rows from the venue layout for RESERVED events, GENERAL ticket types, event sale window, translations tabs with AI suggestions that are never saved automatically, review page with the submit checks, submit dialog.
- Statuses: REJECTED shows the admin's reason and can be fixed and resubmitted; PENDING, CANCELLED, ENDED are read-only with an explanation; APPROVED explains what is editable and confirms before sending the event back to review.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (scratch copy with `node_modules` linked).
- Browser on `http://localhost:3000`, English, as `organizer@ticketzy.demo`: dashboard (counts, earnings), list with tabs and counts, rejected tab, create a RESERVED draft end to end (name, category, description, image upload with a small-image warning and a rejected non-image, venue, dates, sale of two tiers from the layout, "End on the same day"), first save redirect to `/[id]/edit`, ticket types created, AI translate (suggestions shown, nothing filled in, "Use this suggestion" then save), review page, submit dialog and submit (event is now In review and read-only), edit and save of the REJECTED demo event ("Charity Legends Match", description extended, still REJECTED, not resubmitted), approved event page (what is editable), cancel dialog, light theme, 500 px window (dashboard, list, form step 1), unsaved-changes prompt blocked navigation. `pending@ticketzy.demo`: dashboard, events and new pages show why they are blocked, the button is disabled. `buyer@ticketzy.demo` (USER): `/organizer/events/new` redirects to the home page.
- After the dev server was restarted: the list (ko), the form (ko, uz, ru: pending test event, tickets and translations steps), dark and light themes, all at about 520 px. Found and fixed: step labels broke per character in Korean (`white-space: nowrap` on `.org-step`). The `organizer` namespace was empty for ko, ru and uz before the restart (F109).
- **Not done, and why:**
  - Cancelling a test event: the backend has no organizer cancel (F96). The "In review" test event "QA Test Comedy Night" (Laugh Cellar Comedy Club, 20 Mar 2027) is left in the demo data; only an admin can reject or approve it.
  - Duplicate: no backend operation.
  - Saving changes of an APPROVED event (to avoid sending a live demo event back to review).

## Prompt 6: organizer venues and the layout editor (2026-10-08)
Goal: venues list, venue form and a 2D layout editor, with the lock rules of the backend. Not committed. Judgment calls are F111 to F124 in DECISIONS.md.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`. Venue types are unchanged; `getMyEventOrders` and `cancelMyEvent` are new (not used here).

### Operations used (exact names)
`getVenues(input: VenuesInquiry)`, `getVenue(venueId)`, `createVenue(input: VenueInput)`, `updateVenue(input: VenueUpdate)`, `getMyEvents` (counts and locks), `getTicketTypes` (tier warning), `imageUploader(target: "venue")`. Documents in `apollo/organizer/venue.ts`.

### Added
- Pages `/organizer/venues`, `/organizer/venues/new`, `/organizer/venues/[id]`; sidebar item "Venues".
- Libraries `libs/venues/` (model and validation, templates, undo history, time zones, server issue placement, data hooks, editor state), components `libs/components/organizer/venues/` (canvas, section panel, template dialog, time zone combobox, photos, editor), `scss/venues.scss`.
- Event form: "Create a new venue" link with return and venue pre-selected.
- i18n: `organizer.venues.*`, `serverErrors`, `blocked.*.venues`, `form.venue.createLink`, `common dashboard.nav.venues` in en, ko, ru, uz (key and placeholder parity checked by script).

### Behaviour
- List: own venues with name, city, time zone, capacity, number of own events, a "Layout locked" mark; search, sort, pagination (URL state), loading, empty, no-result and error states.
- Form: name, type, city, address, time zone (search), photos, then the editor: SVG canvas 1000 x 700 with zoom (buttons, pinch, Ctrl+wheel), pan, grid and snap, add seated or standing section, drag, rotate, rename, key, rows, seats per row, spacing, tier key, capacity, X and Y, duplicate, delete with confirmation, live seats and capacity, buyer preview (the real `SeatMap`), three templates, undo and redo (100 steps), keyboard and touch, validation per section, warnings for overlap and off-canvas parts, save with dirty state and leave warning.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (scratch copy with `node_modules` linked).
- Browser on `http://localhost:3000` as `organizer@ticketzy.demo`: list (own 3 venues, counts, locked marks); new venue from the stadium template, drag, Ctrl+Z, Ctrl+Shift+Z, arrow nudge, save (capacity 1528 = 1000 + 288 + 240 checked on the API), redirect and reload; rows set to 0 (inline error, save blocked with a summary), duplicate, overlap warning, delete dialog and delete; locked venue "Harbor Sky Stadium" (read-only layout with the events named, details still editable); editor and buyer seat picker of the Harbor Cup event give identical section transforms, seat counts and seat sizes; event form to "Create a new venue" to a club template venue and back (typed title restored, new venue selected); light theme; 390 px (iframe: no horizontal overflow, canvas fits). Pages were seen in Russian (the browser's language), at 520 px and 1440 px.
- **Not tested:** ko and uz pages visually (keys checked by script); real touch input (pinch, one-finger drag: written with pointer events, only mouse drag was exercised); server-side validation placement on sections (the client blocks first); `VENUE_LAYOUT_LOCKED` coming from the server; the tier-orphan warning with real events; photo upload (not exercised); the unsaved-changes confirm of in-app navigation on the venue page (the event form's browser prompt did appear); time zone combobox with the keyboard.
- Test data left behind: venues "QA Test Arena" and "QA Comedy Cellar" (no delete operation exists) and no events.
