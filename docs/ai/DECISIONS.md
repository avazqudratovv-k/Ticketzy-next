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
