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
