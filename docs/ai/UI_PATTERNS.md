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
| Sheets, drawers | `--z-modal` 310 | phone chat sheet, sidebar drawer |
| Toasts | `--z-toast` 400 | |
| MUI menus, dialogs, popovers | 1300 (MUI default) | above everything above |

The bars sit below the header so a header menu never goes under one. The Ask button is above a bar in the stack but is lifted by the bar's height, so they never overlap.

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
- Used by: organizer profile Save / Discard, event wizard Back (step 1) and Save draft / Save changes.

## Dashboard drawer (F327)

`DashboardShell` (organizer and admin) below 1024 px: the sidebar is a dialog while open (`role="dialog"`, `aria-modal`), `.tz-main` is `inert`, Escape closes, focus goes to the close button and returns to the opener, and the opener's label (`dashboard.openSidebar` / `dashboard.closeSidebar`) and `aria-expanded` follow the state. Layers: scrim 300, drawer 310 (see the table above).
