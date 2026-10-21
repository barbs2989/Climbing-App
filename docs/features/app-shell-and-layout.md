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
    Profile, then *Your crews* (up to five, a red dot for unread) and small site links at the bottom.
  - The **page column**, and at **1280px and wider** a 300px **right rail** (`WideRail`): *Coming up*
    (agreed crew days), *Alerts* and *Best day to climb*. Ads, when they come, take slots in this rail
    (desktop only).
  - Between 1024 and 1279px the sidebar shows **icons only** and there is no rail. The whole shell is
    capped at 1308px and centred, so a big monitor gets plain background either side.
  - A site **footer** under every page: every state with climbs, ClimbMatch links, Legal links,
    shortcuts.
  - **☰ Menu** opens as a drawer from the left edge over the dimmed site, holding all the phone Menu holds.
  - **Popups that slide up from the bottom** on a phone open as **centred windows** (rounded, at most
    85% of the window tall).
  - Controls brighten under the mouse; the browser tab names the page (*Coleman-Deming – ClimbMatch*).
- Full-screen views (Settings, Calendar, a group…) still cover the window on desktop.

## 2. How it works
`useWideScreen()` / `useFullWidth()` (in `lib/wideLayout.js`) are `matchMedia` hooks on `WIDE_MIN` (1024)
and `FULL_MIN` (1280). `wideGeom(full)` computes every horizontal position of the shell as CSS lengths;
`wideColumn`, `wideSidebar`, `wideRail`, `wideTopBar` and `wideTopRow` turn it into styles. When `wide`
is false none is applied, so phone styles are unchanged. Inline styles cannot take media queries, and
CLAUDE.md rules out a styling library, so the breakpoints are decided in JS. The two things inline styles
cannot do — hover, and re-shaping every existing bottom sheet — are `WIDE_CSS`, a stylesheet App mounts
only while `wide`; the sheet rule matches the sheets' own serialised inline style
(`align-items: flex-end`). `navBadge(id,right)` is the one reader of the tab counts, shared by both navs.
`index.html` repeats the numbers in `@media (min-width: 1024px)` / `(min-width: 1280px)` blocks so the
boot shell already has the website's shape.

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
| `lib/wideLayout.js` | `useWideScreen`, `useFullWidth`, `wideGeom`, `wideColumn`, `wideSidebar`, `wideRail`, `wideTopBar`, `wideTopRow`, `WIDE_CSS`, `WIDE_MIN`, `FULL_MIN` |
| `lib/DesktopShell.jsx` | `WideSearch`, `WideRail`, `WideFooter`, `DocTitle` |
| `lib/dialogA11y.js` | `coveringLayer` |
| `ClimbMatch.jsx` | `NAV`, `goTab`, `navBadge`, `_inChat`, `_known`, `_openMe` |
| `index.html` | `#cm-boot`, `.b-nav` |

## 4. Data
Layout only. The footer reads the states list (`useStates`); the search reads the catalog.

## 5. Connections
- **Menu** (`menuOpen`): the same Menu on both widths; a left drawer on desktop.
- **Overlays**: `check:overlay-width-cap` still holds every full-screen view to 520px.

## 6. Guards
`check:boot` (boot NAV labels match `NAV`), `check:overlay-width-cap`, `check:bottom-panels`,
`check:zindex`. The browser walks drive a phone-width window, so they cover the phone layout only.

## 7. Last significant change
- **The website shell** (desktop phase 1 of 4, owner-decided 2026-10-21): top bar with search, sidebar
  with Groups/Profile/crews, right rail, footer, Menu drawer, centred popups, hover and page titles; the
  phone tab bar made soft.

## 8. Known gaps
- **Phase 2** (decided): full-screen views as pages in the column with ← Back; Alerts and Messages as
  drop-down panels; route page with facts + photo side by side and the map in the rail; the Climbs tab
  as a grid of regions; short cards 2–3 per row; Messages as a two-pane inbox.
- **Phase 3**: public route and area pages with real web addresses. **Phase 4**: printable route
  page, compare routes, full-month calendar, draw an approach → GPX, chat list in the rail, logbook
  CSV, embeddable route card.
- No browser walk runs at desktop width.
