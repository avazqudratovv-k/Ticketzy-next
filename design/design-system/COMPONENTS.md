# Ticketzy components and layouts

Every component is plain HTML with `tz-` classes from `components.css`, styled only by the tokens in `tokens.css`. There is no JavaScript bundle: opening, closing, selecting and focus handling are yours to wire.

Contents: Core (Button, Input, Select, DatePicker, Modal, Toast, Tabs, Table, Pagination, EmptyState, Skeleton) · Ticketzy (EventCard, TicketCard, PriceTag, CategoryChip, LanguageSwitcher, StatusBadge, SeatMap) · Layouts (PublicLayout, OrganizerLayout, AdminLayout)

---

# Core

## Button

Triggers an action. One primary (Volt) button per view; everything else is secondary, ghost or danger.

**You provide:** the label (a verb phrase, sentence case), an optional leading icon, and the variant.

```html
<button class="tz-btn tz-btn--primary">Buy tickets</button>
<button class="tz-btn">Add to calendar</button>            <!-- secondary -->
<button class="tz-btn tz-btn--ghost">Cancel</button>
<button class="tz-btn tz-btn--danger">Cancel event</button>
<button class="tz-btn tz-btn--icon" aria-label="Save event">…svg…</button>
```

| Modifier | Use |
|---|---|
| `--primary` | The single main action: buy, continue, publish. `accent` fill, `on-accent` text, `accent-edge` border. |
| (none) | Secondary. Transparent with a `border-control` outline. |
| `--ghost` | Tertiary and dismissive actions (Cancel, Back). |
| `--danger` | Destructive and irreversible only: cancel event, reject, refund. |
| `--sm` / `--lg` | `control-sm` for dense dashboard toolbars (pointer only); `control-lg` for the checkout call to action. |
| `--block` | Full width. Default for primary actions below `bp-md`. |
| `--icon` | Round, icon only. Requires `aria-label`. |
| `.is-loading` | Put a `.tz-spinner` first and keep the label; the width must not jump. |

**Rules**
- Never set a fixed width or height. Height is a `min-height`; a long Russian or Uzbek label wraps to a second line and the button grows.
- Do not truncate labels with an ellipsis. If a label exceeds two lines at 168px, shorten the translation.
- Disabled buttons use `disabled`, not just a class, and say why nearby ("Sold out").
- Focus ring is `focus`, 2px, offset 2px. Do not remove it.

## Input

A single-line or multi-line text field with its label, hint and error.

**You provide:** a visible label (always; a placeholder is not a label), the control, and optionally a hint or an error message.

```html
<label class="tz-field">
  <span class="tz-field__label">Event name <span class="tz-field__req" aria-hidden="true">*</span></span>
  <input class="tz-input" required aria-describedby="name-hint">
  <span class="tz-field__hint" id="name-hint">Shown on the event page and on tickets.</span>
</label>
```

- Leading icon: wrap the input in `.tz-input-wrap` and put the icon first.
- Error: set `aria-invalid="true"` on the control and replace the hint with `.tz-field__error` (icon plus sentence). The border turns `danger-text`; the message says how to fix it.
- Multi-line: `<textarea class="tz-input">`.

**Rules**
- Text inside controls is `body` (16px). Smaller text makes iOS zoom the page.
- Labels sit above the field, never beside it: a Russian label is often 40% longer than the English one and a side label breaks the grid.
- Stack fields with `space-6` between them; the label-to-control gap is `space-2`.
- Field width follows its container. Do not size a field to its English placeholder.
- Organizer forms that hold translatable content (event name, description) show one field per language under segmented Tabs (EN / KO / RU / UZ), not four fields in a row.

## Select

Picks one option from a list. Native `<select>` by default; the `.tz-menu` listbox when options need a second column (price, availability).

**You provide:** a label, the options, and the selected value.

```html
<label class="tz-field">
  <span class="tz-field__label">Category</span>
  <span class="tz-select-wrap">
    <select class="tz-select">…</select>
    …chevron svg…
  </span>
</label>

<ul class="tz-menu" role="listbox">
  <li class="tz-option" role="option" aria-selected="true">Seated, block A <span class="tz-option__meta">$48</span></li>
</ul>
```

**Rules**
- Use the native select on mobile: the OS picker handles long options in every script.
- In `.tz-menu`, option text wraps; the `__meta` column stays on one line and is pushed to the end.
- The selected option is `accent-soft` plus semibold; keyboard focus is `.is-active` (`neutral-soft`). Never mark selection with color alone.
- Below `bp-md` open `.tz-menu` inside a bottom-sheet Modal, not as a floating popover.
- Menu z-index: `z-dropdown`.

## DatePicker

A calendar popover for one date or a date range, opened from a read-only Input with a calendar icon.

**You provide:** the visible month, the selected date or range, the minimum and maximum dates, and the locale.

```html
<div class="tz-datepicker" role="dialog" aria-label="November 2026">
  <div class="tz-datepicker__head">…prev… <div class="tz-datepicker__month">November 2026</div> …next…</div>
  <div class="tz-datepicker__grid">
    <span class="tz-datepicker__dow">Mo</span> …
    <button class="tz-day tz-day--today" aria-current="date">9</button>
    <button class="tz-day tz-day--selected" aria-pressed="true">14</button>
    <button class="tz-day tz-day--in-range">15</button>
    <button class="tz-day" disabled>1</button>
  </div>
</div>
```

| Day state | Look |
|---|---|
| `--today` | 1px `border-control` inset ring |
| `--selected` | `accent` fill, `on-accent` text (range start and end) |
| `--in-range` | `accent-soft` band, square corners |
| `--outside` | `ink-subtle`, not focusable |
| `disabled` | `ink-subtle`, struck through (past dates, days with no events) |

**Rules**
- Take month names, weekday names and the first day of the week from the locale (`Intl.DateTimeFormat`, `Intl.Locale#weekInfo`): Sunday for English and Korean, Monday for Russian and Uzbek. Never hard-code them.
- Weekday headers use the locale's narrow or short form; the 7-column grid is fluid, so do not rely on two letters fitting.
- Format the value in the field with the locale: `14 Nov 2026`, `2026년 11월 14일`, `14 нояб. 2026 г.`, `14-noyabr, 2026`.
- Day cells are at least 40px; below `bp-md` show the picker in a bottom-sheet Modal at full width so cells reach 44px.
- Range pickers get a footer with Reset (ghost) and Apply (primary).

## Modal

A dialog that interrupts for a decision or a short task; a bottom sheet below `bp-md`, a centered dialog above.

**You provide:** a title (a question or the task name), body content, and one to three footer actions.

```html
<div class="tz-scrim">
  <div class="tz-modal" role="dialog" aria-modal="true" aria-labelledby="t">
    <div class="tz-modal__head"><h2 class="tz-modal__title" id="t">Cancel this event?</h2> …close button…</div>
    <div class="tz-modal__body">…</div>
    <div class="tz-modal__foot">
      <button class="tz-btn tz-btn--ghost">Keep event</button>
      <button class="tz-btn tz-btn--danger">Cancel event and refund</button>
    </div>
  </div>
</div>
```

**Rules**
- Order the footer in the DOM as dismiss first, confirm last. On mobile the footer reverses and stacks, so the confirm action sits on top, full width, under the thumb.
- Button labels name the outcome ("Cancel event and refund"), never "OK" / "Yes". This also survives translation better.
- Max width 520px; the body scrolls, head and footer stay. Max height 90% of the viewport.
- `radius-xl`, `shadow-lg`, on `scrim`. Z-index `z-scrim` / `z-modal`.
- Trap focus, close on Escape and on scrim click (except while a payment is processing), return focus to the trigger.
- Use a Modal for confirmation, seat-hold expiry, language-agnostic pickers on mobile. Do not put a whole checkout in one.

## Toast

A brief, non-blocking message about something that just happened.

**You provide:** the tone, a short title, an optional one-sentence message, and at most one action.

```html
<div class="tz-toast-region">
  <div class="tz-toast tz-toast--success" role="status">
    <span class="tz-toast__icon">…check…</span>
    <div class="tz-toast__text">
      <p class="tz-toast__title">Tickets sent</p>
      <p class="tz-toast__msg">2 tickets are in My tickets and in your inbox.</p>
      <button class="tz-toast__action">View tickets</button>
    </div>
    <button class="tz-toast__close" aria-label="Dismiss">…x…</button>
  </div>
</div>
```

| Tone | Icon | Use |
|---|---|---|
| (default) | info | Neutral confirmation: draft saved, link copied |
| `--success` | check | Purchase complete, event approved |
| `--warning` | clock | Seat hold about to expire |
| `--danger` | alert | Payment failed, upload failed. `role="alert"` |
| `--info` | undo / info | Refund issued, schedule change |

**Rules**
- The toast surface is always `surface-raised`; only the icon disc carries the tone. Tone is never conveyed by color alone: the icon changes too.
- Text wraps freely; width is fluid up to 420px. Do not cap the number of lines, a Russian sentence may need three.
- Position with `.tz-toast-region`: top, full width below `bp-md`; bottom right from `bp-md`. Stack newest first, `space-2` apart, three at most.
- Auto-dismiss after 5s plus 1s per 10 words; danger toasts and toasts with an action stay until dismissed.
- Never use a toast for something the user must read to continue: that is an inline error or a Modal.

## Tabs

Switches between sibling views of the same page. Underline tabs for page sections, segmented tabs for a compact two-to-four way toggle.

**You provide:** the tab labels (one or two words), which one is selected, and optional counts.

```html
<div class="tz-tabs" role="tablist">
  <button class="tz-tab" role="tab" aria-selected="true">All events <span class="tz-tab__count">48</span></button>
  <button class="tz-tab" role="tab" aria-selected="false">Drafts</button>
</div>

<div class="tz-tabs tz-tabs--segmented" role="tablist">…</div>
```

**Rules**
- Tabs keep their natural width and the row scrolls horizontally when it overflows. Never shrink, wrap or truncate a tab label; scroll the selected tab into view on load.
- The selected tab is `ink` text plus a 3px `accent-edge` indicator; unselected is `ink-muted`.
- Segmented tabs sit on `surface-sunken`; the selected segment is `surface-raised` with a border. Use them for the content-language toggle (EN / KO / RU / UZ) in organizer forms and for Upcoming / Past.
- Six tabs at most. More than that is a Select or a sidebar section.
- Arrow keys move between tabs; only the selected tab is in the tab order.

## Table

Rows of comparable records in the Organizer and Admin dashboards: events, orders, payouts, users.

**You provide:** column headers, rows, a `data-label` on every cell (the column header in the current language), and which column is sorted.

```html
<div class="tz-table-wrap">
  <table class="tz-table tz-table--stack">
    <thead><tr>
      <th>Event</th>
      <th aria-sort="ascending"><button class="tz-table__sort" aria-sort="ascending">Date …icon…</button></th>
      <th class="is-num">Revenue</th>
    </tr></thead>
    <tbody><tr>
      <td data-label="Event"><span class="tz-table__primary">Midnight Signal</span><span class="tz-table__secondary">Riverside Arena</span></td>
      <td data-label="Date">14 Nov 2026</td>
      <td data-label="Revenue" class="is-num">$61,632</td>
    </tr></tbody>
  </table>
</div>
```

**Rules**
- `.tz-table-wrap` is a container: when it is narrower than 620px a `tz-table--stack` table turns each row into a block with the first cell as its title and `data-label` shown before every other cell. Without `--stack` the wrap scrolls horizontally; use that only for wide numeric reports.
- Text cells wrap. Only `.is-num` cells (amounts, counts, dates) are `nowrap`, right-aligned, tabular figures.
- Do not set column widths in pixels. Headers are translated too and wrap at the bottom of the header row.
- The first column is the record's name (`__primary`, semibold) with one line of context (`__secondary`).
- Status goes in a StatusBadge, never colored text. Row actions go in the last column: one icon button that opens a `.tz-menu`, or up to two small buttons in Admin review queues.
- Selected rows: `aria-selected="true"` (`accent-soft`). Pair every table with Pagination and an EmptyState.

## Pagination

Moves through pages of a Table or an event grid.

**You provide:** the current page, the page count, and (for tables) the range summary.

```html
<nav class="tz-pagination" aria-label="Pagination">
  <span class="tz-pagination__summary">Showing 41–60 of 248 events</span>
  <ul class="tz-pagination__pages">
    <li><a class="tz-page" aria-label="Previous page">…</a></li>
    <li><a class="tz-page tz-page--num">2</a></li>
    <li><a class="tz-page tz-page--num" aria-current="page">3</a></li>
    <li><span class="tz-page tz-page--num tz-page--gap">…</span></li>
    <li><span class="tz-pagination__summary tz-pagination__compact">Page 3 of 13</span></li>
    <li><a class="tz-page" aria-label="Next page">…</a></li>
  </ul>
</nav>
```

**Rules**
- Below `bp-md`, `.tz-page--num` items hide and `.tz-pagination__compact` ("Page 3 of 13") shows between the arrows; from `bp-md` it is the reverse. Ship both in the markup.
- Show first, last, current and one neighbour each side; collapse the rest into `--gap`.
- The current page is `accent` with `aria-current="page"`. Disabled arrows use `aria-disabled="true"` and stay in place.
- Write the summary as a full translated sentence with placeholders ("Showing {from}–{to} of {total} events"); word order and plural forms differ in all four languages. Format numbers with the locale.
- On the Public event grid prefer a "Show more" secondary button on mobile; use Pagination from `bp-md` and in dashboards.

## EmptyState

Fills a list, grid or table that has nothing to show, and says what to do next.

**You provide:** an icon, a title that states what is empty, one sentence of help, and one action (two at most).

```html
<div class="tz-empty">
  <span class="tz-empty__art">…ticket icon…</span>
  <h3 class="tz-empty__title">No tickets yet</h3>
  <p class="tz-empty__text">Tickets you buy show up here, ready to scan at the door.</p>
  <div class="tz-empty__actions"><a class="tz-btn tz-btn--primary" href="/events">Browse events</a></div>
</div>
```

**Rules**
- Three kinds, three tones of action: first use (primary: "Create event"), no results (secondary: "Clear filters"), error (secondary: "Try again").
- The art tile is a neutral icon on `neutral-soft`, tilted 6 degrees. No illustrations, no emoji, no Volt: the accent belongs to the action.
- Center it in the space the content would occupy; inside a Table, put it in a full-width cell, not instead of the table header.
- Max width 440px; title and text wrap freely. Quote the user's search term in the title when there are no results.

## Skeleton

A placeholder in the shape of content that is still loading.

**You provide:** the same layout as the loaded component, with `.tz-skel` blocks in place of text, media and badges.

```html
<div class="tz-event-card" aria-hidden="true">
  <span class="tz-skel tz-skel--media"></span>
  <div class="tz-event-card__body">
    <span class="tz-skel tz-skel--title" style="width:86%"></span>
    <span class="tz-skel tz-skel--text" style="width:58%"></span>
  </div>
</div>
```

| Shape | Stands for |
|---|---|
| `--media` | Event image, 4:3 |
| `--title` | A 20px heading line |
| `--text` | A 14px text line; vary widths (86%, 58%, 70%) |
| `--pill` | Badge, chip, button |
| `--circle` | Avatar (set width and height) |

**Rules**
- Build skeletons from the real component shell (`tz-event-card`, `tz-table`) so nothing shifts when content arrives.
- Show a skeleton only after 300ms of waiting, and show as many cards as the page size, capped at one viewport.
- Mark the region `aria-busy="true"` and the skeletons `aria-hidden="true"`.
- The shimmer stops under `prefers-reduced-motion`. For an action in progress (pay, publish) use the Button loading state, not a skeleton.

---

# Ticketzy

## EventCard

The main unit of the marketplace: one event as image, category, title, date, venue and starting price.

**You provide:** a landscape image (at least 1200×900, subject centered: it is cropped to 4:3, 16:9 and 21:9), the category, the localized title, a locale-formatted date and time, venue and city, the lowest available price, and the sold-out flag.

```html
<a class="tz-event-card" href="/events/midnight-signal" lang="en">
  <span class="tz-media"><img src="…" alt=""></span>
  <span class="tz-chip tz-chip--on-image tz-event-card__chip">…icon… Concert</span>
  <span class="tz-event-card__body">
    <h3 class="tz-event-card__title tz-clamp-2">Midnight Signal: The Glass Tour</h3>
    <ul class="tz-event-card__meta">
      <li>…calendar… <span class="tz-clamp-1">Sat, 14 Nov · 20:00</span></li>
      <li>…pin… <span class="tz-clamp-1">Riverside Arena, Tashkent</span></li>
    </ul>
    <span class="tz-event-card__foot">
      <span class="tz-price"><span class="tz-price__label">From</span><span class="tz-price__amount">$48</span></span>
    </span>
  </span>
</a>
```

| Variant | Use |
|---|---|
| (default) | Grids. Image 4:3 on top, body on `surface`. |
| `--feature` | One per page, the hero. Text sits on the image over `image-scrim` in `on-image`; `radius-xl`; may carry a primary button. |
| `--row` | Lists on mobile and search results. 112px image at the start, compact body. |
| `.is-sold-out` | Image goes grayscale; put a Sold out StatusBadge in the footer. The card stays a link. |

**Rules**
- The whole card is one link. Only the save button (`.tz-event-card__save`, top end corner) is a second target.
- Title: `title` style, clamped to 2 lines. Date and venue: 1 line each. Cards in a row stretch to equal height and the footer pins to the bottom, so a one-line Korean title and a two-line Russian title align.
- Set `lang` on the card when its content language differs from the page.
- Lay cards out with `.tz-grid` (auto-fill, 260px minimum): 1 column on phones, 2 from `bp-sm`, 3 from `bp-lg`, 4 from `bp-xl`. Never fix a card's width or height.
- The image is decorative next to the title: `alt=""`. Do not put text, logos or prices inside event images; they cannot be translated.
- The preview images are CSS placeholders (`tz-demo-img--*`). Replace them with real photography.

## TicketCard

A purchased ticket: event facts on top, a perforation, and the QR code with its ticket code on the stub.

**You provide:** the event image, title, date and time, venue, seat facts (block, row, seat, or the ticket type for general admission), the QR code as an SVG or image, the ticket code, the ticket status and one line of entry instructions.

```html
<article class="tz-ticket">
  <span class="tz-media tz-ticket__media"><img src="…" alt=""></span>
  <div class="tz-ticket__main">
    <div><span class="tz-badge tz-badge--valid">…icon… Valid</span></div>
    <h3 class="tz-ticket__title tz-clamp-3">Midnight Signal: The Glass Tour</h3>
    <dl class="tz-ticket__facts">
      <div class="is-wide"><dt>Date</dt><dd>Sat, 14 Nov 2026 · 20:00</dd></div>
      <div><dt>Block</dt><dd>A</dd></div><div><dt>Row</dt><dd>12</dd></div><div><dt>Seat</dt><dd>7</dd></div>
    </dl>
  </div>
  <div class="tz-ticket__tear" aria-hidden="true"></div>
  <div class="tz-ticket__stub">
    <div class="tz-qr">…qr svg…</div>
    <span class="tz-ticket__code">TZ-7F3K-92QA</span>
    <p class="tz-ticket__note">Show this code at the entrance.</p>
  </div>
</article>
```

**Rules**
- The QR tile is `qr-ground` (white) with `qr-ink` modules in both themes. Never theme, tint, round or overlay a valid QR. Keep the tile's `space-4` padding as the quiet zone and render the code at 176px or larger.
- Used, Refunded and Cancelled tickets get `.is-void`: the QR fades to 12% and `.tz-qr__void` states why in words. A void code must not scan from a screenshot.
- Status is a StatusBadge on its own line above the title, so a long title never competes with it: Valid, Used, Refunded (Cancelled when the event is cancelled).
- Facts are a `dl` in an auto-fit grid: labels and values wrap, and long values ("Северная трибуна") take `.is-wide`. Do not abbreviate labels to make them fit.
- The notches are painted with the page ground. On anything other than `bg`, set `--ticket-ground` on the ticket to that surface's color.
- Max width 380px; full width on phones. In "My tickets", one ticket per screen with horizontal swipe on mobile; raise screen brightness when a valid ticket is open.
- The ticket code is `code` style (mono), selectable, and is the fallback when the scanner fails.
- The QR in the preview is a placeholder pattern, not a scannable code.

## PriceTag

Shows what a ticket costs: a small label over a heavy, tabular amount.

**You provide:** an amount already formatted for the locale and currency, and a label ("From", "Total, 2 tickets", "Early bird").

```html
<span class="tz-price">
  <span class="tz-price__label">From</span>
  <span class="tz-price__amount">$48</span>
  <span class="tz-price__was">$60</span>   <!-- optional original price -->
</span>
```

| Modifier | Use |
|---|---|
| `--sm` | Row cards, table cells |
| (none) | Event cards |
| `--lg` | Event page header, checkout total |
| `--inline` | Label and amount on one baseline (order summary lines) |
| `.is-unavailable` | Sold out: amount struck through in `ink-subtle` |

**Rules**
- Format with `Intl.NumberFormat(locale, {style: "currency", currency})`. Do not build the string by hand: the symbol moves and the group separator changes (`$48`, `₩65,000`, `590 000 сум`, `1 250 000 soʻm`).
- The amount never wraps and never truncates. Reserve room for 14 characters at `price` size (about 170px): Uzbek soʻm amounts run to seven digits.
- The label goes above the amount, not before it, so a long label ("Итого за 2 билета") cannot push the amount off the line.
- No decimals for KRW and UZS; two decimals for USD only on totals.
- "From" always means the lowest currently available price, fees included. Zero is the word "Free" in the current language, not `0`.
- The amount is `ink`, never Volt.

## CategoryChip

Names an event category: a filter chip above the grid, or a small label on event imagery.

**You provide:** the category (concert, football or comedy), its translated name, and for filters the pressed state.

```html
<div class="tz-chip-row" role="group" aria-label="Category">
  <button class="tz-chip" aria-pressed="true">All events</button>
  <button class="tz-chip" aria-pressed="false">…music icon… Concerts</button>
</div>

<span class="tz-chip tz-chip--on-image">…ball icon… Football</span>
```

| Category | Icon | EN | KO | RU | UZ |
|---|---|---|---|---|---|
| concert | music note | Concert | 콘서트 | Концерт | Konsert |
| football | ball | Football | 축구 | Футбол | Futbol |
| comedy | microphone | Comedy | 코미디 | Стендап | Stend-ap |

**Rules**
- Categories are told apart by icon and word, never by color. All three share one neutral style; do not assign a hue per category.
- Filter chips: `neutral-soft` at rest, `accent` with `on-accent` text when pressed. Single-select with "All events" first.
- `.tz-chip-row` scrolls horizontally and bleeds to the screen edge on mobile; chips never shrink, wrap or truncate.
- `--on-image` sits at the top start corner of an event image, on `image-scrim` in `on-image`. It is a label, not a control.
- A new category needs an icon, four translations and nothing else.

## LanguageSwitcher

Switches the interface between English, Korean, Russian and Uzbek.

**You provide:** the current language and a handler that reloads the same page in the chosen one.

```html
<div class="tz-lang">
  <button class="tz-lang__trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Language: English">
    …globe… <span class="tz-lang__code">EN</span>
  </button>
  <ul class="tz-menu" role="listbox" aria-label="Language">
    <li class="tz-option" role="option" aria-selected="true" lang="en">English …check…</li>
    <li class="tz-option" role="option" lang="ko">한국어 <span class="tz-option__meta">KO</span></li>
    <li class="tz-option" role="option" lang="ru">Русский <span class="tz-option__meta">RU</span></li>
    <li class="tz-option" role="option" lang="uz">Oʻzbekcha <span class="tz-option__meta">UZ</span></li>
  </ul>
</div>
```

**Rules**
- Each language is written in its own script and never translated: English, 한국어, Русский, Oʻzbekcha. Fixed order: EN, KO, RU, UZ.
- No flags. A language is not a country; the globe icon plus the two-letter code is the trigger.
- Compact trigger (globe + code) in the navbar and top bar; the segmented form in the footer and in account settings, where all four fit. Below 420px the segmented form scrolls.
- Set `lang` on each option so the right font and line-breaking rules apply, and update `<html lang>` on switch.
- Switching keeps the user on the same page and scroll position, and persists in the account (or a cookie when signed out). First visit: follow `Accept-Language`.
- Uzbek is Latin script and uses the letter `ʻ` (U+02BB) in oʻ and gʻ, not an apostrophe.

## StatusBadge

States where an event or a ticket is in its lifecycle. Nine statuses, each a fixed icon, word and tone.

**You provide:** the status key. Icon, tone and translated label come from the table below; do not improvise others.

```html
<span class="tz-badge tz-badge--approved">…check-circle… Approved</span>
```

| Key | Applies to | Tone | Icon | EN | KO | RU | UZ |
|---|---|---|---|---|---|---|---|
| `draft` | Event | dashed outline, `ink-muted` | pencil | Draft | 초안 | Черновик | Qoralama |
| `pending` | Event | `warning-soft` / `warning-text` | clock | Pending | 검토 중 | На проверке | Kutilmoqda |
| `approved` | Event | `success-soft` / `success-text` | check in circle | Approved | 승인됨 | Одобрено | Tasdiqlangan |
| `rejected` | Event | `danger-soft` / `danger-text` | cross in circle | Rejected | 반려됨 | Отклонено | Rad etilgan |
| `cancelled` | Event, ticket | `danger-text` outline, no fill | slashed circle | Cancelled | 취소됨 | Отменено | Bekor qilingan |
| `sold-out` | Event | solid `ink` on `bg` text | ticket | Sold out | 매진 | Распродано | Sotib boʻlingan |
| `valid` | Ticket | `success-soft` / `success-text` | check | Valid | 유효 | Действителен | Yaroqli |
| `used` | Ticket | `neutral-soft` / `neutral-text` | scan | Used | 사용됨 | Использован | Foydalanilgan |
| `refunded` | Ticket | `info-soft` / `info-text` | return arrow | Refunded | 환불됨 | Возвращён | Pul qaytarilgan |

**Rules**
- Always icon plus word. Several statuses share a tone (Approved and Valid, Rejected and Cancelled); the icon and the fill-versus-outline treatment tell them apart, so the set works without color vision.
- Badges never wrap and never truncate; they are as wide as their word. In tables give the status column room for the longest label (UZ "Sotib boʻlingan", about 150px) or let the cell wrap the badge onto its own line.
- Sentence case in every language. No all caps: Hangul has none and Cyrillic caps are wide.
- Russian labels agree with the noun: "Действителен / Использован / Возвращён" are for *билет* (ticket); event statuses use neuter forms for *мероприятие*.
- Event flow: Draft → Pending → Approved or Rejected; Approved → Sold out or Cancelled. Ticket flow: Valid → Used, or Valid → Refunded.
- Do not use badge tones for anything that is not a status. Counts use `.tz-tab__count`.

## SeatMap

A seat and its four states, plus the row, stage and legend pieces a seat map is built from.

**You provide:** per seat, its state and an accessible name ("Row C, seat 7, available"); per row, its label; and the legend in the current language.

```html
<div class="tz-seatmap" role="group" aria-label="Block A">
  <div class="tz-seatmap__stage">Stage</div>
  <div class="tz-seatmap__row">
    <span class="tz-seatmap__label">C</span>
    <button class="tz-seat" aria-label="Row C, seat 1, available"></button>
    <button class="tz-seat tz-seat--selected" aria-pressed="true" aria-label="Row C, seat 2, selected">…check…</button>
    <button class="tz-seat tz-seat--held" disabled aria-label="Row C, seat 3, held"></button>
    <button class="tz-seat tz-seat--sold" disabled aria-label="Row C, seat 4, sold">…x…</button>
    <span class="tz-seatmap__aisle"></span>
  </div>
</div>
<ul class="tz-legend">…one .tz-seat per state, with its word…</ul>
```

| State | Look | Meaning | EN | KO | RU | UZ |
|---|---|---|---|---|---|---|
| available | solid `seat-available` | Can be picked | Available | 선택 가능 | Свободно | Boʻsh |
| `--selected` | `seat-selected` (Volt) + check, `accent-edge` border | In this user's basket | Selected | 선택됨 | Выбрано | Tanlangan |
| `--held` | 2px `seat-held` ring + dot, no fill | In someone else's checkout; may come back | Held | 다른 고객이 결제 중 | Удерживается | Band qilingan |
| `--sold` | `seat-sold` + cross | Gone | Sold | 판매 완료 | Продано | Sotilgan |

**Rules**
- Every state differs by shape as well as color: solid, check, ring with dot, cross. Do not add a state that is only a new color.
- Always show the legend next to the map, and repeat the selection as text below it ("Row C, seats 9–10 · $96").
- Seats are 28px in the overview; when the map is zoomed for picking on touch, use `--lg` (44px). The map scrolls and pinch-zooms inside its container; the page does not scroll sideways.
- Held and sold seats are `disabled`. When a held seat is released, switch it to available and announce it in a polite live region.
- A user's own hold is "selected", with the countdown shown in a warning Toast, not on the seat.
- For general admission and standing areas, skip the map and use a quantity stepper with a PriceTag.

---

# Layouts

## PublicLayout

The shell of every buyer-facing page: a sticky top navbar, a fluid content column, a footer, and a bottom navigation bar on phones.

**You provide:** the page content inside `<main>`, built from `.tz-container` and `.tz-section` blocks.

```html
<div class="tz-app" lang="en">
  <header class="tz-navbar"><div class="tz-container tz-navbar__inner">
    <a class="tz-brand">…</a>
    <ul class="tz-navbar__links">…Concerts, Football, Comedy…</ul>
    <label class="tz-navbar__search tz-input-wrap">…</label>
    <div class="tz-navbar__actions">…LanguageSwitcher, Sell tickets, Sign in…</div>
  </div></header>
  <main>
    <div class="tz-container">…feature EventCard…</div>
    <section class="tz-container tz-section">…chips, heading, .tz-grid of EventCards…</section>
  </main>
  <footer class="tz-footer">…</footer>
  <nav class="tz-bottomnav">…Home, Search, My tickets, Profile…</nav>
</div>
```

| Width of `.tz-app` | Navbar | Content | Bottom nav |
|---|---|---|---|
| below `bp-md` | 56px: brand, language, search icon | gutter `space-4`, 1 or 2 columns, hero 4:5 | shown, 4 items |
| `bp-md` to `bp-lg` | `navbar-height`: adds category links, search field, Sell tickets, Sign in | gutter `space-6`, 2 to 3 columns, hero 21:9 | hidden |
| `bp-lg` and up | same | gutter `space-10`, capped at `container-max`, 3 to 4 columns | hidden |

**Rules**
- `.tz-app` is the responsive root: every breakpoint in the system is a container query on it. Make it the full-viewport wrapper.
- Page order on Home: feature EventCard, category chips, then sections of `.tz-grid`. Sections are `space-8` apart on mobile, `space-12` from `bp-md`, `space-16` from `bp-lg`.
- The navbar holds one Volt element at most, and usually none: Volt is spent on "Get tickets" in the content. Sign in is a secondary button.
- Navbar items marked `tz-navbar__desktop` hide below `bp-md` and `tz-navbar__mobile` the reverse. Anything hidden from the navbar must be reachable from the bottom nav or the Profile screen.
- Bottom-nav labels are one line, 11px, ellipsized as the last resort: keep each translation under 12 characters ("Мои билеты", "Chiptalarim").
- The footer carries the segmented LanguageSwitcher and the legal line; its columns wrap by themselves (auto-fit, 150px minimum).
- Running text (event description, policies) is capped at `container-text`.

## OrganizerLayout

The dashboard shell for people who sell tickets: a sidebar with the organization switcher and "Create event", a top bar, and a content column.

**You provide:** the nav items, the current organization, the page title, and the content.

```html
<div class="tz-app tz-app--dash">
  <div class="tz-shell">
    <aside class="tz-sidebar">
      <div class="tz-sidebar__head">…brand… <span class="tz-rolebadge">Organizer</span></div>
      <button class="tz-switcher">…organization…</button>
      <a class="tz-btn tz-btn--primary tz-btn--block">Create event</a>
      <ul class="tz-nav"><li><a class="tz-navitem" aria-current="page">…icon… <span>Events</span></a></li>…</ul>
      <div class="tz-sidebar__foot">…help…</div>
    </aside>
    <div class="tz-main">
      <header class="tz-topbar">…menu button (mobile), title, LanguageSwitcher, notifications, avatar…</header>
      <div class="tz-content">
        <div class="tz-pagehead">…title, subtitle, actions…</div>
        <div class="tz-stats">…four .tz-stat…</div>
        …Tabs, Table, Pagination…
      </div>
    </div>
  </div>
</div>
```

| Width of `.tz-app` | Sidebar | Content |
|---|---|---|
| below `bp-lg` | Hidden. The top bar's menu button adds `.is-open`: a drawer over `scrim`, 86% wide, 320px at most | padding `space-4` (`space-6` from `bp-md`); stats 2 per row; tables stack |
| `bp-lg` and up | Permanent, `sidebar-width` | padding `space-8`, capped at 1200px |

**Rules**
- Nav order: Overview, Events, Orders, Check-in, Payouts, Reports, Settings. Seven items at most; no nesting.
- "Create event" is the only Volt element in the shell. It lives in the sidebar on desktop; below `bp-lg` repeat it as the primary action in `.tz-pagehead__actions`.
- Nav labels wrap to two lines (the item grows); the organization name truncates with an ellipsis because the full name is in the switcher menu.
- The current item is `surface-raised` with a border and an `accent-text` icon, plus `aria-current="page"`.
- The sidebar scrolls by itself; `.tz-main` scrolls the page; the top bar is sticky. `.tz-app--dash` must fill the viewport height.
- Content is stacked blocks `space-6` apart: page head, stats, tabs, table, pagination. Translatable fields in forms get the segmented EN / KO / RU / UZ Tabs.

## AdminLayout

The dashboard shell for Ticketzy staff: the Organizer shell with a sunken, grouped sidebar, an Admin role badge, queue counters, and full-width content for wide tables.

**You provide:** the nav groups and their counters, the page title, and the content.

```html
<div class="tz-app tz-app--dash">
  <div class="tz-shell tz-shell--admin">
    <aside class="tz-sidebar">
      <div class="tz-sidebar__head">…brand… <span class="tz-rolebadge">…shield… Admin</span></div>
      <ul class="tz-nav">
        <li class="tz-nav__group">Moderation</li>
        <li><a class="tz-navitem" aria-current="page">…icon… <span>Review queue</span><span class="tz-navitem__count">14</span></a></li>
        …
      </ul>
    </aside>
    <div class="tz-main">
      <header class="tz-topbar">…</header>
      <div class="tz-content">…page head, stats, .tz-toolbar (search + segmented Tabs), Table, Pagination…</div>
    </div>
  </div>
</div>
```

| | Organizer | Admin |
|---|---|---|
| Sidebar ground | `surface` | `surface-sunken` (`tz-shell--admin`) |
| Role badge | "Organizer" | shield + "Admin", repeated in the top bar below `bp-lg` |
| Top of sidebar | organization switcher + Volt "Create event" | nothing: admins act on other people's events |
| Navigation | flat, 7 items | 3 labelled groups (Moderation, Money, Platform), up to 10 items, counters on queues |
| Content width | capped at 1200px | full width |
| Volt | "Create event" | "Approve" in a review row; nowhere in the shell |

**Rules**
- An admin must always be able to tell this is not the organizer view: keep the role badge visible at every width.
- `.tz-navitem__count` (warning tone) is for work waiting on staff: review queue, refunds, organizer verification. Do not use it for totals.
- Review rows put the decision in the last column: Reject (secondary) then Approve (primary, small). Reject opens a Modal that requires a reason, written in the organizer's language.
- Admin tables are dense and wide; keep `tz-table--stack` so they still work on a phone, and put filters in `.tz-toolbar` (search field plus segmented Tabs), which wraps.
- Responsive behaviour, drawer, scrolling and spacing are identical to the Organizer layout.

---

# Product pieces in pages.css

These were built for the product screens on top of the components above. They use the `pg-` prefix and live in `pages.css`. Open the matching file in `pages/html/` for the full markup.

| Piece | Main classes | Where to see it |
|---|---|---|
| Responsive show and hide | `pg-from-md`, `pg-below-md`, `pg-from-lg`, `pg-below-lg` | every page |
| Card, stacks, summary lines, price breakdown | `pg-card`, `pg-stack`, `pg-lines`, `pg-line`, `pg-sum` | Checkout, Refund, OrgPayouts |
| Browse filters and results | `pg-browse`, `pg-filters`, `pg-filterchips`, `pg-optlist`, `pg-resultbar` | Browse, BrowseFilters |
| Bottom sheet or dialog slot | `pg-sheetslot`, `pg-sheetscrim` wrapping a `tz-modal` | BrowseFilters, AdmReviewReject, AdmEventsCancel |
| Event page | `pg-event`, `pg-tiers`, `pg-tier`, `pg-qty`, `pg-buybar` (sticky buy bar on phones) | Event |
| Order steps | `pg-steps` | Seats, Checkout, Confirmation |
| Seat picker | `pg-map`, `pg-zoom`, `pg-sec`, `pg-legends`, `pg-3d`, tier fills `pg-t1` to `pg-t3` (`--tier-1` to `--tier-3`) | Seats, Seats3D |
| Auth | `pg-auth`, `pg-roles`, `pg-role` | Login, Register |
| Static pages | `pg-pagehead`, `pg-prose`, `pg-doc`, `pg-toc`, `pg-faq` | About, Faq, Terms |
| Account | `pg-acct`, `pg-notifs`, `pg-notif`, `pg-pref` | Tickets, Settings, Notifications |
| Dashboard shell adjustments | `pg-dash` on `tz-app--dash` (page scrolls, sidebar sticks), `pg-dash-scrim` | every Org and Adm page |
| Create-event stepper | `pg-wsteps`, `pg-wstep`, `pg-wfoot`, `pg-fgrid`, `pg-drop`, `pg-tierrow`, `pg-review` | OrgEventEdit and its steps |
| Seat map editor | `pg-ed`, `pg-ed__canvas`, `pg-ed-sec`, `pg-ed-dots`, `pg-ed-dot`, `pg-capline`, `pg-tierpick` | OrgSeatEditor |
| Charts and meters | `pg-chart`, `pg-bar`, `pg-readout`, `pg-meter`, `pg-tierbars` | OrgAnalytics, AdmDashboard |
| Check-in | `pg-scan`, `pg-result` | OrgCheckin |
| AI moderation flags | `pg-flag`, `pg-flagtext`, `pg-mark` | AdmReview |
| Messaging | `pg-msgs`, `pg-convs`, `pg-conv`, `pg-msgs__log`, `pg-msg`, `pg-typing` | OrgMessages, AdmMessages |
| Notification bell | `pg-bell`, `pg-bell__pop`, `pg-iconbadge`, `pg-dot-count` | components/BellBuyer |
| Language menu | `pg-lang`, `pg-lang__menu` on top of `tz-lang` and `tz-menu` | components/LangOpen |
| AI assistant | `pg-fabslot`, `pg-chat`, `pg-fab`, `pg-chatpanel`, `pg-msg`, `pg-chatcards`, `pg-chatcard`, `pg-thinking` | components/ChatResults |
| Error pages | `pg-error`, `pg-error__code` | Error, Error403, Error500 |
