# App shell and layout — the column, the primary nav, phone vs desktop (the website)

The frame every screen sits in: the app column (the root `<div>` returned by `App` in `ClimbMatch.jsx`),
the primary nav (`NAV`), and the boot placeholder in `index.html` that paints the same frame while the
bundle loads. At 1024px and wider the frame is **the website**: laid out the way a real website is, with
room for side-panel ads later. The phone app keeps its own look.

## 1. What it does today
- **Phone (under 1024px wide):** one 520px column, centred, with the bottom tab bar (Home · Climbs ·
  Partners · Crews · Logbook · Ranks). The bar is soft: see-through with a blur, a faint shadow instead
  of a hard top line, and the selected tab marked only by its pill. Inside an open chat thread the bar
  steps aside for the composer.
- **Desktop (1024px and wider) — the website shell:**
  - A full-width sticky **top bar** (64px): ☰ Menu at the far left, the ClimbMatch wordmark (→ Home), a
    search box for every climb and place (`/` jumps to it; arrow keys and Enter pick a hit), then
    Saved · Alerts · Calendar · Messages and your avatar (→ Profile).
  - A fixed **left sidebar** under it: Home · Climbs · Partners · Crews · Groups · Logbook · Ranks
    (Profile is the avatar at the top right, not a sidebar row), then *Your crews* (up to five, a red dot for unread). No site links: those are the footer's.
  - The **page column**, and at **1280px and wider** a 300px **right rail** (`WideRail`): *Coming up*
    (agreed crew days) and *Alerts*, which starts **collapsed**: just the header (*Alerts · N new*, a blue dot when
    any are unread) until you click it, like Home's Alerts row on a phone. *Best day to climb* is not here; it opens from the Menu. Ads, when they come, take slots in this rail
    (desktop only).
  - Between 1024 and 1279px the sidebar shows **icons only** and there is no rail. The whole shell is
    capped at 1228px and centred (a 640px page column), so a big monitor gets plain background either side.
  - A site **footer** under every page: every state with climbs, ClimbMatch links, Legal links,
    ©. It is the ONLY home of About, Help, Feedback, Privacy and Terms on desktop.
  - **☰ Menu** fills the whole window, as on a phone, with its content centred in a 720px column.
  - **Full-screen views are pages.** Every view that covers the phone screen (Calendar, Messages, Edit
    profile, a group, an event, Settings' sub-pages, Best day, Manage areas, Terms…) is drawn in the
    page column under the top bar, so the top bar, sidebar and rail stay usable; the sidebar, the
    wordmark, the search, ★, the avatar, Calendar and Messages leave an open page first
    (`_closePages`); the Menu opens above an open page. Settings itself stays a small window, and hides while one of its pages is open.
  - **Route pages** (see route-page.md): breadcrumb, facts beside a photo, and at 1280px+ the route
    map takes the rail's place (`#cm-route-rail`) instead of the widgets.
  - **Messages are two panes**: the chat icon drops the inbox down under it (*Open Messages* opens the
    page); on the page the inbox is a 280px left pane (`Inbox pane="side"`) and the conversation you
    pick opens to its right, the inbox staying open; *Choose a conversation* fills the right until then.
  - **The Climbs tab shows its regions as a grid** of cards with their climb counts (the countries
    as buttons when there are two or more) instead of two dropdowns; **Groups** lists its group
    cards and your group rows two per row. Partner and crew cards are long, so they stay one per row.
  - **The Calendar has a month view** above its lists (`MonthGrid`): your crews' agreed climbing days and
    group events on a month grid with ‹ › and *Today*; each entry opens what the list would. Crew days and
    events only (owner).
  - **No emoji in the Calendar** (owner, 2026-10-23): its rows read *Drive from you* and *Daylight* as
    plain labels, its two notes carry the app's line `info` icon, and the empty state a line `calendar` icon
    (`lib/Calendar.jsx`). The meeting place keeps its `pin` line icon through `Lbl`.
  - **Chats in the rail** (1280px+): under Coming up and Alerts, your direct messages and crew chats, newest
    first, unread counts on each; one opens the conversation. The same threads the inbox shows (`RailChats`,
    App's `_dmCounts` keeps blocked and restricted people out).
  - **Nothing stretches across the page** (owner 2026-10-22): the page column is 640px (it was 720), and an
    action button sizes to its label instead of filling the column — `wideCss`' rule for a `width:100%`
    button (and a lone `flex:1` one) in the page column or a page-view. List rows (space-between,
    left-aligned, flex-start) still run edge to edge; dialogs keep full-width footer buttons; on the route
    page the action buttons sit in one row across the header.
  - The **bell** opens Notifications as a drop-down under it at the shell's right edge; Home stops
    repeating its own Alerts list on desktop (the bell and the rail's Alerts card carry it).
  - **Popups that slide up from the bottom** on a phone open as **centred windows** (rounded, at most
    85% of the window tall).
  - Controls brighten under the mouse; the browser tab names the page (*Coleman-Deming – ClimbMatch*).

- **Loading screen and the sign-in screen.** While the bundle downloads, `index.html` paints a branded splash (`#cm-splash`: the app mark, wordmark and a moving bar; still under reduced motion) over the boot shell; while App restores the session it draws the same splash (`BootSplash`, `lib/BootSplash.jsx`) instead of a blank page. As the app's first screen (the real gate, or `LOGIN_FIRST`), the sign-in screen (`lib/AuthModal.jsx`) fills the screen under a branded header (the mark, the wordmark and what the app is for) instead of drawing a modal over a black page; opened from inside the app it is still the modal.

## 2. How it works
`useWideScreen()` / `useFullWidth()` (in `lib/wideLayout.js`) are `matchMedia` hooks on `WIDE_MIN` (1024)
and `FULL_MIN` (1280). `wideGeom(full)` computes every horizontal position of the shell as CSS lengths;
`wideColumn`, `wideSidebar`, `wideRail`, `wideTopBar` and `wideTopRow` turn it into styles. When `wide`
is false none is applied, so phone styles are unchanged. Inline styles cannot take media queries, and
CLAUDE.md rules out a styling library, so the breakpoints are decided in JS. The two things inline styles
cannot do — hover, and re-shaping every existing bottom sheet and full-screen view — are `wideCss(g)`, a stylesheet App mounts
only while `wide`; the sheet rule matches the sheets' own serialised inline style
(`align-items: flex-end`). `navBadge(id,right)` is the one reader of the tab counts, shared by both navs.
`index.html` repeats the numbers in `@media (min-width: 1024px)` / `(min-width: 1280px)` blocks so the
boot shell already has the website's shape.

**Views as pages.** The phone views share one inline shape — `position:fixed; inset:0; maxWidth:520`
(`check:overlay-width-cap` keeps them to it) — so `wideCss` places that shape in the column. The six
views `App` used to RETURN early (`legal`, `editDraft`, `dashOpen`, `guideAppOpen`, `calOpen`,
`inboxOpen`) are built as elements (`_vLegal` … `_vInbox`); a phone still returns them alone, while a
desktop draws `_pageView` in the column in place of `#appscroll` (Terms still replaces everything when
signed out). `coveringLayer` counts a cover that starts under the top bar.

The search, the rail, the footer and `DocTitle` live in `lib/DesktopShell.jsx`. The search uses the
same `useRouteSearch` / `usePlaceSearch` the pickers use, and says so when a search fails rather than
showing "no matches".

**The scroll-lock trap.** `lib/dialogA11y.js` locks the page behind any fixed, opaque, full-height
element, which is how it spots a popup. The sidebar is all three, so it froze every desktop page until
#2560 taught the lock to skip `role="navigation"`. The top bar (not full height) and the rail (starts
below the top bar) do not trip it. Any new fixed desktop panel must not either.

## 3. Files
| File | Key symbols |
|---|---|
| `lib/wideLayout.js` | `useWideScreen`, `useFullWidth`, `wideGeom`, `wideColumn`, `wideSidebar`, `wideRail`, `wideTopBar`, `wideTopRow`, `wideCss`, `WIDE_MIN`, `FULL_MIN` |
| `lib/MonthGrid.jsx` | `MonthGrid` |
| `lib/DesktopShell.jsx` | `WideSearch`, `WideRail`, `WideFooter`, `DocTitle` |
| `lib/dialogA11y.js` | `coveringLayer` |
| `ClimbMatch.jsx` | `NAV`, `goTab`, `navBadge`, `_inChat`, `_known`, `_openMe`, `_closePages`, `_pageView` |
| `index.html` | `#cm-boot`, `.b-nav`, `#cm-splash` |
| `lib/BootSplash.jsx` | `BootSplash` |

## 4. Data
Layout only. The footer reads the states list (`useStates`); the search reads the catalog.

## 5. Connections
- **Menu** (`menuOpen`): the same Menu on both widths, full-screen on both.
- **Overlays**: `check:overlay-width-cap` still holds every full-screen view to 520px, except the desktop Menu (exempt `menu-wide`).

## 6. Guards
`check:boot` (boot NAV labels match `NAV`), `check:overlay-width-cap`, `check:bottom-panels`,
`check:zindex`. The browser walks drive a phone-width window, so they cover the phone layout only.

## 7. Last significant change
- **Narrower desktop** (owner, 2026-10-22): 640px column, action buttons sized to their label, Messages pane 280px.
- **Desktop phase 4e**: chats in the right rail (`RailChats` in `lib/DesktopShell.jsx`).
- **Desktop phase 4b**: the Calendar's month view (`MonthGrid`).
- **Desktop phase 2c**: Climbs region grid, two-per-row Groups lists, two-pane Messages with a chat drop-down; the footer's Shortcuts column and the sidebar's Profile row removed (owner).
- **Desktop phase 2a**: every full-screen view is a page in the column, the desktop nav leaves it, the
  bell is a drop-down, and Home's Alerts list is phone-only.
- **The website shell** (desktop phase 1 of 4, owner-decided 2026-10-21): top bar with search, sidebar
  with Groups/Profile/crews, right rail, footer, Menu drawer, centred popups, hover and page titles; the
  phone tab bar made soft.
- **2026-10-21, owner:** the desktop Menu fills the screen (was a 440px drawer); the sidebar's site links
  left for the footer; *Best day to climb* left the right rail.

## 8. Known gaps
- **Phase 2**: shipped (pages, bell and chat drop-downs, route page, Climbs grid, two-per-row lists,
  two-pane Messages).
- **Phase 3**: public route and area pages with real web addresses. **Phase 4**: printable route
  page, compare routes, full-month calendar, draw an approach → GPX, chat list in the rail, logbook
  CSV, embeddable route card.
- No browser walk runs at desktop width.
