# 03 Routes

**What this file covers.** Every file in `pages/` (Next.js Pages Router): the URL it serves, its purpose, who can open it, the GraphQL operations it runs, its main components, how loading / empty / error states look, and where its translations live. The operation names are the names inside the `gql` documents in `apollo/` (the exported constants are in upper case, e.g. `GET_EVENT` holds `query GetEvent`). Facts were read from the page files and the components they import; where a page was not read line by line, the table says so.

## How pages are built (rules that apply to all rows)

- **URL from file name.** `pages/events/[id]/seats.tsx` is `/events/<id>/seats`. `[id]` is read as `router.query.id`. With i18n on, every URL also exists under `/ko`, `/ru`, `/uz` prefixes (English has no prefix; `next-i18next.config.js`). `localeDetection` is off; a saved choice in `localStorage` key `locale` redirects once on first load (`pages/_app.tsx`).
- **Layout wrappers.** A page exports `withLayoutBasic(Page)` (header `Top`, `Backdrop`, `PendingBanner`, `WakeNote`, `<main id="main">`, `Footer`, lazy `AssistantWidget`; `libs/components/layout/LayoutBasic.tsx`), or `withOrganizerLayout(Page)` / `withAdminLayout(Page)` (dashboard shell with sidebar; `libs/components/layout/LayoutAdmin.tsx` -> `libs/components/dashboard/DashboardShell.tsx`). `LayoutHome` and `LayoutFull` are re-exports of the basic layout (F19). Buyer account pages combine `withLayoutBasic(withAccount(Page))` (`libs/components/account/AccountShell.tsx`).
- **Data comes from the browser.** `getStaticProps` / `getServerSideProps` almost always only call `serverSideTranslations(locale, [namespaces])` (F32). Exceptions that also fetch on the server: `pages/events/[id]/index.tsx` and `pages/organizers/[id].tsx` (SEO tags, anonymous, 8 s limit, `libs/serverFetch.ts`), `pages/robots.txt.tsx` and `pages/sitemap.xml.tsx`.
- **Static vs server props.** Public/dashboard pages use `getStaticProps`; pages that need nothing from the request but use `getServerSideProps` anyway: checkout, seats, confirmation, tickets, orders, settings, notifications, account/saved, account/following, admin/events/[id], organizer/venues/[id], organizer/events/[id]/(edit|orders). This is only a rendering choice (see O-9 in `06-quality.md`).
- **Namespaces** are JSON files `public/locales/<lang>/<namespace>.json`; `scripts/i18n-check.js` fails the check if a page (or a component it imports) uses a namespace the page does not load. Namespaces: `common`, `events`, `checkout`, `account`, `auth`, `organizer`, `admin`, `messages`, `help`, `about`, `legal`.
- **Loading state** is a skeleton (`.tz-skel`) or `aria-busy` block, sized like the final content. **Error state** is a `StateBlock` (`libs/components/states/StateBlock.tsx`) with a retry button, or `LoadError` (`libs/components/account/LoadError.tsx`) on account pages, split into "network error" (retry) and "not found" (link back). **Empty state** is a `StateBlock` with an action. "No data found!" from the backend (an empty list from `getEventsByAdmin`) is treated as an empty list by `libs/admin/errors.ts` `isOnlyNoData`.
- **Meta tags** come from `libs/components/common/Seo.tsx` (title, description, Open Graph, Twitter, canonical, hreflang for 4 languages; private pages pass `noindex`, dashboards add a `robots noindex` meta in `DashboardShell`).

## Special files

| File | URL | Purpose / notes |
|---|---|---|
| `pages/_app.tsx` | all | Wraps every page: loads fonts (`next/font/google`: Onest, Noto Sans KR, JetBrains Mono), imports all SCSS, `ApolloProvider`, `MessagingLifecycle`, `AssistantLifecycle`, `ThemeModeProvider`, `ErrorBoundary`, runs `restoreSession` and the `storage` listener, `useSessionWatch`, `appWithTranslation`. |
| `pages/_document.tsx` | all | HTML skeleton; inline script sets `data-theme` from `localStorage` key `ticketzy-theme` and `data-session` when `accessToken` exists, before first paint (no flash, reserved header space); icons, manifest, two `theme-color` metas. |
| `pages/404.tsx`, `pages/500.tsx` | error pages | `getStaticProps` namespace `common`; use `ErrorScreen`. A render error under the app is caught by `libs/components/common/ErrorBoundary.tsx`. |
| `pages/robots.txt.tsx` | `/robots.txt` | `getServerSideProps` writes `robotsTxt()` (`libs/seo.ts`): disallows private prefixes for each language. |
| `pages/sitemap.xml.tsx` | `/sitemap.xml` | `getServerSideProps` writes `sitemapXml()`: static paths + every public event (query `SitemapEvents`, up to 20 pages of 100, whole budget 8 s), all four languages; header `s-maxage=3600`. |

## Public pages

| Page file | URL | Who | Operations | Main components | States | Namespaces |
|---|---|---|---|---|---|---|
| `pages/index.tsx` | `/` | everyone | `GetEvents` (20 upcoming for hero + side), per-category rail queries, `GetHomeOrganizers` | `Hero`, `OrganizersBlock` (`HomeSections.tsx`), `CategoryRow`, `EventCard`, `Seo` | skeleton hero + side cards; `StateBlock` for error (retry) and for no events | `common`, `events` |
| `pages/events/index.tsx` | `/events` | everyone | `GetEvents` (filters from URL, 12 per page), `GetVenues` (city list) | `EventCard`, `Pagination`, MUI `Select`, filter drawer, `BuyerNoticeBanner` | `EventGridSkeleton`; empty state with "clear filters"; error with retry; last-page redirect | `common`, `events` |
| `pages/events/[id]/index.tsx` | `/events/<id>` | everyone (hidden events show "not found") | `GetEvent`, `GetTicketTypes`; comments (`GetComments`, `CreateComment`, `UpdateComment`), `LikeTargetEvent`, `Subscribe`/`Unsubscribe` | `EventImage` gallery, `CategoryChip`, `TicketPanel`, `TicketBar` (mobile sticky bar), `Comments`, `LikeButton`, `FollowButton`, `SalesNotice` | waits for `authReady`; not found vs network error with retry; server-side SEO props | `common`, `events` |
| `pages/organizers/[id].tsx` | `/organizers/<id>` | everyone | `GetOrganizer`, `GetOrganizerFollow`, `GetEvents` (first 12 upcoming of the organizer, "N more not shown") | `OrganizerAvatar`, `FollowButton`, `EventCard` | not found if the member is not an ORGANIZER; skeleton; error | `common`, `events` |
| `pages/about.tsx`, `faq.tsx`, `contact.tsx`, `terms.tsx`, `privacy.tsx` | `/about`, `/faq`, `/contact`, `/terms`, `/privacy` | everyone | none | `StaticPage`, `LegalDocument` (`libs/components/static/`) | static; contact shows a `mailto:` link from `CONTACT_EMAIL` (no form); terms and privacy carry a "sample text" note | about -> `about`; faq/contact -> `help`; terms/privacy -> `legal` (all plus `common`) |
| `pages/sell.tsx` | `/sell` | everyone; text depends on role | none | `StateBlock as="h1"`; a buyer's button runs `router.push` to signup then `logOut()` | role-aware: guest, buyer (log out first), organizer (dashboard link), admin | `common`, `auth` |

## Authentication pages

| Page file | URL | Who | Operations | Components / notes | Namespaces |
|---|---|---|---|---|---|
| `pages/account/login.tsx` | `/account/login` | guests (signed-in members are redirected by `useRedirectIfSignedIn`) | `Login` then `GetMember` | `LoginForm`; `?returnTo=` (checked by `safeReturnTo`), `?reason=expired` banner | `common`, `auth` |
| `pages/account/signup.tsx` | `/account/signup` | guests | `SignupUser` / `SignupOrganizer` then `GetMember` | `SignupForm` (role tabs), `PendingPanel` for new organizers; `?role=organizer` | `common`, `auth` |
| `pages/account/join.tsx` | `/account/join` | everyone | none | old combined page; only `router.replace('/account/login')` | `common` |

## Buyer flow pages (sign-in required, buyer-only for seats and checkout)

| Page file | URL | Who | Operations | Main components | States | Namespaces |
|---|---|---|---|---|---|---|
| `pages/events/[id]/seats.tsx` | `/events/<id>/seats` | signed-in USER; organizer/admin redirected to the event page with a notice | `GetEvent`, `GetTicketTypes`, `GetSeatConfig`; inside the picker: `GetEventSeatMap` (poll 3 s), `GetMyPendingOrders`, `HoldSeats`, `ReleaseSeats`, `CreateCheckout`, `CancelPendingOrder` | `Steps`, `SeatPicker` (`SeatMap`, `SectionList`, `SeatGrid`, `SeatSummary`, `Countdown`) or `GeneralPicker`, `SalesNotice` | skeleton; not found vs network error; `StateBlock` when the event is not on sale (cancelled, ended, sold out, not started, closed) | `common`, `events`, `checkout` |
| `pages/checkout/[orderId].tsx` | `/checkout/<orderId>` | signed-in USER | `GetOrder`, `GetEvent`, `GetTicketTypes`, seat map poll, `PayOrder`, `CancelPendingOrder`, `CreateCheckout`/`HoldSeats` (retry) | `Countdown`, `OrderSummary`, `DemoNotice`, `PayBar`, MUI `Checkbox` | skeleton; failed payment `StateBlock` with retry; expired/lost `StateBlock`; redirects to confirmation when `PAID` or `REFUNDED` | `common`, `events`, `checkout` |
| `pages/orders/[orderId]/confirmation.tsx` | `/orders/<orderId>/confirmation` | signed-in (the backend only returns the caller's own order) | `GetOrder`, `GetEvent`, `GetTicketTypes`, `GetMyTickets`, `GetEventSeatMap` (cache-first, errors ignored) | `PaidSplash`, `SuccessCheck`, `OrderSummary`, `Steps` | status headline per order status (`confirmation.status.*`); live region filled after mount | `common`, `events`, `checkout` |

## Buyer account pages (`withAccount`: signed in; the buyer menu appears only for USER)

| Page file | URL | Operations | Main components | Namespaces |
|---|---|---|---|---|
| `pages/orders/index.tsx` | `/orders` | `GetMyOrders` | `OrderRow`, `StatusBadge`, pagination | `common`, `events`, `checkout`, `account` |
| `pages/orders/[orderId]/index.tsx` | `/orders/<orderId>` | `GetOrderDetail`, `GetMyTicketsList`, `GetTicketTypes`, `GetRefundQuote`, `RequestRefund` (inside the panel) | `RefundPanel`, `TicketCard`, `OrderSummary` | same |
| `pages/tickets/index.tsx` | `/tickets` | `GetMyTicketsList` (upcoming/past) | `TicketCard`, `QrCode` not shown here | same |
| `pages/tickets/[ticketId].tsx` | `/tickets/<ticketId>` | `GetTicket`, `GetMyTicketsList` (siblings of the same order, for the "1 of 2" stepper) | `QrCode`, MUI `Dialog` (full-screen QR), `buildIcs`/`downloadIcs`, `EventImage` | same |
| `pages/notifications/index.tsx` | `/notifications` | `GetMyNotifications`, `MarkNotificationRead`, `MarkAllNotificationsRead` | `NotificationRow`, `useNotificationActions` (also used by organizer/admin) | same |
| `pages/account/saved.tsx` | `/account/saved` | `GetMyFavorites` (liked events) | `EventCard` | same |
| `pages/account/following.tsx` | `/account/following` | `GetMyFollowings`, `Unsubscribe` | `OrganizerAvatar`, `FollowButton` | same |
| `pages/settings/index.tsx` | `/settings` | `UpdateMember`, `ImageUploader` | avatar upload (PNG/JPG, 5 MB client limit), nickname/name fields with `fieldErrors` | `common`, `events`, `checkout`, `account`, `auth` |

Loading/error pattern for these: skeleton blocks and `LoadError` (`error`, `onRetry`, `notFoundTitle`, `back`). A guest is redirected to login by `AccountShell` through `useRequireAuth()`; until the session check ends a skeleton is shown. Pages in this group also show for organizers/admins who open `/notifications` or `/settings` (solo layout without menu).

## Organizer pages (`withOrganizerLayout`: role ORGANIZER; non-ACTIVE organizers see `BlockedPanel` or disabled actions)

| Page file | URL | Operations | Main components | Namespaces |
|---|---|---|---|---|
| `pages/organizer/index.tsx` | `/organizer` | `GetMyEarnings`, `GetMyEvents`, `GetMyEventCounts`, `GetMyEventOrders`, `GetPaidOrdersForChart` | stat tiles with `CountUp`, `SalesChart`, `CommissionTier`, upcoming events | `common`, `organizer` |
| `pages/organizer/events/index.tsx` | `/organizer/events` | `GetMyEvents` (status tab, search, sort), `GetMyEventCounts`, `SubmitEventForApproval`, `CancelMyEvent` | `EventStatusBadge`, `SubmitDialog`, `CancelDialog`, list state in URL (`useListState`) | `common`, `organizer`, `events` |
| `pages/organizer/events/new.tsx` | `/organizer/events/new` | via editor (see below) | `EventEditor` with no event | same |
| `pages/organizer/events/[id]/edit.tsx` | `/organizer/events/<id>/edit?step=` | `GetMyEvent`, `GetEventTicketTypes`; editor ops `CreateEvent`, `UpdateEvent`, `CreateTicketType`, `UpdateTicketType`, `TranslateEvent`, `SubmitEventForApproval`, `ImageUploader`, `GetVenueOptions`, `GetVenueDetail` | `EventEditor` and `Step*` components | `common`, `organizer`, `events` |
| `pages/organizer/events/[id]/orders.tsx` | `/organizer/events/<id>/orders` | `GetMyEvent`, `GetEventTicketTypes`, `GetMyEventOrders`, `GetMyOrderCounts`, `GetVenueDetail` | status tabs, `OrderDrawer`, `OrderStatusBadge` | same |
| `pages/organizer/venues/index.tsx` | `/organizer/venues` | `GetVenuesPage` (all pages read), `GetEventsForVenues` (events per venue; the server has no "mine" filter) | venue cards with usage info | `common`, `organizer`, `events` |
| `pages/organizer/venues/new.tsx`, `venues/[id].tsx` | `/organizer/venues/new`, `/organizer/venues/<id>` | `GetVenueFull`, `CreateVenue`, `UpdateVenue`, `ImageUploader`, `GetEventsForVenues` | `VenueEditor` (`LayoutCanvas`, `SectionPanel`, `TemplateDialog`, `TimezonePicker`, `VenueImages`) | plus `checkout` (the editor draws seats with the buyer map) |
| `pages/organizer/check-in.tsx` | `/organizer/check-in?event=` | `GetMyEvents`, `GetVenueDetail`, `GetCheckInCounts`, `CheckInTicket` | `Scanner`, `ScanResult` | `common`, `organizer` |
| `pages/organizer/attendees.tsx` | `/organizer/attendees` | `GetSalesEvents`, `GetAttendees` (whole list loaded, filtered on the client), `GetVenueDetail` | `AttendeeDrawer`, CSV export (BOM + quoted cells, F225) | `common`, `organizer`, `events` |
| `pages/organizer/payouts.tsx` | `/organizer/payouts` | `GetMyEarnings`, `GetOrdersForSales`, `GetOrganizerMe`, `GetMyPayouts` | `MyPayouts`, `PayoutTiles`, `BarList`, `EventSelect` | same |
| `pages/organizer/analytics.tsx` | `/organizer/analytics` | `GetMyEarnings`, `GetOrdersForSales`, `GetOrganizerMe` | own SVG `BarChart`, `BarList`, "Derived" reach block | `common`, `organizer` |
| `pages/organizer/profile.tsx` | `/organizer/profile` | `GetOrganizerMe`, `UpdateMember`, `ImageUploader` | `ProfilePreview`; only changed fields are sent; ACTIVE/PENDING only | `common`, `organizer`, `events`, `auth` |
| `pages/organizer/messages.tsx` | `/organizer/messages?c=` | conversation ops (see `apollo/messaging.ts`): `GetMyConversations`, `GetConversation`, `GetMessages`, `StartConversation`, `SendMessage`, `MarkConversationRead` | `Inbox`, `Thread`, `Composer` | `common`, `messages`, `organizer` |

## Admin pages (`withAdminLayout`: role ADMIN)

| Page file | URL | Operations | Main components | Namespaces |
|---|---|---|---|---|
| `pages/admin/index.tsx` | `/admin` | `GetAdminPendingEvents`, `GetAdminActiveEvents`, `GetAdminPendingOrganizers`, `GetAdminOrderCount`, `GetAdminPaidOrders`, `GetAdminPayoutTotals` (no statistics query exists on the server; figures are built from list counts and sums, F149, F265) | stat tiles, "payouts due" line | `common`, `admin`, `organizer` |
| `pages/admin/events/index.tsx` | `/admin/events` | `GetAdminEvents`, `GetAdminEventCount` (counts for tabs), conflicts via `@include(if: $withConflicts)` | tabs, search, 10 per page, `useListParams` | `common`, `admin`, `organizer`, `events`, `checkout` |
| `pages/admin/events/[id].tsx` | `/admin/events/<id>` | `GetAdminEvent`, `GetAdminTicketTypes`, `ApproveEventByAdmin`, `RejectEventByAdmin`, `CancelEventByAdmin`, `RunEventModerationByAdmin`, `RetryEventRefundsByAdmin` | `EventLayoutPreview`, `ModerationPanel`, `VenueConflictPanel`, `ReasonDialog`, approve `Dialog` | + `organizer`, `events`, `checkout` |
| `pages/admin/organizers/index.tsx` | `/admin/organizers` | `GetAdminOrganizers`, `GetAdminOrganizerCounts`; actions inside `OrganizerDrawer` | `OrganizerDrawer`, `MessageOrganizer`, `CommissionDialog` | `common`, `admin`, `events` |
| `pages/admin/commission/index.tsx` | `/admin/commission` | `GetAdminOrganizers`, `SetCommissionOverrideByAdmin`, `ClearCommissionOverrideByAdmin` | tier explanation, `CommissionDialog` | same |
| `pages/admin/members/index.tsx` | `/admin/members` | `GetAllMembersByAdmin` (declared a **Mutation** in the backend, so loaded with `client.mutate`), `UpdateMemberByAdmin` | `MemberStatusBadge`; search by nickname only; buyers only get actions | same |
| `pages/admin/orders/index.tsx` | `/admin/orders` | `GetAdminOrders`, `GetAdminOrderCounts`, `GetAdminOrderEvents` | read-only table, drawer, filters by event/text/dates | `common`, `admin`, `organizer`, `events` |
| `pages/admin/payouts/index.tsx` | `/admin/payouts` | `GetPayoutsByAdmin`, `MarkPayoutPaidByAdmin` | `MarkPaidDialog`, `PayoutTiles` | `common`, `admin`, `events` |
| `pages/admin/messages.tsx` | `/admin/messages?c=` | conversation ops, `StartConversationWithOrganizerByAdmin` (from the organizer list) | `Inbox`, `Thread` | `common`, `messages`, `organizer`, `admin` |

## Who is sent where (redirect summary)

- Guest on a guarded page -> `/account/login?returnTo=<path>` (`loginUrl`, `libs/routes.ts`). `reason=expired` is added within 10 s of a session expiry.
- Wrong role -> `homeFor(user)` (`/`, `/organizer`, `/admin`).
- Signed-in member on login/signup -> `returnTo` (only if they just signed in) else `homeFor(user)`.
- Organizer/admin on seats or checkout -> the event page (`/events/<id>`) with a one-time "only buyer accounts can buy" notice (`queueBuyerNotice`/`takeBuyerNotice`).
- `returnTo` accepted only if `libs/safeReturnTo.ts` allows it; `safeEventReturn` (`libs/routes.ts`) accepts only organizer event form paths for the venue round trip.

Pages not read in full for this table: `organizer/index.tsx`, `organizer/analytics.tsx`, `organizer/attendees.tsx`, `organizer/profile.tsx`, `admin/index.tsx`, `admin/commission`, `admin/members`, `admin/orders`, `admin/payouts`, `settings`, `notifications`, `account/saved`, `account/following`, `orders/index`, `tickets/index`. Their operation lists come from the `gql` constants the files import (grep), and their behaviour from decisions F77 to F92, F137 to F170, F220 to F235.

Next: `04-state-and-data.md`.
