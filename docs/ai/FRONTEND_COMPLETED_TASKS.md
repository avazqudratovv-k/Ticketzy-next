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
