# App shell and layout — the column, the primary nav, phone vs desktop

The frame every screen sits in: the app column (the root `<div>` returned by `App` in `ClimbMatch.jsx`),
the primary nav (`NAV`), and the boot placeholder in `index.html` that paints the same frame while the
bundle loads.

## 1. What it does today
- **Phone (under 1024px wide):** one 520px column, centred, with the bottom tab bar (Home · Climbs ·
  Partners · Crews · Logbook · Ranks). Inside an open chat thread the bar steps aside for the composer.
- **Desktop (1024px and wider), phase 1:** the same NAV becomes a fixed **left sidebar** (the ClimbMatch wordmark, which Home's header drops on desktop so it shows once, then
  icon + label rows, the active tab in a blue pill, the Logbook and Crews counts on the icon). The column
  widens to 720px, and the sidebar and column are centred together. The sidebar stays visible inside a
  chat thread.
- Overlays and sheets keep their own 520px cap and centre in the window. Screens do not yet change
  their content on desktop (no grids).

## 2. How it works
`useWideScreen()` (in `lib/wideLayout.js`) is a `matchMedia` hook on `WIDE_MIN`. When it is true, `App`
spreads `WIDE_COLUMN` into the root column's style and draws the sidebar with `WIDE_SIDEBAR`; when it is
false neither is applied, so the phone styles are the same as before. Inline styles cannot take media
queries, and CLAUDE.md rules out a styling library, so the breakpoint is decided in JS. `navBadge(id,right)`
is the one reader of the tab counts, shared by both navs. `index.html` repeats the numbers in an
`@media (min-width: 1024px)` block so the boot shell already has the sidebar shape.

## 3. Files
| File | Key symbols |
|---|---|
| `lib/wideLayout.js` | `useWideScreen`, `WIDE_MIN`, `SIDEBAR_W`, `SIDEBAR_GAP`, `COL_W`, `WIDE_COLUMN`, `WIDE_SIDEBAR` |
| `ClimbMatch.jsx` | `NAV`, `goTab`, `navBadge`, `_inChat` |
| `index.html` | `#cm-boot`, `.b-nav` |

## 4. Data
None. This is layout only.

## 5. Connections
- **Menu** (`menuOpen`): still the way to Profile, Groups and Settings on both widths.
- **Overlays**: `check:overlay-width-cap` still holds every full-screen view to 520px.

## 6. Guards
`check:boot` (boot NAV labels match `NAV`), `check:overlay-width-cap`, `check:bottom-panels`,
`check:zindex`. The browser walks drive a phone-width window, so they cover the phone layout only.

## 7. Last significant change
- **Desktop phase 1**: left sidebar plus a 720px column at 1024px and wider. Phone layout unchanged.

## 8. Known gaps
- **Phase 2+**: lists that would read better as grids on desktop (Climbs area cards, Partners results,
  Groups discover, Logbook) are still one column. The column is 720px so they could become two columns.
- Overlays centre in the window, not over the column, so on desktop a sheet sits a little right of the
  column's centre line.
- No browser walk runs at desktop width.
