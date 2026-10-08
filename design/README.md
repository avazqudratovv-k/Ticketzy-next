# Ticketzy export

Everything on the Ticketzy canvas, exported on 7 Oct 2026.

```
tokens/
  tokens.css        Design tokens as CSS variables. Dark by default, light under [data-theme="light"]
  tokens.json       The same tokens as JSON: colors (dark and light), type styles, spacing, radii, shadows, sizes, breakpoints, z-index
design-system/
  components.css    Component stylesheet (tz- classes)
  pages.css         Page-level styles built for the product screens (pg- classes), including the seat-tier colors
  COMPONENTS.md     Short spec of each component and layout
  FOUNDATIONS.md    Principles, color, typography, languages, layout, imagery, voice
  tokens.css, tokens.json   Copies of the two files in tokens/
pages/
  html/             74 pages and page states, one standalone HTML file each
  png/desktop/      69 screenshots at 1440 px wide
  png/mobile/       74 screenshots at 390 px wide
components/
  html/, png/       9 shared pieces on their own: assistant panel, notification dropdown, language switcher
```

## The HTML files

- Each file is standalone: all CSS (tokens, components, page styles) is inlined, so a file works when moved or opened on its own. The one outside request is the Google Fonts stylesheet for Onest, Noto Sans KR and JetBrains Mono; without a connection the page falls back to system fonts.
- Each page is responsive. The same file produces the desktop and the mobile screenshot.
- They are static: markup and CSS, no JavaScript. Tabs, steppers, dropdowns, the seat picker and the chat do not respond. States that matter were exported as their own files.
- Links between pages work as long as the files stay together in `pages/html/`.
- Event images are CSS placeholder gradients, QR codes are placeholder patterns, and names, prices and figures are sample content. Text in [SQUARE BRACKETS] is a placeholder.

## The PNG files

- Rendered in Chromium with the real typefaces, dark theme, at 1x.
- Full-page captures, except overlay states (assistant open, dialogs, sheets, drawers), captured as a single screen.
- Five phone-only states (filter sheet, two sidebar drawers, two message-thread views) have no desktop PNG.

## Pages

| File | What it is | Desktop PNG | Mobile PNG |
|---|---|---|---|
| `pages/html/Home.html` | Ticketzy home | full page | full page |
| `pages/html/HomeAssistantOpen.html` | Ticketzy home (state: chatOpen=True) | 1440 × 900 view | 390 × 844 view |
| `pages/html/Browse.html` | Browse and search events | full page | full page |
| `pages/html/BrowseEmpty.html` | Browse and search events (state: empty=True) | full page | full page |
| `pages/html/BrowseFilters.html` | Browse and search events (state: filtersOpen=True) | phone-only state | 390 × 844 view |
| `pages/html/Event.html` | Event detail | full page | full page |
| `pages/html/Login.html` | Sign in | full page | full page |
| `pages/html/Register.html` | Create an account | full page | full page |
| `pages/html/Forgot.html` | Forgot password | full page | full page |
| `pages/html/LoginError.html` | Sign in (state: accountError=True) | full page | full page |
| `pages/html/RegisterOrganizer.html` | Create an account (state: role=organizer) | full page | full page |
| `pages/html/About.html` | About Ticketzy | full page | full page |
| `pages/html/Contact.html` | Contact and support | full page | full page |
| `pages/html/Faq.html` | Frequently asked questions | full page | full page |
| `pages/html/Terms.html` | Terms of service | full page | full page |
| `pages/html/Privacy.html` | Privacy policy | full page | full page |
| `pages/html/Seats.html` | Choose your seats | full page | full page |
| `pages/html/Seats3D.html` | Choose your seats (state: d=True) | full page | full page |
| `pages/html/SeatsGA.html` | Choose your tickets, general admission | full page | full page |
| `pages/html/Checkout.html` | Checkout | full page | full page |
| `pages/html/Confirmation.html` | Order confirmation | full page | full page |
| `pages/html/Tickets.html` | My tickets | full page | full page |
| `pages/html/TicketsPast.html` | My tickets (state: tab=past) | full page | full page |
| `pages/html/TicketDetail.html` | Ticket detail | full page | full page |
| `pages/html/Orders.html` | Order history | full page | full page |
| `pages/html/Refund.html` | Request a refund | full page | full page |
| `pages/html/Settings.html` | Profile and settings | full page | full page |
| `pages/html/Notifications.html` | Notifications | full page | full page |
| `pages/html/OrgPending.html` | Organizer account pending approval | full page | full page |
| `pages/html/OrgRejected.html` | Organizer account not verified | full page | full page |
| `pages/html/OrgDashboard.html` | Organizer dashboard | full page | full page |
| `pages/html/OrgMenu.html` | Organizer dashboard (state: menuOpen=True) | phone-only state | 390 × 844 view |
| `pages/html/OrgEvents.html` | My events | full page | full page |
| `pages/html/OrgEventEdit.html` | Create event | full page | full page |
| `pages/html/OrgEventEdit2.html` | Create event (state: step=2) | full page | full page |
| `pages/html/OrgEventEdit3.html` | Create event (state: step=3) | full page | full page |
| `pages/html/OrgEventEdit4.html` | Create event (state: step=4) | full page | full page |
| `pages/html/OrgEventEdit5.html` | Create event (state: step=5, translated=True) | full page | full page |
| `pages/html/OrgEventEdit6.html` | Create event (state: step=6, translated=True) | full page | full page |
| `pages/html/OrgSeatEditor.html` | Seat map editor | full page | full page |
| `pages/html/OrgSeatEditorPreview.html` | Seat map editor (state: preview=True) | full page | full page |
| `pages/html/OrgSeatEditorGA.html` | Seat map editor (state: mode=ga) | full page | full page |
| `pages/html/OrgAnalytics.html` | Event analytics | full page | full page |
| `pages/html/OrgAttendees.html` | Attendees | full page | full page |
| `pages/html/OrgCheckin.html` | QR check-in | full page | full page |
| `pages/html/OrgCheckinUsed.html` | QR check-in (state: result=used) | full page | full page |
| `pages/html/OrgPayouts.html` | Payouts and earnings | full page | full page |
| `pages/html/OrgProfile.html` | Organizer profile | full page | full page |
| `pages/html/AdmDashboard.html` | Admin overview | full page | full page |
| `pages/html/AdmMenu.html` | Admin overview (state: menuOpen=True) | phone-only state | 390 × 844 view |
| `pages/html/AdmQueue.html` | Review queue | full page | full page |
| `pages/html/AdmQueueOrganizers.html` | Review queue (state: tab=orgs) | full page | full page |
| `pages/html/AdmReview.html` | Review submission | full page | full page |
| `pages/html/AdmReviewReject.html` | Review submission (state: rejectOpen=True) | 1440 × 900 view | 390 × 844 view |
| `pages/html/AdmReviewOrganizer.html` | Review submission (state: kind=organizer) | full page | full page |
| `pages/html/AdmOrganizers.html` | Organizer management | full page | full page |
| `pages/html/AdmUsers.html` | Users management | full page | full page |
| `pages/html/AdmEvents.html` | All events | full page | full page |
| `pages/html/AdmOrders.html` | Orders and transactions | full page | full page |
| `pages/html/AdmRefunds.html` | Refunds | full page | full page |
| `pages/html/AdmCatalog.html` | Categories and venues | full page | full page |
| `pages/html/AdmSettings.html` | Platform settings | full page | full page |
| `pages/html/AdmAudit.html` | Audit log | full page | full page |
| `pages/html/AdmEventsCancel.html` | All events (state: cancelOpen=True) | 1440 × 900 view | 390 × 844 view |
| `pages/html/OrgMessages.html` | Messages with Ticketzy admins | full page | full page |
| `pages/html/OrgMessagesThread.html` | Messages with Ticketzy admins (state: view=thread) | phone-only state | full page |
| `pages/html/AdmMessages.html` | Messages with organizers | full page | full page |
| `pages/html/AdmMessagesThread.html` | Messages with organizers (state: view=thread) | phone-only state | full page |
| `pages/html/OrgNotifications.html` | Organizer notifications | full page | full page |
| `pages/html/AdmNotifications.html` | Admin notifications | full page | full page |
| `pages/html/Error404.html` | Error page | full page | full page |
| `pages/html/Error403.html` | Error page (state: code=403) | full page | full page |
| `pages/html/Error500.html` | Error page (state: code=500) | full page | full page |
| `pages/html/States.html` | Loading and empty states | full page | full page |

## Shared pieces

| File | What it is |
|---|---|
| `components/html/BellBuyer.html` | Notification dropdown, buyer, 560 × 560 |
| `components/html/BellOrganizer.html` | Notification dropdown, organizer, 560 × 560 |
| `components/html/BellAdmin.html` | Notification dropdown, admin, 560 × 560 |
| `components/html/LangOpen.html` | Language switcher open, 320 × 320 |
| `components/html/LangSheetMobile.html` | Language sheet, mobile, 390 × 844 |
| `components/html/LangFooter.html` | Language switcher, segmented, 520 × 140 |
| `components/html/ChatStart.html` | Assistant, first open, 440 × 760 |
| `components/html/ChatThinking.html` | Assistant thinking, 440 × 760 |
| `components/html/ChatResults.html` | Assistant with event cards, 440 × 760 |
