# 04 State and data

**What this file covers.** How data and global state work in the frontend: the Apollo client (links, cache, error handling, session expiry, timeouts, the "waking up" message), how authentication is stored (and the fact that there is no refresh), the GraphQL documents folder and the hand-written types, every shared hook (including `usePagedQuery`), the WebSocket client, the i18n setup and locale files, the theme and design tokens, and the global styles. Paths are in `/Users/kenneth/ticketzy-next`.

---

## 1. Apollo client (`apollo/client.ts`)

**What Apollo Client is:** a library that sends GraphQL requests, keeps results in a normalized in-memory cache (objects stored by `__typename` + `_id`), and re-renders React components when cached data changes (`useQuery`, `useMutation`).

`createApolloClient()` returns `new ApolloClient({ ssrMode, link, cache: new InMemoryCache() })`. **The cache is the default one: no `typePolicies`, no custom `merge`/`keyArgs`** (nothing configured in the repo), so list queries with different `input` variables are cached separately and many components use `fetchPolicy: 'network-only'` / `'cache-and-network'` / `'no-cache'` explicitly.

`initializeApollo()` creates one client per browser tab (module variable `apolloClient`); on the server it returns a fresh client **without a link** (`createIsomorphicLink` returns `undefined` when `window` is missing): nothing is fetched during server rendering; pages that need server data call `serverQuery` (`libs/serverFetch.ts`: plain `fetch` POST, anonymous, 8 s `AbortController` deadline, returns `null` on any failure). `useApollo()` memoizes the client for `_app.tsx`.

### 1.1 Link chain (order matters)

`from([errorLink, trackLink, retryLink, authLink, timeoutLink, uploadLink])`:

| # | Link | File | What it does |
|---|---|---|---|
| 1 | `errorLink` (`onError`) | `apollo/client.ts` | If a GraphQL error has `code === 'UNAUTHENTICATED'` (top-level `code` or `extensions.code`) or the network error has HTTP status 401, and the operation name is not in `SESSION_FREE_OPERATIONS` (`Login`, `SignupUser`, `SignupOrganizer`), it calls `handleSessionExpired(sentToken)` with the token that request carried. In development only it prints errors with `console.error`, skipping `VALIDATION_FAILED` and `"No data found!"`. No popups. |
| 2 | `trackLink` | `apollo/resilience.ts` | Counts **queries** in flight (a `Map` of start times) and a flag `unreachable` (last query ended without an answer: network error, timeout or HTTP >= 500). Feeds `pendingStore`. Mutations pass through untouched. |
| 3 | `retryLink` | `apollo/resilience.ts` | `RetryLink` with 400 ms delay, no jitter, **maximum one retry** (`count < 2`), queries only, and never after the timeout error. Only network-level failures reach it; a GraphQL error is an answer and is not retried. |
| 4 | `authLink` | `apollo/client.ts` | Adds header `Authorization: Bearer <token>` from `getJwtToken()` on every request when a token exists. |
| 5 | `timeoutLink` | `apollo/resilience.ts` | Puts `fetchOptions.timeoutMs` in the context: `QUERY_TIMEOUT_MS` 20 000 for queries, `MUTATION_TIMEOUT_MS` 60 000 for mutations. |
| 6 | `uploadLink` | `apollo/client.ts` | `createUploadLink` from `apollo-upload-client` (multipart for files) to `NEXT_PUBLIC_API_GRAPHQL_URL`, with `fetch: fetchWithTimeout` and header `apollo-require-preflight: true` (the backend's CSRF protection rejects multipart uploads without it). |

`fetchWithTimeout` aborts the request after `timeoutMs` and throws `Error('Request timed out')` (`TIMEOUT_MESSAGE`); a request whose body is `FormData` (an image upload) is never timed out. The timeout shows up as a network error, which pages render as an error state with a Retry button.

### 1.2 Error handling (`libs/errors.ts`)

- `parseApiError(err)` turns an `ApolloError` into `{ code, message, fields?, retryAfterSeconds? }`: first GraphQL error's top-level `code` (the backend formats errors as `{ code, message }`, with `extensions.code` as fallback); `NETWORK_ERROR` when there is only a network error; `UNKNOWN` otherwise.
- `VALIDATION_FAILED` carries `fields: [{ field, rules }]` (property name + class-validator rule names, never values); `readFields` keeps only well-formed entries. `libs/fieldErrors.ts` maps (field, rule) to a translated sentence with `fieldMessage` (keys `common:validation.*`) and splits an answer into inline issues and a banner with `serverIssues(error, knownFields)`.
- Known message texts are mapped to translation keys: `KNOWN_MESSAGES` in `libs/errors.ts` (auth), `libs/seats/errors.ts` (`MESSAGES`: seat/checkout), `libs/account/refund.ts`, `libs/organizer/errors.ts`, `libs/admin/errors.ts`, `libs/messaging/errors.ts`, `libs/assistant/errors.ts`, `libs/aiErrors.ts` (by **code first**, then message: `AI_QUOTA_EXHAUSTED`, `AI_DAILY_CAP_REACHED`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`). An unknown server message is shown as one generic translated error; the raw server text is shown only in a few admin/organizer places.
- Codes known to the frontend: `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_REQUEST`, `VALIDATION_FAILED`, `SERVICE_UNAVAILABLE`, `RATE_LIMITED`, `NO_DATA_FOUND` (coded 404 for "no seat map"), `ACCOUNT_NOT_VERIFIED`, `NETWORK_ERROR` (client-made).

### 1.3 Session expiry (`libs/auth/sessionExpired.ts`)

`handleSessionExpired(sentToken?)`: does nothing if there is no stored token or if the failed request carried a different token than the current one; on the login/signup pages it just drops the token; elsewhere it remembers `expiredAt = Date.now()` (used for 10 s by `sessionJustExpired()`), then calls the registered end-of-session function (`clearSession`, registered by `libs/auth/index.ts` with `registerSessionEnd` to avoid a circular import). `clearSession` removes the token, sets `userVar(null)` and calls `resetStore()` through a promise chain so only one reset runs at a time. The page guard (`useRequireAuth`) then redirects once to `/account/login?returnTo=...&reason=expired`. Three triggers: the error link, `libs/hooks/useSessionWatch.ts` (token `exp` checked every 5 s and on window focus, mounted in `_app` while a user is signed in), and the chat socket closing with code 4401 (`libs/messaging/socket.ts`).

**Why `resetStore()` and not `clearStore()`** (AGENTS.md, F296): `clearStore` cancels requests in flight and does not resend them, which left pages stuck on their skeleton; `resetStore` refetches active queries.

### 1.4 "Server is waking up" message

`libs/hooks/useWakeNote.ts` reads `pendingStore` (from `trackLink`): visible when a query has been pending 5 s (`WAKE_NOTE_AFTER_MS`) or when the last query ended without an answer and the browser is online; it hides when the next query is answered; dismissing keeps it hidden until the trouble ends. Rendered by `libs/components/common/WakeNote.tsx` inside `LayoutBasic` (contained) and `DashboardShell`. Reason: the demo backend runs on a free host that can sleep up to about a minute (README, "Deployment").

---

## 2. Authentication storage and refresh

| Item | Fact | File |
|---|---|---|
| Token | JWT string in `localStorage` key `accessToken` (also exported as `TOKEN_STORAGE_KEY`). Reading failures return `''`. | `libs/auth/token.ts` |
| Token contents | `{ _id, memberType }` plus `exp` (1 day from the backend); decoded with `jwt-decode` for `exp` and `_id` only; **never verified in the browser**. | `libs/auth/index.ts` `TokenClaims`, `isExpired` |
| Profile | Not in the token. Loaded with query `GetMember` into reactive variable `userVar` (`apollo/store.ts`). `authReadyVar` is false until the first restore ends. | `libs/auth/index.ts` `restoreSession`, `startSession` |
| Header/shell flicker guard | `_document.tsx` sets `data-session` on `<html>` when the key exists, so the header reserves room for bell and avatar before JS runs. | `pages/_document.tsx` |
| Multi-tab | A `storage` event for `accessToken` triggers `restoreSession()` in every other tab (`pages/_app.tsx`). | |
| Refresh | **None.** There is no refresh token or silent renewal; after about one day the token expires and the member signs in again. `updateMember` on the backend returns a new token, but the frontend ignores it: the `UpdateMember` document does not request `accessToken`, and `setJwtToken` is called only in `libs/auth/index.ts` `startSession` (checked by grep). | |
| WebSocket auth | Token sent in the first message `{ event: 'auth', data: { token } }`, never in the URL. | `libs/messaging/socket.ts` |
| Risk note | `localStorage` is readable by any script running on the page (XSS). No httpOnly cookie is used. | see O-8 |

Hooks: `libs/hooks/useAuth.ts` returns `{ user, ready, isLoggedIn, organizerAccess, isPendingOrganizer }`. Guards: `libs/auth/guards.tsx` (`useRequireAuth(roles?)`, `useRequireRole(...roles)`, `withAuth`).

---

## 3. GraphQL documents and types

### 3.1 `apollo/` folder

| File | Contents |
|---|---|
| `apollo/user/query.ts` (506 lines) | Public and buyer queries: `GetMember`, `GetEvents`, `GetHomeOrganizers`, `GetVenues`, `GetEvent`, `GetTicketTypes`, `GetComments`, `GetOrganizer`, `GetOrganizerFollow`, `GetSeatConfig`, `GetEventSeatMap`, `GetOrder`, `GetMyPendingOrders`, `GetMyTickets`, `GetMyOrders`, `GetOrderDetail`, `GetRefundQuote`, `GetMyTicketsList`, `GetTicket`, `GetMyNotifications`, `GetUnreadNotificationCount`, `GetMyFavorites`, `GetMyFollowings`; shared field sets `ORDER_FIELDS`, `ACCOUNT_ORDER_FIELDS`, `ACCOUNT_TICKET_FIELDS`. |
| `apollo/user/mutation.ts` | `Login`, `SignupUser`, `SignupOrganizer`, `LikeTargetEvent`, `CreateComment`, `UpdateComment`, `HoldSeats`, `ReleaseSeats`, `CreateCheckout`, `PayOrder`, `CancelPendingOrder`, `RequestRefund`, `MarkNotificationRead`, `MarkAllNotificationsRead`, `UpdateMember`, `ImageUploader`, `AskAssistant`, `Subscribe`, `Unsubscribe`. |
| `apollo/user/fragments.ts` | `MEMBER_FIELDS`, `EVENT_CARD_FIELDS` and others (GraphQL fragments reused by documents). |
| `apollo/organizer/*` | `query.ts` (my events, counts, ticket types, venue options, earnings, venue detail), `mutation.ts` (`CreateEvent`, `UpdateEvent`, `SubmitEventForApproval`, `CreateTicketType`, `UpdateTicketType`, `TranslateEvent`, `CancelMyEvent`), `orders.ts` (orders, counts, `CheckInTicket`, check-in counts), `sales.ts` (events for sales pages, attendees, organizer profile, orders for sales), `venue.ts` (venues page, full venue, `CreateVenue`, `UpdateVenue`, events for venues). Some documents are built by functions when the number of ids varies: `GetTicketTypesOfEvents(ids)`, `GetTierKeysOfEvents(ids)`, `GetSalesOfEvents(ids)`, `lastMessagesQuery(n)` (aliased fields `m0`, `m1`, ...). |
| `apollo/admin/*` | `query.ts` (events, counts, event detail, organizers, orders, overview queries, paid orders), `mutation.ts` (approve/reject/cancel event, run moderation, retry refunds, organizer verify/reject/suspend/reinstate, commission set/clear, `UpdateMemberByAdmin`, `GetAllMembersByAdmin`). |
| `apollo/messaging.ts` | `GetMyConversations`, `GetConversation`, `GetMessages`, `StartConversation`, `StartConversationWithOrganizerByAdmin`, `SendMessage`, `MarkConversationRead`. |
| `apollo/payouts.ts` | `GetMyPayouts`, `GetPayoutsByAdmin`, `GetAdminPayoutTotals`, `MarkPayoutPaidByAdmin`. |
| `apollo/store.ts` | Reactive variables: `userVar`, `authReadyVar`, `conversationsVar`, `messagingReadyVar`, `messagingErrorVar`, `socketStatusVar`. |
| `docs/ai/schema.json` | Introspection dump of the backend schema (not used at runtime). |

There is **no code generator**: result and variable types are written by hand in `libs/types/` (F343), so they can drift from the backend schema. Files: `libs/types/queries.ts` (`GetEventData`, `GetEventsVars`, `ListResult<T>`, ...), `event.ts` (`EventItem`, `TicketTypeItem`, `EventStatus`), `member.ts` (`MemberProfile`, `SignupInput`), `account.ts` (`AccountOrder`, `AccountTicket`, `NotificationItem`, `RefundQuote`), `assistant.ts`; area types in `libs/organizer/types.ts`, `libs/admin/types.ts`, `libs/messaging/types.ts`, `libs/seats/types.ts`, `libs/venues/types.ts`. Enum `libs/enums/member.enum.ts` mirrors the backend values.

List queries return `{ list, metaCounter: [{ total }] }`; the backend builds both in one MongoDB `$facet`. Most list inputs are `{ page, limit, sort, direction, search }`; the backend refuses `limit` above 100 (`MAX_PAGE_SIZE` in `usePagedQuery.ts`; only `EventsByAdminInquiry` allows 200).

---

## 4. Hooks (`libs/hooks/`, plus feature hooks)

| Hook | What it does |
|---|---|
| `useAuth` | See section 2. |
| `useRedirectIfSignedIn(suppress)` | Login/signup pages: signed-in members go to `returnTo` (only if they signed in on this page) or `homeFor(user)`. |
| `useBuyerOnlyRedirect(target)` | Seats/checkout: organizer/admin go to `target` after `queueBuyerNotice()`; returns true while blocked so the page skips its queries. |
| `useBuyerNotice(anchor, fromRedirect?)` | Short "only buyers can buy" message beside an `aria-disabled` button; hides after a few seconds, on outside click, on Escape. |
| `usePagedQuery(query, field, input, { skip, maxRows })` | Loads `{ list, metaCounter }` queries in pages of `MAX_PAGE_SIZE` = 100 with `client.query({ fetchPolicy: 'network-only' })` until `list.length >= total` or `maxRows`. Returns `{ data, error, loading, refetch }` with the same shape as one big `useQuery`, so callers read `data[field].list`. A later page that fails keeps the loaded rows (error reported only if nothing loaded). A `run` counter drops results of an outdated run (changed input or unmount). Used where the server has no filter (all attendees, sales events). |
| `useSeatMap(eventId, enabled)` | Polling of `GetEventSeatMap`, see Flow 7 in `01-flows.md`: 3 s interval, back-off up to 30 s, paused in hidden tabs, `no-cache`. |
| `useSessionWatch` | Section 1.3. |
| `useWakeNote` | Section 1.4. |
| `useUnreadCount(poll)` | `GetUnreadNotificationCount` with `cache-and-network`; only the header bell polls (every 30 s while visible, stops when hidden, one fetch when visible again); others read the cache. |
| `ApprovalCelebration` (component, not a hook) | `GetMyAccountState` (`network-only`, polled every 30 s while visible, organizers only), `MarkApprovalCelebrationDone`; keeps `userVar.memberStatus` in step with the server (F352). |
| `useNotificationActions` | `MarkNotificationRead` / `MarkAllNotificationsRead` with `refetchQueries` for the count and list. |
| `useEventFilters` | `/events` filter state in the URL (see Flow 6) plus `buildEventsInput`. |
| `useUrlState(key)` | Page + one extra key (tab/status) in the URL. |
| `libs/admin/useListParams(defaults, valid)` | Admin/organizer list state (tab, filters, search `q` max 100, sort, page) in the URL; default values are left out of the URL. |
| `libs/organizer/useListState` | Organizer list state helper. |
| `useAdoptTypedValues(form, setters)` | After hydration copies text typed into server-rendered inputs into React state; returns `ready`. |
| `useFocusInvalid(form)` | Focuses the first control with `aria-invalid` after a failed submit. |
| `useUnsavedGuard(dirty, message)` | `beforeunload` plus `window.confirm` on `routeChangeStart`; `allowNextRoute()` lets the form's own redirect pass. |
| `useSectionNames(eventId, enabled)` | Section key -> name from the seat map (cache-first), for seat labels. |
| `useStickyBar`, `useRailPeek`, `usePrefersReducedMotion`, `useIsomorphicLayoutEffect` | UI helpers: set `html[data-bar]` flags for the sticky bar; one-time sideways peek on home rails; read the reduced-motion media query; `useLayoutEffect` only in the browser. |
| `libs/organizer/useEventEditor`, `libs/venues/useVenueEditor`, `libs/venues/useVenueData`, `libs/organizer/useAllAttendees`, `useSalesEvents`, `libs/admin/useAdminEventCounts`, `libs/messaging/useThread` | Feature state hooks described in `05-components.md`. |
| `libs/salesWindow.ts` `useSalesClock(event, ticketTypes)` | One timeout re-armed at the next sale boundary; returns the server-corrected "now". |
| `libs/seats/clock.ts` `useRemainingMs(deadline)` | Milliseconds to a server deadline, ticking every 250 ms. |

---

## 5. WebSocket client (`libs/messaging/`)

Only ORGANIZER and ADMIN connect (`libs/components/messages/MessagingLifecycle.tsx`, mounted in `_app`; buyers never do, the backend refuses their sockets).

- `socket.ts` `MessagingSocket` (one instance, `messagingSocket`): `start()`/`stop()`, `new WebSocket(NEXT_PUBLIC_API_WS_URL)`, on open sends `auth`; messages are JSON `{ event, data }`. Server events handled: `authenticated`, `joined`, `left`, `message`, `unread`, `read`, `typing`. Rooms are **reference counted**: `acquire(conversationId)` returns a release function; `joinConversation` / `leaveConversation` are sent when the count goes 0 <-> 1.
- Reconnect: backoff `[1, 2, 4, 8, 15, 30]` s plus up to 400 ms random jitter; immediate retry on `online` and when the tab becomes visible (`wake`). Close code `4401` means "token or member refused": `handleSessionExpired(token)` and no more retries.
- `socketStatusVar`: `off`, `connecting`, `open`, `fallback`. While the socket is not open the app **polls** every 10 s (`POLL_FALLBACK_MS`); while open a 30 s safety poll remains.
- `sync.ts` `startMessaging(client, memberId, memberType)`: resets the store, starts the socket, subscribes to `open` / `message` / `unread` / `read`, runs `syncConversations` (up to 5 pages of 100, previews of the newest message in batches of 20 aliased queries), and returns a stop function. A `generation` counter discards answers from before a logout.
- `useThread.ts`: one open conversation: pages of 30 messages, optimistic local message with `local: 'sending' | 'failed'`, read receipts, typing indicator (sent at most every 2.5 s, shown for 6 s), polling while the socket is closed. `markConversationRead` only when the thread has unread messages, the tab is visible and the window has focus. Message limit 2000 characters (`libs/messaging/format.ts`, repeated from the backend `MESSAGE_MAX_LENGTH`).
- Notification link for new messages: `/organizer/messages?c=<id>` or `/admin/messages?c=<id>` (F181).

Buyers get **no** push: the seat map is polled (section 4) and notifications are polled (bell).

---

## 6. i18n (translations)

- Setup: `next-i18next.config.js` (`locales: ['en','ko','ru','uz']`, `defaultLocale: 'en'`, `localeDetection: false`, `trailingSlash: true`, `reloadOnPrerender` in development); `next.config.js` copies `i18n` into the Next config; `_app.tsx` wraps with `appWithTranslation`. Pages call `serverSideTranslations(locale, namespaces)`; components use `useTranslation('ns')`, `t('key', { var })`, cross-namespace `t('common:key')`, `Trans` in signup.
- Files: `public/locales/<lang>/<namespace>.json`, 11 namespaces x 4 languages. English line counts: organizer 1221, admin 758, common 259, checkout 243, events 237, account 231, help 184, legal 161, messages 115, auth 81, about 33.
- Language switch: `libs/i18n.ts` `useChangeLanguage` stores the code in `localStorage` key `locale` and navigates to the same page with `{ locale }`; `LanguageSwitcher` shows each language in its own script; stale values (like `kr`) fall back to English (F8).
- Event content is translated by data, not by files: `eventTranslations` (`locale` = `EN`,`KO`,`RU`,`UZ`, `title`, `description`) with `libs/events.ts` `localizedEvent(event, locale)`: requested locale, else EN, else base `eventTitle` / `eventDesc` (description falls back separately).
- Formats: `libs/format.ts` uses `Intl` (`intlLocale`), prices with the ticket currency (`formatPrice`, KRW default, `narrowSymbol`), dates in the **venue's** time zone for event times and in the viewer's zone for viewer times; Uzbek dates are composed by hand (`uzDate`) because `Intl` lacks them (F45).
- Plurals: no plural keys in new strings (wording like "label: n", F109/F235); `i18n-check` folds `_one/_other` suffixes anyway.
- Check: `yarn i18n:check` (see `06-quality.md`). Uzbek was first a copy of English (F7); `i18n-check` prints "untranslated" warnings when a non-English value equals the English one.

---

## 7. Theme and design tokens

- **Tokens** live in `scss/tokens.css` (generated from `scss/tokens.json`): dark theme on `:root, [data-theme="dark"]`, light theme on `[data-theme="light"]`. Dark is the default; `data-theme` is set by the inline script in `_document.tsx` before first paint from `localStorage` key `ticketzy-theme` (no `prefers-color-scheme`, F15). Token groups: colors (`--bg`, `--surface`, `--ink`, `--accent` lime `#c8f53c`, status colors `--success-text` etc., `--seat-*`, `--tier-1..3`), fonts and type styles (`--text-h1` ... `--text-price`), spacing `--space-1..20` (4 to 80 px), radii `--radius-xs..full`, control heights `--control-sm/md/lg` (36/44/52), shadows, z-index layers (`--z-bar` 90, `--z-sticky` 100, `--z-dropdown` 200, then scrim, modal, toast), motion `--ease-*`, `--dur-*` (defined in the tokens; used in `scss/motion.scss`).
- **MUI theme** (`scss/MaterialTheme/index.ts` `getTheme(mode)`): palette values come from `tokens.json` (MUI needs real color values to compute shades); everything else uses `var(--token)`; `shape.borderRadius` 14; buttons `textTransform: none`. `libs/theme/ThemeModeProvider.tsx` holds `mode` state, toggles `data-theme`, saves it, and updates both `meta[name=theme-color]` tags (`#0a0b0d` dark, `#f6f6f3` light). `useThemeMode()` gives `{ mode, toggleMode }`. Rule: keep `tokens.css` and `tokens.json` in step (AGENTS.md, F14).
- Fonts (`pages/_app.tsx`): Onest (latin, latin-ext, cyrillic), Noto Sans KR (Hangul, `preload: false`), JetBrains Mono; exposed as CSS variables `--font-onest`, `--font-noto-kr`, `--font-jetbrains`, combined in `scss/app.scss` as `--font-sans`, `--font-mono`.

## 8. Global styles

All SCSS is imported in `pages/_app.tsx` in this order: `tokens.css`, `app`, `layout`, `auth`, `home`, `events`, `seats`, `account`, `organizer`, `venues`, `admin`, `messages`, `assistant`, `static`, `motion`, `responsive`. Roles: `app.scss` base (links, `:lang(ko){word-break: keep-all}`, `.tz-link`, buttons classes), `layout.scss` (navbar, footer, dashboard shell, backdrop), per-area files hold the class families (`org-`, `adm-`, `acct`, `pg-`, `picker`, `seatmap`), `motion.scss` all animation with a reduced-motion block at the end, `responsive.scss` 44 px touch-target rules for `(max-width: 767px), (pointer: coarse)` and is imported last so it can override. The design export's `components.css` / `pages.css` are **not** imported (F17); the project re-implements the classes it needs. Container queries are used for the account and dashboard content areas (`container: acct / inline-size`, `container: dash`), media queries elsewhere (F16, F192, F194).

Next: `05-components.md`.
