# Shared UI patterns

## Layer order (z-index)

Tokens in `scss/tokens.css` (and `tokens.json`). From the bottom up:

| Layer | Token | What |
|---|---|---|
| Backdrop marks | `-1` (inside `.tz-app`) | decorative ticket marks |
| Sticky bottom bars | `--z-bar` 90 | checkout pay bar, event ticket bar (`.tz-bar`) |
| Header, top bar, seat sheet | `--z-sticky` 100 | navbar, dashboard top bar, seat picker bottom sheet (F75) |
| Ask Ticketzy button and panel | `--z-dropdown` 200 | `.pg-chat` |
| Scrim | `--z-scrim` 300 | drawer backdrop |
| Sheets, drawers, paid splash | `--z-modal` 310 | phone chat sheet, sidebar drawer, `.tz-splash` (F347) |
| Toasts | `--z-toast` 400 | |
| MUI menus, dialogs, popovers | 1300 (MUI default) | above everything above |

The bars sit below the header so a header menu never goes under one. The Ask button is above a bar in the stack but is lifted by the bar's height, so they never overlap.

## Paid splash (`PaidSplash`, `.tz-splash`)

A decorative, one-time ~3 s sequence on the order confirmation page when the order was just paid (F347): blurred `--scrim`, accent glow, two rings, logo with sheen, check badge, confetti. `aria-hidden`, no focus change, portal in `body`, `--z-modal`. Dismiss by click, Escape or Enter; unmounted at the end, so it never blocks the page. Once per order id (`sessionStorage` plus an in-memory fallback).

- Motion: transform and opacity only, plus the scrim's static `backdrop-filter`, the logo's short entrance blur and the check's `stroke-dashoffset`. No `will-change`. Keep it under about 40 animated elements; confetti is a fixed array (no randomness), 16 pieces under 600 px.
- Colors only from tokens (`--accent`, `--on-image`, `--accent-hover`, `--seat-held`, `--bg`, `--on-accent`). The glow sits behind the logo and the sheen runs inside its dark tile, so neither washes it out in light mode.
- Reduced motion: logo fades on a plain scrim; no blur, glow, rings, sheen, badge or confetti.
- The `role="status"` text on the page stays the announcement. A new overlay of this kind should follow the same rules and not use the MUI dialog.

## Sticky bottom bar (`.tz-bar`, `useStickyBar`)

Phones and tablets only (hidden from 1024 px). Fixed, so it never moves the page.

- Markup: `<div className="tz-bar" role="group" aria-label=...>` with `.tz-bar__info` (label and value) and a button with `.tz-bar__action`. Add `tz-bar--toggle` and `is-shown` if it comes and goes (opacity and transform only, hidden from the keyboard while away).
- Call `useStickyBar(shown)` in the bar component. It sets `html[data-bar]` while mounted (the footer gets `--bar-h` of extra bottom room, so the bar never covers the end of the page) and `html[data-bar-shown]` while visible (the Ask Ticketzy button moves up by `--bar-h`).
- Height is `--bar-h` (80 px plus the safe-area inset). Do not make a bar taller than that without a good reason; the Ask button lift and the footer room read the same token.
- One action per bar. If the page has the same action elsewhere below 1024 px, hide the other one (checkout hides the Pay button of the price card).
- Used by: `libs/components/events/TicketBar.tsx` (event detail), `libs/components/seats/PayBar.tsx` (checkout). The seat picker keeps its own sheet (F75) and the Ask button still steps aside there and on checkout (F206).

## Edge fade for scrolling strips (`ScrollFade`, `.tz-fade`)

For tab strips and chip rows that scroll sideways (account tabs, organizer events, orders and attendees tabs, wizard steps, admin events, organizers and orders tabs).

```tsx
import ScrollFade from '<path>/libs/components/common/ScrollFade';

<nav aria-label="...">
	<ScrollFade as="ul" className="my-tabs" activeKey={pathname}>
		<li><a aria-current="page">...</a></li>
		...
	</ScrollFade>
</nav>
```

- The component renders the scroller itself (`as` is `div` by default). Your own class must give it `display: flex` and `overflow-x: auto` (it is the scroll container, as before).
- It adds `tz-fade` and sets `data-fade-start` / `data-fade-end` only on the side that has more content; a 32 px mask (`--fade-size`) fades that edge. No layout change, no extra element, works in both themes.
- The current tab is found with `activeSelector` (default `[aria-current="page"], [aria-selected="true"], [aria-pressed="true"], .is-active`) and scrolled to the centre of the strip when `activeKey` changes: instantly on the first paint and under reduced motion, smooth otherwise. Only the strip scrolls, never the page.
- When the strip does not overflow (for example a vertical list from 1024 px) nothing is set and nothing fades.
- Keep tabs at 44 px on touch (F262); the fade only hides the last 32 px of a tab at an edge.

## Blocked button (`tz-blocked`, F326)

For a control that has nothing to do yet (Save with no changes, Back on the first step). Not for a request in flight (that stays a real `disabled`) and not for the ticket button (F302).

```tsx
<Button className={blocked ? 'tz-blocked' : undefined} aria-disabled={blocked ? true : undefined} onClick={() => { if (!blocked) doIt(); }}>
```

- Outlined: transparent fill, `--border-control` border (4.5:1 or more), `--ink-muted` label (8:1 or more), no hover change, in both themes. Defined in `scss/layout.scss`; no new tokens.
- Stays in the tab order; the click must do nothing (guard the handler, and `preventDefault` on a submit button).
- Plain icon buttons of the assistant (`.pg-sendbtn`, `.pg-iconbtn`) take the same class (F344).
- Used by: organizer profile Save / Discard, event wizard Back (step 1), Save draft / Save changes and Submit for review, venue editor Save, Undo and Redo, Submit dialog confirm, Translate, message Send, assistant Send and New chat.

## Dashboard drawer (F327)

`DashboardShell` (organizer and admin) below 1024 px: the sidebar is a dialog while open (`role="dialog"`, `aria-modal`), `.tz-main` is `inert`, Escape closes, focus goes to the close button and returns to the opener, and the opener's label (`dashboard.openSidebar` / `dashboard.closeSidebar`) and `aria-expanded` follow the state. Layers: scrim 300, drawer 310 (see the table above).

## Seat label (F332)

One way to write a seat for the buyer: `libs/seats/label.ts`.

```tsx
const names = useSectionNames(eventId, enabled);   // libs/hooks/useSectionNames.ts, seat map layout, cache-first
seatLabel(t, seat, names);                          // "Upper East, row 7, seat 12"; "Row 7, seat 12" while the name is unknown
const { short, section, full } = seatParts(t, seat, names);   // when title and meta are separate lines
```

- Section keys and tier keys (`UPPER_E`) are ids; never print them. Keep ticket type names (translated by the organizer) as they are.
- Keys `common:seatLabel.full` and `common:seatLabel.short`. When the layout already is in hand use `sectionNamesOf(sections)` instead of the hook.
- Used by: order detail, ticket detail, ticket card, order confirmation, checkout summary.

## Field errors (F348)

Rejected input is shown under its field, from the same (property, rule) pair whether the client or the server found it.

- Keep form issues as `Record<backendProperty, rule>`. Client checks use `lengthRule` or a rule name the server uses (`isEmail`, `isNotEmpty`); a server answer goes through `serverIssues(apiError, knownFields)`. Render with `fieldMessage(t, field, rule)` (keys `common:validation.*`).
- Show the banner (`AuthError` or the form's status block) only when `serverIssues(...).banner` is true: not `VALIDATION_FAILED`, no `fields`, or a field the form has no input for.
- `Field` already sets `aria-invalid` and `aria-describedby`; a custom control must set both. After a failed submit call `useFocusInvalid(formRef)`'s function next to the `setState` of the issues: focus goes to the first `[aria-invalid="true"]`.
- Typing in a field clears only that field's issue. Limits live in `FIELD_LIMITS` (libs/fieldErrors.ts), read from the backend DTOs.

