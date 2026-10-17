# 05 Components

**What this file covers.** The component tree of the frontend by feature, with emphasis on the hard parts: the seat picker and venue layout editor (how the map is drawn, how selection, holds and the countdown work; there is **no 3D view** in this repo, searched for "3d", "perspective", "webgl" and "three" with no match), checkout, ticket display and QR rendering, the camera scanner, the event wizard, the organizer dashboard, the admin console, the assistant widget, the paid splash, the notification bell and messaging. All components live in `libs/components/<feature>/` unless noted; styling classes are in the matching file under `scss/`.

## 0. Shared building blocks

| Component | File | Role |
|---|---|---|
| `Top`, `Footer` | `libs/components/Top.tsx`, `Footer.tsx` | Public header (brand, nav links Events/Concerts/Football/Comedy from 1024 px, `LanguageSwitcher`, `ThemeToggle`, `NotificationBell`, `AccountMenu` or login buttons) and footer (role-aware "Organizers" column, F215; on phones a "Language" label and the four language buttons follow the Help column, F354). |
| `Brand`, `Logo` | `common/Brand.tsx`, `Logo.tsx` | Wordmark with a lime dot; `Logo` renders `/favicon.svg` at a given size. |
| `StateBlock`, `ErrorScreen`, `LoadError` | `states/StateBlock.tsx`, `ErrorScreen.tsx`, `account/LoadError.tsx` | Icon + title + text + actions for empty/error states; `as="h1"` for page-level; `alert` sets `role="alert"`; `extra` slot. |
| `Field` | `common/Field.tsx` | Label + input + hint + error with `aria-invalid`. |
| `EventCard`, `EventImage`, `EventTag`, `CategoryChip`, `Pagination` | `events/` | Cards in grid or row variants (a `div` with the card link and a `LikeButton` heart as siblings); `EventImage` uses `next/image` 1200x800 with a custom loader (`libs/images.ts`, picsum URLs resized, other URLs unchanged, upload paths prefixed by `NEXT_PUBLIC_API_URL`); `EventTag` is the single status tag (sold out / few left / selling fast / sales start). |
| `Reveal`, `CountUp`, `ScrollFade`, `SuccessCheck` | `common/` | Scroll reveal (opacity/transform only), 600 ms number count-up once per tile, fade edges for scrolling tab strips, animated check mark. |
| `Seo` | `common/Seo.tsx` | Head tags. |
| `Backdrop` | `layout/Backdrop.tsx` | Two faint ticket marks behind the page, only on routes in `BACKDROP_ROUTES`; opacity set in CSS only. |
| `DemoNotice` | `common/DemoNotice.tsx` | Dismissible "no real money" banner on checkout (remembered in `localStorage` key `ticketzy-demo-notice`); footer line is not dismissible. |
| `ErrorBoundary` | `common/ErrorBoundary.tsx` | Class component with `withRouter`; catches render errors, shows `ErrorScreen`, clears when the path changes. |

---

## 1. Seat picker (buyer)

Files: `libs/components/seats/` (`SeatPicker`, `SeatMap`, `SectionList`, `SeatSummary`, `Countdown`, `GeneralPicker`, `OrderSummary`, `PayBar`, `Steps`), logic in `libs/seats/` and `libs/hooks/useSeatMap.ts`.

### 1.1 Drawing the seat map
- Data: `SeatMapData` (`libs/seats/types.ts`): `venueLayout.sections[]` + `seats[]` (only the **taken** seats; every seat not listed is available).
- The map is a single **SVG** (`SeatMap.tsx`), loaded with `next/dynamic` (`ssr: false`, skeleton) because it is the heaviest part. The venue is a 1000 x 700 coordinate canvas; the visible box is `layoutBounds(sections)` (bounds of all rotated sections + 36 margin).
- Geometry (`libs/seats/layout.ts`): seat pitch `PITCH = { COMPACT: 13, NORMAL: 16, WIDE: 21 }`; seat square = `pitch * 0.78` (`SEAT_FILL`); a section's local size is `seatsPerRow * pitch` by `rows * pitch`; `seatCenter(section, row, number)` = `((number - (seatsPerRow+1)/2) * pitch, (row - (rows+1)/2) * pitch)`, so row 1 is nearest the stage (top at rotation 0) and seat 1 is on the left; section `x`,`y` are the **center**; rotation is clockwise degrees applied with `transform="translate(x y) rotate(r)"`. `sectionBounds` handles rotation for the fit box. A STANDING section is a rounded rectangle sized from capacity (`standingSize`: width `sqrt(capacity)*9` clamped 130 to 460, height 0.6 of that), drawn by `StandingArea` with "Standing / no seat numbers". A "Stage" bar is drawn at the top unless the layout contains a standing area (`hasStage`).
- Each seat is `<g class="seat seat--<state> data-seat="section:row:number"><rect/>` plus a mark: an X for `sold`, a tick for `selected`/`mine`, a dot for `held`. States from `libs/seats/visual.ts` `seatVisual(taken, isSelected, locked)`: `selected`, `mine` (held by me), `sold`, `held` (by someone else), `locked` (the tier's ticket type is paused, sold out, outside its sale window or missing), `available`. Colour of a section follows its tier: `tierIndexes` numbers tiers by first appearance, colours `--tier-1..3` then fixed extras (`TIER_COLORS`). Seats are memoized per section (`SectionSeats` is `memo`); row numbers appear at zoom >= 2.4.
- Accessibility: the SVG has `role="img"` and a label; the **accessible path** is the section list (`SectionList`) plus a grid of real `<button aria-pressed>` seats for the chosen section (`SeatGrid`), so keyboard and screen-reader users never need the SVG (F66, F247).

### 1.2 Zoom, pan, pointer handling (`SeatMap.tsx`)
State `view = { cx, cy, zoom }` (1 to 8). The SVG `viewBox` is computed from the bounds and the view, clamped to the bounds. Plain mouse **wheel zooms around the cursor** (native non-passive listener so the page does not scroll, F65); two-finger pinch zooms (pointer map, distance ratio); drag pans after 5 px of movement; click on a seat calls `onSeat(parseKey(key))` unless a drag happened; click on a section plate calls `onSection`; hover (mouse only) shows a tooltip built by the picker: "Section . row, seat . state . price". Buttons: zoom in/out (x1.4), "Fit". Choosing a section in the list zooms to it (`focusSection`).

### 1.3 Selection, hold, countdown (`SeatPicker.tsx`)
- `selected: SeatRef[]` local state; `toggle` rules are in Flow 7 of `01-flows.md` (max from `GetSeatConfig`, locked tiers, others' seats, pending order).
- **Nothing is held while you only select.** The hold is created by "Continue" (`holdAndCheckout`: `HoldSeats` then `CreateCheckout`), so the countdown starts at that moment. A buyer who reloads gets their held seats back: on the first map answer `mine` seats (with `holdExpiresAt`) become the selection.
- The seat map poll every 3 s makes other people's actions visible: seats of my selection that become taken are removed with a notice; seats that were `mine` and are now free mean "hold ended" (timer) or "released elsewhere".
- A **pending order** (order in `PENDING_PAYMENT` for this event, found by `GetMyPendingOrders`) shows a warning box with its own `Countdown`, "Resume checkout" and "Change seats" (`CANCEL_PENDING_ORDER`); while it exists selection is disabled.
- `Countdown.tsx`: `useRemainingMs(deadline)` ticks every 250 ms from `serverNow()`; shows `m:ss`, an SVG ring (`stroke-dashoffset` = `1 - remaining/total`), turns urgent at 10 s, announces to screen readers only at 30, 10, 5 and 0 s through a polite live region; calls `onExpire` once per deadline.
- `SeatSummary`: list of chosen seats with remove buttons, total price, hold note, the Continue button (`aria-disabled` blocked state with a hint when nothing is selected, F331), a "Release seats" text button. Below 1024 px the summary is a fixed bottom sheet (F75).
- `GeneralPicker.tsx` (GENERAL events): per ticket type a stepper with limit `min(maxPerOrder, totalQuantity - soldQuantity)`; "Continue" runs `checkoutQuantities` (the order itself reserves stock).

### 1.4 Checkout (`pages/checkout/[orderId].tsx` + `OrderSummary`, `PayBar`, `Countdown`, `DemoNotice`)
Described step by step in Flow 8. Component facts: the card section is **sample only** (disabled fields, never read, F74); the only real input is the checkbox "Simulate a failed payment" which sends `simulate: 'FAILURE'`; `PayBar` is the sticky pay button; `Steps` shows seats -> pay -> done. The page keeps `outcome` (`failed`, `expired`, `lost`) as local state and renders a `StateBlock` for each; refs `busy` and `handoff` stop double clicks and stop the "leave page" cleanup from cancelling an order that is being paid.

---

## 2. Ticket display and QR rendering

- `TicketCard` (`account/TicketCard.tsx`) in `/tickets`; `StatusBadge` (`account/StatusBadge.tsx`) with tones from `TICKET_BADGE` (`valid` success, `used`/`expired` neutral, `refunded` info, `cancelled` danger).
- Detail page `pages/tickets/[ticketId].tsx`: event image, title, time in the venue zone, facts list (`dl`: ticket type, section/row/seat via `seatLabel`, price, code in mono font, shown by `common/TicketCode.tsx` in groups of 4 with a "Copy code" button that copies the plain code, F351), stepper for tickets of the same order, "Add to calendar" (`.ics`), "Open in maps" link (Google Maps search from venue name + address, F44, no embedded map), full-screen QR dialog.
- `QrCode.tsx`: `import('qrcode')` on first use, `QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 640, color: { dark: '#000000', light: '#ffffff' } })`, rendered as `<img width=320 height=320 alt=label>`; on failure shows an alert text. **The value is the `qrToken` string returned by the backend** (`<ticketId>.<hex signature>`); the frontend never builds or signs it. Always black on white (scanners need contrast; the full-screen view has a white ground). The QR is shown only for a `valid` ticket; used/refunded/expired tickets show a status instead. On the ticket page the AI assistant button steps aside (`TIGHT_ROUTES` includes `/tickets/[ticketId]`) so it does not cover the code.

## 3. Paid splash (`common/PaidSplash.tsx`) and approval splash

Since F352 the overlay itself (phases `show` -> `leave`, timers, Escape/Enter, portal, confetti) lives in `common/SplashOverlay.tsx` (`message?`, `onEnd`); `PaidSplash` only decides and mounts it. `common/ApprovalCelebration.tsx` (mounted in `_app.tsx`) polls `getMyAccountState` for organizers every 30 s, syncs `userVar` status, plays the overlay with the message `common:approval.message` when ACTIVE and `approvalCelebrationPending`, then calls `markApprovalCelebrationDone`; the guard is `sessionStorage` `tz-approval-splash:<memberId>`. The text below describes the paid splash as it was (the overlay behavior is unchanged).

Used on the confirmation page. Plays only when the order is `paid`, `paidAt` is less than 5 minutes old (`FRESH_MS`) and this order id was not played yet in this tab (`sessionStorage` key `tz-paid-splash:<orderId>`, with an in-memory `Set` as fallback). Phases `off` -> `show` -> `leave` -> `off`: shows 3 s total (`SHOW_MS`), fade-out 400 ms (`LEAVE_MS`), removed from the DOM afterwards. Rendered through `createPortal` into `document.body`: logo, glow, two rings, a check badge and 24 confetti pieces whose positions are **computed, not random** (golden angle `137.508` degrees, `BITS`). `aria-hidden`; click, Escape or Enter dismisses early (capturing key listener with `stopPropagation`); CSS in `scss/motion.scss`; reduced motion shortens it to a fade (the global reduced-motion block). The visible/announced text is the `role="status"` headline on the page.

---

## 4. Camera scanner (organizer check-in)

Files: `pages/organizer/check-in.tsx`, `libs/components/organizer/checkin/Scanner.tsx`, `ScanResult.tsx`, `libs/organizer/checkin.ts`.

- **Library:** `html5-qrcode` 2.3.8 (class `Html5Qrcode`), imported with `import('html5-qrcode')` only in the browser; the component itself is loaded by `next/dynamic` with `ssr: false`. It uses the browser's `getUserMedia` camera API (needs HTTPS or localhost and a user click).
- **Permissions:** camera access is requested only after the organizer presses "Start camera" (`start()`); `Html5Qrcode.getCameras()` lists cameras. If the error name/message matches `/NotAllowed|Permission|denied/i` the phase becomes `denied` (message + "Try again" button); any other failure becomes `unavailable`; an empty camera list is also `unavailable`.
- **Decoding:** `scanner.start(source, { fps: 10, qrbox: square of 80 percent of the smaller side }, onDecoded, () => undefined)`; the library decodes frames in the browser (no frames are sent anywhere). `source` is `{ facingMode: 'environment' }` for the first start, then a camera id when the organizer presses "Switch camera" (cycles `cameras[(index+1) % n]`). Stop/clear on "Stop camera" and on unmount.
- **What is sent to the backend:** only the decoded **text** (the `qrToken`) and the selected `eventId`, in mutation `CheckInTicket(qrToken, eventId)`. The page de-duplicates: same token within 4 s is ignored, and a scan while another request runs is ignored.
- **Outcomes** (`classifyScan`): the backend's exact messages map to `valid`, `used` ("already checked in"), `wrongEvent` (also wrong organizer), `refunded`, `invalid` ("not valid" for forged/garbled codes and unknown tickets), `notOpen` (event not approved), `notAllowed`, `network`, or `error` (raw server text shown). `ScanResult` shows an icon (never colour alone), title, text, buyer name and place ("Section, row, seat" or ticket type name or "General admission"), and the page vibrates the phone (80 ms for valid, a double pulse otherwise), scrolls the result into view (`aria-live=polite`) and keeps the last 8 results with times.
- **Manual fallback:** one text field accepts a pasted QR token (same path as the camera) or the printed 20-hex ticket code typed with or without spaces, dashes and in any case (`CheckInTicketByCode`, F351). Anything else answers "not a valid ticket code" without a request. New outcomes `codeNotFound`, `badCode`, `rateLimited` (with seconds). Header counts: `GetCheckInCounts` (USED vs all), shown as "N of M" with a progress bar.

---

## 5. Venue layout editor (organizer)

Files: `organizer/venues/VenueEditor.tsx` (512 lines), `LayoutCanvas.tsx`, `SectionPanel.tsx`, `TemplateDialog.tsx`, `TimezonePicker.tsx`, `VenueImages.tsx`; logic `libs/venues/model.ts`, `history.ts`, `templates.ts`, `useVenueEditor.ts`, `useVenueData.ts`, `serverIssues.ts`, `timezones.ts`.

- **Model:** a layout is `Layout = DraftSection[]`. A `DraftSection` has a local `id` (survives renaming the `key`), `key`, `name`, `kind`, `rows`, `seatsPerRow`, `capacity` (STANDING), `x`, `y`, `rotation`, `spacing`, `tierKey`. Limits (`LIMITS` in `model.ts`, copied from the backend): name 2 to 100, city 2 to 100, address 3 to 200, key and tier key at most 30, section name at most 60, rows and seats per row 1 to 100, at most 8 images. `toInput` sends the exact `VenueSectionInput` (STANDING sends rows=1, seatsPerRow=1, no tier). `signature(layout)` = `JSON.stringify(toInput(layout))` detects unsaved changes.
- **Canvas:** the same 1000 x 700 coordinates as the buyer map, drawn with the **same** `SectionSeats` and `StandingArea` exported from `seats/SeatMap.tsx` (what the organizer edits is what buyers see, F117). Differences: Ctrl/Cmd + wheel (and trackpad pinch) zoom, plain wheel scrolls the page; dragging a section moves it (`onPreview` during the drag, `onDragEnd` commits one undo step); dragging empty canvas pans; optional grid (`GRID = 10`) and snap (`snap(value, on)` rounds to 10); `clampToCanvas` keeps a section's center inside 0..1000 x 0..700. `validateLayout` marks errors (center outside canvas, bad numbers, duplicate keys) that block saving and warnings (overlap with another section, edge sticking out) that do not.
- **Undo/redo** (`history.ts`): reducer with `past`, `present`, `future`, limit 100; same-key edits within 900 ms are merged (typing in one field = one step); a drag uses `preview` then `commit`.
- **Templates:** `TemplateDialog` fills the layout from `libs/venues/templates.ts`.
- **Locked layout:** if any non-draft event with generated seats uses the venue (rule mirrored in `useVenueData.ts` `hasSeats`: RESERVED events that are APPROVED, ENDED or CANCELLED), or the venue belongs to someone else, the editor is read-only (`layoutLocked`); the backend enforces `VENUE_LAYOUT_LOCKED`.
- **Time zone:** `TimezonePicker` uses `Intl.supportedValuesOf('timeZone')` (about 420 names with today's GMT offset; short fallback list in old browsers).

## 6. Event wizard (organizer)

`organizer/editor/EventEditor.tsx` (419 lines) + `StepDetails`, `StepImages`, `StepVenue`, `StepTickets`, `StepTranslations`, `StepReview`, `fields.tsx`; state in `libs/organizer/useEventEditor.ts`; model and validation in `libs/organizer/form.ts` (422 lines); dates in `libs/organizer/zoned.ts`.

- **Steps** (URL `?step=`): details, images, venue (venue + date/time + seating type), tickets (ticket types + sale window), translations (KO/RU/UZ, AI button), review (checklist + submit).
- **State:** `values: FormValues`, `rows: TicketRow[]`, saved snapshots (`valuesDirty`, `rowsDirty`, `dirty`), `errors` keyed by field (`start`, `saleStart`, `KO.title`, `<rowKey>.price`), `serverError` (`describeError`, includes the venue "already booked" text parsed by `libs/venueConflict.ts`). `mode` from `editModeOf(status)` (`full`, `review`, `locked`).
- **Dates** are the venue's wall clock: `zoned.ts` converts local date + time + IANA zone to an instant with `Intl` (second pass for DST). End time defaults to start + 2 h; multi-day events are a convention: one `startAt` and one `endAt` with "the same daily hours on every day of the range" (F129 to F131).
- **Ticket rows:** RESERVED events show one row per tier of the venue layout (`rowsForSeating`), GENERAL events free rows; price is a whole number in KRW; no delete (a "pause" switch); quantity for tiers is derived from the seats on the server.
- **Images:** one `ImageUploader(target: "event")` call per file (the multi-file uploader silently drops a rejected file, F103), PNG/JPG, at most 8.
- **Unsaved guard:** `useUnsavedGuard`; **venue round trip** via `sessionStorage` (Flow 3); **AI translate** saves first (Flow 4).
- Dialogs: `SubmitDialog` (checks list; `fixBookedLabel` for the double-booking refusal), `CancelDialog` (reason required, max 500), confirm-review dialog before saving an APPROVED event.

## 7. Organizer dashboard

Shell: `dashboard/DashboardShell.tsx` (sidebar from `dashboard/nav.tsx` `ORGANIZER_NAV`: Overview, Events, Venues, Messages (with unread badge), Attendees, Check-in, Payouts, Analytics, Profile; "Create event" button disabled with a reason when not ACTIVE; mobile drawer is a dialog with `inert` on the main area, Escape closes, focus returns to the opener; top bar has `LanguageSwitcher`, `ThemeToggle`, `NotificationBell`, `AccountMenu`). Role guard: `useRequireRole(role)`; nothing renders until allowed.

Pages use shared parts in `organizer/sales/` (`BarChart`, `BarList`, `CommissionTier`, `EventSelect`, `AttendeeDrawer`, `ProfilePreview`, `TicketStatusBadge`), `organizer/SalesChart.tsx`, `organizer/orders/OrderDrawer.tsx`, `organizer/payouts/MyPayouts.tsx`, `payouts/*`. Charts are **hand-made SVG and CSS bars** (no chart library, F228), one series, one colour, each bar focusable with an `aria-label`. Data helpers: `libs/organizer/analytics.ts`, `salesSeries.ts` (sales per day from PAID orders, newest 200, grouped by the viewer's calendar day), `attendees.ts`, `payouts.ts`, `commission.ts`.

## 8. Admin console

Same shell with `ADMIN_NAV` (groups Moderation: Overview, Event approvals, Organizers, Messages; Money: Orders, Payouts, Commission; Platform: Members). Components in `admin/`: `OrganizerDrawer` (details + status actions + "Message organizer"), `ReasonDialog` (reason required, used by reject/suspend/cancel), `CommissionDialog` (rate 0 to 100 with two decimals, optional end date, reason; clear override), `ModerationPanel` (stored AI result: flags with type/reason/confidence, overall reason, model, time; "Run AI check"; advisory only), `VenueConflictPanel`, `EventLayoutPreview` (reuses `SeatMap` with nothing sold), `MarkPaidDialog`, `MessageOrganizer`, `MemberStatusBadge`. Lists use `useListParams`; counts for tabs come from separate small queries (`GetAdminEventCount`, `GetAdminOrganizerCounts`, ...). Admin errors are mapped in `libs/admin/errors.ts` (`describeAdminError`, `isOnlyNoData`, `aiKeyOf`, member error codes `CANNOT_CHANGE_OWN_ACCESS`, `CANNOT_CHANGE_ADMIN_ACCESS`, `CANNOT_ASSIGN_ADMIN_ROLE`).

---

## 9. Assistant widget ("Ask Ticketzy")

Files: `assistant/AssistantWidget.tsx` (327 lines), `AssistantCard.tsx`, `AssistantLifecycle.tsx`; `libs/assistant/store.ts`, `errors.ts`, `richText.tsx`; `libs/aiErrors.ts`; mutation `AskAssistant`.

- Mounted by `LayoutBasic` (lazy, `ssr: false`) so it appears on public and buyer pages, also for organizers/admins browsing them, not in dashboards (F197).
- **State:** reactive variable `assistantVar` `{ owner, messages, pending, pendingSince, error, open }`. Only `owner` and `messages` are persisted, in `sessionStorage` key `ticketzy-assistant`; `owner` is the member id or `guest`, and `AssistantLifecycle` (mounted in `_app`) resets the chat when the owner changes (logout, another login). The store is hydrated after mount, not at import, so server and client markup agree.
- **Request:** `ask()` sends `AskAssistant({ message (trimmed), history (last 10 turns, each clipped to 1000 chars, user messages with no answer left out), locale })` with `fetchPolicy: 'no-cache'` and an `AbortController` timer of 40 s (`ASSISTANT_CLIENT_TIMEOUT_MS`); after 10 s the panel says "taking a while". `requestId` ensures an old answer never overwrites a newer state; "New chat" aborts the request.
- **Limits in the UI:** 1000 characters (the field accepts more but shows a red counter from 800 and disables Send, F203).
- **Answer rendering:** the backend answer is plain text with simple markdown. `richText.tsx` is an own parser (no markdown library, F204): paragraphs, lists, `**bold**`, `[text](url)` and bare URLs; links must pass `safeLink`: internal only for routes `events`, `orders`, `tickets`, `notifications`, `account`, `settings`, `organizers`; external only `https:`; everything else is plain text. `events` returned with the answer render as `AssistantCard`s.
- **Errors:** `libs/aiErrors.ts` `aiCause` (code first, then message) -> `libs/assistant/errors.ts` kinds `unavailable`, `rateLimit`, `dailyCap`, `quotaExhausted`, `busy`, `failed`, `timeout`; retry is offered for busy/failed/timeout; final errors discard the unanswered question.
- **Behaviour details:** panel stays mounted 160 ms for the closing animation; focus enters the textarea on open and returns to the button on close; Escape closes; on phones (`max-width: 767px`) the panel is a sheet that locks body scroll; the button steps aside on `/events/[id]/seats`, `/checkout/[orderId]`, `/tickets/[ticketId]` (`TIGHT_ROUTES`); the unsent text is kept in a module variable `draftText`.
- The AI itself (provider, tools, caps) is on the backend (`be:components/ai/`); the frontend only knows the mutation and its error codes.

## 10. Notification bell and notifications page

`notifications/NotificationBell.tsx`: button with badge (99+ cap), shakes once when the count rises, MUI `Popover` dialog listing the latest 6 (`GetMyNotifications`, only fetched when open), "Mark all as read", link to `/notifications`. Count from `useUnreadCount()` (polls 30 s while visible). `NotificationRow.tsx` (F358) maps `notificationType` to an icon and a translated sentence that starts with the sender in bold (`notifications.sentence.<TYPE>`, sender from `authorData`: "Admin" for an admin, else the name; `libs/account/notifications.ts` `KNOWN_TYPES`, `sentenceKey`, `senderOf`), an event-name chip for the types whose description is an event title (`describeNotification`), the time below, an accent tint and dot when unread, and to a link: order/ticket/event pages for buyers, event/organizer pages for organizers, messages with `?c=<conversationId>` for `NEW_MESSAGE`. Reading marks the item read (`useNotificationActions`, refetches the count). The sidebar badge on `/notifications` reads the shared cache instead of polling.

## 11. Messaging (organizer <-> admin)

`messages/Inbox.tsx` (conversation list + thread for the selected one, search, "Contact support"/start buttons), `ConversationList.tsx`, `Thread.tsx`, `Composer.tsx`, `PartyAvatar.tsx`, `labels.ts`, `MessagingLifecycle.tsx`. Data layer in section 5 of `04-state-and-data.md`. Behaviour: a sent message shows at once as "Sending...", then "Sent", and "Read" when `readAt` is set or a `read` event arrives from the other side; failed messages offer retry; unread counts per conversation come from `unreadForOrganizer` / `unreadForAdmin`; the sidebar badge is the sum for the member's side; the page fills the screen height with only the message list scrolling, the composer is a textarea with a round paper-plane button, messages are grouped in runs by sender within 5 minutes (`clusterMessages`) with the sent/read line under the last own message only (F360); opening a thread marks it read and marks its `NEW_MESSAGE` notifications read one by one (`markThreadNotificationsRead`, no bulk operation exists); an admin cannot start a chat from the inbox but can from the organizer list (`StartConversationWithOrganizerByAdmin`, `admin/MessageOrganizer.tsx`).

## 12. Other buyer components

`events/LikeButton.tsx` (page pill and `variant="card"` heart; guests are sent to login with `returnTo`; `LikeTargetEvent` returns `eventLikes` and `meLiked`, an optimistic response flips both and Apollo rolls it back on error, `getFavorites` is evicted without a redraw; the heart is read with `isEventLiked` from `libs/eventLike.ts`), `Comments.tsx` (delete = `UpdateComment` with status DELETE confirmed inline, 500-character limit, own comments only), `TicketBar.tsx` (mobile sticky buy bar; `useStickyBar` sets `html[data-bar]` flags), `account/RefundPanel.tsx` (Flow 11), `account/OrderRow.tsx`, `Hero`/`CategoryRow` rails (native `overflow-x: auto` + `scroll-snap-type`, cards 280 px, arrow buttons `aria-disabled`, one-time "peek" by `useRailPeek`).

Next: `06-quality.md`.
