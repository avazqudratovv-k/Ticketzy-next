# 02 State and rules

**What this file covers.** Every state machine (member, organizer approval, event, ticket type, event seat, order, payment, ticket, refund, payout, conversation) with the exact transitions and the code that performs them; the role and permission matrix (guest, USER, ORGANIZER, ADMIN) per operation and per page; the money rules (commission tiers, refund deadline, payout date, KRW only); and the concurrency rules (how double sales are prevented, hold expiry, lazy expiry, atomic updates) with the real code. Most state is **owned by the backend** (`be:` = `/Users/kenneth/ticketzy/apps/ticketzy-api/src/`); the frontend only mirrors it and never decides eligibility. Frontend files are written without a prefix.

Reading tip: a "conditional update" means a MongoDB `findOneAndUpdate(filter, update)` whose **filter contains the old state**. If another request already changed the state, the filter matches nothing and the update does nothing. That is how this project avoids races without database transactions (backend decision #83 says there is no transaction support without a replica set).

---

## 1. State machines

### 1.1 Member status (every member)

Enum `MemberStatus` (`be:libs/enums/member.enum.ts`): `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `DELETE`.

| Event | From | To | Code |
|---|---|---|---|
| Sign up as buyer | none | `ACTIVE` | `MemberService.signupUser` |
| Sign up as organizer | none | `PENDING` | `MemberService.signupOrganizer` |
| Admin seed | none | `ACTIVE` ADMIN | be:`libs/admin-seed.ts` (not read in detail) |
| Admin changes a buyer | any | any value in the input | `MemberService.updateMemberByAdmin` (no transition table for buyers) |

Rules inside `updateMemberByAdmin`: nobody can become ADMIN (`CANNOT_ASSIGN_ADMIN_ROLE`); an admin cannot change their own type/status (`CANNOT_CHANGE_OWN_ACCESS`); another admin's type/status is untouchable (`CANNOT_CHANGE_ADMIN_ACCESS`) and so is their password (`CANNOT_RESET_ADMIN_PASSWORD`, audited); an ORGANIZER's status cannot be changed here (`USE_ORGANIZER_OPERATIONS`). A self update (`updateMember`) deletes `memberType` and `memberStatus` from the input and only works for `ACTIVE` or `PENDING` members. The frontend page `/admin/members` offers only suspend/reactivate for buyers (`pages/admin/members/index.tsx`, F158).

Who may log in or use a token (`be:components/auth/auth.service.ts` `authenticate` / `loadMember`, `unverifiedMemberStatuses`): `REJECTED`, `SUSPENDED`, `DELETE` are refused (login answers `ACCOUNT_NOT_VERIFIED`). `PENDING` can log in. Two guards let restricted members in on purpose: `NotificationGuard` (REJECTED/SUSPENDED may read notifications) and `ConversationGuard` (organizers/admins, including restricted ones, may reach support). `DELETE` has no operation in this repo that sets it.

### 1.2 Organizer approval

Table `organizerTransitions` (`be:libs/enums/member.enum.ts`), applied by `OrganizerService.changeStatus` as one conditional update `{ _id, memberType: ORGANIZER, memberStatus: { $in: from } }`:

| Action (mutation) | From | To | Extra |
|---|---|---|---|
| `verifyOrganizerByAdmin` | `PENDING` | `ACTIVE` | clears `rejectReason` |
| `rejectOrganizerByAdmin` | `PENDING` | `REJECTED` | reason required; stored as `rejectReason` |
| `suspendOrganizerByAdmin` | `ACTIVE` | `SUSPENDED` | reason required |
| `reinstateOrganizerByAdmin` | `SUSPENDED`, `REJECTED` | `ACTIVE` | clears `rejectReason` |

After each: audit log entry, notification to the organizer, `realtime.setMemberRestricted` (reject and suspend restrict chat sockets). A wrong state answers `INVALID_STATUS_TRANSITION`; an unknown id `NO_ORGANIZER_FOUND`. Frontend: `libs/components/admin/OrganizerDrawer.tsx` shows only the actions valid for the status (helper in `libs/admin/organizers.ts`, not read in full). The organizer's UI mapping of status to ability is `libs/organizer/events.ts` `organizerAccess` (`ACTIVE` -> `active`, `PENDING` -> `pending`, `REJECTED` -> `rejected`, everything else -> `suspended`).

Only ACTIVE organizers can write: `ActiveOrganizerGuard` (`be:components/auth/guards/organizer.guard.ts`) throws `ORGANIZER_NOT_APPROVED` for an organizer whose status is not ACTIVE. Tickets of events whose organizer is not ACTIVE cannot be bought or listed (`createCheckout`, `lookupActiveOrganizer` in `be:libs/config.ts`).

### 1.3 Event status

Enum `EventStatus`: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `ENDED`. Table (`be:libs/enums/event.enum.ts`):

```ts
export const eventTransitions = {
	submit:  { from: [DRAFT, REJECTED], to: PENDING },
	approve: { from: [PENDING],         to: APPROVED },
	reject:  { from: [PENDING],         to: REJECTED },
	cancel:  { from: [APPROVED],        to: CANCELLED },
	end:     { from: [APPROVED],        to: ENDED },
};
```

| Transition | Who/what performs it | Code |
|---|---|---|
| create -> `DRAFT` | ACTIVE organizer | `EventService.createEvent` |
| `DRAFT`/`REJECTED` -> `PENDING` | owner | `submitEventForApproval` (checks by `getEventSubmitError`, `assertVenueFree`, conditional on the validated status; clears `rejectReason`) |
| `PENDING` -> `APPROVED` | ADMIN, never the event's own organizer | `approveEventByAdmin` -> `changeStatusByAdmin` (seats generated first for RESERVED) |
| `PENDING` -> `REJECTED` | ADMIN, reason required | `rejectEventByAdmin` |
| `APPROVED` -> `CANCELLED` | ADMIN or the owning ACTIVE organizer, reason required | `cancelEventByAdmin` / `cancelMyEvent` -> `cancelEvent` (then refunds, Flow 11) |
| `APPROVED` -> `ENDED` | batch job | `BatchService.batchEndEvents` (`endAt <= now`; also `completedEvents +1` for the organizer) |
| `APPROVED` -> `PENDING` | organizer saves an edit | `updateEvent` -> `applyUpdate(..., sendApprovedBackToPending = true)` |

Editing rules (be:`editableEventStatuses` = DRAFT, REJECTED, APPROVED; `closedEventStatuses` = CANCELLED, ENDED). The frontend copy of the rule is `libs/organizer/events.ts` `editModeOf`: `DRAFT`/`REJECTED` -> `full`, `APPROVED` -> `review` (any saved change sends the event back to PENDING), others -> `locked`. Public visibility is only `APPROVED` (`publicEventStatus`), plus the owner and admins can open any status via `getEvent`.

`ENDED` and `CANCELLED` are final: no operation leaves them. The frontend shows an extra label "expired" for tickets but there is no event status for it.

### 1.4 Ticket type status

Enum `TicketTypeStatus`: `ACTIVE`, `PAUSED`, `SOLD_OUT` (`be:libs/enums/ticket.enum.ts`). Counters: `totalQuantity`, `soldQuantity`.

| Transition | Code |
|---|---|
| `ACTIVE` -> `SOLD_OUT` when `soldQuantity >= totalQuantity` | `TicketTypeService.tryReserve` (GENERAL checkout) and `addSold` (RESERVED, when seats are sold): a second conditional `updateOne` with `$expr: { $gte: ['$soldQuantity', '$totalQuantity'] }` |
| `SOLD_OUT` -> `ACTIVE` when `soldQuantity < totalQuantity` | `TicketTypeService.release` (cancelled/expired/failed/refunded) and `expireStaleOrders` stock release |
| `ACTIVE` <-> `PAUSED` | organizer, `updateTicketType` (status field); frontend has a "pause sales" switch, no delete (F100) |

Currency: KRW only (`ONLY_KRW_TICKETS`; constant `EVENT_CURRENCY`). For RESERVED events `totalQuantity` is derived from the seats of the tier (`resolveTotalQuantity`, `generateEventSeats` rewrites it on approval); changing it by hand fails with `TICKET_TYPE_QUANTITY_FROM_SEATS`. The total can never drop below `soldQuantity` (filter `soldQuantity: { $lte: total }`). On the frontend, availability is computed in `libs/events.ts` `ticketAvailability`: `soldOut`, `paused`, `notStarted`, `closed`, `available`, using both the event's sale window and the ticket type's own window (`libs/salesWindow.ts` `typeWindow`: starts at the later start, ends at the earlier end).

### 1.5 Event seat status

Enum `SeatStatus`: `AVAILABLE`, `HELD`, `SOLD`. One document per seat in collection `eventSeats`, created by `EventService.generateEventSeats` at approval (idempotent upsert with `$setOnInsert`).

| Transition | Code (`be:components/seat/seat.service.ts` unless noted) |
|---|---|
| `AVAILABLE` -> `HELD` (`heldBy`, `heldUntil`) | `holdSeats` per-seat conditional update |
| `HELD` (expired) -> `HELD` by another member | same filter, branch `{ seatStatus: HELD, heldUntil: { $lte: now } }` |
| `HELD` -> `HELD` (same member, new deadline) | same filter, branch `{ seatStatus: HELD, heldBy: memberId }` |
| `HELD` -> `AVAILABLE` | `releaseSeats` (buyer button/leaving page), `holdSeats` (earlier seats not asked again), `releaseOrderSeats` (order failed/cancelled/expired), `releaseExpiredSeatHolds` (batch) |
| `HELD` -> `SOLD` (`orderId`) | `markSold` (only if `heldBy` is the payer and `heldUntil > now`) |
| `SOLD` -> `HELD` | `revertSold` (rollback inside a failed payment) |
| `SOLD` -> `AVAILABLE` | `releaseSoldSeats` (refund, `RefundService.releaseStock`) |

### 1.6 Order status

Enum `OrderStatus`: `PENDING_PAYMENT`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED` (frontend copy in `libs/seats/types.ts`).

| Transition | Code |
|---|---|
| create -> `PENDING_PAYMENT` | `OrderService.createOrderDocument` (from `createCheckout`) |
| `PENDING_PAYMENT` -> `PAID` | `payOrder` after a successful charge, conditional on `PENDING_PAYMENT` |
| `PENDING_PAYMENT` -> `FAILED` | `failOrder` (provider declined) |
| `PENDING_PAYMENT` -> `CANCELLED` | `cancelPendingOrder` (buyer) |
| `PENDING_PAYMENT` -> `EXPIRED` | `expireOrder` (inside `payOrder`), `expireStaleOrdersOf` (reads), `expireStaleOrders` (batch and ticket-type sweep), always with `expiresAt <= now` in the filter |
| `PAID` -> `REFUNDED` | `RefundService.processRefund`, conditional on `PAID` |
| `PAID` -> `PENDING_PAYMENT` | rollback only, when ticket creation fails right after payment (`payOrder` catch block) |

`FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED` are final. The frontend never changes order status itself; `pages/checkout/[orderId].tsx` adds the local labels `failed`, `expired`, `lost` (state `outcome`) for what it sees.

### 1.7 Payment status

Enum `PaymentStatus`: `INITIATED`, `CAPTURED`, `FAILED`, `REFUNDED`. `PaymentService.record` creates a row as `CAPTURED` (success) or `FAILED`. `refundOrder` moves `CAPTURED` -> `REFUNDED` (claimed before the provider call; restored to `CAPTURED` if the provider throws). `INITIATED` appears only as the schema default (`be:libs/schemas/Payment.model.ts`) and no code sets it (see oddity O-3). `deleteRecords` removes rows when a payment is rolled back. Providers named in the enum: `MANUAL`, `MOCK`, `STRIPE`, `PAYME`, `CLICK`; only `MockPaymentProvider` exists in `be:components/payment/`.

### 1.8 Ticket status

Enum `TicketStatus`: `VALID`, `USED`, `REFUNDED`, `CANCELLED`.

| Transition | Code |
|---|---|
| create -> `VALID` | `OrderService.buildTickets` / `insertMany` in `payOrder` |
| `VALID` -> `USED` (`checkedInAt`) | `TicketService.checkInTicket`, conditional on `VALID` |
| `VALID` -> `REFUNDED` | `RefundService.markTicketsRefunded` |
| `USED` -> `REFUNDED` | same, only when the event is CANCELLED |
| `REFUNDED` -> `VALID`/`USED` | `restoreTickets`, only to undo a half-done refund |
| `CANCELLED` | never set by any backend code found (see O-3); frontend handles it in `libs/account/tickets.ts` |

Frontend label `expired` (VALID ticket of an ended event) is computed, never stored.

**Ended events and the public (backend #121, F355).** An event is public only while it is `APPROVED` and `endAt` is ahead (backend `libs/event-visibility.ts`; it does not wait for the batch job). `getEvents`, favorites and visited hide it; `getEvent`, `getTicketTypes` and `getComments` answer `EVENT_ENDED` (HTTP 410, no data) for the public, `NO_DATA_FOUND` for a hidden event, and still give the owner and admins everything. `payOrder` refuses an ended event (`EVENT_ENDED_NO_SALES`). Buyers keep their orders and tickets: `getOrder`, `getMyOrders`, `getMyTickets` and `getTicket` join the event by id with no status filter, so the order, confirmation, ticket and My tickets pages read the event from that joined data and never call the public event queries for an event that is not live (`libs/events.ts` `isPublicEvent`).

### 1.9 Refund status

Collection `refunds`, one per order (unique `orderId`). Enum `RefundStatus`: `PENDING`, `COMPLETED`, `FAILED`; `RefundSource`: `BUYER`, `ADMIN`, `EVENT_CANCELLED`.

| Transition | Code |
|---|---|
| create -> `PENDING` (`lockedAt`) | `claimRefund` first branch |
| `FAILED` -> `PENDING` | `claimRefund` takeover |
| `PENDING` older than 5 min -> `PENDING` (new owner) | `claimRefund` takeover, `REFUND_LOCK_MS` |
| `PENDING` -> `COMPLETED` | end of `processRefund` |
| `PENDING` -> `FAILED` (`failureReason`) | `processRefund` catch |

A second caller finding a live `PENDING` refund gets `REFUND_IN_PROGRESS` unless the order is already `REFUNDED` (then it returns the order).

### 1.10 Payout status (computed, not stored)

`PayoutStatus`: `NOT_YET_DUE`, `DUE`, `PAID_OUT`, `NOTHING_TO_PAY` (frontend `libs/payouts.ts`). Never stored; decided in the aggregation `$switch` of `be:libs/payout.ts` `buildPayoutPipeline`, order of rules: payout document exists -> `PAID_OUT`; `net == 0` -> `NOTHING_TO_PAY`; `payoutDate > now` -> `NOT_YET_DUE`; otherwise `DUE`. The only write is creating a `payouts` document in `markPayoutPaidByAdmin` (from `DUE` only). A payout is never reversed.

### 1.11 Conversation (chat)

`conversations` (`be:libs/schemas/Conversation.model.ts`) has **no status field**. Its "state" is: `eventId` (one conversation per event, unique partial index) or `isSupport: true` (one per organizer, unique partial index); `adminId` (null until an admin replies; the first admin to reply claims it, `claimConversation`); `unreadForOrganizer` and `unreadForAdmin` counters (admin counter shared by all admins); `lastMessageAt`. Messages (`ChatMessage`) have `readAt`. Access depends on the organizer's member status (`be:libs/conversation-access.ts`, not read in detail). The frontend derives per-message UI state `sending`, `sent`, `failed`, `read` (`libs/messaging/types.ts` `ThreadMessage.local`, `readAt`) and socket state `off`, `connecting`, `open`, `fallback` (`apollo/store.ts` `socketStatusVar`).

---

## 2. Roles and permissions

### 2.1 Backend guards (what each means)

| Guard | File | Behaviour |
|---|---|---|
| `WithoutGuard` | `be:components/auth/guards/without.guard.ts` | Public. Tries to authenticate; any failure becomes `authMember = null` (guest). |
| `AuthGuard` | `auth.guard.ts` | Any signed-in member (not REJECTED/SUSPENDED/DELETE). |
| `RolesGuard` + `@Roles(...)` | `roles.guard.ts` | Signed in and `memberType` in the list, else `ONLY_SPECIFIC_ROLES_ALLOWED` (403). |
| `ActiveOrganizerGuard` | `organizer.guard.ts` | Used after the above: an ORGANIZER must be ACTIVE (admins pass). |
| `NotificationGuard`, `ConversationGuard` | same folder | Let restricted accounts in for notifications/support. |

The token is re-checked against the database on every call (`authenticate` loads the member), so a suspended member loses access immediately even if the JWT is still valid.

### 2.2 Operations by role (from the resolvers; "buyer" = USER)

Guest = no token. "Buyer-only" = the service additionally calls `assertBuyerAccount` (`be:libs/buyer.ts`), so an ORGANIZER or ADMIN is refused with `ONLY_BUYERS_CAN_BUY` even though the guard is only `AuthGuard`.

| Operation (kind) | Guest | USER | ORGANIZER | ADMIN |
|---|---|---|---|---|
| `signupUser`, `signupOrganizer`, `login` (mutation) | yes | yes | yes | yes |
| `getEvents`, `getEvent`, `getEventSeatMap`, `getTicketTypes`, `getSeatConfig`, `getVenue(s)`, `getMember`, `getOrganizers`, `getComments` (query, `WithoutGuard`) | yes | yes | yes | yes |
| `holdSeats`, `releaseSeats` (`AuthGuard`) | no | yes | refused (buyer-only) | refused |
| `createCheckout`, `payOrder` (`AuthGuard`) | no | yes | refused | refused |
| `cancelPendingOrder`, `getOrder`, `getMyOrders`, `getMyTickets`, `getTicket`, `getRefundQuote`, `requestRefund` (`AuthGuard`, filter by owner) | no | yes | own data only (none) | own data only |
| `likeTargetEvent`, `createComment`, `updateMember`, `imageUploader`, `askAssistant`, notifications | no | yes | yes | yes (notifications via `NotificationGuard`) |
| `createVenue`, `updateVenue` (`@Roles(ORGANIZER, ADMIN)` + ActiveOrganizer) | no | no | ACTIVE only | yes |
| `createEvent`, `updateEvent`, `submitEventForApproval`, `cancelMyEvent`, `getMyEvents`, ticket type create/update, `translateEvent`, `getMyEventOrders`, `getMyPayouts`, sales/attendee queries (`@Roles(ORGANIZER)` + ActiveOrganizer) | no | no | ACTIVE only | no |
| `checkInTicket`, `checkInPreview` (`@Roles(ORGANIZER, ADMIN)` + ActiveOrganizer) | no | no | ACTIVE, own events only | any event |
| `approveEventByAdmin`, `rejectEventByAdmin`, `cancelEventByAdmin`, `getEventsByAdmin`, `runEventModerationByAdmin`, `retryEventRefundsByAdmin`, `refundOrderByAdmin`, organizer verify/reject/suspend/reinstate, commission override set/clear, `getAllMembersByAdmin` (a Mutation), `updateMemberByAdmin`, `getAllOrdersByAdmin`, `getPayoutsByAdmin`, `markPayoutPaidByAdmin` (`@Roles(ADMIN)`) | no | no | no | yes |
| Conversations: `startConversation`, `getMyConversations`, `sendMessage`, ... (`ConversationGuard`) | no | no | yes (restricted ones limited by `conversation-access`) | yes |

This table was assembled from the `@Roles/@UseGuards` lines of the resolvers listed by grep (event, venue, order, seat, ticket, refund, payout, member, organizer). Resolvers of comment, like, follow, notice, notification, view, AI and conversation were not read line by line; their rows follow the decision log (#22 to #30, #58, #60).

### 2.3 Pages by role (frontend)

Guards used by pages: `useRequireAuth` / `useRequireRole` / `withAuth` in `libs/auth/guards.tsx` (redirect guests to `/account/login?returnTo=...`, send a wrong role to `homeFor(user)`), `AccountShell` (`libs/components/account/AccountShell.tsx`), `createDashboardLayout(role)` (`libs/components/dashboard/DashboardShell.tsx`, renders nothing until allowed), `useRedirectIfSignedIn`, `useBuyerOnlyRedirect`.

| Page group | Guest | USER | ORGANIZER | ADMIN | Guard |
|---|---|---|---|---|---|
| `/`, `/events`, `/events/[id]`, `/organizers/[id]`, static pages, `/sell` | yes | yes | yes | yes | none (the buy button is `aria-disabled` for non-buyers, `libs/buyerGate.ts`) |
| `/account/login`, `/account/signup`, `/account/join` | yes | sent home | sent home | sent home | `useRedirectIfSignedIn` |
| `/events/[id]/seats`, `/checkout/[orderId]`, `/orders/[orderId]/confirmation` | login first | yes | sent to event page with notice (seats, checkout) | same | `useRequireAuth` (+ `useBuyerOnlyRedirect` on seats and checkout) |
| `/tickets`, `/tickets/[ticketId]`, `/orders`, `/orders/[orderId]`, `/account/saved`, `/settings`, `/notifications` | login first | yes | the shared pages (`/notifications`, `/settings`) show without the buyer menu (`acct--solo`) | same | `withAccount` -> `AccountShell` -> `useRequireAuth()` (no role list) |
| `/organizer/*` | login first | sent home | yes (non-ACTIVE sees `BlockedPanel` or a disabled create button) | sent to `/admin` | `withOrganizerLayout` |
| `/admin/*` | login first | sent home | sent to `/organizer` | yes | `withAdminLayout` |

Frontend checks are for comfort; the backend repeats every check, so a hand-made request is refused anyway.

---

## 3. Money rules

| Rule | Value | Where it is decided |
|---|---|---|
| Currency | KRW only; one currency per event | be:`TicketTypeService.createTicketType` (`ONLY_KRW_TICKETS`, `EVENT_HAS_OTHER_CURRENCY`); frontend `libs/format.ts` `formatPrice` defaults to `KRW` |
| Buyer price | `totalAmount = subtotal` (sum of unit price x quantity). **No fee is added.** | be:`libs/commission.ts` `calculateOrderAmounts`; checkout page shows the service fee as "Included" (F76) |
| Commission base | 10 percent | `BASE_COMMISSION_RATE` |
| Commission tiers | 7 percent from 5 completed events, 5 percent from 20 (exactly 5 or 20 already gets the lower rate) | be:`commissionTiers`, `getCommissionRate` |
| Commission override | admin sets `{ rate 0 to 100, endsAt?, reason }`; wins while no `endsAt` or `endsAt` is in the future | be:`getCommissionRate`, `OrganizerService.setCommissionOverrideByAdmin` / `clearCommissionOverrideByAdmin`; frontend validation `libs/admin/commission.ts` `parseRate` |
| Commission amount | `round(subtotal x rate / 100, 2 decimals)`, stored on every order with its `commissionRate` | `roundMoney` |
| `completedEvents` | +1 when an APPROVED event becomes ENDED | `BatchService.batchEndEvents` |
| Rate used | the organizer's rate **at the time of checkout**, saved on the order; later rate changes do not alter old orders | `createCheckout` -> `getCommissionRate(organizer, now)` |
| Refund deadline (buyer) | the end of the day before the event starts, at 23:59:59.999 on the **venue's** wall clock (implemented as 1 ms before 00:00 of the event day in the venue zone) | be:`libs/refund-policy.ts` `getRefundDeadline`; default zone `Asia/Seoul` |
| Refund unit | whole order only | `RefundService` |
| Refund blockers | any `USED` ticket (unless the event is cancelled); order not `PAID` | `assess` |
| Admin refund | may refund after the deadline, never with a checked-in ticket, reason required | `refundOrderByAdmin` |
| Cancelled event | every PAID order is refunded, `USED` tickets included, no deadline | `refundOrdersForCancelledEvent` |
| Payout date | `endAt + 3 days` on the venue's calendar (same wall-clock time) | be:`libs/payout.ts` `PAYOUT_DELAY_DAYS = 3`, `getPayoutDate` |
| Payout amount | `gross` (sum of `totalAmount` of PAID orders) minus `commission` (sum of stored order commissions, rounded once half-up per event); cancelled events pay 0; a recorded payout keeps its stored snapshot | `buildPayoutPipeline` |
| Real money | none: `MockPaymentProvider` | `be:components/payment/mock-payment.provider.ts`; `PAYMENT_MODE=disabled` makes `payOrder` fail with `SERVICE_UNAVAILABLE` |

Frontend copies of these rules (display only; the server decides): `libs/organizer/commission.ts` `COMMISSION_TIERS` + `commissionState`, `libs/admin/commission.ts` `COMMISSION_TIERS` + `effectiveRate` (two separate copies, oddity O-4), `libs/format.ts` `formatRefundDeadlineDay` (the date shown on the event and checkout pages), `libs/site.ts` `SEAT_HOLD_SECONDS = 30`, `MAX_SEATS_PER_ORDER = 8` (help texts only; the picker reads real values from `GetSeatConfig`).

---

## 4. Concurrency rules

### 4.1 Preventing double sales of a seat

Core code, `SeatService.holdSeats` (`be:components/seat/seat.service.ts`). For each seat id:

```ts
await this.eventSeatModel.findOneAndUpdate(
  { _id: seatId, eventId,
    $or: [
      { seatStatus: SeatStatus.AVAILABLE },
      { seatStatus: SeatStatus.HELD, heldUntil: { $lte: now } },
      { seatStatus: SeatStatus.HELD, heldBy: memberId },
    ] },
  { seatStatus: SeatStatus.HELD, heldBy: memberId, heldUntil },
  { new: true });
```

MongoDB applies one such update to one document atomically, so two buyers racing for one seat cannot both get a result: the loser gets `null` and `holdSeats` releases the seats it already claimed and throws `SEAT_JUST_TAKEN`. There is also a unique index `(eventId, sectionKey, row, number)` on `eventSeats` (backend decision #43) so seat rows cannot be duplicated.

Selling a held seat, `SeatService.markSold`:

```ts
{ _id: seatId, heldBy: memberId, seatStatus: SeatStatus.HELD, heldUntil: { $gt: new Date() } }
  -> { seatStatus: SeatStatus.SOLD, orderId }
```

Only the holder with an unexpired hold can sell it. If any seat of the order fails, `revertSold` puts the already-sold seats back to `HELD` and `HOLD_EXPIRED` is thrown, so no half orders exist. `payOrder` also refunds the mock charge in that case (`refundQuietly`).

### 4.2 Preventing overselling of general admission

`TicketTypeService.tryReserve` increments `soldQuantity` in the same update that checks the stock:

```ts
{ _id, ticketTypeStatus: ACTIVE, maxPerOrder: { $gte: quantity },
  $expr: { $lte: [{ $add: ['$soldQuantity', quantity] }, '$totalQuantity'] },
  sale window ... } -> { $inc: { soldQuantity: quantity } }
```

If stock is short it first sweeps abandoned orders of that ticket type (`sweepStaleOrders`) and tries once more (`reserve`). Reserved-seat ticket types are counted only when seats are sold (`addSold`); holds never count.

### 4.3 Hold expiry

- Duration `SEAT_HOLD_SECONDS` (default 30, allowed 1 to 3600, `be:libs/env.validation.ts`). Seat holds store `heldUntil`; a GENERAL order stores `expiresAt = now + hold`; a seated order stores `expiresAt = min(heldUntil)` of its seats.
- A hold that ran out is treated as free **everywhere it matters**: the seat map query (`heldUntil > now` filter), the hold filter above, and `markSold`. So correctness never depends on a timed job.
- The browser counts down with a clock corrected by `serverTime` (`libs/seats/clock.ts`), because a wrong device clock would otherwise show the wrong time. The server remains the judge.

### 4.4 Lazy expiry and the timed job

Shared code `be:libs/order-expiry.ts`:

- `expireStaleOrders(models, scope, limit = 200)`: finds `PENDING_PAYMENT` orders with `expiresAt <= now`, flips each with a conditional `findOneAndUpdate` (filter repeats status and `expiresAt`), and only the caller whose update matched releases seats (`releaseSeatsOfOrder`, only the buyer's holds that already ran out) or stock (`releaseStockOfOrder`).
- `releaseExpiredSeatHolds`: all `HELD` seats with `heldUntil <= now` back to `AVAILABLE`.
- Callers: batch app `BatchService.batchExpireOrders` (cron `10 * * * * *`, every minute), and lazily inside the API when a buyer reads orders (`OrderService.expireStaleOrdersOf`), when ticket types are read or stock is short (`TicketTypeService.sweepStaleOrders`). Reason (decision #102): the batch app runs on a free host and may sleep. Repeating the function or running API and batch at the same moment releases an order exactly once.
- Other batch cron jobs (`be:../ticketzy-batch/src/batch.controller.ts`): `batchTopEvents` at second 20 of minute 0 hourly (`'20 00 * * * *'`), `batchTopOrganizers` (`'40 00 * * * *'`), `batchEndEvents` (`'00 30 * * * *'`, minute 30 every hour). Ranks are computed first and written only if changed (#96).

### 4.5 Other atomic updates

| Where | Guard |
|---|---|
| Event approve/reject/cancel/submit | status in the filter (`changeStatusByAdmin`, `submitEventForApproval`) |
| Organizer approve/reject/suspend/reinstate | `memberStatus: { $in: from }` in the filter |
| Check-in | `{ _id, ticketStatus: VALID }` -> `USED` |
| Pay | `{ _id, buyerId, orderStatus: PENDING_PAYMENT }` -> `PAID`; `payOrder` of an already `PAID` order returns it (idempotent) |
| Payout record | unique index on `payouts.eventId` (duplicate key 11000 -> `PAYOUT_ALREADY_PAID`) |
| Refund | unique `refunds.orderId` + `lockedAt` takeover + `stockReleased` flag claimed by conditional update + payment claimed `CAPTURED -> REFUNDED` before the provider call |
| Likes, views | unique indexes `{memberId, refId, group}` (decision #20) |
| Chat | one conversation per event / one support conversation per organizer (partial unique indexes) |

### 4.6 Known weak spot

`EventService.assertVenueFree` is check-then-write, so two simultaneous requests could both pass (the backend comment says so: "no transaction without a replica set, decision #83"). The frontend adds nothing here; it only shows the refusal text (`libs/venueConflict.ts` `parseVenueBooked`, F307).

### 4.7 What the frontend adds for the same problems

- Double click: `busyRef`/`busy` refs in `SeatPicker.goOn`, `GeneralPicker.goOn`, `checkout pay()`, `check-in submit()` ignore a second call while one is running.
- Old poll answers: `useSeatMap` drops a response older than the last applied one.
- Stale session: `libs/auth/sessionExpired.ts` ignores an error whose `sentToken` differs from the current token, so an old request cannot end a newer login.
- Messaging: `generation` counter in `libs/messaging/sync.ts` discards answers that arrive after logout or a member change.
- Assistant: `requestId` in `libs/assistant/store.ts` discards answers of a request that was aborted or replaced.

Next: `03-routes.md`.
