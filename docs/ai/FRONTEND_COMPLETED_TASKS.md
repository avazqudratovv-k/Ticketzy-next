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

## Small fix: event date fields in the organizer event form (2026-10-08)

### Changed
- `libs/components/organizer/editor/StepVenue.tsx`: new "When is the event?" block (Date, Start time, End time; End date behind a link), default end time, "Ends the next day" notice, live inline errors, one-line summary with the venue time zone.
- `libs/organizer/form.ts`: `dateOrderErrors`, `addDays`, `addHours`, `impliedEndDate`, `endsOnOtherDay`; `validateVenue`, `allErrors` and `canCreateDraft` take the saved start so a started event is not blocked. `libs/format.ts`: `formatEventDay`. `scss/organizer.scss`: `.org-when`, `.org-grid3`.
- i18n (en, ko, ru, uz): `form.venue.date`, `form.venue.when.*`, errors `startInPast`, `endRequired`, `endBeforeStart` reworded; `form.venue.sameDay` removed. Decisions F125 to F128.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean.
- Browser (`http://localhost:3000`, organizer@ticketzy.demo, Russian UI): new event with Date 12 Dec 2026 and start 19:00 gave end 21:00 and the summary; end 01:00 gave "Ends the next day" and a two-day summary; saved as a draft (create), reopened (edit): overnight stays hidden with the notice; revealed End date, set 14 Dec 22:00, saved, reloaded: End date is shown by default; end date before start and start date in the past both showed the inline error.
- **Not tested:** ko, uz and en pages visually (keys only, parity checked by script); editing an event that already started (the rule is code only); the same-day case saved separately (it was the same form before the overnight edit); error text after Save/Continue (only the live errors were seen); 390 px width.
- Test data left behind: draft "QA One-day show" (12 to 14 Dec 2026, Hanbit Concert Hall; no delete operation exists).

## Small fix: multi-day layout of the event time fields (2026-10-08)

### Changed
- `StepVenue.tsx`: one-day mode unchanged; multi-day mode has "Dates" (From, To) and "Daily hours" (Start, End) with "Back to a single day"; summary from `formatEventSummary`. `form.ts`: `multiDay` flag, multi-day rules and error keys. `useEventEditor.ts`: any date or time edit clears all four date errors. `format.ts`: `isMultiDay`, `formatEventWhen`, `formatEventSummary`. Event cards, detail, seats, orders, tickets, organizer lists and the review step use `formatEventWhen` (F131, F132).
- i18n (en, ko, ru, uz): `form.venue.fromDate`, `toDate`, `when.hintMulti`, `dates`, `dailyHours`, `backToSingle`, errors `lastDayBeforeFirst`, `dailyEndBeforeStart`; the earlier `summarySame`, `summaryRange` and `endDate` keys were removed.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. Key parity en, ko, ru, uz: checked by script.
- Browser (`http://localhost:3000`, organizer@ticketzy.demo): reopened the saved multi-day draft (opens in multi-day mode, summary "12 – 14 Dec 2026 · daily 19:00–22:00 (Asia/Seoul)"); end time 01:00 shows the daily-hours error and hides the summary; To date before From date shows its error; Back to a single day keeps 19:00 and 22:00 and the one-day summary; saved as one day, reloaded: one-day mode.
- Formatter run under Node for en, ko, ru, uz with one day, overnight, a 3-day range and a range across a year: output as expected (F131).
- A one-day buyer event page (Harbor Sky Summer Rock Festival, ends 00:00) is unchanged.
- **Not tested:** a buyer page of a **multi-day** event: no published event spans days and publishing needs admin approval. Cards, checkout, tickets and organizer lists were not opened with a multi-day event either (same helper, type-checked). ko, uz pages in the browser. Saving the multi-day draft again after the new layout (it was saved earlier with the previous layout and reloaded fine).
- Test data left behind: draft "QA One-day show" (now 12 Dec 2026, 19:00 to 22:00, Hanbit Concert Hall).

## Small fix: ticket sale window must fit the event (2026-10-08)

### Changed
- `libs/organizer/form.ts`: `validateSaleWindow` checks sales start before end, sales end no later than the event end, sales start before the event end; new `saleWindowConflicts`.
- `StepTickets.tsx`: live inline sale errors, sales end suggested from the event start, hint under Sales end date and the rule line under the window. `StepVenue.tsx`: warning when new event dates conflict with the sale window. `useEventEditor.ts`: date edits and sale edits clear stale sale errors.
- `libs/organizer/errors.ts` and `libs/seats/errors.ts`: the six new backend messages mapped.
- i18n (en, ko, ru, uz): `form.tickets.saleEndHint`, `saleRule`, `form.venue.when.saleConflict`, errors `saleEndAfterEventEnd`, `saleStartAfterEventEnd` (and `saleEndBeforeStart` reworded), six `serverErrors.*` keys, three `checkout` `errors.*` keys. Decisions F133 to F136.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. Key parity en, ko, ru, uz: checked by script (only plural-form differences, as before).
- Browser (`http://localhost:3000`, organizer@ticketzy.demo, English UI) on draft "QA One-day show" (12 Dec 2026, 19:00 to 22:00, Asia/Seoul): filling Sales start date suggested sales end 12 Dec 19:00; sales end 13 Dec showed "Sales can’t end after the event ends." and Save draft sent no request; sales end 30 Nov showed the start/end error; 1 Dec 10:00 to 12 Dec 19:00 saved (UpdateEvent). Event date changed to 25 Nov: the venue-step warning appeared, Save draft was blocked and jumped to the tickets step with both errors; date set back to 12 Dec: warning gone, form clean.
- Backend (direct `updateEvent` with the organizer token): returned "The ticket sales must end no later than the event end!" and "The ticket sales start must be before the ticket sales end!", which match the mapped strings exactly.
- **Not tested:** the translated server error shown in the form (the client blocks first); "must start before the event ends" from the server (backend answered the start/end message for that input); the buyer messages at checkout; ko, ru and uz pages in the browser; 390 px.
- Test data: draft "QA One-day show" now has a sale window 1 Dec 2026 10:00 to 12 Dec 2026 19:00.

## Prompt 7: organizer sales, orders, event cancellation and check-in (2026-10-08)
Goal: real dashboard data, orders per event, cancel, check-in. Not committed. Judgment calls F137 to F146 in DECISIONS.md.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`.

### Operations used (exact names)
`getMyEarnings`, `getMyEventOrders(input: OrganizerOrdersInquiry)` (filters `orderStatus`, `eventId`; sort `createdAt` or `totalAmount`; pagination), `cancelMyEvent(input: EventReasonInput)`, `checkInTicket(qrToken, eventId)`, `getEventAttendees` (counts only), `getTicketTypes`, `getVenue`, `getMyEvents`. Documents in `apollo/organizer/orders.ts` and `mutation.ts`. `checkInPreview` and `getEventSales` are not used.

### Added or changed
- Dashboard (`pages/organizer/index.tsx`): paid orders, tickets sold, revenue, commission, payout, upcoming events from real data; 30-day revenue chart (`SalesChart`, `libs/organizer/salesSeries.ts`); recent orders card (5 newest) replaces the placeholder; loading, empty and error states.
- `/organizer/events/[id]/orders`: status tabs with counts, sort, pagination, table (buyer, ticket types and seats, amount, commission, status, date), detail drawer, empty, no-result, error, loading.
- Events list: "Orders" action; `CancelDialog` now cancels (reason required, translated errors); the edit page uses the same dialog.
- `/organizer/check-in`: event chooser, camera scanner (html5-qrcode, new dependency), manual QR-text entry, big result states, checked-in counter, recent scans (this page only).
- Ticket tier default names (`defaultTierName` in `libs/organizer/form.ts`).
- i18n en, ko, ru, uz: `orders.*`, `checkin.*`, `cancel.*`, `dashboard.*` additions, `serverErrors.cancelReasonRequired`, `alreadyClosed`, `list.actions.orders`. Key and placeholder parity checked by script.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (scratch copy with `node_modules` linked).
- Browser, `http://localhost:3000`, organizer@ticketzy.demo, English: dashboard numbers equal the sums of `getMyEventOrders` PAID (50 orders, 215 tickets, 14,189,000 revenue, 1,418,900 commission, direct API check); orders list of "Incheon FC vs Seoul United" (13 orders, tab counts, Paid and Refunded tabs, empty state for 0 refunded, URL state), drawer (money split, seats with section names); check-in by manual entry for a VALID ticket (valid, counter 1 of 61), the same ticket again (already used), a ticket of another event (wrong event), a refunded ticket on its own event (refunded), a garbage code and a tampered code (invalid). Backend cancel messages checked against the live API (blank reason, CANCELLED, ENDED, DRAFT, unknown id) and they match the mapped strings. Dark and light themes; 390 px (iframe) for check-in, dashboard and orders: no horizontal overflow. Found and fixed: money figures broke mid-number at 390 px, chart labels too small on a phone, scanner idle text off-centre, section keys (LOWER_N) shown at the gate instead of names, result below the fold on a phone.
- **Not done, and why:**
  - Cancel success path: the UI offers cancel only for APPROVED events and every approved event is demo data; creating an approved test event needs an admin account. The dialog (required reason, buttons) was not clicked in the browser because the automation was blocked from opening it on a demo event. Error strings were verified through the API only.
  - The camera: no camera in the automated browser, so scanning a real QR code, "Switch camera" and the denied state were not exercised.
  - ko, ru and uz pages were not looked at in the browser (keys only).
  - The 30-day chart has only one non-empty day in the demo data (all orders were created on 8 Oct).
- Test data changed: one VALID demo ticket of "Incheon FC vs Seoul United" (buyer@ticketzy.demo) is now USED. No events were cancelled or created.

## Prompt 8: admin panel (2026-10-08)
Goal: admin shell, event approvals with AI advice, organizers, members, commission, orders. Not committed. Judgment calls F147 to F166 in DECISIONS.md.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql` (no change in the SDL; the file is minified as before).

### Operations used (exact names)
Queries: `getEventsByAdmin`, `getEvent`, `getTicketTypes`, `getOrganizersByAdmin`, `getAllOrdersByAdmin`. Mutations: `approveEventByAdmin`, `rejectEventByAdmin`, `cancelEventByAdmin`, `runEventModerationByAdmin`, `retryEventRefundsByAdmin`, `verifyOrganizerByAdmin`, `rejectOrganizerByAdmin`, `suspendOrganizerByAdmin`, `reinstateOrganizerByAdmin`, `setCommissionOverrideByAdmin`, `updateMemberByAdmin` (status only), `getAllMembersByAdmin` (a mutation in the schema). Documents in `apollo/admin/query.ts` and `mutation.ts`. Not used: `translateEvent` (organizer only), `updateEventByAdmin`, `removeEventByAdmin`, `refundOrderByAdmin`, `getAuditLogsByAdmin`.

### Added or changed
- Pages: `/admin` (six live figures, two queues), `/admin/events` and `/admin/events/[id]`, `/admin/organizers`, `/admin/members`, `/admin/commission`, `/admin/orders`.
- `libs/admin/` (types, errors, commission, list params, tab and sort tables), `libs/components/admin/` (ReasonDialog, ModerationPanel, EventLayoutPreview, OrganizerDrawer, CommissionDialog, MemberStatusBadge), `scss/admin.scss`.
- Nav: real admin items only; admin footer link is "Back to Ticketzy".
- i18n: `admin.json` in en, ko, ru, uz (keys and placeholders checked identical by script); three `dashboard.nav` keys in `common.json`.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (scratch copy with `node_modules` linked).
- Browser (`http://localhost:3000`, English, as admin@ticketzy.com): dashboard figures equal the API (5 pending events, 1 pending organizer, 7 active, 53 orders, ₩14,189,000 revenue, ₩1,418,900 commission); events list tabs, counts, rows; event detail (details, four languages, ticket types, seat map with tier legend, organizer card); stored AI result shown, "Run again" stored a new result; approved the multi-day demo event "seng part" and its buyer page shows "21 – 25 Oct 2026 · daily 14:50–17:50"; rejected "Xayr maktab" (empty reason showed the required error, then a reason saved and shown); approved Midnight Jazz Sessions (its stored check was "did not run" and showed the friendly state); approved the pending organizer, suspended it with a reason and reinstated it; commission override: 150 refused (range), empty reason refused, 5% saved after the confirmation step and shown as an override; members list, buyer suspend and reactivate, own admin account shows "can't change here"; orders tabs with counts and the drawer.
- Test event as organizer@ticketzy.demo (created through the API with the organizer's token, submitted): approved in the UI, buyer@ticketzy.demo paid 2 tickets, cancelled in the UI with a reason; the order read REFUNDED through the API and "Check and finish refunds" said nothing was waiting.
- A signed-in ORGANIZER opening `/admin/events` was sent to `/organizer`.
- Dark and light themes on all seven pages; 390 px (iframe, the browser window cannot go below 606 px): no horizontal overflow in either theme.
- Found and fixed while testing: members list used a query for what is a mutation; duplicated "did not run" sentence; row labels shown on desktop; plural member type label in rows.
- **Not tested:** ko, ru and uz pages in the browser (a saved locale reset to English when I opened `/ru/...`; keys only, parity by script); the cancel dialog's server error path; admin approval failing on `CANNOT_APPROVE_OWN_EVENT`; the "AI unavailable" error state (the AI was on, so only the stored `checked: false` state was seen); pagination past page 1 (all lists have fewer than 11 rows per tab); the real 390 px viewport of dialogs and drawers.
- Test data left behind: "seng part", Midnight Jazz Sessions and Laugh Cellar Anniversary Special are now APPROVED; "Xayr maktab" REJECTED; "QA Test Comedy Night" still PENDING; "QA Admin Test Weekend" CANCELLED with one refunded order; New Stage Productions is ACTIVE with a 10% override that ends on 9 Oct 2026 about 07:40 UTC (same as base; no reset exists); Demo Crowd was suspended and reactivated.

## Prompt 9: new admin operations (2026-10-08)
Goal: clear commission override, admin orders filters, member error messages. Not committed. Decisions F167 to F170.

- `docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`. Changes vs the old file: `clearCommissionOverrideByAdmin`, `ClearCommissionOverrideInput`, `CommissionOverrideCleared`, audit action `COMMISSION_OVERRIDE_CLEARED`, and `getAllOrdersByAdmin(input: AdminOrdersInquiry!): AdminOrders!` with `AdminOrder` (`buyerNick`, `buyerEmail`, `eventTitle`). (The file is a plain introspection result, a little smaller than before because the query asks for fewer meta fields.)
- Changed: `apollo/admin/mutation.ts` (clear mutation), `apollo/admin/query.ts` (order fragment on `AdminOrder`, filtered counts, event list for the filter), `libs/admin/errors.ts`, `libs/admin/types.ts`, `pages/admin/commission/index.tsx`, `pages/admin/orders/index.tsx`, `libs/components/admin/CommissionDialog.tsx` (removed the no-reset note), `scss/admin.scss`, `admin.json` in en, ko, ru, uz (keys added to all four).
- Verified: `yarn tsc --noEmit` 0 errors, `yarn lint` clean. Browser as admin@ticketzy.com on `http://localhost:3000`: set 7% on Hanbit Live Entertainment, then "Clear override": empty reason refused, with a reason it cleared and the notice said 7% removed and 10% automatic; orders filtered by status + text + date range (2 paid orders for "buyer" in October, tab counts followed the filters), a "from" date after all orders (1 refunded order, placed later that day), and an inverted range (error text, nothing listed). Buyer nick and email and event title show in rows.
- **Not tested:** the three member refusals (own account, another admin, assigning ADMIN) in the browser: the UI guards stop them, and my attempt to send them through the API from the page was blocked, so the mapping is verified by code and key parity only. Event filter select and the order drawer were not clicked. ko, ru and uz pages not looked at (translations written without native review). `yarn build` not run.
- Test data left behind: Hanbit Live Entertainment had a 7% override set and cleared (audit entries, two notifications). No override remains on it.


## Prompt 9a: organizer-admin messaging (2026-10-09)
Goal: inboxes for organizers and admins, thread, real time, unread badges, notifications link. Not committed. Decisions F171 to F184.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`. No change in the SDL (the file is rewritten by the same introspection query; only whitespace and ordering of meta fields differ).

### Operations used (exact names)
Queries: `getMyConversations(input: OrdinaryInquiry)`, `getConversation(conversationId)`, `getMessages(conversationId, input)` (newest first), `getMyNotifications` (now also reads `conversationId`), `getUnreadNotificationCount`. Mutations: `startConversation(eventId?)`, `sendMessage(conversationId, body)`, `markConversationRead(conversationId)`, `markNotificationRead`. Documents in `apollo/messaging.ts`.
Socket (raw WebSocket, `NEXT_PUBLIC_API_WS_URL`): client `auth` (first message, token), `joinConversation`, `leaveConversation`, `typing`; server `authenticated`, `joined`, `left`, `message`, `unread`, `read`, `typing`, `error`.

### Added or changed
- Pages: `/organizer/messages`, `/admin/messages` (shared `libs/components/messages/Inbox.tsx`; `?c=<id>` selects a thread).
- `libs/messaging/`: `socket.ts` (the one shared socket), `sync.ts` (conversation store, polling, bell refresh, mark-notifications-read), `useThread.ts`, `hooks.ts`, `format.ts`, `errors.ts`, `types.ts`. Reactive vars in `apollo/store.ts`.
- `libs/components/messages/`: `Inbox`, `ConversationList`, `Thread`, `Composer`, `PartyAvatar`, `MessagingLifecycle` (mounted in `_app`), `labels`.
- Sidebar "Messages" with an unread badge for both roles (`dashboard/nav.tsx`, `DashboardShell.tsx`); "Message organizer" in the admin organizer drawer and as a row link (`components/admin/MessageOrganizer.tsx`).
- Notifications: `NEW_MESSAGE` links to the thread (`libs/account/notifications.ts`), `conversationId` in the query and type.
- `scss/messages.scss`; `libs/format.ts` got `formatViewerDay`.
- i18n: new `messages.json` in en, ko, ru, uz (keys and placeholders checked identical by script, plural forms per language); `organizers.message.*` in `admin.json`, `dashboard.unreadMessages` in `common.json`, plus `thread.handlingTeam`.

### Verified
- `yarn tsc --noEmit`: 0 errors. `yarn lint`: clean. `yarn build`: succeeds (scratch copy with `node_modules` linked, deleted afterwards).
- Browser on `http://localhost:3000`. Two sessions in one browser share `localStorage`, and `127.0.0.1:3000` is refused by the API's CORS, so the browser played one side at a time and the other side was a Node script using the real GraphQL API and WebSocket (`organizer@ticketzy.demo` and `admin@ticketzy.com`):
  - Admin UI: list, event card, live incoming message in the open thread, live reorder and unread badge in another conversation, sidebar badge, typing indicator, Enter sends, Shift+Enter adds a line, Sent turning into Read when the organizer read it, unread cleared and bell count lowered when the thread is open and focused, load older (30 then 41 messages, position kept, button gone at the end), fallback with the socket blocked (banner, a message arrived by polling within 10 s), socket back after restoring.
  - Organizer UI: list and thread, live badge and reorder, bell dropdown entry opening the thread and clearing both badges, typing indicator from the admin, failed send (offline) then Try again, dark theme, 390 px list and thread (iframe, no horizontal overflow).
  - Guards: a buyer signed in through the form is sent to `/` from both inbox pages (in-app navigation); a buyer socket is refused with 4401 (script); logout closes the socket.
- Light theme was seen on the admin and organizer inbox at desktop width.

### Not tested
- ko, ru, uz pages visually (keys and placeholders by script only; translations written without native review).
- "Message organizer" in the admin organizer list and drawer: compiled, typed and built, but not looked at in the browser (the browser tab became too slow to switch back to the admin session).
- Contact support / empty state (every demo organizer I could use already had conversations); an organizer opening `/admin/messages` (same guard as `/admin/events`, tested in Prompt 8); the 2000 character counter; the rate-limit message; a REJECTED or SUSPENDED organizer.
- Hard page loads in the automation tab were slow and sometimes blank for 15 to 60 seconds, also on pages that already existed (the tab reports `visibilityState: hidden`, which throttles the dev server's hydration). To test mark-as-read in a hidden tab I overrode `document.visibilityState` and `document.hasFocus` in the page; the app itself is unchanged by that.
- Test data left behind: about 45 messages in the two demo conversations between `hanbit_live` and the admin (bulk messages 1 to 35 and a few others) and their notifications. The admin session of the browser was replaced by the organizer one (the browser is signed in as `organizer@ticketzy.demo`).

## Prompt 9b: admin starts a conversation with an organizer (2026-10-09)
Goal: "Message organizer" always works. Not committed. Decisions F185 to F190.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`. New: mutation `startConversationWithOrganizerByAdmin(organizerId: String!): Conversation!`. Nothing else changed.

### Added or changed
- `apollo/messaging.ts`: `START_CONVERSATION_WITH_ORGANIZER` (same `ConversationFields` fragment).
- `libs/messaging/sync.ts`: `addConversation` and the `localAdds` guard in `syncConversations` (F186, F187).
- `libs/components/admin/MessageOrganizer.tsx`: calls the mutation, adds the conversation, `router.push` to `/admin/messages?c=<id>`, inline error, busy state. Same component for the table link and the drawer button.
- `libs/messaging/errors.ts` and `public/locales/{en,ko,ru,uz}/{admin,messages}.json`: new strings (`organizers.message.opening`, `organizers.message.errors.*`, `serverErrors.adminOrganizersOnly`); `none` and `noneHint` removed. Keys identical in the four languages (ko, ru, uz written without native review).
- `libs/messaging/hooks.ts`: `useOrganizerConversation` removed (unused).
- `scss/admin.scss` (`.adm-actions__error`), `scss/organizer.scss` (disabled `.org-linkbtn`).

### Verified
- `yarn tsc --noEmit` and `yarn lint`: clean.
- Browser, `http://localhost:3000`, dark theme, signed in as `admin@ticketzy.com`:
  - "Message" for New Stage Productions (no conversation before): opened `/admin/messages?c=...` with an empty "General support" thread selected and first in the list; sent a message (Sent, preview in the list).
  - Signed in as that organizer (`pending@ticketzy.demo`): the thread and message were there, and the bell listed two `NEW_MESSAGE` notifications ("An admin opened a conversation with you." and the message); opening the thread marked both read. The admin then saw the message as Read.
  - "Message" again for the same organizer: same conversation id, still 3 conversations in the list, no duplicate.
  - Drawer button for Ghost Tickets Co. (REJECTED, no conversation): created and opened, first in the list.
  - Errors: with the mutation answered by a stubbed `fetch` in the page, each of the three server messages showed its translated text under the link.
  - 390 px (same-origin iframe, the window cannot be resized): organizer list with the link and an error line, and the thread, no horizontal overflow.

### Not tested
- Live delivery into a conversation created by this button: the rejected organizer cannot sign in (`ACCOUNT_NOT_VERIFIED`) and the other two already had a conversation, so I could not send a message from the organizer side into a just-created conversation while the admin stayed on another page. Room join by `addConversation` is by code reading only.
- ko, ru, uz visually; light theme; a suspended or pending (unapproved) organizer.
- Test data left behind: two support conversations (New Stage Productions with one admin message, Ghost Tickets Co. empty). The browser is signed in as the admin.

## Prompt 10: desktop layout of the order detail page and dashboards (2026-10-09)
Goal: fix `/orders/[id]` at desktop widths and check related pages. Not committed. Decisions F191 to F196. No backend change.

### Found
- `/orders/[id]` (and every shared account page: `/tickets/[id]`, `/notifications`, `/settings`) broke for **organizer and admin sessions**: no menu column, so the page sat in the 240px column and the 380px refund column overlapped it (F191). As a buyer the page was already correct at 1440, 1280, 1024, 768, 390, but the buyer's main column was only about 376px wide at 1100 to 1280px.
- Organizer orders table (`/organizer/events/[id]/orders`) at 1024 to about 1200px: buyer and tickets columns 45 to 57px wide, text one character per line. The same window breakpoint was used by the organizer events list and all admin tables (F194).
- Admin orders (7 columns) was cramped at 1200 to 1280px (F195).
- No problem found: `/orders`, `/tickets`, `/tickets/[id]` (single column below 820px content, as before), `/checkout/[orderId]`, `/events/[id]`, `/organizer` overview, `/organizer/events`, `/admin/events`.

### Added or changed
- `libs/components/account/AccountShell.tsx`: `acct--solo` for non-buyers.
- `scss/account.scss`: `.acct__content` container, `.acct--solo`, `.acct__cols` and `--ticket` on `@container acct (min-width: 820px)`, refund column 340px, `.acct__stack--sticky`.
- `scss/seats.scss`: `.order__lines li` first child `flex: 1 1 0; min-width: 0`, last child `flex: none; nowrap`.
- `pages/orders/[orderId]/index.tsx`: refund column uses `acct__stack--sticky`.
- `scss/layout.scss`: `.tz-content` container `dash`.
- `scss/organizer.scss`, `scss/admin.scss`: window media queries replaced by `@container dash` (900px tables, 820px columns, 940px admin detail), admin orders column minimums.

### Verified
- `yarn tsc --noEmit` and `yarn lint`: clean.
- `http://localhost:3000`, widths 1440, 1280, 1200, 1024, 768, 390, tested in a same-origin iframe (the browser window cannot be resized), both themes (the theme only changes colour tokens): order detail as buyer (paid, 2 tickets plus one cloned row), as admin (paid, 3 tickets, refund card), `/orders`, `/tickets`, `/tickets/[id]`, `/checkout/[orderId]` (live hold, 3 seats), `/events/[id]`, `/organizer`, `/organizer/events`, `/organizer/events/[id]/orders`, `/notifications` as organizer, `/admin/events`, `/admin/orders`, `/admin/events/[id]`. Checks: no horizontal overflow, no text squeezed into narrow boxes, element boxes do not overlap, screenshots. Sticky: with a 420px-high viewport and a 300px scroll the refund column stayed at 88px from the top and above the bottom of the main column.

### Not tested
- ko, ru, uz (longer words) and a very long ticket type name.
- Test data left behind: two unpaid checkout holds on Midnight Jazz Sessions (expire by themselves).

## Prompt 9b (assistant): the AI assistant widget (2026-10-09)
Goal: floating "Ask Ticketzy" button and chat panel on public and buyer pages, on the backend's `askAssistant`. Not committed.

### Contract (read from `apps/ticketzy-api/src/components/ai`, `libs/dto/ai`, backend `docs/ai`; `docs/ai/schema.json` re-fetched, no type added or removed)
- `askAssistant(input: AskAssistantInput!): AssistantAnswer!` is a **mutation**. `AskAssistantInput { message: String! (1 to 1000 chars), history: [AssistantHistoryInput!] (max 10), locale: EventLocale (EN|KO|RU|UZ, default EN) }`, `AssistantHistoryInput { role: AssistantRole (USER|ASSISTANT), content: String (max 1000) }`. Returns `{ answer: String!, events: [Event!]! }` (public events the tools found, at most 5; answer at most 2000 chars).
- Who: `WithoutGuard`, so **visitors and every member type**. A visitor is rate limited by IP, a member by id (`AI_RATE_LIMIT_PER_MINUTE`, in memory). There is no role limit.
- Tools (all read-only): `search_events`, `get_event`, `get_refund_policy`, `get_my_tickets` (caller's own tickets only; says to log in for visitors). The assistant cannot change orders or payments, so the label says so.
- Errors (`Message.AI_*`): off or not configured (503), rate limited (429), failed or invalid answer, busy (503, after one retry), timeout (no longer returned since decision #63). Validation errors (empty, too long, bad history) come back only as `BAD_REQUEST` / "Bad Request Exception", with no detail.
- Time: the provider times out at about 15 s and is retried once after 1 s on 503/504/timeout, so a slow call can take about 31 s before `AI_BUSY`.

### Added
- `apollo/user/mutation.ts`: `ASK_ASSISTANT` (answer plus the card fields of each event).
- `libs/types/assistant.ts`, `libs/assistant/errors.ts` (limits, message to kind mapping), `libs/assistant/store.ts` (reactive var for the chat, sessionStorage with try/catch, request, retry, history), `libs/assistant/richText.tsx` (safe renderer).
- `libs/components/assistant/AssistantWidget.tsx` (button and panel), `AssistantCard.tsx` (row event card), `AssistantLifecycle.tsx` (mounted in `_app`).
- `scss/assistant.scss` (design classes `pg-chat`, `pg-fab`, `pg-chatpanel`, `pg-msg`, `pg-chatcards`, `pg-thinking`, tokens only), imported in `_app`.
- `LayoutBasic` renders the widget: every public and buyer page. The organizer and admin dashboards have their own shell and do not get it.
- i18n: `assistant.*` in `common.json` for en, ko, ru, uz (the `common` namespace is on every page).

### Behaviour
- Panel: dialog 380 by 560 above the button on desktop, full-height sheet under 768px. Greeting, suggestions on an empty chat (translated: comedy this weekend, refunds, cheapest football ticket, pick seats), user and assistant bubbles, thinking dots, "New chat", close, multi-line field (Enter sends, Shift+Enter newline, not during IME composition), send disabled while waiting or empty or too long, counter from 800 characters, over-limit message.
- The chat lives in a module reactive var (survives page changes) and in sessionStorage (survives reload). It belongs to one identity (`guest` or the member id): it is dropped on logout (also from a dashboard), on login as someone else, and by "New chat".
- Answers: paragraphs, bullet and numbered lists, bold, `[text](url)`, bare https URLs and bare `/events/...` paths. Links only to app routes (`/events`, `/orders`, `/tickets`, `/notifications`, `/account`, `/settings`, `/organizers`, `/`) or `https:`; anything else (javascript:, data:, http:, `//host`, other paths) is shown as plain text. HTML is never parsed (React text). Event cards link to `/events/[id]` (locale kept by next/link).
- Errors: unavailable, rate limit, busy, failed, timeout, invalid, not allowed, no connection, each translated, with "Try again" (retry the same question) or "Dismiss" when asking again cannot help. Slow note after 10 s ("up to half a minute"). The browser gives up after 40 s (`AbortController`) and shows the timeout text.
- Accessibility: button `aria-expanded` / `aria-haspopup`, panel `role="dialog"`, focus into the field on open and back to the button on close, Escape closes (document level), Tab trapped inside the sheet on phones, log is `role="log"` `aria-live="polite"`, thinking text for screen readers, `prefers-reduced-motion` removes the panel and dot animations.

### Verified
- `yarn tsc --noEmit`, `yarn lint`: clean. `yarn build` in a scratch copy: succeeds (scratch copy deleted).
- `http://localhost:3000`, signed out: refund question matches `getRefundPolicyText`; "cheapest ticket for football" answered Harbor Cup Semi-Final 18,000 and showed two cards (18,000 and 22,000, matching `getEvents` for FOOTBALL); comedy question returned three real events earlier from curl. As an ADMIN session (the browser had one; same code path as any member): Korean UI, Korean question, Korean answer with a matching card (seng part, 4,141). Chat survived reload and page change, reset on logout.
- Stubbed in the page (`window.fetch`, backend untouched): busy, rate limit, failed, no connection, bad request (Dismiss), AI off, a request that never answers (slow note at 10 s, timeout text at 40 s), recovery by "Try again" with the real fetch. A hostile answer (`<img onerror>`, `<b>`, `javascript:`, `data:`, `//evil.com`, `/admin`, `http://`) rendered as text, no script ran, only `/events/..` and `https://` links remained, https link has `target=_blank rel="noopener noreferrer"`.
- Empty and whitespace messages: send disabled, Enter does nothing. 1001 characters: send disabled, message and red counter. 850 characters: counter shown.
- Dark and light themes. 390 px in a same-origin iframe (the window cannot be made that narrow): full-height sheet, focus in the field, body scroll locked; the button is hidden on `/events/[id]/seats` and `/checkout/[orderId]` below 1024px (their own bottom sheets).

### Not tested
- Signed in as `buyer@ticketzy.demo` (DEMO_PASSWORD not available; no password was entered). `get_my_tickets` was therefore not exercised for a buyer.
- A real rate limit (not triggered, to avoid cost; only the stubbed response), a real timeout from the backend, ru and uz answers (strings only checked in code), Safari.
- Screen reader run, real IME input.
- Test data: none created. The tab's login was removed and put back during the logout check; a stale `ticketzy-assistant` chat may remain in that tab's sessionStorage.

## Prompt 9c: role-aware footer and menu, auth redirect, follow (2026-10-09)

Goal: small role fixes and follow / unfollow. Not committed. Decisions F210 to F219 in `DECISIONS.md`.

### Schema
`docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql` (standard introspection; follow operations unchanged).

### Added / changed
- `apollo/user/mutation.ts`: `SUBSCRIBE`, `UNSUBSCRIBE`. `apollo/user/query.ts`: `GET_ORGANIZER_FOLLOW`.
- `libs/components/events/FollowButton.tsx` (used in the event detail organizer card and on `/organizers/[id]`); styles `.follow` in `scss/events.scss`.
- `libs/components/Footer.tsx` (role-aware Organizers column), `libs/components/common/AccountMenu.tsx` (links per role), `pages/sell.tsx` (new), `libs/routes.ts` (`ROUTES.sell`), `libs/hooks/useRedirectIfSignedIn.ts`.
- i18n in en, ko, ru, uz: `common` (`account.*`, `footer.*`), `events` (`follow.*`), `auth` (`sell.*`).

### Verified
- `yarn tsc --noEmit`, `yarn lint`: clean.
- `http://localhost:3000`, by DOM checks and screenshots: signed out footer (both links) and "Sign in to follow" with returnTo; buyer: menu, footer (Sell tickets to /sell), /sell text, login and sign-up (also with `returnTo=/orders`) go to `/`, follow on the event page (state, count 0 to 1, backend count 1), the organizer page showed Following, the Following list showed the organizer, unfollow on the organizer page (count back to 0, list empty); rollback with a stubbed failing `subscribe` (state and count restored, error text shown); organizer: signs in to `/organizer`, menu and footer, every menu link opens without a role redirect, login and sign-up go to `/organizer`, own page shows the reason; admin: same checks, login and sign-up go to `/admin`, hint "Only buyer accounts can follow organizers."
- Dark theme (organizer page as admin) and 390 px (event page in a same-origin iframe, no horizontal overflow, organizer card wraps).

### Not tested
- ko, ru, uz visually (strings only). The buyer's Follow / Following button at 390 px and in dark (only the admin hint was seen there). The "No data found!" unfollow race. Real `Self subscription` / `Only organizers` responses (cannot be reached from the UI).
- The browser window was hidden, so a fresh page load did not hydrate; all pages were opened by client navigation after one load.
- Test data: the buyer followed and unfollowed the one demo organizer (follower count is back at 0). The tab ended signed in as admin.

## Prompt 9d: organizer area finished (Attendees, Payouts, Analytics, Profile)

Goal: the four organizer sidebar links that led nowhere now have pages, built only from data the backend returns. Not committed.

### Schema
- `docs/ai/schema.json` re-fetched from `http://localhost:3007/graphql`. The SDL is unchanged (compared type by type with the previous file).
- Operations used (exact names): `getEventAttendees(input: AttendeesInquiry{eventId, page, limit, ticketStatus?}): Attendees`, `getEventSales(eventId): EventSales`, `getMyEarnings: MyEarnings`, `getMyEventOrders(input: OrganizerOrdersInquiry)`, `getMyEvents` (also `eventViews`, `eventLikes`), `getMember(memberId)` on the organizer's own id (`completedEvents`, `memberFollowers`, `memberEvents`, `commissionOverride{rate, endsAt, reason}`, `memberStatus`), `updateMember(input: MemberUpdate)`, `imageUploader(file, target: "member")`.

### Pages
- `/organizer/attendees`: event selector, status tabs (All, Valid, Used, Refunded) with counts, search (buyer, order number, ticket code), pagination, totals (sold, checked in, not yet, refunded), drawer per attendee (all tickets of the same order), "Download CSV" of the current filtered list. State is in the URL (`event`, `status`, `q`, `page`).
- `/organizer/payouts`: earnings summary from `getMyEarnings`, net payout split by event state, commission tier ladder with the remaining completed events and any active override with its end date, per-event table (gross, commission, refunded, net, event state).
- `/organizer/analytics`: event selector (or all events) and period (14, 30, 90 days, since the first sale), tiles, sales over time (tickets or revenue, bars, "View as table"), revenue by event, ticket type mix, reach (views, likes, followers, paid orders per view).
- `/organizer/profile`: form (organization name, nickname, about, address, phone, logo upload; email shown read-only), live preview of the public page header, account card (status, followers, events, completed events), commission tier, unsaved-changes guard (`useUnsavedGuard`), success and error messages.
- Avatar menu: "Profile" is back for organizers. `/organizers/[id]` now also shows the organizer's address (already in the query, `memberAddress`).

### Files
- New: `apollo/organizer/sales.ts`; `libs/organizer/{attendees,analytics,commission,payouts,profile,useAllAttendees,useSalesEvents}.ts`; `libs/components/organizer/sales/{EventSelect,TicketStatusBadge,AttendeeDrawer,CommissionTier,BarChart,BarList,ProfilePreview}.tsx`; `pages/organizer/{attendees,payouts,analytics,profile}.tsx`.
- Changed: `AccountMenu.tsx`, `libs/routes.ts`, `pages/organizers/[id].tsx`, `scss/organizer.scss` (appended block), `public/locales/{en,ko,ru,uz}/{organizer,common}.json` (204 organizer keys per language, placeholders checked by script).

### Verified
- `yarn tsc --noEmit`: clean. `yarn lint`: clean. `yarn build` in a scratch copy (deleted afterwards): passes, the running dev server was untouched.
- Browser (organizer@ticketzy.demo, localhost:3000, 400 px wide viewport, dark and light):
  - Attendees: Incheon FC vs Seoul United shows 61 sold, 1 checked in, 60 not yet, 0 refunded, the same numbers `getEventAttendees` gives to the check-in counter. For every event with sales, tickets sold equals the sum of `ticketCount` of its PAID orders (checked through the API for all events).
  - Used filter, drawer (2 tickets of one order), CSV (only the filtered row), page 2 of 7.
  - Payouts: gross ₩14,783,000, commission ₩1,478,300, net ₩13,304,700, refunded ₩550,000 (228 tickets); the same `getMyEarnings` numbers as the dashboard. The two net splits (₩367,200 + ₩12,937,500) add up to the net payout. Analytics shows the same 228 tickets and ₩14,783,000.
  - Profile: edited the description, "Profile saved", the public page showed it. Description restored afterwards through `updateMember`.
  - Account menu lists Profile.
- Found and fixed while testing: pagination showed the raw key `pagination.compact` because the `events` namespace was not loaded on `/organizer/attendees`.

### Not tested
- Logo upload in the browser (no file could be sent from the test tool). The upload link already sends `apollo-require-preflight` (`apollo/client.ts`) and the form uses the same `imageUploader(target: "member")` call as `/settings`.
- ko, ru, uz visually; the pages at a real 1440 px desktop width (the test window stayed 400 px wide); the profile of a PENDING organizer; the unsaved-changes prompt (reuses `useUnsavedGuard` from the event form); refunded attendees (no demo event had any); the commission override banner (the demo organizer has no override); weekly buckets (only appear for spans over 120 days).
- Fresh page loads in the dev server took 10 to 25 seconds before hydrating (first compile of each page); this was the same for existing pages.

## Prompt 10a: static pages, error pages, metadata, accessibility, README

### Built
- **Static pages** `/faq`, `/about`, `/terms`, `/privacy`, `/contact` in en, ko, ru, uz. Namespaces: `help` (FAQ and contact), `about`, `legal` (terms and privacy). FAQ groups: buying, seats and the hold, refunds, tickets and QR check-in, organizers, accounts; answers use `libs/site.ts` constants (30 seconds, 8 seats) and the backend rules (refund until 23:59 the day before the event in the venue time zone, commission taken from the organizer payout). Terms and privacy carry a "sample text, not legal advice" notice. Contact shows a mailto address and, for a signed-in organizer, a link to the messages inbox (no form).
- **Links**: footer gets a Help column (FAQ, About, Contact) and Terms / Privacy in the bottom bar; the account menu gets "Help & FAQ". The organizer sidebar already linked to `/contact`; that page now exists.
- **Demo notice**: `DemoNotice` banner (dismissible, remembered in local storage) on the checkout page, and a permanent one-line version in the footer.
- **Error pages**: designed 404 and 500 (`ErrorScreen`), an error boundary around the page in `_app.tsx` (retry, home, events; a navigation clears it). The failed-query inline states with retry already existed on home, events, event detail, seats, checkout, orders and tickets; checked, not rewritten.
- **Metadata**: `Seo` now writes Open Graph, Twitter, `og:url`, canonical and hreflang (en, ko, ru, uz, x-default); noindex pages get `noindex,nofollow` and no canonical. Login and sign-up now use `Seo` with noindex. Favicon (ico, svg), apple-touch icon, 192 and 512 icons, manifest and a default Open Graph image were generated with a small script (no external assets). `theme-color` for dark and light, kept in step with the chosen theme. `/robots.txt` and `/sitemap.xml` are page files (`libs/seo.ts`) built from `NEXT_PUBLIC_SITE_URL`; the sitemap lists the static pages and every public event in all four languages. `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` added to `.env.example`. `<html lang>` now follows the locale (the fixed `lang="en"` was removed from `_document`).
- **Accessibility**: chart hover targets (`SalesChart`, `BarChart`) used `aria-label` on a bare `rect` (axe `aria-prohibited-attr`, serious): the `rect` now has `role="img"` and the svg `role="group"`; the compact home cards use `h2` (axe `heading-order`); the hero image has the event title as alt text; the global focus ring also covers `select`, `textarea` and `summary`.
- **README.md** rewritten (Korean summary, features by role, stack, architecture, setup, env table, demo accounts without passwords, scripts, structure, limitations, deployment placeholders).

### Verified
- `yarn tsc --noEmit`, `yarn lint`: clean. `yarn build` in a scratch copy (node_modules linked, `NEXT_PUBLIC_SITE_URL` set): succeeds; with `next start` there, `/robots.txt` (text/plain) and `/sitemap.xml` (application/xml) return 200 and use the configured site URL.
- i18n: key and `{{placeholder}}` parity for the new namespaces and the new `common` keys across en, ko, ru, uz (script check; the only differences in the old files are legitimate plural forms).
- Browser, http://localhost:3000, buyer and organizer demo accounts: FAQ, About, Contact, Privacy, 500 and 404 in several languages; the error boundary (temporary throwing page, removed); the inline "We couldn't load events" state with retry (fetch blocked); robots.txt and sitemap.xml (68 entries = 17 pages x 4 languages); view-source style check of title, description, Open Graph, Twitter, canonical, hreflang and `<html lang>` for `/faq`, `/ko/about`, `/ru/terms`, and `noindex` on login; the demo notice (dismiss with Enter, persisted); keyboard walk: account menu (Enter, Escape returns focus), section list, seat grid (Enter selects), Continue to checkout.
- axe-core 4.10.2 (injected from a CDN in the page, not a dependency), dark and light, final result no violations on: home, events list, event detail, seat picker, checkout (dark), login (dark), sign-up (dark), organizer dashboard, organizer event form (first step), organizer events, venues, analytics, orders, tickets, FAQ, contact, terms, about. Found and fixed: the chart `aria-prohibited-attr` (serious, 30 nodes) and `heading-order` (moderate).

### Not tested / left
- **Admin events and the other admin pages**: no admin credentials were given, so axe was not run there (the shared dashboard shell and tables were checked on the organizer pages).
- Checkout in the light theme, login and sign-up in the light theme, and the later steps of the event form (tickets, venue, images, review) were not scanned.
- **390 px**: the test window cannot be resized, so FAQ, privacy and the 500 page were checked in 390 px wide iframes; checkout and the seat map were not checked at 390 px.
- `/robots.txt` and `/sitemap.xml` were also checked on the running dev server on port 3000 (they work there without a restart).
- Client-side navigation by `router.push` in the background test tab stalled and produced a hydration warning; the same happened on an existing page (`/sell` to `/events`) with the error boundary removed, and a real click on a link worked, so it was treated as a test-tab artifact (the tab reports `document.hidden`).
- Contrast was checked by axe only (no manual review of every state, for example hover and disabled).

## Prompt 10b: motion, responsive and language polish

### Built
- **Motion** (CSS only, no new dependency; tokens in `tokens.css`/`tokens.json`, rules in `scss/motion.scss`): seat map pulse and smooth colour change; hold countdown ring on the picker, the pending-order box and checkout (urgent in the last 10 seconds, server time offset); route fade/slide on `main`; card lift and image zoom (hover devices only), press states, eased focus ring; animated check mark on the paid confirmation, QR fade-in, success messages slide in (refund, saved forms, settings); dashboard and admin counters count up once; bell shakes once; assistant panel closes smoothly; one slow hero drift on the home page. Reduced motion turns everything off except a 120 ms page fade.
- **Skeletons**: the lists and detail pages already had skeleton loaders (events, event detail, orders, tickets, organizer and admin tables); the only spinner left is the 14 px one inside the follow button. The seat map, editors, charts and scanner get a skeleton block while their code loads.
- **Responsive** (`scss/responsive.scss` and small fixes, see F262, F263): 44 px touch targets below 768 px, seat list buttons 44 px, no wrapped figures, no cut dates, no page-wide overflow in Russian.
- **Language pass**: `yarn i18n:check` (new script); fixes for the raw key `pagination.compact` on four admin pages, the `auth` namespace on the organizer profile, and layout fixes found in ko, ru, uz (F263).
- **Accessibility**: `definition-list` (serious) on the last step of the event form, `page-has-heading-one` on `/sell`, 36 px password toggle.
- **Performance**: lazy loading, image sizes and a resizing loader (F269, F270); `useIsomorphicLayoutEffect`; hydration fix on `/events`; the admin overview counters bug (F265).

### Bundle sizes (First Load JS, `yarn build` of the committed code against the working tree, both in scratch copies)
| Page | Before | After |
|---|---|---|
| /organizer/venues/[id] | 291 kB | 260 kB |
| /organizer/venues/new | 290 kB | 258 kB |
| /organizer/events/[id]/edit | 282 kB | 259 kB |
| /organizer/events/new | 281 kB | 258 kB |
| /tickets/[ticketId] | 277 kB | 270 kB |
| /events | 276 kB | 278 kB |
| /admin/events/[id] | 276 kB | 278 kB |
Shared by all pages 254 kB to 255 kB; total of all 51 routes 13,375 kB to 13,344 kB. The five heaviest before (venue editor, new venue, event edit, new event, ticket) dropped by 7 to 32 kB. The five heaviest now are `/admin/events/[id]`, `/admin/organizers`, `/events` (all 278 kB), `/admin/members` (276) and `/organizer/profile` (275); a few admin pages and the profile grew by 2 to 5 kB (next/image on the event pages, CountUp, motion code; the cause of the +5 on the admin organizers, members and profile pages was not found). The 255 kB shared chunk (MUI, Apollo, i18n, React) was not reduced. `next build` still warns that the translation data of some admin pages is over 128 kB (they load several namespaces).
- Fonts: `next/font` self-hosts Onest, Noto Sans KR and JetBrains Mono with size-adjusted fallbacks; the Hangul slices of Noto Sans KR load on demand (checked: `__Noto_Sans_KR` faces loaded on `/ko/events`); layout shift measured by a `layout-shift` observer on home (390 and 1440 px), events and event detail: 0.000.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check`: clean. `yarn build` in a scratch copy: passes; the dev server on port 3000 was not touched.
- **Console and terminal**: browser console on home, events, event detail, seats and several organizer pages: no React warning (one hydration warning on `/events` was found and fixed). The user's dev terminal cannot be read from here; instead a scratch `next dev` on port 3100 (used only for `curl` of 23 pages in four languages, then killed) printed no warning.
- **Per page group** (iframe widths, see F273; en unless said; "390 ko/ru/uz" = all pages of the group listed in the last row):
  - Public (home, events, event detail, seat picker, FAQ, about, terms, privacy, contact, sell, login, sign-up, join): 390 dark and light, 768, 1440 (home, events, detail, seats); ko, ru, uz at 390 for all of them; axe light on login, sign-up, sell and join: no serious or critical.
  - Buyer (checkout, orders, order detail, confirmation, tickets, ticket detail, notifications, settings, saved, following): 390 dark (checkout also light), 768 (orders, order, tickets, ticket, seats), 1440 (orders, ticket, settings, notifications); ko, ru, uz at 390: ru orders, order detail, confirmation, tickets, ticket detail, notifications, settings; ko order detail, tickets, settings; uz orders, order detail, tickets, settings (saved, following and checkout only in en); axe light on checkout: none. The seat picker was driven at 390 px: seat selected by click (pulse seen), Continue created an order, checkout showed the ring 0:26, amber, then red at 0:08. The QR code renders after the lazy import.
  - Organizer (dashboard, events, event form all six steps, venues list and editor, orders, attendees, payouts, analytics, check-in, messages, profile): 390 dark (events also light), 768 light (dashboard, events, new event, orders, venues, new venue, attendees, payouts); ko, ru, uz at 390 for all 13; axe light on all six steps of a new event and of an existing event: none after the fix.
  - Admin (overview, events, event detail, members, orders, organizers, commission, messages): 390 dark, 768 dark, 1024 light, 1440 dark; ko, ru and uz at 390 (ko and ru all eight, uz overview, organizers, orders, members); axe light on all eight: none.
- **Reduced motion**: media rules unwrapped in a loaded page, computed styles read (main fades 120 ms, the rest 0.01 ms).
- **Language**: dates, numbers and money come from `Intl` (ko "₩4,141", ru "4 141 ₩", uz "₩ 4,141" as this browser's ICU gives it) and the existing Uzbek date helper; no raw key found by the script or by the page scans; Korean text uses Noto Sans KR (faces loaded).

### Not tested / left
- No real touch device: pinch and drag on the seat map were not exercised (clicks were sent by script); hover lift and image zoom were checked by CSS, not by a mouse; the bell shake was checked by adding the class, not by a real new notification; the pay button was not pressed (it would change demo orders), so the check mark was seen only through the existing paid confirmation page.
- Not every page at every width and theme: 1024 px was run for the admin pages (light) and a few others; organizer pages were not run at 1024 or 1440 px; ko, ru and uz were only run at 390 px; light theme was run on the pages named above, dark elsewhere.
- axe was not run on dialogs, drawers, menus or the assistant panel.
- Uzbek number grouping follows the browser's ICU data (comma), which may differ from CLDR in other browsers.
- The backend's "No data found!" for an empty list nulls a whole query document; only the admin overview was split. Other admin pages that combine several lists in one query were not checked for the same wrong zeros.
- The 255 kB shared bundle and the large translation payloads of some admin pages are unchanged.

## Prompt 10c: home polish and two leftover bugs

### Built / fixed
- **Scroll reveal** on the home page (F274): `libs/components/common/Reveal.tsx`, CSS in `scss/motion.scss`. Visible without JS and with reduced motion; CLS stays 0.000.
- **Category tiles** (F276): keyboard focus lifts like hover.
- **Login/sign-up first-input bug** (F277): `libs/hooks/useAdoptTypedValues.ts`, used by `LoginForm` and `SignupForm`.
- **Admin events tab counts** (F278): `libs/admin/useAdminEventCounts.ts`, `GET_ADMIN_EVENT_COUNT` replaces `GET_ADMIN_EVENT_COUNTS`.
- **Demand badges: not done** (F275). The events queries return no stock data; backend field needed.

### Pages checked for several lists in one query
Admin: overview (already split), events (fixed), orders (counts and list are `getAllOrdersByAdmin`, a facet that never errors; event filter is one `getEventsByAdmin`), organizers (facet), members (facet), commission, messages. Organizer: dashboard, events, event orders (counts), check-in (counts), analytics, payouts, attendees, venues, profile, messages: all use facet endpoints or `getTicketTypes` aliases (which only fail for an unknown event or a non-active organizer). Public: home (`getEvents` x5 plus organizers, all facets; an empty category returns `[]`, checked against the backend).

### Verified
tsc, lint, i18n:check clean; `yarn build` in a scratch copy passes. Browser (port 3000): home reveal at 1440 (sections hidden below the fold, shown after scrolling, CLS 0.0000) and in a 390 px dark ru iframe; tile focus (transform and ring) in ko; sign-in with text present before hydration (page rebuilt with scripts held back): button disabled, values kept, submit used them.

### Not tested / left
- No admin password, so the admin events counts fix was not run against real data; the organizer and buyer logins were not exercised (a credential probe was denied), so the organizer pages were audited from code and the backend source only.
- Reduced motion was checked by code path (`Reveal` never hides), not with an OS setting; 768 px, light theme for reveal and en/uz not separately run.
- Pre-existing dev warnings on home: next/image "loader does not implement width" for picsum images at width 1200 (not a React warning, not changed).

## Prompt 12: payouts UI, seat badges, console cleanup

### Built / fixed
- **Organizer payouts** (F280): schedule section on `/organizer/payouts` with totals, status filter, sort, table and cards, explanation and demo note, empty, error and skeleton states.
- **Admin payouts** (F281, F282): `/admin/payouts` with tiles, filters (status, event text, payout date range, sort), pagination, table and cards, Mark as paid out dialog; Due line on the overview (F284).
- **Notification** PAYOUT_PAID in the bell and list, four languages (F285).
- **Seat badges** on event cards (F286); **console**: image loader width, LCP priority (F287).
- Strings in en, ko, ru, uz (`common`, `organizer`, `admin`, `events`). `Pagination` needs the `events` namespace, so the two payouts pages load it.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` in a scratch copy passes (only the existing page-data size warnings).
- Real backend: admin list, status filter, inverted date range (backend text shown), DUE row marked as paid out with a note (the one DUE demo row, "Spring Stand-Up Showcase", is now PAID_OUT; a second API attempt answers "already paid out"), tiles and list refreshed, double-click sent one request (one payout row). Organizer sees the row as Paid out with the paid date and the totals moved; the bell shows "A payout was recorded" with the amount.
- axe (4.10.2, no violations at all): `/admin/payouts`, `/organizer/payouts`, and the open confirm dialog. Dialog: Escape closes, focus returns to the button.
- Layout: organizer payouts at 390 ko dark, 768 ru light, 1440 uz dark; admin payouts at 390 uz dark, 1024 en light, 1440 ko dark; no page overflow, no control under 44 px at 390. Two column fixes found in uz (orders header, wrapping commission).

### Not tested / left
- No organizer picker for the admin list (F281). No demo event reaches a seat-badge threshold, so the badge was not seen on real data (F286). The refusal texts other than "already paid out" were mapped from the backend source, not triggered. Not every width, language and theme combination was run (listed above). The notification link was not clicked (the page it leads to was already open).

## Prompt 12b: ticket logo across the site

### Built / fixed
- **Logo** component (F288) replaces the lime dot inside the shared `Brand` link. Places where dot + wordmark appeared (all go through `Brand`): navbar (`Top.tsx`, desktop and mobile), footer (`Footer.tsx`), organizer and admin sidebar (`DashboardShell.tsx`), error screen (`ErrorBoundary.tsx`). Login, sign-up and organizer join show no wordmark of their own (they sit under the navbar), so nothing to change there.
- Dark theme ring (F289). Icons, og image and manifest already used the same artwork; unchanged.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean (see the build line below).
- Browser (dev server): navbar logo 28 px, footer 24 px, link still 44 px tall at 390; at 390 and 768 in ko and en, light and dark the logo, wordmark and header icons fit; the dark ring was seen.

### Not tested / left
- Admin/organizer sidebar was not looked at in the browser (same component as the navbar). CLS was not measured with a tool; the image has fixed width and height. 1440 was checked on the dev window (about 1470 px) only for en.


## Prompt 14: buyer-only purchasing, loading resilience, stuck skeleton

### Built / fixed
- **Buyer-only UI** (F290-F292): organizer and admin see the event page button dimmed and `aria-disabled` with a spoken explanation on click; seats and checkout URLs redirect with the message; the backend refusal text is mapped and translated (en, ko, ru, uz).
- **Loading resilience** (F293-F295): 20 s query deadline (60 s for mutations, none for uploads and the websocket), one retry for dropped or aborted queries, the "Waking up the server" line after 4 s (once per page load), Retry refetches without reload.
- **Stuck skeleton** (F296): cause was `clearStore()` on sign-out (cancels in-flight queries, re-sends none). Now `resetStore()`; sign-in refetches active queries.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` of a scratch copy passes.
- Against a scratch mock API (the real backend was down): old code, sign out while the page loads, skeleton still showing after 16 s with a 6 s API; fixed code, skeleton gone after about 5 s with the data. Sign-in with `returnTo=/` under a 4 s delay lands on a loaded home. A 25 s answer: wake line at 4 s, error state with Try again at 20 s, Try again loads without a reload. Closed port: error state with Try again. Organizer: button `aria-disabled`, message on click, hides after 6 s, on outside click and on Escape, no navigation; seats URL redirects to the event page with the message; checkout URL redirects to `/events` with the message. Buyer and visitor: still a link to the seats page. Admin: gated like the organizer. axe 4.10.2 on the event page with the message shown: no violations (1456 px, dark). 390 px light in en and ko: message fits. No React warnings in the console.

### Not tested / left
- **Real accounts were not used** (the backend on 3007 was not running; it was being edited by the parallel Prompt 13 work). The three roles were tested against the mock, in one tab one after another instead of private windows. The real backend refusal path (a hold attempted by an organizer) was not exercised, only mapped.
- Not every width, language and theme combination; the signed-up organizer path and the settings logout were reasoned from the shared `clearSession`, not clicked. The event page navbar for a signed-in organizer overflows the 386 px iframe by about 20 px (navbar actions, not touched here).

## Prompt 14b: "best for" hints on the ticketing choice

### Built
- `StepVenue.tsx`: hint line with a Lightbulb icon under each seating card, `aria-describedby` on the radio (description + hint). `scss/organizer.scss`: `.org-radio__hint` (bold, `--warning-text`). `seatingHint` keys in en, ko, ru, uz (DECISIONS F298).

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` passes in a scratch copy; scratch server on 3100 started and stopped (nothing on 3000 touched). Contrast computed from the tokens.

### Not tested / left
- **Not checked in a browser**: the form needs an organizer sign-in and no test credentials were given, so 390/768/1440 px layout, dark theme, keyboard use and the console were not exercised.

## Prompt 14c: show when ticket sales start

### Built
- `libs/salesWindow.ts` (effective window per ticket type = event window and own window, `salesInfo`, `useSalesClock` with one timer per page), `saleState` / `ticketAvailability` now take a server-time `now` and honour the event window (DECISIONS F299, F300).
- `SalesNotice` (`role="status"`, venue time zone, four languages) on the seats page (new `extra` slot in `StateBlock`), the event page ticket box, and the organizer editor (F301, F303).
- Dimmed `aria-disabled` ticket button with a click message while sales have not started (F302).
- "Sales start 10 Oct" chip on `EventCard` in place of the seat badge; `saleStartAt/saleEndAt` added to `EVENT_CARD_FIELDS`, no extra request (F304).
- `formatSalesMoment`, `formatShortDay` in `libs/format.ts`; `sales.*` and `card.salesStart` in en, ko, ru, uz.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` passes in a scratch copy (port 3100, `/graphql` proxied because the backend allows CORS only from 3000; F306).
- Real backend, "QA Test Comedy Night" (it was REJECTED with no sales window): start set to 03:40 (Seoul) in the editor, resubmitted, approved by the admin in the UI. Organizer editor showed the line. Buyer seats page showed "Ticket sales start on Sat, 10 Oct 2026 at 03:40 (Asia/Seoul)." and at 03:40:01, with no reload (same document), the notice went and the seat map appeared. Then the window was cleared again in the editor, resubmitted and re-approved: sales window is back to none.
- Event page (not started): line in the ticket box, button `aria-disabled="true"`, click shows the message in the status region, no navigation. As admin both the not-started and the buyer-only messages show. Cards: ru "Продажа с 15 окт." / "Продажа с 28 окт.". ko and uz text checked in a 390 px frame; the notice is 316 px wide and fits. Contrast 8.8:1 dark, 5.9:1 light (measured). Dev server (scratch, 3100): no React warnings on `/en/events` and the ko event page.

### Not tested / left
- Event page live unlock and the card chip expiring are not timed in a browser (same hook as the seats page; cards have no timer by design).
- The translated backend refusal (clock off by seconds) was not triggered; the text is mapped since F292.
- The final status of "QA Test Comedy Night" is APPROVED (it was REJECTED); an approval cannot be undone from the UI.
- 390 px: the signed-in navbar overflows the frame by about 16 px on the event page (known, not touched). Not every language / theme / width combination was clicked.
- Sessions were switched one after another (no private window available).

## Prompt 14e: venue double-booking errors and admin conflict warning

### Done
- `libs/venueConflict.ts`: parser for "This venue is already booked for {title} from {start} to {end}.", venue-clock formatting, `VenueConflict` type. `describeError` and `describeAdminError` return `key: 'venueBooked'` plus the parts; `describedText()` renders any described error (F307).
- Organizer editor: inline `role="alert"` on the venue step with "Choose another venue / time" buttons that focus the fields; jumps to the venue step after a failed save; cleared when the venue or a date changes; submit dialog shows it with "Change venue or time"; the list's submit dialog goes to `?step=venue` (F308).
- Admin: `VenueConflictPanel` on the event page, warning badge with the count on the pending list, conflicts listed in the approve dialog with "Approve anyway", translated refusal in the dialog (F309, F311).
- `possibleVenueConflicts` only in the admin detail query and the pending-tab list query (`@include`) (F310).
- Keys: organizer `serverErrors.venueBooked`, `submit.fixBooked`, `form.venue.booked.*`; admin `serverErrors.venueBooked`, `event.approve.anyway`, `conflicts.*` in en, ko, ru, uz.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` passes in a scratch copy (3100, `/graphql` proxied).
- Real backend as organizer: a new event overlapping "seng part" at the same venue answered with the refusal; alert shown with localized dates, form kept, both buttons focus the right field (select / date input). As admin: pending list badge, panel on the event page, approve dialog with the list and "Approve anyway".
- Submit-dialog and approve-dialog refusals were shown by faking only that mutation's reply with the backend's text (F312); the approve error scrolls into view.
- 390 px in ko (event page and pending list): no horizontal overflow; dark theme on the approve dialog; no console warnings or errors on the admin pages.

### Not tested / left
- A real same-venue refusal on submit or approve (needs a second organizer's overlapping event); en/ko only were looked at, ru and uz strings are unchecked on screen (plural forms follow the app's existing pattern).
- The organizer form at 390 px and in dark was not screenshotted; the alert uses the existing `tz-alert` styles.
- Test data created: see the report (venue "QA Comedy Cellar" at 99 Lookalike-ro, event "ZZ Venue Clash Test").

## Prompt 14f: home page upgrade (2026-10-09)
Frontend only, not committed. Decisions F313 to F319.

### Done
- Step 0, the old rule: hero = the most viewed event (`getEvents` sorted by `eventViews`, limit 1), falling back to the first upcoming one; beside it the first three of 8 upcoming (soonest first) other than the hero. No check for ended, sold out, image or sales window, and no category mix.
- New hero rule in `libs/homeFeatured.ts` (eligibility, ranking, category mix, fallback, example table); one `getEvents` query of 20; "Featured" label on the hero when it came from the eligible group.
- Category rows (`CategoryRow.tsx`): Concert, Football, Comedy, Other; scroll-snap row, arrow buttons on pointer devices, keyboard, right-edge fade, skeletons, per-row error and Retry, hidden when empty, `Reveal` entrance.
- Removed from the home page: the "Upcoming events" grid, the concerts, football and comedy 4-card grids (`EventSection`), the "Browse by category" tiles, the combined `GET_HOME` query (replaced by `GET_HOME_ORGANIZERS`), the old top-right and foot seat badges.
- `Backdrop.tsx` (two faint ticket marks) in the public layout on the allowed routes only.
- `EventTag.tsx`: one corner tag on every card.
- Keys in en, ko, ru, uz; dead `home.*` keys removed.

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` passes in a scratch copy served on 3100 (`/graphql` proxied to 3007).
- Browser (iframes at 390, 768, 1440; en, ko, ru, uz; light and dark): no horizontal overflow from the new content, all tags single line inside the picture, 10 px (8 px on side cards) from the top and right; dot colours and tag styles read from computed styles; row arrow keys, buttons, disabled and fade states; reduced motion scrolls instantly; axe (wcag2a, wcag2aa, wcag21aa, best-practice) 0 violations on `/` (light, dark), `/events` (light, dark), `/about`, event detail (dark); backdrop present on the allowed routes and absent on login, orders and the others; hidden at 1100 px.
- Layout shift: two real shifts of the home content were found (skeletons shorter than the real cards: 0.02 at 768, 0.05 to 0.07 at 1440) and fixed (F316); the home content now measures 0. A 0.0004 to 0.0014 shift from the signed-in navbar actions remains (not part of this change).

### Not tested / left
- Touch swiping: the tooling cannot send touch gestures; the row is a plain `overflow-x: auto` scroller (`touch-action: auto`), so it is native.
- The row error state and Retry were not triggered (the backend was up); the empty-row hiding was not seen on screen (all four categories have events).
- The three seat tags (few seats, selling fast, sold out) have no demo data; only "Sales start" appeared on real cards. Their colours and sizes were checked on cloned tags; their texts in each language were measured (longest 146 px, fits the 164 px side picture).
- Dead CSS for the old category tiles (`home__cat*`) is still in the stylesheets.

## Prompt 14g: background ticket marks in the logo's colours (2026-10-09)
Frontend only, not committed. Decision F320.

### Done
- `Backdrop.tsx`: the favicon artwork inline in its original colours; opacity 0.07 light, 0.09 dark on the SVG element (raised to 0.11 / 0.12 in 14i, below); marks cropped by 25% of their width at most (130 px) instead of 200 px (`scss/layout.scss`).

### Verified
- `yarn tsc --noEmit`, `yarn lint` clean; `yarn build` passes in a scratch copy (3100). `i18n:check` unchanged (no text changed).
- Computed style: opacity 0.07 / 0.09, filter none, blend normal, fills #0a0b0d and #c8f53c only. Composited colours (calculated, a canvas read-back would not run in the test tab): light ticket rgb(243,246,230) on page rgb(246,246,243), square and bars rgb(229,230,227); dark ticket rgb(27,32,17) on page rgb(10,11,13). Body text on the worst of them: 14.6:1 (light) and 14.6:1 (dark), so no opacity change was needed.
- axe (wcag2a, wcag2aa, wcag21aa, best-practice) 0 violations on `/` and `/events`, light and dark, at 1440. Screenshots of the left mark at 1440 in light and dark.

### Not tested / left
- The demo artifact was not opened. In dark the dark square equals the page colour, so only the ticket shows (dark olive) with the notches and bars as holes; in light the square shows as a soft grey and the ticket as a pale yellow-green.
- No pixel read-back from a real render (the tab did not run an image decode); the numbers are calculated from the fills and opacities.

## Prompt 14h: one-time peek on the home category rows (2026-10-09)
Frontend only, not committed. Decision F321.

### Done
- `libs/hooks/useRailPeek.ts` (new) and one call in `Rail` (`CategoryRow.tsx`): see F321 for the rules (60% visible, 64 px, 450 ms + 150 ms + 450 ms, snap off during the motion, cancel on any interaction, skipped for reduced motion / nothing to scroll / not at start).

### Verified
- `yarn tsc --noEmit`, `yarn lint`, `yarn i18n:check` clean; `yarn build` passes in a scratch copy served on 3100 (stopped afterwards).
- Browser (same-origin iframes of 390, 768, 1440 px): every row that can scroll nudged once when scrolled to, one after another; peak 64 px (64.5 from device rounding), back to 0, inline snap removed. 390: 4 of 4 rows (all have more than one screen of cards); 768: the two rows with 4+ cards, the two 3-card rows correctly skipped; 1440: only the Football row (5 cards) is wider than the screen, the other three fit exactly and were skipped. Hover (real mouse), focus and a `touchstart` event each stopped a running nudge part-way (peaks 35 to 43 px), left the row at 0 with snap restored and it did not run again. With `prefers-reduced-motion` forced to true in the iframe no row moved. Page scroll position unchanged by the nudge; `layout-shift` entries 0 (CLS 0.0000).
- Timing: the test tab reports `document.hidden`, so Chrome only gives frames while a screenshot is being taken. Durations are therefore from the code (timestamps of `requestAnimationFrame`, not frame counts) and the sampled positions follow the ease-out curve (4, 10.5, 17, 22.5 ... px in the first frames), but the 450 / 150 / 450 ms were not measured with a stopwatch on a visible tab.

### Not tested / left
- Real touch gestures and real arrow-button or keyboard clicks (touchstart and focus were sent as events or `focus()`; hover was a real mouse move). All use the same listener list.
- Reduced motion was forced by replacing `matchMedia` in the iframe, not by the OS setting.
- At 390 px the iframe's document was 16 px wider than the viewport, from the navbar actions (not the rows, which scroll inside their own box); not investigated here.

## Prompt 14i: stronger background marks (2026-10-09)
Frontend only, not committed. Decision F320 (values updated).

### Done
- `scss/layout.scss`: backdrop mark opacity 0.11 in light (was 0.07) and 0.12 in dark (was 0.09). Colours, 25% crop, 1200 px minimum and routes unchanged.

### Verified
- Computed opacity 0.11 / 0.12 in light / dark. axe (wcag2a, wcag2aa, wcag21aa, best-practice) at 1440: 0 violations on `/` and `/events` in light and dark. Lowest contrast axe measured: 5.67:1 light, 5.87:1 dark (both pages). axe lists 10 (`/`) and 16 (`/events`) colour-contrast checks as "incomplete" (it cannot decide over images), same as before.
- Calculated worst cases (square / ticket composited on the page colour): light square rgb(220,220,218), ticket rgb(241,246,223); dark ticket rgb(33,39,19), square equals the page. Body text on the worst surface: 13.9:1 light, 14.1:1 dark; muted text 6.4:1 light, 7.8:1 dark; subtle text 4.1:1 on the light square (4.6 at the old 0.07), 5.0:1 on the dark ticket. No subtle text sits directly on the page over a mark on `/` or `/events`; on a card (own surface) it is unaffected.

### Not tested / left
- Other backdrop routes (event detail, organizer, info pages) were not re-run in axe; any bare-page subtle text over a light-theme mark there would be 4.1:1, under AA.

## Part X: background mark contrast check, light and dark (2026-10-09)
Frontend only, not committed. Decision F320 (extended). Closes the "other backdrop routes not re-run" note of 14i.

### Done
- `Backdrop.tsx` adds `tz-backdrop--soft` on `/events/[id]` and `/organizers/[id]`; `scss/layout.scss` sets the light-theme mark opacity to 0.07 there. Nothing else changed: other routes stay 0.11 (light) / 0.12 (dark), dark stays 0.12 everywhere.
- Why not the two options in the brief: 0.09 for all routes still fails (4.33:1 on the event page; 0.075 gives 4.47). Moving a mark does not work: the layer is `position: fixed` and the text scrolls under it; on these pages the subtle text (`Starts`, `Ends`, `Times are shown in...`, `Prices include fees`, the comments count, the `@` handle) sits at the content edge, which the marks overlap at 1200 to 1600 px.

### Method
- axe (wcag2a, wcag2aa, wcag21aa, best-practice) plus a DOM scan on all nine routes, both themes, 1333 to 1633 px wide. The scan scrolls the page in thirds of the viewport, forces `data-reveal` sections shown, takes every text node with no own background up to the page, maps sample points through the mark's inverse transform to its shape (square, ticket, notches, bars), composites the fill at the mark opacity on the page colour and computes the ratio with the real text colour.

### Lowest contrast of text on the bare page over a mark (before, then after)
| Route | Light | Dark |
|---|---|---|
| `/` | 5.13 (green "See all" link) | 12.15 |
| `/events` | 6.38 (muted "From"/"To") | 7.82 |
| `/events/[id]` | 4.14 fail, now 4.52 (subtle "Starts") | 4.99 (subtle "Starts"; 7.82 at 1600 px) |
| `/organizers/[id]` | 4.14 fail, now 4.52 (subtle "@") | 14.11 (only text over a mark) |
| `/about`, `/faq`, `/contact`, `/privacy`, `/terms` | no bare text over a mark | no bare text over a mark |

axe: 0 violations on every route in both themes after the change (lowest passing ratio on the page: 5.24 to 5.67 light, 5.87 to 8.29 dark). One `color-contrast` hit on `.pg-fab` ("Ask Ticketzy") on `/` appeared once, right after a theme switch, and not in the later runs (a transition read mid-way; not related to the marks).

### Not tested / left
- Event detail and organizer were measured for one event / one organizer; other content moves the text but the worst surface (square at 0.07) bounds the ratio, 4.52:1 for `--ink-subtle` (#63676f), so the margin is 0.02 at the tightest.
- Dev server in a tab that is not visible: pages stay hidden until a screenshot wakes the tab; numbers are calculated from fills and opacity, not from a pixel read-back.

## Prompt 16a: project guide files and skills index (2026-10-12)
Frontend only, not committed. Decision F322. No application code changed.

### Done
- `AGENTS.md` rewritten (about 70 lines): what Ticketzy is, stack, roles, buyer-only rule, commands, working rules, design rules, key files, skills. Kept from the old file: backend docs pointer, small incremental changes, Yarn only, typecheck after each phase. Fixed: the "DECIONS.md" typo, the "petoria" reference, and the old rule to update `ticketzy/docs/ai/COMPLETED_TASKS.md` (F1 put the frontend log here).
- `CLAUDE.md` created: `@AGENTS.md` and three notes.
- `docs/ai/SKILLS.md` created: the eight installed skills, the two project skills, the global `find-skills`, and how the lock file is used.
- Project skills `.claude/skills/ticketzy-ui` and `.claude/skills/ticketzy-frontend-workflow` created.
- README: "Working with AI tools" section (7 lines).
- `.claude/settings.local.json` was already in `.gitignore` and is untracked (`git check-ignore` confirms); nothing to change.

### Not tested / left
- The command that restores skills from `skills-lock.json` was not run or named (unverified).
- Root `SKILLS.md` (empty) and `.cursor/` (empty) untouched.


## Prompt D1: design audit with the installed skills (2026-10-13)

Frontend only, not committed. Decision F323. No application code changed; the only files touched are `docs/ai/DESIGN_AUDIT.md` (new), `DECISIONS.md` and this file.

### Done
- Audit report `docs/ai/DESIGN_AUDIT.md`: top 10 quick wins, 32 rows (P1 3, P2 16, P3 13), what must not change, findings that conflict with decisions (F18/F288, F316, F197/F206, F106/F302, F262, F318), four batches of work.
- Checked in the Chrome tab on `localhost:3000` (signed in as the demo buyer) with the iframe method at 390, 768 and 1440 px in dark and light: home, events list (filters, empty, page past the end), event detail, seats (reserved and general), checkout (expired hold and a live hold), orders, order detail, confirmation, failed order, my tickets, notifications, settings, public organizer page, about, FAQ, contact, terms. Login and sign-up (buyer and organizer, empty submit) in a second tab on `127.0.0.1:3000` (signed out).
- Automated per combination: sideways overflow, controls under 44 px, controls without a name, raw i18n keys, clipped text; axe-core 4.10.2 (CDN) at 390 and 1440 in both themes. One moderate axe finding (`heading-order` on event cards); everything else clean.
- Main findings: signed-in header overflows at 390 px on every page; Pay button 1454 px down on phone checkout with a 30 s hold; home hero CTA below the fold at 1440 px.

### Not tested / left
- Organizer dashboard (wizard, payouts) and admin pages (events, organizers, payouts): no organizer or admin session, and passwords are not in the repository; code reading only.
- 768 px was measured but not looked at; light theme at 390 was measured but not looked at; no timing of slow interactions; loading skeletons and server-error states not looked at; ticket detail with QR, saved, following, 404, 500, privacy not reviewed.
- Signed-out home and events pages were not checked (the API refuses the 127.0.0.1 origin); they were measured signed in.
- Side effect: one 30-second seat hold was created as the demo buyer (Busan Late Night Stand-Up, Front Tables row 1 seat 1) and left to expire. The tab's saved language was changed to English during the run and set back to Korean.
- No skill script was run; no package was installed.


## Prompt D1b: audit of organizer and admin pages (2026-10-13)

Frontend only, not committed. Decision F324. No application code changed; files touched: `docs/ai/DESIGN_AUDIT.md` (three new sections), `DECISIONS.md` and this file.

### Done
- Organizer (signed in as the approved demo organizer): overview, my events, create-event wizard (all six steps, on an empty form and on an existing draft, stepped with the step tabs only), edit draft, event orders, attendees, check-in, messages, analytics, payouts, venues (list, new, edit), profile, settings, notifications. 390, 768, 1440 px, dark and light; axe at 390 and 1440.
- Admin (the user signed in): overview, event approvals (approved list), event review, organizers and their drawer, payouts, orders, commission, members, messages. Same combinations.
- Result: organizer P1 1, P2 7, P3 7; admin P1 1, P2 5, P3 3. The one critical axe finding is the unnamed avatar file input on profile and settings; the other axe findings are `scrollable-region-focusable` on event review at 390 and `landmark-complementary-is-top-level` on the venue editor.
- Method correction recorded in the report: the first dark pass set `data-theme` after load (MUI palette not switched); all dark numbers come from the second pass that sets the `ticketzy-theme` key first.

### Not tested / left
- Nothing was submitted: no Continue on a valid wizard form (it saves a draft), no approve, reject, suspend, cancel, mark paid, commission override; their dialogs were not opened. Pending approvals and due payouts are both zero, so those controls had nothing to act on.
- Loading and server-error states, image upload, venue picker dropdown opened, check-in camera, 768 px axe, most light-theme screenshots, the admin venue conflict panel and message thread.
- Side effects: the tab's stored theme was changed during the run and put back to `light`. No data was changed.
- No skill script was run; no package was installed.

## Prompt D2: mobile layout fixes (2026-10-13)

Frontend only, not committed. Decision F325, patterns in `docs/ai/UI_PATTERNS.md`.

### Files changed
- New: `libs/components/common/ScrollFade.tsx`, `libs/components/events/TicketBar.tsx`, `libs/components/seats/PayBar.tsx`, `libs/hooks/useStickyBar.ts`, `docs/ai/UI_PATTERNS.md`.
- Edited: `libs/components/Top.tsx`, `libs/components/account/AccountShell.tsx`, `libs/components/events/TicketPanel.tsx`, `pages/events/[id]/index.tsx`, `pages/checkout/[orderId].tsx`, `pages/_document.tsx`, `scss/layout.scss`, `scss/seats.scss`, `scss/events.scss`, `scss/account.scss`, `scss/assistant.scss`, `scss/tokens.css`, `scss/tokens.json`, `public/locales/{en,ko,ru,uz}/{checkout,events}.json` (3 keys each: `pay.payShort`, `pay.barLabel`, `detail.barLabel`), `docs/ai/DESIGN_AUDIT.md`, `DECISIONS.md`, this file.

### Done
- Header at 320, 360, 390: no sideways scroll signed in; icon-only language trigger; theme toggle and language moved into the menu on very narrow phones.
- Sticky pay bar on checkout, sticky ticket bar on event detail, shared edge fade on the account tab strip, Ask button lifted above bars and clear of the footer.

### Checks
- `yarn typecheck`, `yarn lint`, `yarn i18n:check`: clean. `yarn build` in a scratch copy: succeeds; the scratch build started on port 3100 and returned 200 (no data, the API only allows port 3000).
- Browser (iframes of 320, 390, 768, 1440 px on localhost:3000, dark set through the `ticketzy-theme` key before load, signed in as the demo buyer): home, events, event detail, seats, settings, notifications and the expired checkout in light and dark: scrollWidth equals clientWidth everywhere, CLS 0.0000 to 0.0001, axe clean except `heading-order` on the events list at 320 to 768 (audit finding 20, not touched) and `label` + `label-title-only` on settings (audit O1, not touched).
- One live hold (general admission, ₩500) at 390 light: bar, one visible Pay button, timer, hold expiry removing the bar, footer room. Not paid.
- Event bar: shown on load, "View tickets" scrolls to the box and focuses its heading, bar hides, dark and light seen.

### Not tested / left
- The live checkout bar at 320, 768 and 1440 and in dark (only one hold was allowed); the pay-error line in the bar; Safari safe-area inset; reduced-motion toggled (code paths only).
- Screenshots were taken at 390 (light and dark) for the event bar, account tabs and checkout bar; 320, 768 and 1440 were measured, not looked at.
- Findings 3, 5 to 13 and the other audit rows were not part of this prompt. No decision in audit section 4 was changed.
- Side effects: one expired unpaid order for the demo buyer. The stored theme was put back to `light`.

## Prompt D3: dashboard accessibility and phone fit (2026-10-13)

Frontend only, not committed. Decisions F326 to F328, patterns in `docs/ai/UI_PATTERNS.md`.

### Files changed
- Edited: `libs/components/dashboard/DashboardShell.tsx`, `libs/components/organizer/editor/EventEditor.tsx`, `pages/organizer/profile.tsx`, `pages/settings/index.tsx`, `pages/organizer/events/index.tsx`, `pages/organizer/events/[id]/orders.tsx`, `pages/organizer/attendees.tsx`, `pages/admin/events/index.tsx`, `pages/admin/events/[id].tsx`, `pages/admin/organizers/index.tsx`, `pages/admin/orders/index.tsx`, `scss/layout.scss`, `scss/responsive.scss`, locale files `organizer.json`, `account.json`, `admin.json` (en, ko, ru, uz), the docs.

### Done
- Fix 1: file inputs on profile and settings have an `aria-label`. Fix 2: `.adm-scroll` is a labelled, focusable region. Fix 3: `tz-blocked` (profile Save/Discard, wizard Back, wizard Save draft/Save changes). Fix 4: 44 px on touch (MUI input, small buttons, language segments, overview/profile/admin links, thumbnail icons, Pause sales row). Fix 5: `ScrollFade` on seven tab strips (organizer events, orders, attendees, wizard steps; admin events, organizers, orders). Fix 6: dashboard drawer as a dialog (Escape, focus in and back, label and `aria-expanded`, `inert` page).

### Checks
- `yarn typecheck`, `yarn lint`, `yarn i18n:check` clean. Scratch build (copy, port 3100) built and answered 200.
- Browser (iframes 390, 768, 1440, light and dark with the `ticketzy-theme` key set before load, axe 4.10.2): organizer pages and admin pages, results in the report. Keyboard: drawer Escape/focus/label on the organizer and admin shells, `.adm-scroll` region reachable. Stored theme put back to `light`.

### Not tested / left
- Login and sign-up fields at 44 px (the signed-in tab redirects away; same rule as the profile fields). Reduced motion not toggled (no new animation). The wizard language segments have no fade (they fit at 390). Light and dark screenshots were looked at only for the profile buttons, the wizard strip and the admin pages listed in the report; other combinations are measured.
- `landmark-complementary-is-top-level` on the venue editor (audit O10) is untouched.
- Nothing was submitted, approved, rejected or cancelled.

## Prompt D4: remaining buyer design fixes (F329 to F332)

### What changed
- Home hero capped at 1280 px and up (F329); events list count and Sort on one row below 480 px and a hidden results `h2` (F330); seat page and general admission Continue as a `tz-blocked` button with a hint (F331); shared seat label helper and `useSectionNames` replacing six seat formatters (F332). Files: `scss/events.scss`, `scss/seats.scss`, `pages/events/index.tsx`, `libs/components/seats/{SeatSummary,SeatPicker,GeneralPicker}.tsx`, `libs/seats/label.ts`, `libs/hooks/useSectionNames.ts`, `libs/components/account/TicketCard.tsx`, `pages/orders/[orderId]/{index,confirmation}.tsx`, `pages/tickets/[ticketId].tsx`, `pages/checkout/[orderId].tsx`, locale files `common`, `events`, `checkout` (en, ko, ru, uz).
- Seat map zoom (audit finding 7): checked in D4b, not confirmed (see D4b below).

### Checks
- `yarn typecheck`, `yarn lint`, `yarn i18n:check` clean. Scratch build from a copy (port 3100) built; `/` and `/events` answered 200.
- Browser (iframes, `ticketzy-theme` set before load, axe 4.10.2): home at 320, 390, 768, 1440 and events at 320, 390, 768, 1440, light and dark: no axe violation, no horizontal overflow, no control under 44 px below 768 px (apart from the hidden native select input). Hero button bottom at 1440 x 800 and x 900 is 625 and 641 px in both themes. Layout shift 0 on home, at most 0.0003 on events. Theme key put back to `light`.

### Not tested
- **The Chrome tab was not signed in** and no password may be typed, so seats, checkout, orders, order detail, ticket detail and my tickets were not opened. The blocked Continue button (dark and light), the seat labels on those pages, the seat map zoom check, axe and overflow on those routes, and the one allowed seat hold are all open. No seat hold was made.
- Screenshots: only the 390 px events top and a scaled 1440 home were looked at; no light screenshots. Reduced motion not toggled (no motion added).

### D4b: verified signed in (verification only, no application code changed)
- Method: Chrome tab signed in as the demo buyer (no password typed), pages loaded in same-origin iframes at 390 and 1440 px with `ticketzy-theme` set before load (light and dark), axe 4.10.2, layout-shift observer. Theme key put back to `light`. One seat hold made (Upper East, row 3, seat 16, 30 s), opened the checkout summary, not paid, left to expire.
- **Continue blocked (F331):** seat page (seated event) and general admission picker, 390 and 1440, light and dark: outlined `tz-blocked` button, `aria-disabled="true"` (not `disabled`), `aria-describedby` the hint ("Select at least one seat to continue." / "Choose at least one ticket to continue."), height 53 px. With one seat selected the button is not blocked and the hold and checkout worked as before.
- **Seat labels (F332):** orders (order detail, history), order detail, ticket detail, my tickets (12 cards), confirmation and the checkout summary show "Upper East, row 9, seat 7" (or "Row 3, seat 16" with "Upper East · Seated" on the confirmation and checkout lines). No tier or section key anywhere (regex for `UPPER_E` style keys found none). "ORCHESTRA" and "Back Row" are organizer-entered ticket type names, not keys. The fallback without a section name ("Row 7, seat 12") was read from `libs/seats/label.ts` and seen only as the first paint of the confirmation; it was not forced with a missing layout.
- **Seat map zoom (audit finding 7): not confirmed.** Choosing each of the five sections in the list at 390 and 1440 px: every section's group stays inside the map (smallest margin 8 px, Upper West 19 px left); the view box is clamped to the layout bounds, which already include a margin, and a screenshot of Upper West shows the full outer seats. What looks cut off on a phone is the lower part of the map under the fixed summary bar, which scrolls. No change made.
- **Axe, overflow, touch (below 768 px), CLS:** seats (seated and general admission), checkout (390 dark, 1440 light only: the hold was gone afterwards), orders, order detail, my tickets: no axe violation, no horizontal overflow, no control under 44 px at 390 (apart from the two items below). Layout shift: all pages 0.00 to 0.08 outside the footer; the footer itself moves while a page loads when the content is shorter than the window (0.1 to 0.9 in the iframe, a pre-existing page-level effect, not from D4).
- **Found, not from D4, not fixed:** (1) ticket detail (seated ticket) has axe `definition-list` and `dlitem` (serious): `div.tdetail__seat` wraps three facts inside the `dl` (the wrapper has no CSS; removing it fixes it). (2) Order confirmation has axe `aria-allowed-role` (minor, `h1 role="status"`) and `page-has-heading-one` (moderate). (3) My tickets: the event title link in a ticket card is 128 x 23 px at 390 (the "View ticket" link beside it is 44 px). (4) Checkout payment radio input is 42 x 42 inside a 44 px label (fine).
- **Home at 1440 x 800, band under the hero:** hero 789 x 560 px (y 113 to 673), side column 395 x 812 px (y 113 to 925), so about 252 px of empty space under the hero before the next section starts at y 989. Options are in the D4b report; none applied.
- Not tested: checkout at 390 light and 1440 dark and the 390 summary in the light theme (the hold lasts 30 s), the fallback label with a missing layout, real touch input and reduced motion.

## Prompt D5: hero band and three buyer accessibility fixes

- **Changed**: `scss/events.scss` (shared `--home-hero-h`, two side cards at 1280 px and up, F333), `pages/tickets/[ticketId].tsx` (no `div.tdetail__seat` inside the `dl`, F334), `pages/orders/[orderId]/confirmation.tsx` (no `role` on the `h1`, polite live region, F335), `scss/responsive.scss` (title link 44 px on touch, F336). No new text, so no locale files changed.
- **Home hero band** (iframes, dark and light, `ticketzy-theme` set before load): 1280 x 720 dark and light 536 / 536 px (hero / side column), 1440 x 800 dark 544 / 544, 1440 x 900 light 560 / 560, 1920 x 1080 dark 560 / 560. Cards 260, 264 and 272 px (never under 260). CLS 0 and the skeleton and loaded heights were equal in every run. 390 px still shows three cards (203, 229, 229 px).
- **Axe** (4.10.2): home 390 dark and 1440 dark, my tickets 390 dark and 1440 dark, seated ticket detail 390 light and 1440 dark, order confirmation 390 light and 1440 dark: 0 violations, one `h1` on each page. Title link 128 x 44 at 390, 128 x 23 at 1440. Theme key restored to light.
- `yarn typecheck`, `yarn lint`, `yarn i18n:check`: clean. Scratch build (copy in the scratchpad, `node_modules` linked): builds, `next start -p 3100` answered 200 on `/`. No console errors or warnings were logged by the pages loaded after console tracking started (home 390 and 1440).
- **Not tested**: a PAID confirmation (the only order opened was cancelled), a screen reader, light theme axe on home and my tickets, 1440 x 800 and 1920 light screenshots (geometry is theme independent), reduced motion (no motion added), a real touch device.

## Prompt N1: Nestar frontend comparison (report only)

- **Changed**: new `docs/ai/NESTAR_FRONTEND_COMPARISON.md`; one entry (F337) in `docs/ai/DECISIONS.md`; one line in the README docs list. No application code, no `package.json`, no locale files. Nothing committed. Nestar was only read.
- **Nestar used**: `/Users/kenneth/nestar-next` (Next 14.2.0, Apollo Client 3, MUI 5, next-i18next, `subscriptions-transport-ws`). `/Users/kenneth/nestar-client` is a 0-byte file with no `package.json`.
- **Method**: read the Apollo client, store, auth, `_app`, `_document`, layouts, theme, alert helpers, one list page and one upload form in both repos; counted `any`, `@ts-ignore`, `console`, `aria-`, `@media` and similar with `grep`. A first read of Nestar's `.env.development` was blocked and not repeated (rule 4); env names come from `process.env` use in code.
- **Checks**: none of `yarn typecheck`, `yarn lint`, `yarn i18n:check` were needed (only Markdown changed).
- **Not tested**: Nestar was never run; backend decision numbers are quoted from comments in this repo; no expired-token run on each Ticketzy page; bundle contents not analysed. Full list at the end of the comparison file.

## Prompt N2: Cleanup and risk audit (report only)

- **Changed**: new `docs/ai/CLEANUP_AUDIT.md` (10 sections, findings C1-1 to C10-4) and this entry. No application code, `package.json`, config or locale file. No decision number added (nothing was decided). Nothing committed.
- **Method**: grep and import scans, three small Node scripts (unused files, unused exports, unused SCSS classes) kept in the scratchpad, a scratch copy of the repo for `yarn build`, `yarn lint`, `yarn typecheck` and `yarn i18n:check` (port 3000 untouched), and the Chrome test tab on the running dev server for the console on home and the event page. No `.env*` file was read.
- **Checks**: in the scratch copy build OK (128 pages), lint clean, typecheck clean, i18n check OK.
- **Not tested**: checkout in the browser, a real expired token on each page, the `returnTo` tab bypass through the login form, the favicon and picsum warnings (not reproduced), a production build with the backend off, unused locale keys, a bundle analyzer. Full list at the end of the audit.

## Prompt N3: security, session, CI and config fixes

- **Changed**: new `libs/safeReturnTo.ts`, `libs/auth/sessionExpired.ts`, `scripts/check-return-to.js`, `.github/workflows/ci.yml`; edited `libs/routes.ts` (`loginUrl(returnTo, reason)`, re-export), `libs/auth/index.ts`, `libs/auth/guards.tsx`, `apollo/client.ts`, `libs/hooks/useSessionWatch.ts`, `libs/messaging/socket.ts`, `pages/_app.tsx`, `libs/components/seats/SeatPicker.tsx` and `pages/checkout/[orderId].tsx` (own `useSessionWatch` calls removed), `libs/components/auth/LoginForm.tsx`, `libs/components/common/DemoNotice.tsx`, `libs/serverFetch.ts`, `libs/seo.ts`, `next.config.js`, `.env.example` (comment only), `.gitignore`, `package.json` (one script, no dependency), `public/locales/{en,ko,ru,uz}/{auth,common}.json` (`errors.sessionExpired`, `demo.noEmail`), `docs/ai/NESTAR_FRONTEND_COMPARISON.md` (two corrections), `docs/ai/CLEANUP_AUDIT.md` (fixed rows marked). Decisions F338 to F341. Nothing committed.
- **Env files**: `git ls-files` lists only `.env.example`; no other env file is tracked. No env file was read.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` clean; `yarn check:return-to` 37 of 37 pass (includes `/%09/evil.com`). Scratch build (copy in the scratchpad, `node_modules` linked, no `.env*` copied): fails with the clear message when `NEXT_PUBLIC_SITE_URL` is unset, builds with a dummy value.
- **Browser** (dev server on 3000, Chrome test tab): signed in home loads (header shows the avatar); signed out home loads and the footer reads "Demo project: payments are simulated, no real money is charged. Demo only. No emails are sent." Expired session on `/tickets`: with the real session open, the stored token was replaced by a well-formed token with a bad signature and the page moved to `/orders` through its link; the first private query failed `UNAUTHENTICATED`, the app moved once to `/account/login?returnTo=%2Forders&reason=expired`, the message "Your session ended. Sign in again to continue." showed, the token was removed, the URL stayed stable (no loop). The real token was put back afterwards (a copy in a temporary key, removed again); the header shows the signed-in avatar, no new sign-in is needed.
- **Found while testing**: a fake token loaded cold is not rejected by the backend (`getMember` is public, answers "No data found!"), so the session is kept with no profile and a guarded page goes to login without the message and leaves the token (as before this task). Not changed.
- **Not tested**: wrong password on the login form (no credentials typed; the operation names are excluded in code), the socket 4401 path, seats and checkout with the global watcher (needs a seat hold, which was not made), a token whose `exp` has passed on a cold load (code path only), ko/ru/uz renderings of the new text, light theme and axe on the login message, the CI workflow on GitHub, the sitemap and event page under a real 8 s timeout, a production `next start` with the new config.

## Prompt N4: cleanup audit fixes (dead code, Nestar leftovers, typing, blocked buttons)

- **Changed**: `package.json` and `yarn.lock` (4 packages removed, version 0.1.0, license MIT, description, `changelog` script gone), new `LICENSE`, `CHANGELOG.md` (rewritten), `README.md`, `.gitignore`, `.prettierrc`, `.eslintrc.json`, `tsconfig.json`; deleted `libs/sweetAlert.ts`, `public/img` (83 files), `public/next.svg`, `public/vercel.svg`; new `libs/types/queries.ts`; typed queries in 11 files; 32 pages got `GetStaticPropsContext`; `LayoutBasic.tsx`, `DashboardShell.tsx`, `apollo/client.ts`, `apollo/resilience.ts`, `pages/_app.tsx`; unused names removed in 6 files; blocked buttons in `VenueEditor.tsx`, `EventEditor.tsx`, `SubmitDialog.tsx`, `StepTranslations.tsx`, `Composer.tsx`, `AssistantWidget.tsx`, `scss/layout.scss`; `Logo.tsx`, `EventImage.tsx`, `Avatar.tsx`; docs (F342 to F345, audit rows, UI_PATTERNS). No locale file changed (no new text). Nothing committed.
- **Checks**: `yarn typecheck` (with the stricter flags), `yarn lint` (with `eqeqeq` and `no-console`), `yarn i18n:check`, `yarn check:return-to` (37 of 37). Scratch builds of the tree before and after (copies in the scratchpad, `node_modules` linked, no `.env*`): both build 128 pages; First Load JS shared 264 kB before and after; client `static` JS and CSS 3,458,286 bytes before, 3,459,135 after (+849 bytes); route sizes equal except three pages 1 kB smaller.
- **Browser** (dev server, same-origin iframes, `ticketzy-theme` key): home, event detail and my tickets at 390 and 1440 in light and dark: axe 0 violations, one `h1`, no horizontal overflow, no broken images. Network: every image request returned 200 or 304 except `localhost:3007/https://picsum.photos/.../member-buyer` (503, fixed in `Avatar`). Console: the width/height warning on the event page at 1440 px was reproduced (image exactly 1200 px wide) and gone after the fix.
- **Venue editor** (organizer session, saved venue "QA Comedy Cellar", 390 and 1440, light and dark): axe found `landmark-complementary-is-top-level` on the `<aside class="ve__side">` (older than this task); it is now a `<section>` with the same label, then 0 violations in all four runs. Save, Undo and Redo are `tz-blocked`, `aria-disabled`, focusable, Save is described by the status line, the click changes nothing; typing in the name flips Save to the normal button and "Unsaved changes", typing the old name back blocks it again (nothing was saved). Heights 45 / 44 / 44 px at 390. Image requests 200 or 304 (the 503 avatar requests came from the run before the `Avatar` fix; afterwards the same image is requested from picsum and returns 200). One console error "Bearer Token is not provided" appeared once, at the sign-in switch (a guest query before the organizer token), none on the venue pages.
- **Not tested**: the assistant and composer blocked buttons, the wizard Submit and Translate buttons, the Submit dialog confirm (all typechecked only), a production `next start`, the lockfile on a clean install. Theme key left as `light`.

## N5: compatibility with backend decisions #90 to #99 (F346)
- **Changed**: `libs/hooks/usePagedQuery.ts` (new); `apollo/organizer/orders.ts`, `apollo/admin/query.ts` (paid-orders documents take `$input`); `pages/organizer/{index,analytics,payouts}.tsx`, `pages/admin/index.tsx`, `libs/organizer/useAllAttendees.ts` (no request above 100 rows); `libs/errors.ts`, `libs/seats/errors.ts`, `libs/messaging/errors.ts`, `libs/admin/errors.ts`, `libs/organizer/errors.ts` (SERVICE_UNAVAILABLE, PAYMENTS_DISABLED, DUPLICATE_VALUE, admin password refusal); `apollo/client.ts` (401 network error ends the session); `auth`, `checkout`, `messages`, `admin`, `organizer` locale files in en, ko, ru, uz.
- **Verified**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass. Browser (dev server, same-origin iframes, 1440 and 390, `fetch` and `console.error` of each iframe logged): guest (home, events, event, organizer page, following), buyer (tickets, orders, settings, following, saved, notifications, event), organizer (overview, events, wizard, edit, orders, venues, venue editor, payouts, analytics, attendees, check-in, profile, messages), admin (overview, members, events, event detail, organizers, orders, commission, payouts, messages): no GraphQL error except the empty-list "No data found!" the admin pages already treat as empty, and `BAD_REQUEST` for my own malformed venue id (the page shows its not-found state). API checks with each role: restricted fields null for others and filled for self and admin; limit 101 refused (200 for admin events); an image upload with a valid token returns a path, with a missing or bad token a 401 `UNAUTHENTICATED`.
- **Not tested**: the multi-page loop of `usePagedQuery` with real data (the organizer has 57 paid orders, one page); the checkout message for `PAYMENT_MODE=disabled` (needs the backend restarted with that mode; code path only typechecked); the `SERVICE_UNAVAILABLE` texts; the 401 upload expiry in the UI; a UI-driven file upload; dark theme; axe (no markup changed). Theme key left as `light`. An upload test file was written to the backend `uploads/event/` folder.

## N6: paid logo splash (F347)
- **Changed**: new `libs/components/common/PaidSplash.tsx` (wrapper markup, fixed confetti array, 3 s timing); `pages/orders/[orderId]/confirmation.tsx` (one line of use); `scss/motion.scss` (sequence keyframes, `.tz-splash*` classes, reduced-motion block); `docs/ai/DECISIONS.md` (F347), `docs/ai/UI_PATTERNS.md` (layer table and splash section). `Logo` is unchanged. No locale, dependency, `package.json` or env change. Not committed.
- **Verified**: `yarn typecheck`, `yarn i18n:check` and a scratch-copy `yarn build` pass (`yarn lint` not run, asked; no test script in the repo). Browser (dev server, Chrome test tab, order paid by the user, widths as same-origin iframes at 390 and 1440, `Date.now` shifted by 5 minutes inside the iframe only once the real 5-minute window had passed, theme set on `<html>`): plays once and is removed from the DOM after 3.03 s at 390 and 1440, dark and light (parent `body`, `position: fixed`, z-index 310, `aria-hidden`, focus stays on `BODY`, `h1` and `role="status"` text intact after); frame gaps at most 29 ms (183 frames in 3 s, `requestAnimationFrame` in the iframe); 24 confetti pieces at 1440 and 16 at 390 (a first version showed 13 because the glow and rings count as `nth-child`, fixed); click, Escape and Enter dismiss (`is-leaving`, `pointer-events: none`, removed about 450 ms later, Escape and Enter default prevented); reload with the key set does not replay (also the user's own first reload); axe 0 violations during the splash and after, dark and light at 390, dark at 1440; console: only info and HMR logs, no errors or warnings. Frozen frames (animations paused at 950 and 1500 ms) checked by eye in dark and light: the glow stays behind the logo, the sheen stays inside the tile, the logo is not washed out in light.
- **Not tested**: a real `prefers-reduced-motion` setting (the Chrome tab cannot emulate it; the page's own reduced-motion rules were copied into the iframe as a plain stylesheet, then no glow, rings, confetti, badge, sheen, transform or blur and a 0.12 s fade were measured); real key presses (Escape and Enter were dispatched as events on the iframe window); the sessionStorage-blocked fallback (code path only); a real phone or a throttled CPU (the frame figures are from a desktop browser); the animation at `/orders` flow from checkout in a real 390 px window (iframes only); ko, ru and uz (no text).

## N7: per-field validation errors (F348)
- **Changed**: new `libs/fieldErrors.ts`, `libs/hooks/useFocusInvalid.ts`; `libs/errors.ts` (`fields`, `VALIDATION_FAILED`), `libs/components/auth/{SignupForm,LoginForm,validation}`, `libs/account/profile.ts`, `libs/organizer/profile.ts`, `pages/settings/index.tsx`, `pages/organizer/profile.tsx`, `libs/assistant/errors.ts`, `apollo/client.ts`; locales `common` (`validation.*`), `auth`, `messages`, `account`, `organizer` in en, ko, ru, uz (nickname hint 3 to 50; old `profile.error.fullName/nick` and auth `errors.required/emailInvalid/passwordShort` removed); `docs/ai/DECISIONS.md` (F348), `docs/ai/UI_PATTERNS.md`.
- **Mismatches with backend DTOs**: profile and organizer profile allowed a nickname of 3 to 12 (backend `MemberUpdate`: 3 to 50); sign-up had no length check for full name (backend 3 to 100) or organization name (3 to 50); the buyer sign-up has no nickname input (the backend nick is optional); `memberDesc` 1000 and `memberAddress` 200 are client limits only (the DTOs have none); phone format is client only. Not checked: other DTO limits in forms outside this task (event, venue, comment, ticket type, notice).
- **Checks**: `yarn typecheck`, `yarn i18n:check` pass; scratch-copy `yarn build` passes; `yarn lint` not run (asked).
- **Browser** (dev server, same-origin iframes at 390 and 1440, light and dark): organizer sign-up with a 2-character and a 60-character name shows "Use 3 to 50 characters." under the field, focus on it, `aria-invalid` and `aria-describedby` set, no banner, no request. Server path: real backend answered `VALIDATION_FAILED` with `memberEmail isEmail`, `memberPassword minLength`, `memberNick isLength` to a request whose variables a scratch `fetch` override in the iframe replaced (client check passed with a generated placeholder, nothing was typed, no account could be created); the form showed the three field messages and no banner, focus on the first. Sign-in client check shows both field messages with focus on the first. Axe 0 violations in both themes, no horizontal overflow, no new console errors.
- **Not tested**: sign-in server path, `/settings` and organizer profile in the browser (need a signed-in session; typechecked only); ko, ru and uz text on screen; per-field errors in the event wizard and other forms.


## N8: deployment prep (F349)
- **Changed**: `libs/components/common/WakeNote.tsx`, `libs/hooks/useWakeNote.ts`, `apollo/resilience.ts` (query-only tracking, `unreachable` flag, 5 s), `libs/components/layout/LayoutBasic.tsx`, `libs/components/dashboard/DashboardShell.tsx` (note moved under the header), `scss/events.scss`; `pages/orders/[orderId]/confirmation.tsx`, `libs/components/auth/SignupForm.tsx`, `pages/organizer/profile.tsx`; `next.config.js`, `libs/config.ts`, `libs/site.ts`, `.env.example`, `README.md`; text in `common`, `checkout`, `auth`, `organizer` for en, ko, ru, uz.
- **Env names**: required in production `NEXT_PUBLIC_API_GRAPHQL_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`; optional `NEXT_PUBLIC_CONTACT_EMAIL`. No `.env*` file was read or edited.
- **Checks**: `yarn typecheck`, `yarn i18n:check` pass; `yarn lint` not run (asked). Scratch-copy build (no `.env*`): fails listing the four names when unset, builds when set.
- **Browser** (dev server, same-origin iframes at 390 and 1440, light and dark): sign-up (organizer), confirmation (paid order, buyer signed in by the user) and organizer profile show their notices; axe 0 violations, no horizontal overflow in all four combinations each. Slow server: GraphQL `fetch` of the iframe delayed 9 s: note absent at 3 s, shown at about 5 s, gone when the answer arrived; rejected `fetch`: shown, dismiss hides it, next answered query keeps it hidden; shown on the public layout and the organizer dashboard, axe clean with it open. The first run logged React's "Cannot update a component (WakeNote) while rendering"; fixed with `queueMicrotask`, not seen again. Remaining console lines are the simulated `[Network error]` logs (development only).
- **Not tested**: checkout notice (text change only; needs an unpaid order with a live hold), ko/ru/uz on screen, a real sleeping host, `prefers-reduced-motion` (note only uses the existing fade), production `next start`.

## N9: AI errors by code (F350)
- **Changed**: new `libs/aiErrors.ts`; `libs/assistant/errors.ts`, `libs/organizer/errors.ts`, `libs/admin/errors.ts`, `libs/errors.ts` (`retryAfterSeconds`), `libs/types/assistant.ts`, `libs/components/assistant/AssistantWidget.tsx` (panel `header` to `div`); `quotaExhausted` and `dailyCap` texts in `common.json` (`assistant.errors`), `organizer.json` and `admin.json` (`ai.errors`) in en, ko, ru, uz; `docs/ai/DECISIONS.md` (F350).
- **Checks**: `yarn typecheck`, `yarn i18n:check` pass; scratch-copy `yarn build` passes (env names set inline, no `.env*` read); `yarn lint` not run (asked).
- **Browser** (dev server, signed out, assistant, same-origin iframe at 390 and 1440, light and dark, `fetch` of `askAssistant` overridden inside the iframe): each of AI_QUOTA_EXHAUSTED, AI_DAILY_CAP_REACHED, RATE_LIMITED (30 s), RATE_LIMITED (40000 s, daily), SERVICE_UNAVAILABLE with the busy text, and an unknown code with the quota text (message fallback) shows the expected text and button (Dismiss for quota and daily cap, Try again for rate limit and busy); axe 0 violations.
- **Not tested**: organizer translation and admin moderation screens on screen (need organizer and admin sessions; mapping shared and typechecked only); ko, ru, uz text on screen; a real backend answer (backend was not running); the code Nest gives the plain 429 and 503 AI errors (read from `libs/error-mapping.ts`, not exercised).

## N-F: approval celebration, new notification types, forgot password (F352, F353)
- **Changed**: new `libs/components/common/ApprovalCelebration.tsx` and `SplashOverlay.tsx` (overlay extracted from `PaidSplash.tsx`, which keeps only its decision logic); `pages/_app.tsx`; `apollo/user/query.ts` (`GET_MY_ACCOUNT_STATE`) and `mutation.ts` (`MARK_APPROVAL_CELEBRATION_DONE`); `libs/types/account.ts`; `libs/account/notifications.ts`, `NotificationRow.tsx` (`PAYOUT_DUE`, `ORGANIZER_VERIFIED` link); `libs/routes.ts` (`ROUTES.contact`); `libs/components/auth/LoginForm.tsx`; `scss/motion.scss` (message pill), `scss/auth.scss` (forgot link); `common.json` (`approval.message`, `notifications.type.PAYOUT_DUE`, `PAYOUT_DUE_ADMIN`) and `auth.json` (`login.forgot*`) in en, ko, ru, uz; DECISIONS F352 and F353; UI_PATTERNS; tour 01, 04, 05.
- **Checks**: `yarn typecheck`, `yarn i18n:check` pass (2574 keys in en, 0 missing); scratch-copy `yarn build` passes (env names set inline, no `.env*` read). `yarn lint` not run (asked).
- **Browser**: only partly done. The Chrome profile was signed in as an admin, so the sign-in page redirected away and the organizer steps (sign-up needs the user's password) were not run. Nothing of the new UI was seen on screen. The dev server and backend were running.
- **Not tested**: everything visual and live: the splash and message pill at 390 and 1440 in light and dark, the live approval, no replay after reload and after sign-in, the Forgot password link, notification rows for the new types, axe, console, reduced motion, ko/ru/uz text on screen, and whether the running backend already has `getMyAccountState` (the backend report says it passes its tests but was not run against MongoDB).

## N-F2: approval message layout fix (F352)
- **Changed**: `SplashOverlay.tsx` (message is a sibling block under the stage, modifier `tz-splash--msg`), `scss/motion.scss` (message block, stronger scrim, entrance 300 ms at 900 ms, no entrance animation while leaving), DECISIONS F352. The cause was the 0-width flex wrapper inside the logo stage, which shrank the pill to the logo width.
- **Checks**: `yarn typecheck`, `yarn i18n:check` pass; scratch-copy `yarn build` compiled successfully (exit status not captured because of a pipe); `yarn lint` not run.
- **Browser** (dev server, admin session, same-origin iframes with the overlay markup and real locale texts injected; the real flow needs an organizer): message width 351 px at 390 and 448 px at 1440, inside the viewport. Lines: 390 px en 3, ru 3, uz 3, ko 2; 1440 px en, ru and uz 2. Pill text `--ink` on `--surface` in both themes (244/20/26 on dark, 14/16/19 on white). Screenshots seen: ru at 390 dark, uz at 1440 dark.
- **Not tested**: the real organizer flow and animation timing, reduced motion, axe on the live overlay, light-theme screenshots (computed colors only), and the paid splash on a real order (its markup and `--scrim` are unchanged: no message means no `tz-splash--msg`, no column layout).


## UI batch: phone footer, ended events, date field, price slider, notifications, actions column, messaging (F354 to F361)
- **Changed**: `Footer.tsx`, `Top.tsx`, `common/LanguageSwitcher.tsx`, `scss/layout.scss`, `scss/assistant.scss` (item 1); `libs/errors.ts`, `libs/events.ts` (`isPublicEvent`), `apollo/client.ts`, `apollo/user/query.ts` (`ORDER_FIELDS` venue, `GET_MY_TICKETS` ticket type, notification `authorData`), `libs/seats/types.ts`, `seats/OrderSummary.tsx`, `pages/events/[id]/index.tsx`, `seats.tsx`, `pages/checkout/[orderId].tsx`, `pages/orders/[orderId]/index.tsx`, `confirmation.tsx`, `account/TicketCard.tsx`, `pages/tickets/[ticketId].tsx` (item 2); `events/CategoryRow.tsx` (item 3); new `common/DateField.tsx`, `libs/dateField.ts`, `libs/format.ts` (Uzbek name lists exported), `pages/events/index.tsx`, `scss/events.scss` (items 4 and 5); `notifications/NotificationRow.tsx`, `libs/account/notifications.ts`, `libs/types/account.ts`, `scss/account.scss` (item 6); `scss/admin.scss`, `scss/organizer.scss` (item 7); `messages/Thread.tsx`, `Composer.tsx`, `Inbox.tsx`, `libs/messaging/format.ts`, `scss/messages.scss` (item 8); locale files `common`, `events`, `checkout` in en, ko, ru, uz; DECISIONS F354 to F361, UI_PATTERNS, tour 02, 03, 05.
- **Checks**: `yarn typecheck` clean; `yarn i18n:check` OK (2609 keys in en at the end of the batch, 0 missing, 0 placeholder mismatches); scratch-copy `yarn build` exit 0 (env names set inline, no `.env*` read). `yarn lint` not run (asked). Date helpers and `clusterMessages` run through a throw-away Node script: formats and parsing for en, ko, ru and uz, Monday and Sunday weeks, month clamping, run grouping (all as expected).
- **Browser** (Chrome tab, signed in as admin; same-origin iframes of 360, 390, 900, 1000, 1300 px; axe-core 4.10.2 in the iframe): footer at 360, 390 and 430 px in dark and light (label before the grid, 2 x 2 grid, axe clean, no overlap of the round button with any footer link, no empty band, round button clear of the links, button hidden while the header menu is open, back visible after it closes); home rail arrow in dark; events filter with date fields (en and ko, calendar open: arrows, Enter, Escape, URL `to=2026-10-28` unchanged), slider and formatted numbers; axe clean on home, events with the calendar open, notifications, admin messages (list and thread at 390, 1440 dark and light), ended-event screen (dark and light). Notifications page in ko with real data (rows read as sentences, avatar badge); unread tint, dot and chip checked on rows with the classes added by script because every real notification was already read. Admin messages at 390 and 1440 / 900: page does not scroll (document height equals the viewport), composer pinned, round send button 44 px, back arrow 44 px; grouped bubbles checked on injected markup. Actions column checked on injected rows (real classes, real CSS): the two actions share one line at 1300 px in the organizers (170 px) and commission (220 px) tables.
- **Mocked, not real**: the ended-event screen and the order confirmation of an ended event were driven by a replaced `fetch` in the iframe (`EVENT_ENDED` on `GetEvent` and `GetTicketTypes`, a made-up paid order with `eventData` and one ticket). The confirmation showed the event, venue, "2 x Standing" and total, and asked only for `GetOrder` and `GetMyTickets`.
- **Not tested**: a real ended event (the running backend on 3007 is a working-tree build of the backend repo that has the follow feature removed, so every query with `memberFollowers` fails with "Cannot query field memberFollowers on type Member": the admin organizers list, commission list, event page and organizer page could not load; that is a mismatch between the two repos and was left alone); the real admin organizers, commission, members and events tables with rows; organizer tables (no organizer session); the buyer ticket page, order pages and "My tickets" with an ended event; unread rows from the server; the notification bell dropdown; grouped bubbles with real messages (no messages were sent from the admin account); ru and uz text on screen; reduced motion; yarn lint.

## Follow removed, like heart fixed (F362; backend #122)
- **Changed**: deleted `libs/components/events/FollowButton.tsx` and `pages/account/following.tsx` (staged with `git rm`); `apollo/user/mutation.ts`, `apollo/user/query.ts`, `apollo/admin/query.ts`, `apollo/organizer/sales.ts`, `libs/types/event.ts`, `libs/admin/types.ts`, `libs/admin/organizers.ts` (sort key `likes`), `libs/routes.ts`, `AccountShell.tsx`, `AccountMenu.tsx`, `OrganizerDrawer.tsx`, `ProfilePreview.tsx`, `pages/events/[id]/index.tsx`, `pages/organizers/[id].tsx`, `pages/organizer/analytics.tsx` and `profile.tsx`, `scss/events.scss` and `account.scss`; locale keys and texts in en, ko, ru, uz (`account`, `common`, `events`, `organizer`, `admin`, `help`, `legal`). Heart: new `libs/eventLike.ts`; `LikeButton.tsx` (card variant, cache eviction of `getFavorites`), `EventCard.tsx` (heart beside the link), `pages/index.tsx`, `CategoryRow.tsx` and `pages/organizers/[id].tsx` (queries wait for the session). Docs: DECISIONS F362 and `docs/ai/tour/` 00, 02, 03, 04, 05, 06.
- **Checks**: `yarn typecheck` clean; `yarn i18n:check` OK (0 missing, 0 placeholder mismatches); scratch-copy `yarn build` passes (the four required `NEXT_PUBLIC_*` names set inline, no `.env*` read or copied). `yarn lint` not run (asked).
- **Browser** (dev server, signed in as the buyer by the user, backend on 3007 with #122): like on a card (grey to red at once, 5 to 6, no navigation), event page red with 6, back to the list still red, full reload red on `/events`, the event page and `/`; unlike on the event page grey with 5 at once; `/account/saved` listed the event while liked (6) and dropped it after the unlike (5). Same-origin iframes at 390 and 1440 (light; dark for `/events` and `/` at both widths): `/events`, the event page, the organizer page and `/` axe 0 violations, no horizontal overflow, every visible heart at least 44 px, no follow text; the saved page has one `heading-order` note (card `h3` straight after the page `h1`, an existing structure). Console: no errors (only the dev-mode "LCP image needs priority" warnings).
- **Not tested**: a guest clicking the heart (the user's session stayed signed in; the code path is unchanged), the optimistic rollback on a failed like (no failure was forced), the visited list, ko/ru/uz on screen, organizer and admin pages with the removed counts on screen (the organizer page was loaded; analytics, profile, admin drawer were typechecked only), `prefers-reduced-motion` (no new animation), production `next start`.

## Delete account, ticket PDF, card form, 120 s hold (F363 to F367; backend #123 to #125)
- **Changed**: new `libs/account/ticketPdf.ts`, `libs/hooks/useTicketDownload.ts`, `libs/components/account/DeleteAccount.tsx`, `libs/components/common/AccountDeletedNotice.tsx`, `libs/components/seats/CardForm.tsx`, `libs/checkout/card.ts`; `pages/settings`, `pages/tickets` (both), `pages/checkout/[orderId].tsx`, `pages/admin/members`, `pages/_app.tsx`, `apollo/*` (check query, delete mutation, admin tag fields, `accountDeletedVar`), `libs/errors.ts` (`reasons`, codes), `libs/fieldErrors.ts`, `SignupForm.tsx`, `libs/auth/sessionExpired.ts` (`pauseSessionExpiry`), `libs/site.ts`, `Countdown.tsx`, scss (account, admin, motion, seats), locales in en, ko, ru, uz. New dependency `jspdf` 4.2.1 (pinned).
- **Checks**: `yarn typecheck`, `yarn i18n:check` (2661 keys in en, 0 missing, 0 placeholder mismatches), scratch-copy `yarn build` exit 0 (env names set inline, no `.env*` read). `yarn lint` not run (asked).
- **Browser** (dev server, signed in as the test buyer by the user): Download all gives a 2-page PDF (name, GMT+9 date, venue, buyer, 90 mm QR, code in groups of 4, hint, seen in the PDF viewer); both QR images given to the PDF decode with `BarcodeDetector` to the 89-character token; single download names `ticketzy-late-night-stand-up-with-oh-jae-mi-vol-2-6BA5B4B2BF658ECE155B.pdf`. Delete window with 2 unused tickets (full screen): sentences, Delete blocked and not clickable until `DELETE`, Escape and Cancel close with no change and the field is empty on reopen, Tab stays inside, axe clean in light and dark, 390 px no overflow and controls at least 44 px. Checkout: hold shows 1:55 with 115 in the ring, the 120-second text on the seat page; empty Pay shows four errors and focuses the number; bad Luhn, past expiry, month 13, short CVC, blank name show their lines; spaces and grouping work; a valid card with success went to the confirmation, with the failure box to the "did not go through" screen; a `fetch` hook showed `PayOrder` carrying only `orderId` and `simulate`, and no card value in any request body or URL; no card key in local or session storage; console had no errors.
- **Not tested**: (see the final report for the status of the organizer, admin, delete and sign-up runs); ko, ru, uz on screen; reduced motion; browser autofill of a saved card; the PDF opened in another viewer or printed and scanned from paper; a PDF with a Korean event name.

## Console audit, favorites headings, assistant header, admin tags, sign-up (F368 to F372)
- **Changed**: `libs/auth/index.ts` (wait before `resetStore`), `libs/components/events/EventCard.tsx` and `pages/account/saved.tsx` (`headingLevel`), `libs/components/assistant/AssistantWidget.tsx`, `scss/assistant.scss`, `public/locales/*/common.json` (`assistant.note`, `info`, `infoLabel`), `libs/format.ts` (`formatPlatformMoment`), `pages/admin/members/index.tsx`, `apollo/store.ts` (`signingUpVar`), `libs/components/Top.tsx`, `libs/components/auth/SignupForm.tsx`, `public/locales/*/auth.json` (`signup.submitting` with an ellipsis), `README.md` (Not tested list), DECISIONS F368 to F372.
- **Checks**: `yarn lint`, `yarn typecheck`, `yarn i18n:check` pass; scratch-copy `yarn build` passes (env names set inline, no `.env*` read).
- **Browser** (dev server, same Chrome tab; guest, then buyer, organizer and admin signed in by the user; a Los Angeles browser zone): console audit of the main pages for each role, with sign-out checked for admin, buyer and organizer. Favorites: axe clean, headings H1 then H2. Assistant at 390 px in ko: one line, popover opens, closes on Escape (panel stays) and on an outside press, inside click keeps it open, axe clean in light and dark, no horizontal overflow. Admin member drawer: axe clean in both themes; raw and shown deletion times compared.
- **Not tested**: the sign-up "Creating your account…" state and the header during it (needs a typed password; the code path was not run); checkout page and the buyer pages with a real pending order; the sign-out in a production build (CORS blocked the copy on port 3100); ru and uz assistant header on screen; the admin links "Open previous account" and "Open new account" (no deleted email reused yet).

## Card form wording and focus order (F373)
- **Changed**: `public/locales/{en,ko,ru,uz}/checkout.json` (`card.errors.*.required` and `errors.cardInvalid`), `libs/components/seats/CardForm.tsx` (`validate` no longer focuses, new `focusFirstIssue`), `pages/checkout/[orderId].tsx` (calls `focusFirstIssue` on the next animation frame after the summary error is set), DECISIONS F373.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass (2663 keys in en, 0 missing, 0 placeholder mismatches).
- **Not tested**: not tried in the browser; the new lines on screen in all four languages; focus landing on the first bad field after the box shows; screen-reader announcement order of the alert and the focus move; axe in light and dark; the phone pay bar text.

## Language switch at checkout, unpaid order wording (F374, F375)
- **Changed**: `libs/i18n.ts` (`isSamePageOtherLocale`), `pages/checkout/[orderId].tsx` and `libs/components/seats/SeatPicker.tsx` (leave handlers skip a same-page locale change), `libs/components/account/OrderRow.tsx` and `pages/orders/[orderId]/index.tsx` (Ordered vs Bought), `public/locales/{en,ko,ru,uz}/account.json`, DECISIONS F374 and F375.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass. Browser as buyer: checkout switched en, ko, ru, uz and back to en with the same order id and the countdown running (1:51, 1:32, 1:21, 1:14); paid with 4242 on the same order, the confirmation showed Paid and the history/detail say "bought". A second checkout left to the home page: the order is Cancelled, detail says "ordered 17 Oct 2026" (en, ko, ru checked). The helper was run on 8 URL shapes (prefix, query, other page).
- **Not tested**: the seat page with an active hold during a language switch (Continue goes straight to checkout, so the held-without-order state was not reached; same code path as checkout, only the helper was tested); typed card fields across a switch (kept by design, the page does not remount, not tried); the "Not paid in time" label and the uz "Ordered" wording on screen (the running dev server kept an old uz namespace in memory; the JSON files and `i18n:check` are right, a dev server restart would show them); an EXPIRED order on screen; axe and light/dark (text-only changes).

## Autofill look (F376)
- **Changed**: `scss/app.scss` (global `:-webkit-autofill` rule), `scss/MaterialTheme/index.ts` (same rule on `MuiOutlinedInput` input), DECISIONS F376.
- **Checks**: `yarn typecheck`, `yarn lint` (results in the final report).
- **Not tested**: not tried in Chrome with a saved or suggested password; light and dark on screen; axe; Safari and Firefox (the rule is WebKit/Blink only, Firefox keeps its own look).

## Demo card number: any 16 digits (F377)
- **Changed**: `libs/checkout/card.ts` (Luhn removed, 16-digit limit, new `incomplete` rule), `libs/components/seats/CardForm.tsx` (`maxLength` 19), `public/locales/{en,ko,ru,uz}/checkout.json` (`card.errors.number.incomplete` replaces `invalid`; `pay.testCard` hint), DECISIONS F377.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` (results in the final report).
- **Not tested**: not tried in the browser (typing, pasting letters or 20 digits, the new message in four languages, a full payment with a non-Luhn number); axe and light/dark (text-only change).

## Phone layout: footer, assistant sheet, menu sign-in row (F378)
- **Changed**: `scss/layout.scss` (footer 2-column lists, `.tz-navbar__menu-auth`), `scss/assistant.scss` (sheet, backdrop, 600 px breakpoint), `libs/components/assistant/AssistantWidget.tsx` (backdrop, keyboard lift, scroll lock, focus return), `libs/components/Top.tsx` (sign-in row), DECISIONS F378.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` all pass.
- **Not tested**: nothing was checked in a browser (the Chrome extension was not connected): no 390/360 px look, no axe in light/dark, no long ko/ru/uz labels, no 768 to 1023 px header line check, no phone keyboard, no iOS scroll lock, no focus return on screen.

## Sticky header audit and "Log in" wording (F379, F380)
- **Changed**: `scss/app.scss` (`html` scroll-padding-top), `scss/events.scss` and `scss/static.scss` (old scroll-margin-top removed), `public/locales/en/{account,admin,auth,checkout,common,help,legal,messages,organizer}.json` (39 values). Keys changed (all en): account `profile.sub`, `profile.emailHint`, `profile.signOutTitle`, `profile.signedInAs`, `delete.textBuyer`, `delete.textOrganizer`, `delete.emailWarning`, `delete.unusedTickets_one/_other`; admin `serverErrors.notAuthenticated`, `members.confirm.suspend.text`, `members.confirm.reactivate.text`; auth `login.title/subtitle/submit/submitting/pageTitle`, `signup.signIn`, `pending.text`, `errors.sessionExpired`, `errors.alreadyUsed`, `alreadySignedIn`, `sell.buyerLead/buyerStay/organizerLead/adminLead`; checkout `errors.session`; common `footer.organizerSignIn`; help `faq.groups.0.items.0.a`, `faq.groups.4.items.3.a`, `contact.organizers.text/signedOut/signIn`; legal `privacy.sections.3.list.0/2`; messages `serverErrors.notAuthenticated`; organizer `serverErrors.notAuthenticated`, `analytics.reach.note`, `profile.emailHint`.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` (results in the final report).
- **Not tested**: nothing in a browser: no iOS Safari / Android Chrome scroll, no anchor, skip-link or invalid-field landing check, no light/dark or axe run (text and one scroll rule only).

## Assistant open/close glitches (F381)
- **Changed**: `libs/components/assistant/AssistantWidget.tsx` (html-only scroll lock with position restore, `CLOSE_MS`, label/`aria-expanded` follow `shown`, focus return after unmount), `scss/motion.scss` (200 ms out animations for panel, phone sheet and backdrop), DECISIONS F381.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass.
- **Not tested**: the Chrome extension was not connected, so nothing ran in a browser: no open/close/reopen with X, backdrop and Escape at phone and desktop widths, no iOS or Android scroll check, no reduced-motion run, no axe.

## Assistant close without see-through, upright seat icons (F382)
- **Changed**: `scss/motion.scss`, `scss/assistant.scss` (opacity-free in/out keyframes), `libs/components/seats/SeatMap.tsx` (icon group counter-rotated), DECISIONS F382.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass.
- **Not tested**: no browser run (close at phone and desktop widths, reduced motion, rotated and unrotated sections with selected/held/sold seats, organizer venue preview), no axe.

## Assistant close flash (F383)
- **Changed**: `libs/components/assistant/AssistantWidget.tsx` (`leaving` set during render), DECISIONS F383.
- **Checks**: Playwright (playwright-core in scratchpad, system Chrome, removed afterwards) sampled each frame at 375x667 and 1280x800 for X, Escape and phone backdrop click: before, one frame with no panel/backdrop then remount; after, panel present every frame, opacity 1, backdrop fades 1 to 0.25 to gone, scrollY constant, label correct only after unmount. `yarn typecheck`, `yarn lint`, `yarn i18n:check`.
- **Not tested**: real iOS/Android, axe.

## Header scrolls away on phones (F384)
- **Changed**: `scss/layout.scss` (`.tz-navbar`, `.tz-topbar` sticky only from 768 px), `scss/app.scss` (`scroll-padding-top`), DECISIONS F384.
- **Checks**: Playwright (scratchpad, removed) at 375 and 1280 px on home, login, an event page; menu position at top, with scroll attempts and on reopen; computed styles at 375/767/768/1280. `yarn typecheck`, `yarn lint`, `yarn i18n:check`.
- **Not tested**: signed-in organizer/admin pages in a browser, real devices, axe.

## Messages pages keep the top bar on phones (F384 update)
- **Changed**: `scss/layout.scss` (`.tz-main:has(.msgs-page) > .tz-topbar` sticky), DECISIONS F384.
- **Checks**: signed-in Playwright at 375x667 on /organizer/messages and /admin/messages: no gap, no page scroll, input at the bottom. `yarn typecheck`, `yarn lint`, `yarn i18n:check`.
- **Not tested**: other dashboard pages after the change, real devices, axe, browsers without `:has`.

## Venue focal areas, levels, templates, refund policy, logos, avatar, notifications (F385 to F390)
- **Changed**: `libs/refundPolicy.ts`, `libs/refundText.ts`, `scripts/check-refund-deadline.js` (+ `package.json` script), `libs/seats/focal.ts`, `libs/seats/{types,layout,checkout}.ts`, `libs/venues/{model,history,useVenueEditor,types}.ts` (`templates.ts` deleted), `libs/components/organizer/venues/{LayoutCanvas,FocalPanel,SectionPanel,TemplateDialog,VenueEditor}.tsx`, `libs/components/seats/{SeatMap,SeatPicker,GeneralPicker,SeatSummary,RefundAck}.tsx`, `libs/components/events/{RefundPolicyNote,EventCard}.tsx`, `libs/components/organizer/editor/{RefundFields,StepTickets,StepReview}.tsx`, `libs/organizer/{form,types,useEventEditor}.ts`, `libs/components/account/{RefundPanel,OrderRow}.tsx`, `libs/account/refund.ts`, `libs/components/common/{InitialsAvatar,Avatar,OrganizerAvatar}.tsx`, `libs/components/messages/PartyAvatar.tsx`, `libs/components/notifications/NotificationRow.tsx`, `pages/{events/[id]/index,events/[id]/seats,checkout/[orderId],settings/index,organizer/profile}.tsx`, `apollo/{user,organizer,admin}/*.ts`, `libs/{types,admin}/*.ts`, `libs/format.ts` (dead `formatRefundDeadlineDay` removed), `scss/{app,layout,account,events,seats,venues,messages}.scss`, `scss/MaterialTheme/index.ts`, locales en/ko/ru/uz (`checkout`, `events`, `organizer`, `account`, `common`), DECISIONS F385 to F390.
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass; `yarn check:refund-deadline` 67 checks. Playwright (borrowed from another local project, dev server on port 3100 because another project holds 3000; the test browser relayed API calls to add the CORS header, the API was not changed), 390 and 1280 px, dark and light, signed in as the buyer and the organizer: axe 4.10.2, no violations on 9 pages x 2 widths x 2 themes (events, event non-refundable and window closed, organizer page, seats, orders, notifications, venue editor with the stadium, event form tickets step). Venue editor: all 4 server templates apply with the server's stage or pitch geometry; stadium PITCH does not move (drag, arrows), has no handles and no fields; concert-hall stage moves, resizes by handle and by number, stays in 1000x700, one undo step per drag; legacy venues without a stored stage show 340,4,320x22; a real create of a stadium venue sent `focalArea: { type: "PITCH" }` and the server stored 290,214,420,272 (test venue then set to DELETE). Event form: a draft saved NON_REFUNDABLE, REFUNDABLE 14 and restored to REFUNDABLE 7, each confirmed through the API; 0, 31 and empty days show the error and send nothing. Checkout: non-refundable event, Continue `disabled` until ticked (a forced click sent 0 requests), then `createCheckout` carried `acknowledgeNonRefundable: true` and the payment succeeded (one real paid demo order); refundable event shows the deadline, no checkbox, no flag. Client deadline equals the server's `getRefundQuote` deadline text on 3 of 3 comparable orders. Avatars: layout box offset 0.000 px at 11 sizes x 4 scripts. Notifications: rows about 53 px, no horizontal overflow at 390.
- **Also**: FAQ (refund answers on the deadline and on how to ask) and terms (refund paragraph) rewritten for the per-event policy in en, ko, ru, uz (`help.json`, `legal.json`). Admin phone menu measured signed in as admin at 390 px: 264 px.
- **Template warnings**: found, not changed (see the final report): the editor's `overlap` rule uses a 6-unit plate around each section; the server has no overlap rule.
- **Not tested**: keyboard-only run of the stage handles on a real touch device; real iOS/Android; reduced-motion; the `text-box` fallback in a browser without it; ko, ru and uz were checked by the key script and by reading the event-page and venue strings, not by a native speaker; "My tickets" cards have no refund line.

## View from your seat (F391)
- **What changed**: new `libs/seats/view3d.ts`, `libs/components/seats/seatViewScene.ts`, `libs/components/seats/SeatViewDialog.tsx`; changed `SeatPicker.tsx` (dynamic dialog, opener focus, seat picked last, button under the map), `SeatSummary.tsx` (eye button per line), `scss/seats.scss`, `checkout.json` in en, ko, ru, uz (`view.*`), `package.json`, `yarn.lock` (`three` 0.186.1, `@types/three` 0.186.0).
- **Verified**: typecheck, lint, i18n:check and build pass. `/events/[id]/seats` first load JS 282 kB to 283 kB (page 9.51 to 10.1 kB, shared CSS/JS 283 to 284 kB: the buttons, state and about 1 kB of SCSS). In dev, opening the panel was the first load of two new chunks (`SeatViewDialog` 51 kB and the scene with `three`, unminified 6.2 MB; the production build splits `three` into one lazy chunk of 357 kB, 84 kB gzipped); 10 scripts before the open and none of them contained the scene. Playwright (Chromium, headed, software WebGL), signed in as a buyer: concert hall front and back seat, stadium upper tier, legacy venue (default stage, level 0) at 1280 px dark; stadium upper tier at 390 px light (dialog 390 x 844, full screen). axe on the open dialog: 0 violations (the first run found `aria-label` on a div; it is now `role="img"` on the canvas). 10 open/close cycles on the concert hall: heap 54.4 MB after warm-up to 55.3 MB after 10 (about 0.09 MB per cycle, within noise), DOM nodes 12357 to 12357, event listeners 510 to 510. The selection (1 seat, summary line) was unchanged and no request left the page during the cycles; focus returned to "View from your seat".
- **Not tested**: the 120 s hold itself (it starts on Continue, which makes an order; nothing in the panel touches it); light theme beyond the one 390 px screenshot; the arena venue; real touch pinch and a real GPU; WebGL-off message; reduced-motion; ko, ru and uz text read by a native speaker; a layout with `focalArea` really missing (the API always sends one; the default stage is the code path of a legacy venue).
- **Seen**: the stadium pitch (42 x 27 m) looks small next to the stands from an upper-tier seat, and seats in the first rows at 390 px are large. Suggested single change: scale the pitch (and its lines) by about 2 around its centre while keeping the 420 x 272 canvas box for the map. Not changed.


## Email confirmation, change email, password reset (F392 to F399)

- **What changed**: new pages `/verify-email`, `/forgot-password`, `/reset-password`; sign-up sends `memberLang` and ends on "Check your inbox" with a shared Resend cooldown; `memberLang` follows the language switch; `VerifyEmailBanner`; friendly `EMAIL_NOT_VERIFIED` text in seat hold, checkout and pay; admin organizer drawer shows email status and the refusal; settings "Change email" card and email status; login "Forgot password?" links to the new page; token pages strip the token (`useLinkToken`), `no-referrer` meta and header (`next.config.js`). New files: `libs/auth/emailAuth.ts`, `libs/hooks/useLinkToken.ts`, `libs/hooks/useResendVerification.ts`, `libs/components/auth/{CheckInboxPanel,ResendVerification,StatusScreen}.tsx`, `libs/components/common/{VerifyEmailBanner,NoReferrer}.tsx`, `libs/components/account/ChangeEmail.tsx`, the three pages. Text in en, ko, ru, uz (new keys in `common`, `auth`, `account`, `checkout`, `admin`, one FAQ answer).
- **Checks**: `yarn typecheck`, `yarn lint`, `yarn i18n:check` (0 missing, 0 placeholder mismatches) and `yarn build` pass. Browser run (Playwright borrowed from another local project, headed window, dev server on 3100, the browser relayed API calls to add the CORS header; the API was not changed), 1280 px, one 390 px screenshot, dark theme, real API with the links from the backend console: signed up qa+verify@example.com (typed by the user); banner with Resend and a countdown shown (390 px screenshot checked); seat hold refused with the friendly sentence; verify link: address bar showed `/verify-email` without the token, "Your email is confirmed", banner gone; the seat hold then reached `/checkout/<id>`. Forgot password: the known and an unknown address showed the identical message. Reset link: the address bar lost the token, new password saved, the stored token was cleared and the header showed Log in; a second browser context logged in with the old password was sent to `/account/login?returnTo=%2Forders&reason=expired` on its next page; reusing the link ended on "This link has expired or was already used" with "Ask for a new link"; login with the new password worked and the banner was gone. Settings: the Change email card renders. Two bugs found in the run and fixed: the sign-up redirect beat the "Check your inbox" panel, and Save on the reset page stayed disabled (form mounted after the hook's one look).
- **Not tested**: the "Check your inbox" panel after the redirect fix (typecheck only; needs one more sign-up); the organizer variant of that panel; Resend click and its cooldown end to end; `RATE_LIMITED` messages; a real change-email request and its link; pay with an unconfirmed account (hold was checked, pay uses the same mapping); the admin drawer (approving an unconfirmed organizer); the language switch calling `updateMember`; 390 px of the new pages; light theme; axe on the new pages (skipped on request); ko, ru and uz text read by a native speaker; real email delivery (no Resend key locally, links came from the backend console); a pending order from the run is left to expire.

## Football pitch surround (F400)
- **What changed**: new `libs/seats/surround.ts`; changed `libs/components/seats/SeatMap.tsx` (`FocalShape`, PITCH branch only), `scss/seats.scss` (`&__pitch` block replaced, new run-off, board, dugout and tunnel rules), `libs/components/seats/seatViewScene.ts` (pitch branch). The 2D map, the venue editor canvas, the template thumbnails and the admin preview all use `FocalShape`, so all got it. No backend or dependency change by this task (the backend template was moved by the user first: stands 17 units from the pitch).
- **Measured before drawing**: Football stadium template, plate edge to pitch: north -1, south -1, west -5, east -5 (seat blocks 5, 5, 1, 1), so nothing fitted. After the backend change: 17 on every side. Dev data: of 3 stadium venues only Gwangju World Cup Stadium carries the pitch layout (stands at y 153 / 547, x 229 / 771, so 16 units); Seoul World Cup Stadium and Incheon Football Stadium are still STAGE layouts with other sections.
- **Verified**: typecheck, lint, i18n:check and build pass (`/events/[id]/seats` page 10.1 kB, first load 285 kB; the F391 entry said 283 kB). Playwright (from `~/zentr/frontend`, scratch dev server on 3100, API relay on 3101 with CORS for 3100, both stopped): Gwangju seat map at 1280 dark and 390 light (pitch, run-off, boards, dugouts, tunnel drawn, stands clear of them), editor with the Football stadium template (canvas and the template dialog thumbnail), 3D view from Lower South row 2 seat 15 (dark and light) and Upper South row 3 seat 18 (dark): boards in front, stands behind and above them, dugouts and tunnel visible. axe (wcag2a, wcag2aa) on the seat map: no violations at 1280 dark and 390 light.
- **Not tested**: a concert hall pixel comparison (the STAGE branch and its styles are untouched by the diff, but no before/after screenshot was taken); the buyer map or editor on Seoul and Incheon (they have no pitch in the dev data); an organizer-made venue from the old template (stands 1 to 5 units from the pitch, the surround would overlap their plates); touch and keyboard use of the editor with the new shapes beyond the canvas screenshot; ko, ru, uz (no new text); real GPU rendering (headless SwiftShader); the 3D view at 390 px.
- **Seen**: the north "Lower North" plate has no label in the gap, but "Lower South" and "Upper South" labels sit on the south board band; kept (labels are the old placement). Dugouts are 5 units deep, so on the 2D map they are thin at 100 % zoom.

## 3D "View from your seat" upgrade (F401)
Changed: `libs/seats/view3d.ts` (world scale, edge-based tier height, `sectionShells`, `chairWidth`), `libs/components/seats/seatViewScene.ts` (rails, back wall and roof, stage and pitch scenery, crowd, lighting, `setSeat` / `resetView`), `SeatViewDialog.tsx` (seat stepper, reset button), `SeatPicker.tsx` (passes `seatText` as a function), `scss/seats.scss`, `checkout.json` in en, ko, ru, uz.
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass; a node script on the maths (stadium stands start at the same height, section directions and top tier correct for a stadium and a hall).
Not tested: the scene was not looked at in a browser (the Chrome extension was not connected and the backend was not running), so colors, roof/wall placement, crowd density and the new buttons in light and dark, axe, and touch/pinch are unchecked.

## 3D view for stage venues, people and overview (F402)
Changed: `libs/seats/view3d.ts` (`STAGE_SCALE`, `stageDepthOf`, `roomBox`), `seatViewScene.ts` (room, deeper stage with proscenium and curtains, seated people, overview mode and marker, `setMode`), `SeatViewDialog.tsx` (overview toggle), `checkout.json` in en, ko, ru, uz.
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check`; a node script on a hall and a club (room size, tier heights, stage depth).
Not tested: nothing was looked at in a browser (the Chrome extension was not connected). Colors, ceiling lights, curtains, seated people, the overview camera, light and dark, axe and touch are unchecked.

## 3D view: first look in a browser, sky, phone toolbar (F403)
Changed: `libs/components/seats/seatViewScene.ts` (sky dome, horizon fog), `libs/components/seats/SeatViewDialog.tsx` (Reset label in a span), `scss/seats.scss` (phone toolbar order).
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check` pass. The scene was rendered for the first time in headless Chromium (software GL) from the four backend venue templates (football stadium, concert hall, arena, comedy club) using a temporary page, since removed, and Chrome DevTools screenshots: from-seat view in dark and light, overview in dark, the real dialog at 1200 px and 390 px (also overview mode at 390 px). axe 4.10.2 (the local copy in `node_modules`) on the dialog: no violations in dark at 390 px, light at 1200 px and dark at 1200 px apart from the missing document title of the temporary page.
Not tested: the real app and backend (no MongoDB or Docker here, so no real seat data or the checkout flow), real GPU rendering, touch and pinch, ko, ru and uz layouts (no new text), the hall and club in light overview, an open-air stage venue (`indoor: false`). Still open: stairs and aisles, closer seat spacing in stadiums, richer walls, `venueType` for the seat map.

## 3D view: venue type, denser stands, aisles, walls (F404)
Changed: `apollo/user/query.ts` (`venueType` in `GET_EVENT`), `libs/types/event.ts`, `pages/events/[id]/seats.tsx`, `SeatPicker.tsx`, `SeatViewDialog.tsx` (`indoor`), `seatViewScene.ts` (filler chairs and people, aisle ramps, pilasters and wainscot, ground height).
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check`. The real `GET_EVENT` text was run against the local backend (port 3007): no errors, `venueType` returned (STADIUM for the Gwangju fixture). Scene seen in headless Chromium (software GL) through a temporary page, since removed, with the football stadium and concert hall templates: from-seat dark and light, a corner seat of the west stand, overview dark and light, the hall as an open-air venue (sky, no walls), the dialog at 390 px with axe 4.10.2 from `node_modules` (no violations apart from the missing title of the temporary page). Scratch copy served on port 3100.
Not tested: the real seat page signed in (the page needs a login and no test account was created in the dev database), checkout, touch and pinch, ko, ru and uz, arena and comedy club after this change, real GPU, a very large venue for speed (a stadium is about 11 000 chairs in 8 instanced meshes; frame time not measured).

## 3D view: closed stadium bowl, decks on columns (F405)
Changed: `libs/seats/view3d.ts` (`cornerFill`), `libs/components/seats/seatViewScene.ts` (scenery corner terraces, skyline ring, neutral concrete, floor color; the deck and columns of this task were removed in F406).
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check`. Looked at in headless Chromium (software GL) through a temporary page in a scratch copy on port 3100 (the real project and the dev server on port 3000 were not touched), with the football stadium, concert hall and arena templates and the seats of the screenshots (Upper North row 1 seat 36, arena Upper Right row 2 seat 4): stadium from the seat in dark and light, stadium overview in light, arena from the seat in dark and light, hall overview in dark, hall upper-tier seat in dark.
Not tested: the real seat page after this change (the user's screenshots were from the change before it), touch, a stadium whose stands are not the four-sided template, the comedy club, frame speed, ko, ru and uz (no new text).

## 3D view: solid concrete grandstands instead of columns (F406)
Changed: `libs/components/seats/seatViewScene.ts` (columns, `DECK` and the deck branch removed; risers solid for every venue, concrete color, lighter on every second row).
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check`. Seen in headless Chromium in a scratch copy (port 3100, the real project and the server on port 3000 untouched): arena whole-venue view from Lower Right row 3 seat 5 in light and dark (the user's screenshot), arena from Upper Right row 2 seat 4, hall whole-venue view in light.
Not tested: the real seat page after this change, touch, stadium after this change (only the riser color changed there), frame speed.

## 3D view: stadium ring, time of day, stepped aisles, stage atmosphere (F407)
Changed: `libs/seats/view3d.ts` (`stadiumRing`, `timeOfDayAt`, `rows` on `SectionShell`), `libs/components/seats/seatViewScene.ts` (ring, roof, lit edge, scoreboard, floodlight banks, sky and light by time of day, pitch stripes and nets, stepped aisles with handrails, exterior windows and gates, stage screen pattern and wash light), `SeatViewDialog.tsx` (`timeOfDay`), `SeatPicker.tsx` (computes it from `startAt` and the venue time zone).
Verified: `yarn typecheck`, `yarn lint`, `yarn i18n:check`. Seen in headless Chromium (software GL) through a temporary page in a scratch copy on port 3100 (the real project and the server on port 3000 untouched): stadium from the user's seat at day, dusk and night, in light and dark, and from a lower seat; whole-venue stadium at dusk; arena from the user's seat and whole-venue view in light; hall; the hall as an open-air venue at dusk; the stadium at 390 px with axe 4.10.2 from `node_modules` (no violations apart from the title of the temporary page).
Not tested: the real seat page after this change, touch, frame speed on a large stadium (a ring of extruded geometry, 64 skyline boxes and about 11 000 chairs), the comedy club, a stadium that is not the four-stand template, a venue whose start time falls on the 17:00 or 20:00 edge.
Not done: seats bent into an oval, shadows and ambient occlusion, a home-team crowd color, moving beams, an aisle through the middle of a long row (see F407).

