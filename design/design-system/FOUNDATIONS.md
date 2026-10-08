# Ticketzy design system: foundations

Ticketzy sells tickets for concerts, football matches and comedy shows. The interface is a dark, quiet frame around large event photography, with one loud color, Volt, spent only where the user commits. It is designed for a phone first and scales up to desktop, in English, Korean, Russian and Uzbek.

## Principles

1. **The event is the picture.** Imagery is large and uncropped by UI. Chrome stays neutral so the photo carries the color.
2. **One accent, spent once.** `accent` (Volt) marks the single main action or the current selection in a view. If two things are Volt, one of them is wrong.
3. **Text decides its own size.** No container has a fixed width or height. Every label can be 40% longer or one line taller than the English.
4. **Never color alone.** Statuses, seat states and categories always carry a word or an icon and a shape difference.

## Color

Dark is the primary theme; light is a full second theme. Set `data-theme="dark"` or `data-theme="light"` on `<html>`. Use tokens only; never a hex value.

- **Grounds.** Page on `bg`. Cards, tables and inputs on `surface`. Modals, menus and toasts on `surface-raised` with a shadow token. Wells (table header, segmented track, Admin sidebar) on `surface-sunken`.
- **Text.** `ink` for primary, `ink-muted` for secondary, `ink-subtle` for placeholders and captions. Nothing lighter than `ink-subtle`.
- **Lines.** `border` for dividers and card outlines. `border-control` for anything the user can operate (inputs, secondary buttons); it holds 3:1.
- **Volt.** Fill with `accent`, write on it with `on-accent` (near black, never white), outline it with `accent-edge`. For Volt-colored text or icons use `accent-text`, which darkens in the light theme. Tinted selection grounds use `accent-soft`.
- **Tones.** Success, warning, danger, info and neutral each have a `-soft` ground and a `-text` ink. They are for status only. `danger` / `on-danger` is the destructive button fill.
- **Imagery.** Text on a photo is `on-image` over a bottom-up `image-scrim` gradient. Both are the same in light and dark.
- **QR.** `qr-ink` on `qr-ground`, always, in both themes.
- **Focus.** 2px `focus` outline with 2px offset on every interactive element.

Spend of Volt per view: one primary button, or one selected chip / tab indicator / page / date / seat set. A dashboard page with a Volt "Create event" in the sidebar has no second Volt button in the content.

## Typography

One family for interface and display: Onest, with Noto Sans KR behind it for Hangul (`--font-sans`). JetBrains Mono (`--font-mono`) for ticket codes. All three are loaded from Google Fonts and cover Latin, Cyrillic and Hangul between them.

- Hero: `display-xl` from `bp-lg`, `display-lg` below. Event page title: `display-lg` from `bp-lg`, `h1` below.
- Page titles `h1`, sections `h2`, groups `h3`, card titles `title`.
- Running text `body`; card meta and table cells `body-sm`; legends `caption` (12px is the floor).
- Buttons and tabs `label-lg`; field labels, chips and nav `label`; badges `badge`; amounts `price`; codes `code`.
- Form controls are always 16px so iOS does not zoom.
- Sentence case everywhere. No all caps and no letter-spaced labels: Hangul has no case, and Cyrillic capitals run wide.
- Weight carries hierarchy: 800 for display and prices, 700 for headings, 600 for labels, 400 for text. No italics (Hangul and many Cyrillic italics are synthesized).

## Four languages

Supported: English (`en`), Korean (`ko`), Russian (`ru`), Uzbek in Latin script (`uz`). Set `lang` on `<html>` and on any element whose content is in another language (an event title, a language option): the stylesheet keys line breaking off it.

| | English | Korean | Russian | Uzbek |
|---|---|---|---|---|
| Length vs English | 1× | 0.6 to 0.9×, but glyphs are wider and taller | 1.2 to 1.4× | 1.1 to 1.35× |
| Breaking | words; hyphenates | `word-break: keep-all` (never mid-word) | long words; `hyphens: auto` | long agglutinated words; no browser hyphenation |
| "Buy tickets" | Buy tickets | 티켓 구매 | Купить билеты | Chipta sotib olish |
| "Sold out" | Sold out | 매진 | Распродано | Sotib boʻlingan |
| Money | $48 | ₩65,000 | 590 000 сум | 590 000 soʻm |
| Date | Sat, 14 Nov | 11월 14일 (토) | Сб, 14 ноября | Shanba, 14-noyabr |
| Week starts | Sunday | Sunday | Monday | Monday |

Rules for every text container:

- **No fixed widths, no fixed heights.** Use `min-height` (`control-md`) and padding. Buttons, nav items, toasts, table cells and modal titles wrap and grow.
- **Budget for 40% more.** Design with the Russian string, not the English one. If a layout only works in English, it does not work.
- **Clamp only titles, and only by lines.** Event titles clamp to 2 lines (`.tz-clamp-2`), meta lines to 1. Never clamp a button, badge, tab, price, error message or legal text.
- **Scroll rows of short items instead of shrinking them.** Tabs and chip rows scroll horizontally; their items never wrap or truncate.
- **Labels above fields, label above amount.** Stacking survives any length; side-by-side does not.
- **Never build sentences from pieces.** "Showing {from}–{to} of {total} events" is one translated string with placeholders. Word order and plural rules differ in all four languages (Russian has three plural forms; Korean and Uzbek have none).
- **Format with `Intl`.** Dates, times, numbers and currency come from `Intl.DateTimeFormat` and `Intl.NumberFormat` with the active locale. Reserve room for 14 characters in any amount.
- **No text in images.** It cannot be translated.
- Uzbek uses `ʻ` (U+02BB) in oʻ and gʻ. Do not substitute an apostrophe or a backtick.

## Layout and spacing

Mobile first. Styles are written for a 360px phone and grow at four breakpoints: `bp-sm` 480, `bp-md` 768, `bp-lg` 1024, `bp-xl` 1280. Breakpoints are container queries on `.tz-app`, the root wrapper of every layout.

- Spacing is a 4px scale, `space-1` to `space-20`. Page gutter: `space-4` on phones, `space-6` from `bp-md`, `space-10` from `bp-lg`. Between sections: `space-8`, then `space-12`, then `space-16`.
- Be generous: card padding is `space-4` (`space-5` from `bp-md`), grids gap `space-4` (`space-6` from `bp-md`), form fields sit `space-6` apart.
- Event grids use `.tz-grid`: auto-fill columns with a 260px minimum, giving 1, 2, 3 and 4 columns as the page widens.
- Touch targets are at least `control-md` (44px). `control-sm` is for pointer-only dashboard toolbars.
- Three layouts: **Public** (top navbar, footer, bottom nav on phones), **Organizer** (sidebar dashboard) and **Admin** (sidebar dashboard, sunken and grouped). See the Layouts components.

## Shape, elevation, motion

- Radii: controls `radius-md`, cards and tables `radius-lg`, modals and hero imagery `radius-xl`, chips and badges `radius-full`, seats and day cells `radius-xs`.
- Flat by default. Separation comes from surface steps and `border`. Shadows are for things that float: `shadow-md` for menus and toasts, `shadow-lg` for modals. Cards get `shadow-sm` only on hover.
- No gradients in the interface, except the `image-scrim` fade under text on photos and the skeleton shimmer.
- Motion is short and functional: 120ms for color and press, 200ms for hover lift, sheets and menus, with `ease`. Cards lift 2px on hover; buttons scale to 0.98 on press. Everything stops under `prefers-reduced-motion`.

## Imagery

- Real event photography: the stage, the pitch, the performer. Wide shots with the subject near the center, since one image is cropped to 4:3 (cards), 16:9 and 21:9 (hero) and 4:5 (hero on phones).
- Upload at 1600×1200 or larger. Dark, saturated photos sit best on the dark theme; do not add a color overlay or duotone.
- Sold-out events show the image in grayscale.
- The component previews use CSS placeholders (`tz-demo-img--concert`, `--football`, `--comedy`). They are stand-ins, not brand artwork. No photography ships with this system yet.

## Iconography

- Line icons on a 24px grid, 1.75px stroke, round caps and joins, drawn in `currentColor`. Rendered at 20px (`.tz-icon`) or 16px (`.tz-icon--sm`).
- The icons in the previews are simple placeholders drawn for this system. For production, adopt one open line set with the same construction (Lucide matches these metrics) and keep to it.
- Fixed meanings: music note is concert, ball is football, microphone is comedy; globe is language. Status icons are listed in StatusBadge.
- Icons accompany words. Icon-only buttons need `aria-label`. No emoji, no flags for languages.
- There is no logo yet. The brand is set as the word "Ticketzy" in Onest 800 with a Volt dot (`.tz-brand`).

## Voice

- Short, direct, second person. Say what happens next: "Tickets you buy show up here, ready to scan at the door."
- Buttons are verb phrases that name the outcome: "Buy tickets", "Cancel event and refund". Never "OK", "Yes" or "Submit".
- Errors say what to do, not what went wrong internally: "Enter an email address like name@example.com."
- Numbers over adjectives: "2 minutes left to complete your order", not "Hurry!". No exclamation marks, no urgency tricks.
- Russian and Korean use the polite form (вы, 합니다/해요 style); Uzbek uses siz.

## Using the components

All components are plain HTML with classes from `components.css` (prefix `tz-`), styled entirely by the tokens. There is no JavaScript bundle: behaviour (open, close, select, focus trapping) is yours to wire, following each component's guidelines. Classes starting `tz-demo-` exist only for the previews; do not ship them.

- **Core:** Button, Input, Select, DatePicker, Modal, Toast, Tabs, Table, Pagination, EmptyState, Skeleton.
- **Ticketzy:** EventCard, TicketCard, PriceTag, CategoryChip, LanguageSwitcher, StatusBadge, SeatMap.
- **Layouts:** PublicLayout, OrganizerLayout, AdminLayout.
