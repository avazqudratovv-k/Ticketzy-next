# Frontend decisions

| # | Decision | Why | Open question |
|---|---|---|---|
| F1 | These docs live in `ticketzy-next/docs/ai`, not in `ticketzy/docs/ai` | `ticketzy/docs/ai/DECISIONS.md` is the backend log and would be overwritten; the prompt named `FRONTEND_COMPLETED_TASKS.md` to avoid that clash | AGENTS.md says to update `ticketzy/docs/ai/COMPLETED_TASKS.md`; say if you want a line added there too |
| F2 | The "audit list" of unused packages was not in my context; I built the list from an import grep and removed everything unused | Safer than guessing | Check the result against your audit |
| F3 | The three layouts became one identical shell; the Nestar banner/title switch in `LayoutBasic` and the `HeaderFilter` hero in `LayoutHome` were dropped | They only served deleted pages | The design of the real layouts is a later phase |
| F4 | `AdminMenuList` rewritten as a one-item placeholder; `LayoutAdmin` kept but has no routes | Its menu pointed only to deleted `_admin` pages | |
| F5 | `libs/auth`, `userVar`, `CustomJwtPayload` and the `LOGIN`/`SIGN_UP` documents kept unchanged | Asked to keep `libs/auth`; the rework belongs to the Ticketzy auth step | They are **stale against the backend**: login is by `memberEmail`, the JWT holds only `_id` and `memberType`, signup is `signupUser`/`signupOrganizer`. The placeholder join page does not call them |
| F6 | `MemberType`/`MemberStatus` enums updated to the backend values; `MemberAuthType` deleted | Cheap and needed by `LayoutAdmin`; documented in FRONTEND_MIGRATION | |
| F7 | `uz` locale file is a copy of the English values | No translations available | Needs real Uzbek text. The existing keys are Nestar leftovers (Properties, Agents...), kept as asked |
| F8 | Stale `localStorage.locale` values (such as `kr`) fall back to `en` | `kr` no longer exists as a locale | |
| F9 | `.env.local` / `.env.development` (empty, gitignored) were not touched; build and dev were verified with the three variables exported in the shell | Do not write to the user's env files | Copy `.env.example` to `.env.local` |
| F10 | `libs/config.ts` exports `NEXT_PUBLIC_API_URL` (renamed from `REACT_APP_API_URL`) | Matches the env name; three files updated | |
| F11 | `NEXT_PUBLIC_API_WS_URL` is documented in `.env.example` but not read anywhere | WebSocket link removed per the prompt | The chat/notification client will use it later |
| F12 | Left in place: `public/img/banner`, `public/img/events`, `public/img/icons`, other images, `i18next`/`react-i18next` (peer deps of next-i18next), `phosphor-react`, `sweetalert2`, `animate.css` (used by `sweetAlert.ts`) | Not named in the prompt or still used | `next-i18next@14` wants `i18next@^23` and `react-i18next@^13` (peer warning, already present before); upgrading is out of scope |
| F13 | Deleted `libs/utils.ts` and `numeral` | Only Nestar like handlers and an unused formatter | |

## Prompt 1 decisions
| # | Decision | Why | Open question |
|---|---|---|---|
| F14 | Palette values come from `tokens.json`, everything else in the MUI theme uses `var(--token)` | MUI computes hover/contrast colors from palette values and fails on `var()`; CSS variables make theme switching instant and SSR safe | Two sources must stay in step: `tokens.css` and `tokens.json` were copied together |
| F15 | Dark is always the default; the saved choice is applied by an inline script, no `prefers-color-scheme` | The prompt says dark by default | Follow the OS setting on first visit? |
| F16 | Media queries instead of the design's container queries on `.tz-app` | Simpler with MUI and SCSS; same breakpoints (480, 768, 1024) | Fine unless a layout is embedded in a narrower container |
| F17 | Design `tz-`/`pg-` class names reused in our SCSS, but `components.css` / `pages.css` are not imported | Prompt asks for MUI + SCSS; copying 85 KB of unused CSS would conflict with MUI | |
| F18 | Brand is the word Ticketzy with a Volt dot, not an image | Design: "There is no logo yet". The old `logoWhite.svg` is Nestar's | Real logo later |
| F19 | `LayoutAdmin` extended (not renamed): `withAdminLayout` and `withOrganizerLayout`; `LayoutHome` / `LayoutFull` re-export `LayoutBasic` | Kept the files and imports; the three duplicates were identical | Remove the aliases once the home page has its own layout |
| F20 | Signup role selector follows the design's two cards but uses `role="tab"` semantics | Prompt says tabs, design shows cards | |
| F21 | Organization name is sent as `memberNick`, full name as `memberFullName`; no phone | `MemberInput` has no organization field; `memberNick` is unique, so a taken name gives the "already used" error | Does the backend want a separate organization field? |
| F22 | After signup the member is signed in (the mutations return a token). A buyer goes to `returnTo` or home; an organizer sees the awaiting-approval panel and is signed in as PENDING | Prompt: PENDING organizers can log in | Not tested end to end (see below) |
| F23 | Login by role: ORGANIZER lands on `/organizer`, ADMIN on `/admin`, USER on `returnTo` or `/`; placeholder pages exist so the shell can be seen | Design text: organizers "land on their dashboard" | |
| F24 | Left out of the login design: "Forgot password?", "Keep me signed in", "Contact support" | No reset operation in the schema; the token always goes to localStorage as asked; there is no support page yet | |
| F25 | Dead links on purpose: Events, FAQ, Contact, About, Terms, Privacy, organizer/admin sub-pages, avatar-menu targets | Their pages come in later phases; the shell follows the design | They 404 until then |
| F26 | Server messages known to the UI ("Incorrect email or password!", account not verified, already used) are shown translated; any other server message is shown as sent | The API answers in English only and uses one code (`UNAUTHENTICATED`) for both login failures, so the message is the only way to tell them apart | If the backend text changes the mapping in `libs/errors.ts` must follow; better: distinct codes |
| F27 | A saved locale (`localStorage.locale`) redirects once on first load; `uz` is not auto-detected | Locale detection is off, the design wants the choice to persist | |
| F28 | The session is cleared only when `getMember` fails with UNAUTHENTICATED, FORBIDDEN or BAD_REQUEST; a network failure keeps the token | A backend restart should not sign everyone out | |
| F29 | Chat WebSocket: nothing built. `NEXT_PUBLIC_API_WS_URL` is still unused; the client will send the token in a first `auth` message | Prompt | |
| F30 | Old files are left unused instead of deleted (list in FRONTEND_COMPLETED_TASKS.md) | A bulk delete was blocked by the permission system | Delete them with `git rm` |
| F31 | The shell shows nothing until the member is allowed in (no skeleton) | Avoids a flash of dashboard content for the wrong role | |

## Prompt 2 decisions
| # | Decision | Why | Open question |
|---|---|---|---|
| F32 | Data is fetched in the browser with Apollo; only the SEO tags come from `getServerSideProps` (anonymous plain `fetch`) | The Apollo client has no link on the server and the member's token lives in `localStorage`; the like state and view count need the token | If a page must be indexed with its full text, add a server Apollo link |
| F33 | The event detail waits for the stored session (`authReadyVar`) before its first request | The first request then carries the token, so the view is recorded once and `meLiked` is right | The page shows a skeleton until the session check ends |
| F34 | A hidden event (draft, pending, cancelled, ended for visitors) shows "Event not found" | The API answers `NO_DATA_FOUND` for all of them, so the page cannot tell them apart | Ask the backend to return CANCELLED and ENDED events publicly (read-only) if buyers should see them |
| F35 | Text search is sent as is. When the text equals a category name in the active language (or `comedy`, `concert`, `football`), the empty state offers "Show all Comedy events" | The API only searches `eventTitle`; "comedy" finds nothing | Backend could search translations, category and venue |
| F36 | Category filter has four slugs: `concert`, `football`, `comedy`, `other` (other = SPORT, THEATER, CONFERENCE, FESTIVAL, OTHER) | The design shows four filters; the enum has eight values | |
| F37 | Date filter uses Seoul midnight boundaries (`+09:00`) | Venues default to Asia/Seoul and the API takes absolute times | Per-venue boundaries are not possible in one query |
| F38 | Page size 12 with numbered pagination (compact "Page 2 of 3" below 768px); no "Show more" | Design allows either; numbered pages keep the page in the URL | |
| F39 | Left out of the browse design: "Hide sold-out events" and the top-bar search box | The list API has no sold-out filter, and a second search field would duplicate the one on `/events` | |
| F40 | Cards have no "Sold out" badge | `getEvents` does not return ticket stock; the detail page derives it from `getTicketTypes` | Backend could expose a `soldOut` flag |
| F41 | Detail "Select seats" button reads "Select tickets" for GENERAL events and is disabled for cancelled, ended, sold out and not-yet-on-sale events, with the reason as its label | Matches the design's separate general-admission flow; the prompt says "Select seats" for the primary case | Use "Select seats" everywhere if preferred |
| F42 | Refund line is hidden for cancelled and ended events; the cancelled banner says orders are refunded automatically | The 23:59 rule is meaningless for them | |
| F43 | `cancelReason` is shown when the API sends it (owner and admins only) | It is the only reason text available | |
| F44 | "Open in maps" is a Google Maps search link built from the venue name and address; no embedded map | `venueCoordinates` order is not documented and an iframe adds a third-party request | Embed later |
| F45 | Uzbek dates are composed by hand (`Yakshanba, 8-noyabr`); other languages use `Intl` | Chrome and Node have no Uzbek date data (Intl prints "M11 8, Sun") | Re-check when ICU gets full `uz` |
| F46 | Prices use `Intl` with the ticket's currency and `narrowSymbol` (₩ in all languages, grouping per locale: `33 000 ₩` in Russian) | The design's table shows ₩65,000 for Korean only | |
| F47 | Title, description and image in the SEO tags come from the active language with the EN fallback; the server query is anonymous | Same rule as the page; hidden events get a generic title and `noindex` | |
| F48 | Comments: delete is `updateComment` with status DELETE, confirmed inline (no browser dialog); 1000 characters client limit; own comments only | There is no member-level remove operation; the length limit is not in the schema | Check the backend limit |
| F49 | The like button redirects logged-out visitors to login with `returnTo` | Prompt: like for logged-in users | |
| F50 | Organizer page rejects members that are not ORGANIZER and shows the first 12 upcoming events with a "N more not shown" line | `getMember` answers for any ACTIVE member | Add a "load more" when an organizer has many events |
| F51 | Category links in the top bar appear from 1024px; the 768px bar kept wrapping the auth buttons | Not enough room | A burger menu up to 1023px would keep them reachable |
| F52 | Avatar-menu targets (My tickets, Orders, Settings) were left as they are (F25) | Their pages come in later phases | |
| F53 | `reloadOnPrerender` is on in development in `next-i18next.config.js` | Locale JSON edits showed stale keys until the dev server restarted | |
| F54 | Seats page `/events/[id]/seats` is a placeholder with a back link | Next prompt | |
