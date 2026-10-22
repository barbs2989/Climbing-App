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
  - A fixed **left sidebar** under it: Home · Climbs · Partners · Crews · Groups · Logbook · Ranks ·
    Profile, then *Your crews* (up to five, a red dot for unread). No site links: those are the footer's.
  - The **page column**, and at **1280px and wider** a 300px **right rail** (`WideRail`): *Coming up*
    (agreed crew days) and *Alerts*. *Best day to climb* is not here; it opens from the Menu. Ads, when they come, take slots in this rail
    (desktop only).
  - Between 1024 and 1279px the sidebar shows **icons only** and there is no rail. The whole shell is
    capped at 1308px and centred, so a big monitor gets plain background either side.
  - A site **footer** under every page: every state with climbs, ClimbMatch links, Legal links,
    shortcuts, ©. It is the ONLY home of About, Help, Feedback, Privacy and Terms on desktop.
  - **☰ Menu** fills the whole window, as on a phone, with its content centred in a 720px column.
  - **Full-screen views are pages.** Every view that covers the phone screen (Calendar, Messages, Edit
    profile, a group, an event, Settings' sub-pages, Best day, Manage areas, Terms…) is drawn in the
    page column under the top bar, so the top bar, sidebar and rail stay usable; the sidebar, the
    wordmark, the search, ★, the avatar, Calendar and Messages leave an open page first
    (`_closePages`); the Menu opens above an open page. Settings itself stays a small window, and hides while one of its pages is open.
  - **Route pages** (see route-page.md): breadcrumb, facts beside a photo, and at 1280px+ the route
    map takes the rail's place (`#cm-route-rail`) instead of the widgets.
  - The **bell** opens Notifications as a drop-down under it at the shell's right edge; Home stops
    repeating its own Alerts list on desktop (the bell and the rail's Alerts card carry it).
  - **Popups that slide up from the bottom** on a phone open as **centred windows** (rounded, at most
    85% of the window tall).
  - Controls brighten under the mouse; the browser tab names the page (*Coleman-Deming – ClimbMatch*).

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
| `lib/DesktopShell.jsx` | `WideSearch`, `WideRail`, `WideFooter`, `DocTitle` |
| `lib/dialogA11y.js` | `coveringLayer` |
| `ClimbMatch.jsx` | `NAV`, `goTab`, `navBadge`, `_inChat`, `_known`, `_openMe`, `_closePages`, `_pageView` |
| `index.html` | `#cm-boot`, `.b-nav` |

## 4. Data
Layout only. The footer reads the states list (`useStates`); the search reads the catalog.

## 5. Connections
- **Menu** (`menuOpen`): the same Menu on both widths, full-screen on both.
- **Overlays**: `check:overlay-width-cap` still holds every full-screen view to 520px, except the desktop Menu (exempt `menu-wide`).

## 6. Guards
`check:boot` (boot NAV labels match `NAV`), `check:overlay-width-cap`, `check:bottom-panels`,
`check:zindex`. The browser walks drive a phone-width window, so they cover the phone layout only.

## 7. Last significant change
- **Desktop phase 2a**: every full-screen view is a page in the column, the desktop nav leaves it, the
  bell is a drop-down, and Home's Alerts list is phone-only.
- **The website shell** (desktop phase 1 of 4, owner-decided 2026-10-21): top bar with search, sidebar
  with Groups/Profile/crews, right rail, footer, Menu drawer, centred popups, hover and page titles; the
  phone tab bar made soft.
- **2026-10-21, owner:** the desktop Menu fills the screen (was a 440px drawer); the sidebar's site links
  left for the footer; *Best day to climb* left the right rail.

## 8. Known gaps
- **Phase 2** (decided; views-as-pages, the bell drop-down and the route page shipped): Messages as a
  drop-down; the Climbs tab
  as a grid of regions; short cards 2–3 per row; Messages as a two-pane inbox.
- **Phase 3**: public route and area pages with real web addresses. **Phase 4**: printable route
  page, compare routes, full-month calendar, draw an approach → GPX, chat list in the rail, logbook
  CSV, embeddable route card.
- No browser walk runs at desktop width.
