# Design audit (Prompt D1, 2026-10-13)

Report only. No application code was changed and nothing was committed. Ticketzy's decisions (`DECISIONS.md`), the Volt tokens and the CSS-only motion rule override every skill; no new library and no rebrand is proposed.

Skills used as checklists: web-design-guidelines, ui-ux-pro-max, impeccable (critique and audit style), frontend-design, emil-design-eng, review-animations, vercel-react-best-practices (page feel only). No skill script was run, nothing was installed.

## How it was checked, and what it covers

- Browser method of earlier tasks: each page loaded in a same-origin `<iframe>` of 390, 768 or 1440 px inside the Chrome tab on `localhost:3000`, in dark and light, then measured through `iframe.contentDocument` (horizontal overflow, controls under 44 px, controls without a name, raw i18n keys, clipped text, missing image sizes) and axe-core 4.10.2 from cdnjs at 390 and 1440 in both themes. Screenshots were looked at for the pages marked "seen" below.
- The tab was already signed in as the demo **buyer**. Signed-out pages (login, sign-up) were checked in a second tab on `127.0.0.1:3000` (separate storage; the API refuses that origin, so only pages that need no data were used there).
- The measured routes had **no axe violation** except one moderate (`heading-order` on event cards, finding 28).

| Page | Measured (6 combos: 390/768/1440 x dark/light) | Seen in a screenshot |
|---|---|---|
| Home | yes, axe clean | 390 dark, 1440 light |
| Events list, filters, empty, page past the end | yes | 390 dark (list, empty, filters open, page 99), 1440 not |
| Event detail | yes, axe clean | 390 dark (4 scroll positions), 1440 light |
| Seats (reserved and general event) | yes, axe clean | 390 dark (4 positions, one with a section opened), 1440 light |
| Checkout | expired hold: 6 combos; live hold: 390 dark | both at 390 dark |
| Orders, order detail, confirmation, failed order | yes (orders, detail) | 390 dark |
| My tickets, notifications, settings | tickets: yes; others screenshot only | 390 dark |
| Public organizer page | yes, axe clean | 390 dark |
| Login, sign-up (buyer and organizer), validation | 390 dark and light, 1440 dark, axe clean | 390 dark |
| About, FAQ, contact, terms | yes, axe clean | 390 dark |

**Not reviewed in the browser:** organizer dashboard (create-event wizard, payouts, and the other organizer pages) and admin pages (events, organizers, payouts). The tab is signed in as a buyer and `DashboardShell` sends a buyer away; the demo passwords are not in the repository and I may not type passwords. Those pages are covered by **code reading only** (findings marked "code only"), which cannot show contrast, spacing or overflow. If you sign in as the organizer and as an admin in the Chrome tab, a follow-up run can measure them.

Also not done: 768 px screenshots (measured only), light-theme screenshots at 390, 1440 screenshots of the list, orders and account pages, timing of slow interactions (no stopwatch run), server-error and loading-skeleton states by eye, ticket detail with QR, saved and following pages, 404 and 500, privacy.

Side effect of the check: one live hold was created as the buyer (Busan Late Night Stand-Up, Front Tables row 1 seat 1, ₩45,000). It was left to expire after 30 s and may show in that buyer's order history as an unpaid, expired or failed order. The browser's saved language was set to English for the run and put back to Korean afterwards; the theme key was set to light (the tab's original look).

---

## 1. Top 10 quick wins

| # | Page | What is wrong | What to change | Effort |
|---|---|---|---|---|
| 1 | Every page, signed in, 390 px | The header does not fit: brand, language, theme, bell, avatar and menu add up to 405 px, so the menu button is cut at the right edge and the page scrolls sideways by 15 px (signed out it fits). It shows on every signed-in route measured. | Below about 420 px make the language trigger an icon only (or move it into the menu); keep the wordmark. | S |
| 2 | Checkout, 390 px | The hold lasts 30 s but the Pay button is 1454 px down the page (static), and the countdown scrolls away at the top. A buyer must scroll two screens blind. | Below 1024 px a sticky bottom bar with the timer and Pay, like the seat picker sheet (F75). | M |
| 3 | Home, 1440 px | The hero is so tall that its title starts at y 725 and its "Get tickets" button ends at y 893: the main call to action is below the fold on a 1440x800 laptop. | Cap the hero height (for example `min(560px, 68vh)`) and keep the text at the bottom of the image. | S |
| 4 | Event detail, 390 px | The ticket box is under the long description, venue, organizer and comments (about 2000 px down); only a "View tickets" link at the top leads there. | A sticky bottom bar "From ₩x" + "View tickets" that disappears when the ticket box is visible. | M |
| 5 | Seats, dark | With 0 seats the Continue button is dark on dark and almost invisible (it is `disabled`, not `aria-disabled`). | Use `aria-disabled` with a visible outline style and a line "Pick a seat to continue". | S |
| 6 | Account pages, 390 px | The tab strip (My tickets, Order history, Notifications, Settings) is cut at "Notif" with no sign that it scrolls. | Edge fade (mask) on the scroll container, or let it wrap into two rows. | S |
| 7 | Login and sign-up, 390 px | Text fields are 41 px high; the rule (F262) is 44 px. | `min-height: var(--control-md)` on `.tz-input` below 768 px. | S |
| 8 | All pages with the "Ask Ticketzy" button, 390 px | The floating button sits on the last footer controls (the Russian and Uzbek language segments) and on card text. | Extra bottom padding on the footer, or let the button fade out while the footer is in view. | S |
| 9 | Events list, 390 px | Search, Filters, the "Showing" line and Sort are four stacked rows (about 380 px) before the first card. | Put "Showing" and Sort on one row. | S |
| 10 | Order detail and confirmation | The same seat is written two ways ("Row 7, seat 12 / Upper East" and "UPPER_E, row 9, seat 7" under "Upper Tier"): a raw tier key reaches the buyer. | One seat label helper used by both pages; never print the tier key. | S |

---

## 2. Full findings

Priority: **P1** hurts use or trust, **P2** noticeable polish, **P3** nice to have. Viewports: 390 / 768 / 1440; D dark, L light. "Code only" means not seen in a browser.

### P1 (3)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| 1 | All pages (signed in) | 390 D+L | Header too wide: menu button cut off, 15 px sideways scroll (scrollWidth 405). Measured on every signed-in route. The hamburger is the only way to reach the footer links on a phone. | Language trigger icon-only below 420 px | S | Low | web-design-guidelines (no horizontal scroll), impeccable (responsive); F90 |
| 2 | Checkout | 390 D+L | Pay button 1454 px down, timer not visible while scrolling, 30 s hold. | Sticky bottom bar with timer and Pay below 1024 px | M | Medium (payment flow, F57, F206) | impeccable (critique: primary action), ui-ux-pro-max (sticky CTA on timed flows) |
| 3 | Home | 1440 D+L | Hero CTA below the fold (title y 725, CTA bottom y 893). The hero is the page's one big promise. | Cap hero height, keep the side cards aligned to it | S | Low (F316 minimum heights stay) | frontend-design (first screen), impeccable (hierarchy) |

### P2 (16)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| 4 | Event detail | 390 D | Ticket box about 2000 px down, after comments (see quick win 4). | Sticky "From ₩x / View tickets" bar | M | Low | impeccable, ui-ux-pro-max |
| 5 | Event detail | 1440 D+L | The image (about 660x440) pushes the title and the ticket box down; the box starts around y 575. | Limit image height (about 360 px) or put the box beside the title | S | Low | frontend-design |
| 6 | Seats | 390 and 1440 D | Continue invisible when blocked (quick win 5). | Styled blocked state plus hint | S | Low | web-design-guidelines (disabled state), AGENTS rule (aria-disabled) |
| 7 | Seats | 390 D | After choosing a section the map zooms to 150% and the section's outer seats are cut at the left and right edge (seen in one screenshot; the map was blank for the first moments of the load). | Fit-to-section should leave a margin; check the first paint | M | Medium | emil-design-eng (state at rest), impeccable |
| 8 | Seats | 390 D | Seats on the map are about 22 px; real tap targets are the section buttons and the grid (F66, F247), but the map invites tapping. | Tap on the map picks the section (not a seat) at 100% zoom, or show a hint "Choose a section below" | M | Medium | ui-ux-pro-max (touch targets) |
| 9 | Checkout | 390 D | Order summary comes before payment, so the page is 1561 px with only a small timer above (see P1 2). A first-time buyer sees an empty-looking "Payment" box with disabled sample card fields (F74). | Part of P1 2; add one line "Demo payment: nothing is charged" next to Pay | S | Low | impeccable (trust) |
| 10 | Order detail, confirmation | 390 D | Raw tier key and two seat label formats (quick win 10). | One label helper | S | Low | impeccable (consistency) |
| 11 | Events list | 390 D+L | Four stacked control rows before the first card (quick win 9). | One row for count and sort | S | Low | impeccable |
| 12 | Events list, filters | 390 D | Filters open as a 580 px inline panel above the results; nothing shows how many events match and the results are out of sight. | Sticky "Show N events" button at the bottom of the panel, closing it | M | Medium (F164 URL state stays) | web-design-guidelines (feedback), ui-ux-pro-max |
| 13 | Events list, organizer page | 390 D | One card per row, each about 470 px: 13 events make a 6845 px page, 12 organizer events 6815 px. | Compact card (image at the left, like the home side cards) below 480 px | M | Medium (conflicts with F316, see section 4) | impeccable (density), vercel-react-best-practices (less to paint) |
| 14 | Account pages | 390 D | Tab strip cut at "Notif" with no hint (quick win 6). | Edge fade | S | Low | web-design-guidelines |
| 15 | Login, sign-up | 390 D+L | Text fields 41 px (quick win 7). | `min-height` 44 px | S | Low | F262 |
| 16 | Several | 390 D | Floating assistant button covers footer language segments and card text (quick win 8). | Footer padding or fade | S | Low | impeccable |
| 17 | Dashboards | 390 | Code only: the sidebar drawer closes on a scrim click and on route change, but there is no Escape handler or focus move into the drawer in `DashboardShell`, and `aria-expanded` is on the opener only. | Escape closes, focus goes to the first link and returns to the button; `inert` on the page behind | M | Medium | web-design-guidelines (focus management) |
| 18 | Organizer wizard | 390 | Code only: the Back / Save draft / Continue row (`org-actions`) sits at the end of each step; on the long venue and tickets steps it is far below. | Sticky action row at the bottom on phones | M | Low | ui-ux-pro-max (forms) |
| 19 | Organizer and admin pages | 390 to 1440 | **Not reviewed** (no sign-in). Tables to cards at 900 px (F194), payouts filters and dialogs (F281, F282) were not seen. | Follow-up run with both roles signed in | M | n/a | n/a |

### P3 (13)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| 20 | Events list | 390 D | Axe `heading-order` (moderate): card titles are `h3` after the page `h1` with no `h2`. | Visually hidden `h2` for the results, or card titles as `h2` | S | Low | web-design-guidelines |
| 21 | Events list | 390 D | Empty state for a title search says "Try a different date or city, or clear the filters" and Sort stays visible above it. | Copy that matches a title search; hide Sort when the list is empty | S | Low | impeccable (empty states) |
| 22 | Events list | 390 D | An event without an image shows a flat purple block. | A neutral Volt placeholder with the category icon | S | Low | impeccable ("unfinished" look) |
| 23 | My tickets | 390 D | 16 upcoming tickets of one event are 16 near-identical cards. | Group by event and order ("16 tickets") | M | Medium | impeccable (density) |
| 24 | Sign-up | 390 D | Every required field says the same "Fill in this field." The two role cards take 280 px before the first field. | Say what is needed ("Enter your full name"); slimmer role cards on phones | S | Low | web-design-guidelines (forms) |
| 25 | Settings | 390 D | The read-only email field is dim grey on dark and reads as empty (axe does not test disabled fields). | A lock icon and a stronger value colour | S | Low | impeccable |
| 26 | Contact | 390 D | Mail link is 18 px high; a link and a "Write an email" button do the same thing. | Keep the button, make the link at least 44 px or drop it | S | Low | F262 |
| 27 | Event detail | 390 D | "All Comedy" link is 24 px high. | Same padding as other stand-alone links | S | Low | F262 |
| 28 | Seats | 1440 L | The 30-second note is a bordered box inside the bordered "Your seats" card. | Plain text under the heading | S | Low | impeccable (nested cards) |
| 29 | Dashboards | all | Code only: the top bar title is an `h2` before the page `h1`; there is no skip link (the public pages have one). | Page title as the `h1`, skip link | S | Low | web-design-guidelines |
| 30 | Dashboards | all | Code only: "Create event" is `disabled` when the organizer is not approved. | `aria-disabled` plus the reason (see section 4, F106) | S | Low | AGENTS rule |
| 31 | Several scss files | all | Hard-coded colours outside tokens: tag dots (`#8a8a80`, `#c93a12`, `#f2b705`, `#3a47b0`) and `#f2b705` in `events.scss`, `#000` in `organizer.scss` (QR, white-view colours in `account.scss` are decided by F85 and fine). | Move the tag dots to `--tag-*` tokens in `tokens.css` and `tokens.json` | S | Low | AGENTS design rule, F14 |
| 32 | Header, footer | 768 D+L | Account trigger 40 px, brand 28 px, footer links 32 px. F262 limits the 44 px rule to below 768 px and to touch screens, so this is by decision; only a tablet in a desktop-style window would show it. | None needed; see section 4 | n/a | n/a | F262 |

**Counts: P1 3, P2 16, P3 13 (32 rows; row 19 is a gap, row 32 is a note and needs no work).**

Motion: nothing distracting was found. Route fade, hold ring, count-up, one-time peek and the focus ring are short and use the tokens; reduced motion is handled in one rule (F252). The 14 s hero drift (F260) is slow enough not to read as movement. No change suggested by emil-design-eng or review-animations.

Performance as page feel (vercel-react-best-practices): no finding beyond finding 13 (long card lists). Images have sizes and lazy loading (F269, F270); `imgNoDim` showed one or two images per page without width and height attributes (not identified); worth a look in the batch for finding 1, not counted.

---

## 3. What already looks good and must not change

- The Volt look: lime CTA on near-black, the Ticketzy wordmark with the ticket logo, the "Featured" label on the home hero, the status tag (F318).
- Dark as the default and a working light theme: axe found no contrast violation on any measured page in either theme.
- The seat picker on phones: bottom sheet, legend, "Live" badge, section list with free-seat counts, 44 px seat buttons in the grid, hold ring.
- Checkout's expired state and the paid confirmation (check mark, order summary, one clear next step).
- Form error style: red border plus icon plus text, never colour alone.
- Empty state card with an icon, a short sentence and a "Clear filters" button.
- Static pages (about, FAQ, contact, terms): readable line length, clear headings, demo notice, FAQ topic chips.
- Order history cards (status chip with icon, three small facts, one link) and the notification list.
- Focus ring that eases in (F261), the skip link, `aria-busy` and `role="status"` use.
- The footer, the account menu and the language segments.
- Home rows with native scroll snap and the one-time peek (F315, F321), the Backdrop marks and their contrast (F317, F320).

---

## 4. Findings that conflict with an existing decision (your choice)

| Finding | Decision | The conflict | Options |
|---|---|---|---|
| 1 (header overflow) | F18, F288 (brand is the word plus the logo) | The cheapest fix is to hide the wordmark below 420 px. | **A (recommended):** icon-only language trigger, wordmark stays. B: logo mark only below 420 px (changes F18 on phones). |
| 3 (hero height) | F316 (minimum heights so nothing shifts) | A cap lowers the hero's height. | Keep F316's minimum for the side cards and skeletons, cap the hero only; skeleton and hero must use the same cap. |
| 13 (compact cards) | F316 (cards at least 420 px tall) | A compact card is shorter than the minimum. | Apply the compact card below 480 px only and give its skeleton the same height; or leave the long list as it is. |
| 16 (assistant button) | F197, F206 (where it shows, when it steps aside) | Hiding it in the footer area adds a third rule. | Extra footer padding instead (no new rule), or accept the overlap. |
| 6 and 30 (`disabled` vs `aria-disabled`) | F106 (sidebar "Create event" is disabled with the reason), F302 (`aria-disabled` while sales have not started) | AGENTS.md says blocked buttons use `aria-disabled`; F106 predates that. | Move F106's button to `aria-disabled` and say so in a new F-entry; keep real `disabled` only while a request is running. |
| 32 (tablet touch targets) | F262 (44 px below 768 px and on touch screens only) | A 768 px tablet window without touch keeps 28 to 40 px controls. | Leave as is (recommended), or raise the breakpoint to 1024 px. |
| 31 (tag dot colours) | F318 (tag spec) | F318 fixes the tag look but not where the dot colours live. | Tokens with the same values: no visual change. |
| 2 (sticky pay bar) | F57, F75, F206 | Consistent with F75 (the picker is already a fixed sheet) and F206 (the assistant steps aside there); listed because it touches the payment page. | Reuse the picker sheet pattern. |

---

## 5. Suggested order of work

Each batch can be one prompt. Run the full checklist (typecheck, lint, i18n check, axe, light and dark) after each.

1. **Batch A, phone fit (all S, CSS and small markup):** findings 1, 3, 6 (blocked Continue), 11 (events header row), 14, 15, 16, 20, 21, 26, 27. Re-measure overflow on every route measured here; the target is no sideways scroll when signed in.
2. **Batch B, the buying path on phones (M):** findings 2, 4, 9, 7, 8, 10, 12. One sticky bottom bar pattern shared by event detail and checkout, then the seat-label helper and the map fit. Test with a live hold and both ticketing types.
3. **Batch C, density and polish (M):** findings 5, 13, 22, 23, 24, 25, 28, 31. Decide the conflicts in section 4 first (F316, F18).
4. **Batch D, dashboards (needs you signed in as organizer and admin in the Chrome tab):** finding 19 first (measure the wizard, payouts and the admin pages at 390, 768 and 1440 in both themes, same method), then 17, 18, 29, 30 and whatever that run finds.

---

# Organizer pages (Prompt D1b, phase 1, 2026-10-13)

Report only. No application code changed, nothing committed, nothing submitted: the wizard was only stepped through with its step tabs (no Continue on a valid form, so no draft was created or saved) and one empty Continue to see validation. The tab was signed in as an approved organizer (Hanbit Live Entertainment).

## O.1 How it was checked

- Same method as the first audit (same-origin `<iframe>` of 390, 768 and 1440 px, measured through `contentDocument`, axe-core 4.10.2), light and dark, 6 combos per page; axe at 390 and 1440 (768 measured only).
- **Method correction:** the first dark pass set `data-theme` after load, which does not switch the MUI palette (inputs showed near-black text on a dark surface, a false alarm). All dark results below come from a second pass that sets the `ticketzy-theme` storage key before the page loads, as the real toggle does. The first audit loaded pages the same way as this second pass, so its results are not affected. The stored theme was put back to `light` afterwards.
- Screenshots looked at (390 dark unless noted): overview (1440 light), events list, create-event wizard steps 1 (with validation errors), 3 (draft with a venue) and 4, event orders, payouts (5 scroll positions), profile, messages, check-in, the navigation drawer opened. Other combinations are measured only.

| Page | Measured (6 combos) | Seen | Axe |
|---|---|---|---|
| Overview `/organizer` | yes | 1440 L | clean |
| My events `/organizer/events` | yes | 390 D | clean |
| Create event `/organizer/events/new`, all 6 steps | steps: 390 D and 1440 L/D | steps 1, 3 at 390 D | clean |
| Edit event (draft `hijib`), all 6 steps | steps: 390 D/L, 1440 D | steps 1, 3, 4 at 390 | clean |
| Edit event (approved, rejected) | not opened (see O.4) | | |
| Event orders (one with 3 orders, one with none) | yes | 390 D | clean |
| Attendees, check-in, messages, analytics | yes | check-in, messages 390 D | clean |
| Payouts | yes | 390 D, 5 positions | clean |
| Venues list, new venue, edit venue | yes | none | `landmark-complementary-is-top-level` (O10) |
| Profile `/organizer/profile` | yes | 390 D | **critical `label`** (O1) |
| Account `/settings`, `/notifications` (organizer signed in) | yes | none | settings: **critical `label`** (O1) |

## O.2 Quick wins (organizer)

1. Give the avatar file input on the profile page and on settings an accessible name (O1).
2. Give blocked buttons a visible outline in dark (profile Save/Discard, wizard Back on step 1) and use `aria-disabled` (O3).
3. Minimum 44 px on phones for profile fields, venue editor buttons, translation language segments and the overview "All events" / "Fix" links (O5).
4. Edge fade on the tab strips that scroll (events, orders, attendees, wizard steps) (O4).
5. Escape closes the dashboard drawer and the opener label/`aria-expanded` follow its state (O2).

## O.3 Findings

Numbers are O-numbers so they do not collide with the buyer numbering (1 to 32). Priorities as before.

### P1 (1)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| O1 | Organizer profile, account settings | all, D+L | The hidden `<input type="file">` for the logo/avatar (`#org-avatar`, `#avatar-file`) has no accessible name: axe **critical** `label` and serious `label-title-only` on both pages at every width and in both themes. Screen-reader users hear an unnamed file field. | `aria-label` (translated, like the "Change logo" button) or a `<label htmlFor>` | S | Low | axe, web-design-guidelines (forms) |

### P2 (7)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| O2 | All organizer pages | 390 | Confirms #17 in the browser: with the drawer open, Escape does nothing, focus stays on the opener, the opener keeps `aria-label="Open navigation"` while `aria-expanded="true"`, the drawer has no dialog role, the page behind stays reachable. | Escape closes; focus to the first link and back; label "Close navigation" or `inert` behind | M | Medium | web-design-guidelines |
| O3 | Profile (Save changes, Discard changes), wizard (Back on step 1), Follow (public page) | 390, 1440 D | Blocked buttons are real `disabled` with a near-black fill on the near-black card (`rgb(6,7,8)`): the pill is invisible, only grey text floats. Same class as #6. Light looks fine. | `aria-disabled` with an outlined style from the tokens; hide Back on step 1 | S | Low (F106 note, section O.5) | AGENTS rule, #6 |
| O4 | Events, event orders, attendees, create/edit wizard | 390 D+L | Tab strips scroll sideways with no hint: "Appr", "Await", "Schedule and" are cut at the edge (wizard steps: tabs 4 to 6 are off-screen on step 1). Extends #14. | Edge fade; scroll the current step into view | S | Low | #14 |
| O5 | Several | 390 | Touch targets under 44 px (F262): profile inputs 41 px (same as buyer #15), venue editor "Add seated section", "Add standing area", "Load template" 36 px and image move/remove icons 36 px, wizard translation language segments 36 px, overview links "All events" 75x24 and "Fix" 22x24, "Open payouts" 24 px, "Pause sales" checkboxes 18 px (label row not measured). | `min-height: var(--control-md)` on `.tz-input` and these buttons; padding on stand-alone links | S | Low | F262 |
| O6 | Create and edit event | 390 | Confirms #18: the Back / Save draft / Continue row is at the very end; the tickets step with 3 ticket types is 2888 px, so Continue is about 2800 px down. Stepping needs a long scroll each time. | Sticky action row on phones (same bar pattern as the buyer batch B) | M | Low | #18 |
| O7 | Payouts | 390, 768 | The page is 8769 px at 390 (7625 at 768, 3668 at 1440). The three money tiles stack one per row (about 110 px each), two info notes stack, the two filters are two separate half-width rows, and per-event money is shown twice as long card lists (the payout schedule and "Payouts by event", each one card per event with five rows). The tier ladder takes 600 px. | Tiles in one row (3 columns, smaller), filters on one row, one list only or "Show 5 more", ladder as a compact row | M | Medium (F280 content stays, only its density) | impeccable (density), ui-ux-pro-max |
| O8 | Event orders | 390 D | Each order card centres the buyer name, then left-aligns code, label and value lines with no column alignment; amount, commission and status are separate lines. Hard to scan 10 or more orders. | Name left, amount right on the first row; label/value as a two-column list | M | Low | impeccable |

### P3 (7)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| O9 | My events | 390 D | 22 events make a 3278 px list of text-only cards (no thumbnail); row actions are small underlined links and "Fix" sits indented compared with "View". | Small thumbnail left, one aligned action row | S | Low | impeccable |
| O10 | New venue, edit venue | all, D+L | axe moderate `landmark-complementary-is-top-level`: `.ve__side` is an `<aside>` inside `<main>`. | `<section aria-label>` or `<div>` | S | Low | web-design-guidelines |
| O11 | Create event | 390 D | An empty Continue shows a good summary (`role="alert"`, "Some fields need attention (2)") and red text under each field, but focus does not go to the first invalid field. | Focus the first invalid field | S | Low | web-design-guidelines (forms) |
| O12 | Dashboards | all | Confirms #29: the top-bar title is an `h2` ahead of the page `h1` (Payouts is read twice). | Page title is the `h1` | S | Low | #29 |
| O13 | Wizard, tickets | 390 | Price and quantity inputs show raw digits ("20000", "5000") while every list shows "₩20,000". | Thousands separator while typing (keep digits-only value) | S | Low | impeccable (consistency) |
| O14 | Wizard, profile | 390 D | Locked fields (venue after tickets exist, contact email) are dim grey and read as empty; same as #25. | Lock icon, stronger value colour | S | Low | #25 |
| O15 | Profile, edit venue | all | Two images on the profile page and one on edit venue have no `width`/`height` (layout shift rule). | Add sizes | S | Low | AGENTS (no layout shift) |

**Counts (organizer): P1 1, P2 7, P3 7 (15 rows).**

Also confirmed by the same run (no new row): signed-in `/settings` and `/notifications` still overflow sideways at 390 (scrollWidth 405, finding 1). The organizer dashboard layout itself (`/organizer/*`) has **no horizontal overflow at 390** and its own top bar fits. Motion: nothing found; reduced motion not toggled.

## O.4 Not reviewed in phase 1, and why

- Loading skeletons and server-error states: cannot be forced without changing data or the network; only seen by reading code.
- Venue picker dropdown opened, image upload, submit-for-review dialog, cancel-event dialog, "Resubmit" and the approved/rejected edit modes (a save there sends an event back to review): not opened or clicked, by the rule not to change data. Step 3 was seen on a draft with a venue and on the empty form.
- Check-in scanner (needs camera and an event), analytics hover states, order refund controls.
- 768 px axe (measured only), light-theme screenshots (measured only except the overview).
- The organizer's public page `/organizers/[id]` is a buyer page, covered in the first audit.

## O.5 Conflicts with decisions

| Finding | Decision | Conflict | Options |
|---|---|---|---|
| O3 | F106 (disabled button with the reason), F302 | AGENTS says blocked buttons use `aria-disabled`; real `disabled` is right only while a request is running. The profile Save button is disabled while nothing changed. | `aria-disabled` plus the outlined style (recommended), keep `disabled` during saving |
| O5, O6 | F262 (44 px below 768 px and on touch) | None, these are the rule applied | |
| O7 | F280 (what the payouts section says) | Shortening lists must keep both notes (3 days after the event, demo) | Compact layout only, texts unchanged |

---

# Admin pages (Prompt D1b, phase 2, 2026-10-13)

Report only. Nothing was approved, rejected, suspended, cancelled or marked paid; no dialog was confirmed; no form was submitted. The tab was signed in as the admin (the user signed in; no password was typed by me). Same method as O.1 (iframe at 390, 768 and 1440, light and dark, dark with the `ticketzy-theme` key set before load, axe at 390 and 1440). The stored theme was put back to `light`.

## A.1 What was covered

| Page | Measured (6 combos) | Seen (390 D unless noted) | Axe |
|---|---|---|---|
| Overview `/admin` | yes | 1440 L (behind the other pages) | clean |
| Event approvals `/admin/events` (Pending is empty, so `?tab=approved` was used for the list) | yes | empty state, approved list | clean |
| Event review `/admin/events/[id]` (an approved event with an AI flag) | yes | details, venue map, decision, AI check | **serious `scrollable-region-focusable`** at 390 (A1) |
| Organizers `/admin/organizers` (`?tab=all`) and its detail drawer | yes | drawer | clean |
| Payouts `/admin/payouts` | yes | filters, first card | clean |
| Orders `/admin/orders` | yes | filters, two cards | clean |
| Commission `/admin/commission` | yes | none | clean |
| Members `/admin/members` | yes | none | clean |
| Messages `/admin/messages` | yes | none | clean |
| Venues | **there is no admin venues page**; venue conflicts show inside event review (`VenueConflictPanel`), not seen because this event has none | | |

No admin page overflows sideways at 390 (scrollWidth 390 on all of them), no control is without a name, no raw i18n key was found.

## A.2 Findings

Numbers are A-numbers.

### P1 (1)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| A1 | Event review | 390 D+L | axe **serious** `scrollable-region-focusable`: `.adm-scroll` (the horizontally scrolling table or seat-layout region) cannot be reached or scrolled with the keyboard. Not reported at 1440 (no scroll there). | `tabIndex={0}` with a name (`role="region"`, `aria-label`) on the scroll wrapper | S | Low | axe, web-design-guidelines |

### P2 (5)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| A2 | Event review | 390 | The page is 3439 px; "Decision" starts about 2360 px down, after details, text in each language, ticket types and the seat layout, and the AI check comes after it. A reviewer scrolls the whole page before reaching approve or reject. (For a pending event the buttons are in that same card; only the approved variant, Open public page and Cancel event, was seen.) | A short status and decision link at the top, or a sticky "Decision" bar below 1024 px that scrolls to the card; the confirm and reason dialogs stay as they are | M | Medium (moderation flow, F-entries on reasons) | impeccable (primary action) |
| A3 | Payouts, orders | 390 D | Five stacked filter rows (search, status or event, From, To, sort, about 330 px) before the first card. The From and To inputs are half width and their labels sit at different left offsets. | Dates side by side, sort next to the count, or filters in a collapsible row | S | Low (F281 URL state stays) | impeccable |
| A4 | Orders, payouts | 390 | Long cards of 8 to 10 label/value rows: 72 orders are 4618 px, payouts 4739 px. The buyer label sits above the name, the commission rate "10%" is on its own line, and payouts lists events with "Nothing to pay", ₩0 and 0 orders in full. | Two-column compact card (code and status on the first row, amount right), hide or fold empty payouts | M | Medium | impeccable (density), same idea as O7, O8 |
| A5 | Overview, event review | 390 | Controls under 44 px: "Open payouts" 94x20, "Run again" (AI check) 113x36. At 768 a row of links in the lists are 20 px (by F262 only below 768). | Padding to the 44 px rule | S | Low | F262 |
| A6 | Orders, event approvals | 390 D | Tab strips are cut at the edge ("Awa", "Rejected" without its count) with no hint. Same as #14 and O4. | Edge fade; current tab into view | S | Low | #14 |

### P3 (3)

| # | Page | Viewport, theme | Problem | Suggested fix | Effort | Risk | Source |
|---|---|---|---|---|---|---|---|
| A7 | Event review | 390 | The event image is a small thumbnail (about 100x60) and the seat-layout preview about 170 px high; a reviewer checking images and the map has little to judge. The map has zoom buttons and "Fit map". | Full-width image that opens larger; taller map on phones | M | Low | impeccable |
| A8 | Admin shell | all | Confirms #29: top-bar title is an `h2` before the page `h1` ("Event approvals" twice in the outline); no skip link seen. | Page title is the `h1` | S | Low | #29 |
| A9 | Admin messages | all | 4 images without `width`/`height`. | Add sizes | S | Low | AGENTS (no layout shift) |

**Counts (admin): P1 1, P2 5, P3 3 (9 rows).**

Good, keep as is: the organizer detail drawer is a real dialog (focus moves into it, close button, full-width on phones, clear "Suspend with a reason" in red, reason required note); empty states ("Nothing to review" with an icon, a sentence and one button); the AI check card says "Advice only" and "You always decide"; status chips use icon and text; no axe violation on the other seven pages in either theme.

Admin dashboard shell: the same drawer as the organizer one (**confirmed on `/admin`**: Escape does not close it and the opener still says "Open navigation"); counted once as O2.

## A.3 Not reviewed in phase 2, and why

- Approve, reject, request-changes, cancel, suspend, commission override and mark-paid dialogs: opening them is safe but their buttons confirm a change; they were not opened (no pending event or unpaid payout to open them on either: Pending is 0 and Due now is ₩0).
- The pending event review (approve and reject controls), the venue conflict panel, the admin message thread view, the member detail drawer.
- Commission and members pages: measured, not looked at in a screenshot. Admin overview at 390: measured, not looked at.
- Loading, error and 768 px axe: not looked at or not run.

---

# Combined result of the dashboard audit (D1b)

## Top quick wins (dashboards)

1. O1: name the avatar file input (profile, settings) - the only critical axe finding.
2. A1: make `.adm-scroll` focusable and named.
3. O3: visible blocked buttons in dark, `aria-disabled`.
4. O5, A5: 44 px on phones for profile fields, venue editor buttons, language segments, a few links.
5. O4, A6, #14: one edge-fade for every scrolling tab strip.
6. O2 (and #17): drawer Escape, focus and label (one component, both dashboards).

## Counts

| | P1 | P2 | P3 | Rows |
|---|---|---|---|---|
| Organizer (O1 to O15) | 1 | 7 | 7 | 15 |
| Admin (A1 to A9) | 1 | 5 | 3 | 9 |
| **Dashboards** | **2** | **12** | **10** | **24** |
| Buyer audit (1 to 32, row 19 now closed by this run) | 3 | 16 | 13 | 32 |
| **Whole audit** | **5** | **28** | **23** | **56** |

Row 19 of the buyer table ("organizer and admin pages not reviewed") is answered by these two sections; #17, #18, #29 and #30 were confirmed or extended in the browser (O2, O6, O12/A8, O3).

## Conflicts with decisions

See O.5 (F106/F302 for O3; F280 for O7; F262 is applied, not broken). Admin findings need no new decision; A2 (sticky decision bar) touches the moderation flow, so its dialogs and reasons must stay untouched.

## Suggested batches (continue after Batch A to C above)

- **Batch D1, accessibility and phone fit (all S):** O1, A1, O3, O4/A6/#14, O5/A5, O10, O12/A8/#29, O15, A9. Re-run axe on profile, settings, venues and admin event review.
- **Batch D2, shell (M):** O2/#17 drawer, O6/#18 sticky wizard actions, A2 decision shortcut. Test with keyboard and a phone width.
- **Batch D3, density (M):** O7 payouts, O8 and A4 order cards, A3 filters, O9 events list.
- **Batch D4, polish (S):** O11, O13, O14, A7.
