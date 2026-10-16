# 01 Flows

**What this file covers.** The 12 most important end-to-end flows, each as numbered steps from the user's action in the browser to the database and back. Every step names a file and a function or component. Paths starting with `libs/`, `pages/`, `apollo/` are in the frontend repo (`/Users/kenneth/ticketzy-next`); paths starting with `be:` are in the backend repo under `/Users/kenneth/ticketzy/apps/ticketzy-api/src/` (read only for cross-checks, so the frontend teacher can explain where each request ends). Terms are explained in the glossary of `00-overview.md`.

**How every request travels (read this once; later flows only say "mutation X").** A component calls `useQuery` / `client.mutate` with a `gql` document from `apollo/`. The request passes the link chain built in `apollo/client.ts` `createIsomorphicLink`: `errorLink` (detects an expired token) -> `trackLink` (counts queries for the wake note) -> `retryLink` (one retry for queries that got no answer) -> `authLink` (adds `Authorization: Bearer <token>` read from `localStorage` key `accessToken` by `libs/auth/token.ts` `getJwtToken`) -> `timeoutLink` (marks 20 s for queries, 60 s for mutations) -> `uploadLink` (`fetchWithTimeout` + HTTP POST to `NEXT_PUBLIC_API_GRAPHQL_URL`). On the backend a **resolver** (`be:components/<area>/<area>.resolver.ts`) is guarded by `AuthGuard`, `RolesGuard` (+`@Roles(...)`), `ActiveOrganizerGuard` or `WithoutGuard` (public), validates the input class, and calls a **service** that talks to MongoDB with Mongoose. Errors are mapped to `{ code, message }` (be:`libs/error-mapping.ts`), parsed in the browser by `libs/errors.ts` `parseApiError`.

Server time rules used below: the hold lasts `SEAT_HOLD_SECONDS` (default 30, be:`libs/env.validation.ts`), at most 8 seats per hold (`MAX_SEATS_PER_HOLD`, be:`components/seat/seat.service.ts`).

---

## Flow 1. Sign up and sign in

**Sign up (buyer or organizer)**

1. The visitor opens `/account/signup` (`pages/account/signup.tsx`). A footer link `?role=organizer` pre-selects the organizer card (`useEffect` sets `initialRole`).
2. `libs/components/auth/SignupForm.tsx` `validate()` checks the fields with `libs/fieldErrors.ts` `lengthRule` (limits in `FIELD_LIMITS`: `memberNick` 3 to 50, `memberFullName` 3 to 100, `memberPassword` at least 8) and `EMAIL_PATTERN` (`libs/components/auth/validation.ts`). The organization name is sent as `memberNick`; a buyer sends no nick (F21).
3. `submit()` calls `signUp(role, input)` in `libs/auth/index.ts`. It lowercases and trims the e-mail and runs mutation `SignupUser` or `SignupOrganizer` (`apollo/user/mutation.ts` `SIGNUP_USER`, `SIGNUP_ORGANIZER`).
4. Backend: `be:components/member/member.resolver.ts` `signupUser` / `signupOrganizer` -> `MemberService.signup`. The **server** decides role and status: `signupUser` creates `USER` + `ACTIVE`; `signupOrganizer` creates `ORGANIZER` + `PENDING` (`be:components/member/member.service.ts`). The password is hashed with bcrypt (`AuthService.hashPassword`), the document is created in collection `members`, and `AuthService.createToken` signs a JWT containing only `{ _id, memberType }` (valid 1 day, `be:components/auth/auth.module.ts`). A duplicate e-mail/nick/phone (Mongo error 11000) becomes `USED_MEMBER_EMAIL_NICK_OR_PHONE`.
5. The mutation returns `{ _id, accessToken }`. Back in `signUp` -> `startSession`: `setJwtToken` stores the token in `localStorage`; `resetSessionExpired()`; `loadProfile` runs query `GetMember` with `fetchPolicy: 'network-only'`; `userVar(profile)` publishes the member; `refreshActiveQueries()` refetches queries already on screen. If loading the profile fails, `clearSession()` runs and the error is thrown (nothing half signed in).
6. A buyer is moved on by `libs/hooks/useRedirectIfSignedIn.ts` (to a safe `returnTo`, else `/`). An organizer sees `PendingPanel` (`libs/components/auth/PendingPanel.tsx`) because `signup.tsx` passes `suppress = organizerCreated` to the redirect hook.
7. Errors: a `VALIDATION_FAILED` answer carries `fields: [{ field, rules }]`; `libs/fieldErrors.ts` `serverIssues` puts each under its input and keeps the banner only for other errors (F348).

**Sign in**

1. `/account/login` (`pages/account/login.tsx`) shows `libs/components/auth/LoginForm.tsx`. `useAdoptTypedValues` copies text typed before hydration into state; the submit button is disabled until then.
2. `submit()` validates, then `logIn(email, password)` (`libs/auth/index.ts`) runs mutation `Login` (`apollo/user/mutation.ts` `LOGIN`).
3. Backend `MemberService.login`: finds the member by e-mail with the password field, **always** compares the password (a dummy hash when the e-mail is unknown, `AuthService.comparePasswords`), and throws one message `WRONG_EMAIL_OR_PASSWORD` (401) for both cases. Statuses `REJECTED`, `SUSPENDED`, `DELETE` get `ACCOUNT_NOT_VERIFIED` (GraphQL error with its own code). `PENDING` organizers **can** log in. Token is created as above.
4. Frontend continues with `startSession` (same as sign up step 5). `useRedirectIfSignedIn` sends the member to `returnTo` (only if they were not already signed in when the page opened) else `homeFor(user)` (`libs/routes.ts`: buyer `/`, organizer `/organizer`, admin `/admin`).
5. `reason=expired` in the URL makes `LoginForm` show "session ended" (`libs/auth/guards.tsx` adds it when `sessionJustExpired()`).

**Session lifetime and sign out**

- On every page load `pages/_app.tsx` runs `restoreSession()` (`libs/auth/index.ts`): token present and not expired (`isExpired` reads `exp` with `jwt-decode`) -> `GetMember` -> `userVar`. A rejected token (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_REQUEST`) ends the session; a network error keeps the token. `authReadyVar(true)` is set in `finally`. The same function runs when another tab changes `accessToken` (`storage` event).
- Expiry: `apollo/client.ts` `errorLink` calls `libs/auth/sessionExpired.ts` `handleSessionExpired(sentToken)` on `UNAUTHENTICATED` (not for `Login`, `SignupUser`, `SignupOrganizer`, set `SESSION_FREE_OPERATIONS`) or HTTP 401; `libs/hooks/useSessionWatch.ts` checks the token's `exp` every 5 s and on window focus. There is **no refresh token**: when the token's day is over the member must sign in again.
- Sign out: `libs/components/common/AccountMenu.tsx` -> `logOut()` = `clearSession()`: remove token, `userVar(null)`, `resetStore()` (never `clearStore()`, F296).

---

## Flow 2. Organizer approval

1. State after sign up: member `ORGANIZER` + `PENDING`. `libs/hooks/useAuth.ts` exposes `isPendingOrganizer` and `organizerAccess` (from `libs/organizer/events.ts` `organizerAccess`). `libs/components/common/PendingBanner.tsx` shows a banner; `libs/components/dashboard/DashboardShell.tsx` disables "Create event" with a reason; pages call `BlockedPanel` for locked states.
2. An admin opens `/admin/organizers` (`pages/admin/organizers/index.tsx`, query `GetAdminOrganizers`, tabs Pending/Approved/Rejected/Suspended/All, counts from `GetAdminOrganizerCounts`).
3. Clicking a row opens `libs/components/admin/OrganizerDrawer.tsx`. "Approve" runs `run('approve')` -> mutation `VerifyOrganizerByAdmin(memberId)` (`apollo/admin/mutation.ts`). Reject/suspend ask a reason through `ReasonDialog` and run `RejectOrganizerByAdmin` / `SuspendOrganizerByAdmin`; reinstate runs `ReinstateOrganizerByAdmin`.
4. Backend: `be:components/organizer/organizer.resolver.ts` (`@Roles(ADMIN)`) -> `OrganizerService.verifyOrganizerByAdmin` -> `changeStatus(adminId, memberId, 'verify')`: one conditional `findOneAndUpdate({ _id, memberType: ORGANIZER, memberStatus: { $in: from } }, { memberStatus: to })` using `organizerTransitions` in `be:libs/enums/member.enum.ts` (see `02-state-and-rules.md`). If nothing matches it answers `NO_ORGANIZER_FOUND` or `INVALID_STATUS_TRANSITION`.
5. After the update: an `audit_logs` entry (`AuditLogService.record`), a notification to the organizer (`notify`), and `syncSockets` (reject/suspend cut the organizer's chat sockets off non-support rooms; reinstate/verify lift it).
6. Back in the drawer: `onChanged(updated, message)` updates the list and shows a notice.
7. The organizer finds out through the notification bell (`libs/components/notifications/NotificationBell.tsx`, polled every 30 s by `libs/hooks/useUnreadCount.ts`). **Caution:** the organizer's own `userVar` is only reloaded by `restoreSession` (page load or sign-in; `GET_MEMBER` is used only in `libs/auth/index.ts`), so an already open tab can keep showing PENDING until reload (see oddity O-2 in `06-quality.md`).

---

## Flow 3. Create a venue and its seat layout

1. An ACTIVE organizer opens `/organizer/venues/new` (`pages/organizer/venues/new.tsx`) or edits `/organizer/venues/[id]` (`pages/organizer/venues/[id].tsx`, query `GET_VENUE_FULL`). Non-active organizers see `BlockedPanel`.
2. `libs/components/organizer/venues/VenueEditor.tsx` uses `libs/venues/useVenueEditor.ts`. Fields: name, type (`VENUE_TYPES` in `libs/venues/model.ts`), city, address, time zone (`TimezonePicker`, list from `Intl.supportedValuesOf` in `libs/venues/timezones.ts`), images (`VenueImages`), and the layout (`LayoutCanvas`, `SectionPanel`, `TemplateDialog` with `libs/venues/templates.ts`).
3. Editing state is a list of `DraftSection` with undo/redo (`libs/venues/history.ts`, 100 steps, drag = one step). `validateLayout` and `validateValues` run on the client with the backend's limits (`LIMITS` in `libs/venues/model.ts`).
4. Save: `toInput(layout)` builds the exact `VenueSectionInput` shape; mutation `CreateVenue` or `UpdateVenue` (`apollo/organizer/venue.ts`).
5. Backend `be:components/venue/venue.resolver.ts` (`@Roles(ORGANIZER, ADMIN)` + `ActiveOrganizerGuard`) -> `VenueService.createVenue` / `updateVenue`: `assertValidLayoutAndTimezone` validates the time zone and the layout (`be:libs/venue-layout.ts` `getVenueLayoutError`, `computeLayoutCapacity`), then creates/updates the `venues` document with `venueCapacity`. `updateVenue` refuses a new `venueLayout` if any non-DRAFT event of the venue already has generated seats (`VENUE_LAYOUT_LOCKED`; helper `hasGeneratedSeats`). Only the creator or an ADMIN may update (`search.memberId = memberId`).
6. Server validation messages name sections by index; `libs/venues/serverIssues.ts` `placeServerError` puts them on that section (F119).
7. "Create a new venue" from the event form: `useEventEditor.stashDraft` keeps the form in `sessionStorage` (`tz:event-draft:<path>`), goes to `/organizer/venues/new?returnTo=...`; after saving, `withVenue` (`libs/routes.ts`) returns to the event form with `venueId=` and the form is restored (F120).

---

## Flow 4. Create and submit an event

1. `/organizer/events/new` (`pages/organizer/events/new.tsx`) or `/organizer/events/[id]/edit` renders `libs/components/organizer/editor/EventEditor.tsx` with `useEventEditor` (`libs/organizer/useEventEditor.ts`). Steps (`STEPS` in `libs/organizer/form.ts`): `details`, `images`, `venue`, `tickets`, `translations`, `review`.
2. Each step's check is a pure function in `libs/organizer/form.ts` (`validateDetails`, `validateImages`, `validateVenue`, `validateTickets`, `validateSaleWindow`, `validateTranslations`). "Continue" runs the current step's check, then saves a DRAFT/REJECTED event on the way (`EventEditor.next` -> `runSave`). An APPROVED event is only saved on purpose (any save sends it back to review).
3. First save: `useEventEditor.save()` -> mutation `CreateEvent` (`apollo/organizer/mutation.ts`). Backend `EventService.createEvent` (`@Roles(ORGANIZER)` + `ActiveOrganizerGuard`): `assertValidDates`, `assertVenueUsable` (venue must be `ACTIVE`), `assertVenueFree` (no time overlap with another event of the same venue record whose status is PENDING, APPROVED or ENDED, `venueBlockingStatuses` in `be:libs/venue-conflicts.ts`), then `eventModel.create({ ...input, eventStatus: DRAFT })` and `memberStatsEditor(memberEvents +1)`. The page then replaces the URL with `/organizer/events/<id>/edit?step=...` (`onCreated`).
4. Ticket types: for each changed row `CREATE_TICKET_TYPE` / `UPDATE_TICKET_TYPE` (`be:components/ticket-type/ticket-type.service.ts`). KRW only (`ONLY_KRW_TICKETS`); for RESERVED events the quantity comes from the layout seats of the tier (`resolveTotalQuantity`, `TICKET_TYPE_QUANTITY_FROM_SEATS`).
5. Translations step: `StepTranslations.tsx` can call mutation `TranslateEvent` (AI; reads the title and description **saved** on the event, so it saves first, F102). It fills KO/RU/UZ fields; the organizer edits them.
6. Review step -> `SubmitDialog` (`libs/components/organizer/SubmitDialog.tsx`) lists checks -> `EventEditor.confirmSubmit` -> `useEventEditor.submit()` -> mutation `SubmitEventForApproval`.
7. Backend `EventService.submitEventForApproval`: only the owner; `eventTransitions.submit` (`DRAFT` or `REJECTED` -> `PENDING`); `getEventSubmitError` (exported pure function in `be:components/event/event.service.ts`: title, at least one image, start and end in the future, sales-window rules, venue ACTIVE, at least one ticket type, and for RESERVED a layout with seated sections where every tier has a ticket type); `assertVenueFree` again; conditional `findOneAndUpdate` on the status that was validated; clears `rejectReason`; then starts AI moderation in the background (`void this.aiModerationService.moderateEvent(result._id)`, never blocks).
8. The UI shows the "submitted" notice; status badge becomes PENDING and the form becomes read-only (`editModeOf('PENDING') === 'locked'` in `libs/organizer/events.ts`).
9. Editing an APPROVED event is allowed; the server moves it back to PENDING on save (`applyUpdate(..., sendApprovedBackToPending = true)`); `EventEditor` asks confirmation first (`confirmReview`).
10. Cancelling an approved event (organizer): `CancelDialog` -> `CancelMyEvent` (see Flow 11).

---

## Flow 5. Admin approval and AI moderation

1. Admin opens `/admin/events` (`pages/admin/events/index.tsx`, query `GetAdminEvents`; tabs Pending default, Approved, Rejected, Cancelled, Ended, Drafts, All). A row opens `/admin/events/[id]` (`pages/admin/events/[id].tsx`, query `GetAdminEvent`).
2. The detail page shows the seat layout preview (`libs/components/admin/EventLayoutPreview.tsx` reusing `SeatMap`), ticket types (`GetAdminTicketTypes`), texts in four languages, the organizer, any venue conflict (`VenueConflictPanel`, field `possibleVenueConflicts`) and `ModerationPanel`.
3. AI check: submitting an event already started `moderateEvent` in the background (Flow 4 step 7). `be:components/ai/ai-moderation.service.ts` `moderateEvent` reserves a rate-limit slot (`aiClient.reserve`), builds a clipped payload (`buildPayload`: title, description, category, translations, venue, ticket types, other titles of the same organizer), asks the model for JSON, validates it (`parseModerationResult`) and stores `eventModeration` on the event (`store`). **Any failure is stored as `checked: false`**; it never throws, never changes the event status. The admin can press "Run AI check": `ModerationPanel.run` -> mutation `RunEventModerationByAdmin` -> `runEventModerationByAdmin` (`assertAvailable`, run, audit log).
4. Approve: `pages/admin/events/[id].tsx` opens an approve dialog (it lists venue conflicts and the button reads "Approve anyway" when there are some, F311) and runs `APPROVE_EVENT_BY_ADMIN`.
5. Backend `EventService.approveEventByAdmin`: loads the event; "approvable" only if status is `PENDING` and the organizer is not the admin; `assertVenueFree` again; for RESERVED events `generateEventSeats(event)` **before** the status change: for every seat of every SEATED section a bulk `updateOne ... upsert` with `$setOnInsert` creates an `eventSeats` document (status AVAILABLE, `ticketTypeId` of the section's tier), then sets each tier ticket type's `totalQuantity` to its seat count. Errors: `EVENT_SUBMIT_LAYOUT_REQUIRED`, `SEAT_TIER_MISSING`, `SEAT_TIER_DUPLICATE`, `SEAT_GENERATION_FAILED`.
6. `changeStatusByAdmin(adminId, eventId, 'approve')`: one conditional update `{ _id, eventStatus: { $in: ['PENDING'] }, organizerId: { $ne: adminId } }` -> `APPROVED`, `$unset rejectReason`; audit log; notification to the organizer.
7. Reject: `ReasonDialog` (reason required) -> `RejectEventByAdmin` -> same function with `'reject'`, sets `rejectReason` (shown to the organizer in `EventEditor`).
8. After approve the event is public: `publicEventStatus = APPROVED` is the only status visible in public queries (`be:libs/enums/event.enum.ts`).

---

## Flow 6. Browse and search events

1. Home `/` (`pages/index.tsx`, `getStaticProps` for translations only): query `GetEvents` with `upcomingSearch(from)` (`libs/homeFeatured.ts`, `FEATURED_POOL` = 20 upcoming events, ordered by `startAt`). `pickFeatured` chooses the hero and 3 side events; `CategoryRow` rails (`libs/components/events/CategoryRow.tsx`) have their own queries; organizers block uses `GetHomeOrganizers` (sorted by `memberRank`).
2. `/events` (`pages/events/index.tsx`): `libs/hooks/useEventFilters.ts` reads filters from the URL query (`q`, `category`, `city`, `from`, `to`, `min`, `max`, `sort`, `page`), ignoring bad values; `buildEventsInput(filters)` makes `{ page, limit: 12, sort, direction, search }`. Text boxes are debounced 400 ms (`useDebouncedCommit`) before writing the URL (`router.replace`, shallow).
3. Sort keys (`libs/events.ts` `EVENT_SORTS`): `date` (`startAt` ASC), `priceAsc/priceDesc` (`eventMinPrice`), `popular` (`eventViews` DESC), `newest` (`createdAt` DESC).
4. Date filter uses Seoul midnights: `libs/format.ts` `dayBoundaryIso` appends `+09:00` (F37). City list comes from `GetVenues` (limit 100).
5. Backend `EventService.getEvents`: `match = { eventStatus: APPROVED }`, `shapeMatchQuery` adds category list, venue/city (cities resolved to venue ids), price range on `eventMinPrice`, period range on `startAt`, and text as one `$or` over `eventTitle`, `eventTranslations.title`, category name, venue name/city and organizer name/nick. An aggregation joins `lookupActiveOrganizer` (events of non-ACTIVE organizers disappear), sorts, and uses `$facet` for `list` + `metaCounter` (total). `addSeatCounts` adds `eventTotalSeats` / `eventSoldSeats`.
6. UI: `EventCard` + `EventTag` (status tag from `libs/seatAvailability.ts` `seatBadge`: sold out, few left at 10 percent or less, selling fast at 50 percent or more sold); `Pagination`; empty/error states with `StateBlock`; page past the end is redirected to the last page.
7. Event detail `/events/[id]` (`pages/events/[id]/index.tsx`): `getServerSideProps` fetches only SEO data anonymously through `libs/serverFetch.ts` `serverQuery` (8 s deadline, returns null on failure). In the browser, once `useAuth().ready`, queries `GetEvent` and `GetTicketTypes` run (`cache-and-network`). `getEvent` on the backend: public if APPROVED; the owner or an admin may see any status; hidden events answer `NO_DATA_FOUND`; for a signed-in member a **view** is recorded once per member (`ViewService.recordView`, then `eventViews +1`) and `meLiked` is computed.
8. `TicketPanel` shows ticket types and the buy button according to `libs/events.ts` `saleState` and `libs/salesWindow.ts`. A buyer-only gate (`libs/buyerGate.ts` `isBlockedBuyer`) makes the button `aria-disabled` for organizer/admin accounts.

---

## Flow 7. Select seats and hold them

1. The buyer clicks "Select seats" -> `/events/[id]/seats` (`pages/events/[id]/seats.tsx`). `useRequireAuth()` redirects guests to login with `returnTo`; `useBuyerOnlyRedirect` sends organizers/admins back with a notice (`libs/buyerGate.ts`).
2. The page loads `GetEvent`, `GetTicketTypes`, `GetSeatConfig` (hold seconds and max seats from the server). `saleState` must be `onSale`, else a `StateBlock` with `SalesNotice` explains why. RESERVED events render `SeatPicker`; GENERAL events render `GeneralPicker` (quantity per ticket type, no hold, see Flow 8).
3. `libs/components/seats/SeatPicker.tsx` uses `libs/hooks/useSeatMap.ts`: query `GetEventSeatMap` with `fetchPolicy: 'no-cache'` every **3 s** while the tab is visible, with back-off 3, 6, 12, 24, 30 s after failures, a refresh at once when the tab becomes visible, and a guard that drops an answer older than the one already applied. The map object is kept the same when `JSON.stringify([seats, venueLayout])` did not change.
4. Backend `EventService.getEventSeatMap`: only APPROVED RESERVED events of ACTIVE organizers (else coded `NO_DATA_FOUND`); returns the venue layout, the time zone and **only the seats that are not free**: `SOLD`, or `HELD` with `heldUntil > now` (an expired hold counts as free). For the caller's own holds it adds `mine: true` and `holdExpiresAt`. It never says who holds other seats.
5. Drawing and selecting: `SeatMap.tsx` draws SVG; clicking a seat calls `toggle(ref)` in `SeatPicker`: ignored if a pending order exists, the section is not SEATED, the tier is locked (`lockedTiers`, from `ticketAvailability`) or the seat is taken by someone else; adding beyond `maxSeatsPerOrder` shows a `max` notice. Selected seats are sorted with `compareSeats`.
6. Continue -> `goOn()` -> `libs/seats/checkout.ts` `holdAndCheckout(client, eventId, seats)`:
   a. Mutation `HoldSeats(eventId, seats: [{ sectionKey, row, number }])`.
   b. Backend `SeatService.holdSeats`: `resolveSeatInput` turns coordinates into seat ids (one query); buyer must be an ACTIVE `USER` (`assertBuyerAccount`); `assertEventOpenForSeats` (APPROVED, RESERVED, not started, organizer ACTIVE, purchase window open); seats this member held earlier and did not ask for again go back to AVAILABLE (`updateMany`); then **per seat** a conditional `findOneAndUpdate` whose filter allows `AVAILABLE`, or `HELD` with `heldUntil <= now`, or `HELD` by the same member; if any seat fails, the seats claimed in this call are released and `SEAT_JUST_TAKEN` is thrown (all or nothing). It returns the seats, `heldUntil`, `holdSeconds` and `serverTime`.
   c. `updateClockSkew(serverTime, sentAt, receivedAt)` (`libs/seats/clock.ts`) stores `server - midpoint` in `sessionStorage` (`tz:clock-skew`); countdowns use `serverNow()` = `Date.now() + skew`.
   d. Mutation `CreateCheckout({ eventId, seatIds })` creates the pending order (Flow 8). The order id is returned and `saveRetryInfo` (`libs/seats/retry.ts`) remembers the seats in `sessionStorage` for a retry.
7. The countdown (`libs/components/seats/Countdown.tsx`) counts down to the earliest `holdExpiresAt` of "my" seats (`holdDeadline`), turns urgent at 10 s and calls `onExpire` once per deadline; `SeatPicker.onHoldExpired` clears the selection and shows an "expired" notice.
8. Leaving the page inside the app releases the hold: `routerEvents.on('routeChangeStart', onLeave)` -> `RELEASE_SEATS` (not on reload; after a reload the hold is restored from the map's `mine` seats). "Release seats" button does the same.
9. If another buyer takes a selected seat the next poll shows it; the effect on `[map]` removes it from the selection and shows the `taken` notice. On `SEAT_JUST_TAKEN`, `goOn` re-reads the map (`refresh()`) and names the lost seats.

---

## Flow 8. Checkout and simulated payment

1. `createCheckout` backend (`be:components/order/order.service.ts`): buyer must be an ACTIVE USER; event must be APPROVED; the organizer must be ACTIVE; `getPurchaseWindowError` (event ended, sales not started, sales closed). The commission rate is `getCommissionRate(organizer)` (override first, else tier by `completedEvents`, `be:libs/commission.ts`).
   - RESERVED (`checkoutSeats`): `findHeldSeats` requires every seat to be held by this member with `heldUntil > now` (else `HOLD_EXPIRED`); `ticketTypeService.findSellable` (ACTIVE and inside sale window); price lines are computed from the **ticket types**, never from the client; `expiresAt` = the earliest `heldUntil`.
   - GENERAL (`checkoutQuantities`): for each item `ticketTypeService.reserve` does an atomic `findOneAndUpdate` that increments `soldQuantity` only if status is ACTIVE, quantity <= `maxPerOrder`, stock remains and the sale window is open; `expiresAt = now + SEAT_HOLD_SECONDS`. If one item fails every reservation made is released.
   - `createOrderDocument` stores `orderNumber` (`TZ-<time36>-<hex>`), items, `seatIds`, `subtotal`, `commissionRate`, `commissionAmount`, `totalAmount` (= subtotal: the buyer pays the price, the commission comes out of the organizer's side, `calculateOrderAmounts`), status `PENDING_PAYMENT`.
2. The frontend navigates to `/checkout/[orderId]` (`pages/checkout/[orderId].tsx`, `useRequireAuth`, `useBuyerOnlyRedirect`). It loads `GetOrder` (`network-only`), then `GetEvent`, `GetTicketTypes`, and for seated orders keeps polling the seat map via `useSeatMap` (to show seat names and to detect that the hold was replaced).
3. UI parts: `Countdown` to `order.expiresAt`; `OrderSummary`; `DemoNotice` (explains no real money, no real card details); disabled sample card fields; a checkbox "Simulate a failed payment" (`simulateFailure`); `PayBar`.
4. "Lost hold" detection (effect on `[pending, reserved, mapLoaded, map, mine, order, remaining]`): if one of my held seats has a `holdExpiresAt` that differs from the order's `expiresAt` by more than 1 s, or I hold fewer seats than the order has, `outcome = 'lost'`.
5. Pay: `pay()` -> mutation `PayOrder(orderId, simulate: SUCCESS | FAILURE)`. Backend `OrderService.payOrder`:
   a. `PAYMENT_MODE=disabled` -> GraphQL error code `SERVICE_UNAVAILABLE`.
   b. Order must belong to the buyer; already `PAID` returns the order (idempotent); not `PENDING_PAYMENT` -> `ORDER_NOT_PAYABLE`; past `expiresAt` -> `expireOrder` then `HOLD_EXPIRED`.
   c. `paymentService.charge(order, simulate)` -> `MockPaymentProvider.charge` (no money; returns `success` or a simulated failure and a `MOCK-...` reference).
   d. Failure -> `failOrder`: conditional update `PENDING_PAYMENT -> FAILED`, `releaseResources` (seats go back to AVAILABLE or stock is returned), the failed payment is recorded.
   e. Success: `seatService.markSold` (per seat conditional `HELD by me and not expired -> SOLD`, all or nothing; on failure the mock charge is refunded); then conditional update order `PENDING_PAYMENT -> PAID` (`paidAt`); `ticketTypeService.addSold`; `paymentService.record` (status CAPTURED); `ticketModel.insertMany(buildTickets(...))` (Flow 9); notifications to buyer and organizer. Any failure in this block undoes everything and throws `SOMETHING_WENT_WRONG`.
6. Frontend result: `PAID` -> `router.push(confirmationUrl(orderId))`; `FAILED` -> state `failed` and a retry button: `retry()` loads `loadRetryInfo` and calls `holdAndCheckout` / `checkoutQuantities` again (a failed payment frees the seats, so a retry is a **new hold and a new order**, F56). Errors map through `libs/seats/errors.ts` `checkoutErrorKey` (by exact message; unknown text becomes a generic translated error).
7. Leaving the page inside the app cancels an unpaid order: `routeChangeStart` -> `CANCEL_PENDING_ORDER` (backend `cancelPendingOrder`: conditional `PENDING_PAYMENT -> CANCELLED` then `releaseResources`). "Change seats" cancels first, then opens the seat page.
8. Expired orders: the backend expires them in two ways (lazy and timed): `OrderService.getOrder` / `getMyOrders` call `expireStaleOrdersOf(memberId)`; the batch app runs `batchExpireOrders` on the cron `10 * * * * *` (second 10 of every minute, `be:../ticketzy-batch/src/batch.controller.ts`). Details in `02-state-and-rules.md`, "Concurrency".

---

## Flow 9. Ticket creation and QR display

1. Creation (inside `payOrder`, `OrderService.buildTickets`): one ticket per sold seat (RESERVED) or per purchased quantity (GENERAL). Each ticket gets a new ObjectId `_id`, `ticketCode = randomBytes(10).toString('hex').toUpperCase()` (20 hex chars), `qrToken = buildQrToken(_id)` and status `VALID`; inserted with `ticketModel.insertMany`.
2. QR token (be:`libs/qr-token.ts`): `<ticketId>.<HMAC-SHA256(ticketId, QR_SECRET) as hex>`. The signature is generated at purchase and **stored** on the ticket document (`qrToken`). The secret never leaves the server. The frontend never creates or signs tokens.
3. Confirmation page `/orders/[orderId]/confirmation` (`pages/orders/[orderId]/confirmation.tsx`): `GetOrder`, then `GetMyTickets` (first 50 `UPCOMING` tickets, filtered by `orderId` in the browser) for seat names. `PaidSplash` (`libs/components/common/PaidSplash.tsx`) plays about 3 s once per order if `paidAt` is under 5 minutes old (`sessionStorage` key `tz-paid-splash:<orderId>`).
4. Ticket list `/tickets` (`pages/tickets/index.tsx`, query `GetMyTicketsList`) and detail `/tickets/[ticketId]` (`pages/tickets/[ticketId].tsx`, query `GetTicket`). The backend `TicketService.getTicket` returns the ticket only if `ownerId` is the caller; its `qrToken` field is returned there.
5. QR rendering: `libs/components/account/QrCode.tsx` imports `qrcode` lazily and calls `QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 640, color: { dark: '#000000', light: '#ffffff' } })`, shown as an `<img>` 320 x 320. **Always black on white** in both themes (F85). The page shows it only when `ticketState(ticket) === 'valid'` and `qrToken` exists (`showQr`). The printed `ticketCode` is a reference, not a door fallback (F84). A full-screen dialog (`fullscreen` state) enlarges it.
6. Ticket state shown to the buyer: `libs/account/tickets.ts` `ticketState`: `USED`, `REFUNDED`, `CANCELLED` as stored; a `VALID` ticket whose event has ended (status `ENDED` or `endAt` past) is labelled `expired` (never stored).
7. Calendar file: `buildIcs` / `downloadIcs` (`libs/account/ics.ts`) from the ticket page.

---

## Flow 10. QR scan and check-in

1. The ORGANIZER (ACTIVE) opens `/organizer/check-in` (`pages/organizer/check-in.tsx`). The page lists APPROVED events that have not ended (`GetMyEvents` with `search: { eventStatus: 'APPROVED' }`, filtered by `endAt` in the browser). The selected event is in the URL `?event=<id>`.
2. The camera is started only by a button in `libs/components/organizer/checkin/Scanner.tsx` (`html5-qrcode`, dynamic import, no SSR). `Html5Qrcode.getCameras()`; first start uses `{ facingMode: 'environment' }`; config `fps: 10` and a square `qrbox` of 80 percent of the smaller side. Errors named `NotAllowed`, `Permission` or `denied` set phase `denied`; other failures set `unavailable`. "Switch camera" cycles through the cameras found.
3. The library calls `onScan(text)` on every decoded frame. `pages/organizer/check-in.tsx` `submit(raw, 'camera')` ignores the same token within `REPEAT_MS` = 4 s (`last` ref) and ignores a scan while another is being checked (`busyRef`). A typed code uses the same function (`source: 'manual'`; `cleanToken` strips whitespace).
4. The camera sends mutation `CheckInTicket(qrToken, eventId)` (`apollo/organizer/orders.ts`), the QR token. The manual box can also take the printed 20-hex ticket code and then sends `CheckInTicketByCode(input: { eventId, ticketCode })` (backend #116, F351); `readManual` in `libs/organizer/checkin.ts` picks the path (token format, else 20 hex after removing spaces and dashes, else a client message and no request). The backend finds the ticket by code **and** event, then runs the same checks as below; a shared limit of 60 preview/check-in-by-code calls per minute gives `RATE_LIMITED`.
5. Backend `be:components/ticket/ticket.resolver.ts` (`@Roles(ORGANIZER, ADMIN)` + `ActiveOrganizerGuard`) -> `TicketService.checkInTicket` -> `validateScan`:
   a. `parseQrToken`: regex `^([a-f0-9]{24})\.([a-f0-9]{64})$` and `timingSafeEqual` signature check **without touching the database**; failure -> `QR_INVALID`.
   b. Ticket must exist with that exact stored `qrToken`.
   c. If the gate's `eventId` is given it must equal the ticket's event (`TICKET_WRONG_EVENT`); the scanning member must own the event unless ADMIN (`TICKET_WRONG_ORGANIZER`); the event must be APPROVED (`EVENT_NOT_OPEN_FOR_CHECKIN`); the ticket must be `VALID` (`TICKET_ALREADY_USED`, `TICKET_REFUNDED`, `TICKET_NOT_VALID`).
   d. **Double-scan protection**: one conditional `findOneAndUpdate({ _id, ticketStatus: VALID }, { ticketStatus: USED, checkedInAt: now })`. Of two simultaneous scans only one matches; the other reads the current status and throws the matching message.
   e. Returns buyer name, ticket type name, seat coordinates and the ticket (without `qrToken`).
6. Frontend maps the result with `libs/organizer/checkin.ts` `classifyScan` (error code first, exact backend message second -> `valid`, `used`, `wrongEvent`, `refunded`, `invalid`, `notOpen`, `notAllowed`, `codeNotFound`, `badCode` (client only), `rateLimited`, `network`, `error`). `ScanResult.tsx` shows an icon, a sentence and the buyer/seat; green for valid, red for refused, amber for set-up problems. The device vibrates (`navigator.vibrate`), the last 8 scans are listed, and the counts card (`GetCheckInCounts`, USED vs all) is refetched.
7. **Preview** queries `checkInPreview` and `checkInPreviewByCode` exist on the backend (same checks, change nothing) but this frontend does not call them (check-in happens on submit).

---

## Flow 11. Refund (buyer) and event cancellation (refund of every order)

**Buyer refund**

1. The buyer opens `/orders/[orderId]` (`pages/orders/[orderId]/index.tsx`, `withAccount`), which renders `libs/components/account/RefundPanel.tsx`.
2. For a PAID order `RefundPanel` runs query `GetRefundQuote(orderId)`. Backend `RefundService.getRefundQuote` -> `assess(...)`: refundable only if the order is `PAID`; if the event is CANCELLED always refundable; else no ticket may be `USED` (`REFUND_TICKET_CHECKED_IN`), every ticket must be `VALID` or `REFUNDED`, and (for buyers) now must be before the deadline from `getRefundDeadline(startAt, venueTimezone)` = the instant before 00:00 of the event day on the venue's wall clock (that is "23:59 the day before", be:`libs/refund-policy.ts`). Returns `refundable`, `deadline`, `venueTimezone`, `refundableAmount`, `reason`.
3. The panel shows the deadline (formatted with the venue zone, `formatEventDate` + `formatZoneName`) and, if refundable, a danger button. A MUI `Dialog` asks confirmation with an optional note (max 300 characters).
4. `submit()` runs mutation `RequestRefund(orderId, reason)` with `refetchQueries` for `GetOrderDetail`, `GetMyTicketsList`, `GetRefundQuote`, `GetUnreadNotificationCount`.
5. Backend `RefundService.requestRefund` -> `processRefund`:
   a. `claimRefund`: create a `refunds` document (unique index on `orderId`) with status `PENDING` and `lockedAt`; a duplicate-key error means someone else owns it; a `FAILED` one, or a `PENDING` one older than `REFUND_LOCK_MS` (5 min), is taken over by a conditional update.
   b. `markTicketsRefunded`: `VALID` tickets -> `REFUNDED` (and `USED` too only for a cancelled event); if a scan slipped in, the flipped tickets are restored and `REFUND_TICKET_CHECKED_IN` is thrown.
   c. `paymentService.refundOrder`: claims the `CAPTURED` payment by setting `REFUNDED` before calling the provider (mock does nothing), restores it if the provider fails.
   d. `releaseStock`: guarded by the `stockReleased` flag on the refund; seats `SOLD -> AVAILABLE`, `soldQuantity` reduced (also lifts `SOLD_OUT`).
   e. Order `PAID -> REFUNDED` (`refundedAt`); refund `COMPLETED`; notifications to buyer (and organizer for buyer/admin refunds).
   f. On error before the money moved, tickets are restored and the refund becomes `FAILED`.
6. Idempotent: refunding an already `REFUNDED` order returns it unchanged; `RefundPanel` detects "already" when `refundedAt` is more than 5 s before the click.

**Admin cancels an event (refunds every paid order)**

1. Admin: `pages/admin/events/[id].tsx` -> `ReasonDialog` -> `CancelEventByAdmin({ eventId, reason })`. Organizer: `libs/components/organizer/CancelDialog.tsx` -> `CancelMyEvent`.
2. Backend `EventService.cancelEvent`: reason required; `changeStatusByAdmin(..., 'cancel')` conditional `APPROVED -> CANCELLED` (`ownerId` filter for the organizer path); `memberEvents -1`; then `refundOrdersForCancelledEvent` -> `RefundService.refundOrdersForCancelledEvent` loops PAID orders of the event in batches of 50 by `_id` and calls `processRefund` with `assessment.cancelled = true` (USED tickets are refunded too, no deadline). A failure for one order is counted and logged, the run goes on.
3. If some failed, the admin page shows "Check and finish refunds" -> `RetryEventRefundsByAdmin` -> `retryEventRefundsByAdmin` (only for CANCELLED events; safe to repeat).
4. An admin can also refund one order after the deadline (`refundOrderByAdmin`, reason required, audited); there is **no screen for it** in this frontend (no `refundOrderByAdmin` in `apollo/`).

---

## Flow 12. Organizer payout

1. There are no payout records until an admin records one. The backend computes the rows on demand: `be:libs/payout.ts` `buildPayoutPipeline` is an aggregation over `events` (APPROVED, ENDED, CANCELLED) that joins the venue time zone, computes `payoutDate = endAt + 3 days` on the venue's calendar (`$dateAdd` with timezone), sums PAID orders (`gross` = sum of `totalAmount`, `commission` = sum of the commission stored on each order, rounded once half-up for the whole event), joins `payouts`, and computes `payoutStatus`.
2. Organizer view: `/organizer/payouts` (`pages/organizer/payouts.tsx`) renders `libs/components/organizer/payouts/MyPayouts.tsx`: query `GetMyPayouts(input: { page, limit: 10, direction, payoutStatus? })` (`apollo/payouts.ts`). Backend `PayoutService.getMyPayouts` forces `organizerId` from the token. The tiles (`PayoutTiles`) show `totalPaidOut`, `totalDue`, `totalUpcoming`; rows show a status chip (`PayoutStatusChip`).
3. Admin view: `/admin/payouts` (`pages/admin/payouts/index.tsx`): `GetPayoutsByAdmin` with filters (organizer, text, dates, status).
4. "Mark as paid out" (`libs/components/admin/MarkPaidDialog.tsx`): shows event, organizer, gross, commission, net; optional note (max `PAYOUT_NOTE_MAX` = 300); runs `MarkPayoutPaidByAdmin({ eventId, note })`.
5. Backend `PayoutService.markPayoutPaidByAdmin`: refusals in order: unknown event (`PAYOUT_EVENT_NOT_FOUND`), already paid (`PAYOUT_ALREADY_PAID`), no row (`PAYOUT_NOTHING_TO_PAY`), date not reached (`PAYOUT_NOT_DUE_YET`), status not `DUE`. It then **recomputes** the numbers and stores them as a snapshot in `payouts` (`eventId` unique: a race between two admins is decided by the unique index, the loser gets `PAYOUT_ALREADY_PAID`), writes an audit entry (`PAYOUT_MARKED_PAID`) and notifies the organizer (`PAYOUT_PAID`).
6. Status rule (`be:libs/payout.ts` `getPayoutStatus`, mirrored in the aggregation `$switch`): a payout document exists -> `PAID_OUT`; net is 0 (also every cancelled event) -> `NOTHING_TO_PAY`; payout date in the future -> `NOT_YET_DUE`; else `DUE`.
7. The organizer's dashboard and analytics numbers (`GetMyEarnings`, `libs/components/organizer/sales/*`) are separate "live" figures from PAID orders (F137); they do not read the `payouts` collection.

Next: `02-state-and-rules.md`.
