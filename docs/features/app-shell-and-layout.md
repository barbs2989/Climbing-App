# App shell and layout — the column, the primary nav, phone vs desktop (the website)

The frame every screen sits in: the app column (the root `<div>` returned by `App` in `ClimbMatch.jsx`),
the primary nav (`NAV`), and the boot placeholder in `index.html` that paints the same frame while the
bundle loads. At 1024px and wider the frame is **the website**: laid out the way a real website is, with
room for side-panel ads later. The phone app keeps its own look.

## 1. What it does today
- **Phone (under 1024px wide):** one 520px column, centred, with the bottom tab bar (Home · Climbs ·
  Partners · Crews · Logbook · Ranks · Profile). The bar is soft: see-through with a blur, a faint shadow instead
  of a hard top line, and the selected tab marked only by its pill. Inside an open chat thread the bar
  steps aside for the composer.
  - **Popups fill the screen** (owner 2026-10-23): every popup that used to slide up as a bottom sheet
    (a form, a list, a share screen, a photo — 27 of them) opens full screen, clear of the notch and the
    home bar, with its ✕ at the top. One rule in `index.html` does it, matched on the sheets' serialised
    inline style (`align-items: flex-end` on a `role="dialog"` backdrop), so no sheet was edited and a
    new one is covered too. A short **action menu** — a group post's ⋯ and a comment's ⋯ — stays a
    bottom sheet, as iOS and Material draw one; it opts out with `data-sheet="menu"`.
  - **...and so does every card popup** (owner 2026-10-24: "like an actual page on itself"): the ~20
    popups that were a rounded card centred or pinned near the top over a dimmed page (Settings,
    Feedback, Rate app, Privacy, About us, Data request, Form a crew, Year in review, a climber's profile,
    Report climber, the résumé, Your contributions, Friends, Notifications, Share profile, both Log a
    climb forms, Add a climb, Contribute info, a trip report, a shared list, the topo) open as a
    full-height page in the 520px column, scrolling inside themselves, from a second rule beside the
    first one (`align-items: center` / `flex-start` on a `role="dialog"` backdrop). Two kinds opt out
    with `data-sheet`: the delete-account confirm (`"alert"` — Material keeps a small centred dialog
    for an urgent yes/no) and the photo viewers (`"viewer"`, already a black full-screen lightbox).
    The page behind is locked by `useDialogA11y` in `lib/dialogA11y.js`, as for every dialog.
    `check:overlay-fullscreen` walks every popup at 390x844 and proves both halves: 21 sample points
    each land on the popup's own opaque page (none on the app or a dimmed backdrop), and 2,000px of
    wheel inside it leaves the app behind where it was (2026-10-29: 66 of 68 pass, the ⋯ menu and the
    delete-account confirm opt out).
  - **A popup's ✕ and ← Back stay on screen** (owner 2026-10-24: "need to be sticky when a popup page
    comes up"): the header row holding a popup's Close…/Back… button is pinned to the top of the pane
    that scrolls, and the content scrolls under it — Material's full-screen dialog and iOS's sheet both
    keep the close in a top bar like this. One function does it for every open popup, `pinDismiss` in
    `lib/dialogA11y.js` (run by `pinLayers` on each change while a popup is open), so no popup was
    edited and a new one is covered too. It pins only a ROW (at most 120px tall) at the TOP of its pane,
    so a Back at the foot of a step stays where it is. Two needed hand fixes: the trip report's ✕ and
    share float over the cover photo in a zero-height sticky bar, and the sign-in sheet is portalled to
    `<body>` (it rendered inside `#appscroll`, under the app header, which hid its ✕). Hidden file
    inputs (`.cm-file-input`) are `position:fixed`, so they no longer stretch a popup's backdrop into a
    second scroller that carried Log a climb off the screen. `check:pinned-dismiss` walks every popup.
- **Desktop (1024px and wider) — the website shell:**
  - A full-width fixed **header** of two rows (112px). First the **top bar** (64px): a bare ☰ at the far left (no box, no "Menu" label on
    desktop — owner 2026-11-04; its accessible name is still "Menu"), the logo (the app mark beside a
    26px ClimbMatch wordmark, → Home), a
    search box for every climb and place **centred in the window** (owner 2026-11-04; `WideSearch` sits on
    the 50vw midline out of the row's flow, 220–680px wide so it never reaches either end; `/` jumps to
    it; arrow keys and Enter pick a hit; **its list opens at 8 places and 10 climbs and grows in place** (owner 2026-11-13, "when i click mt only 6 show up"): *Show all N places* lists every place the search matched, *Show more climbs* adds 30 at a time up to 200, the same ranked search only longer, reset when the words change; the phone Climbs tab draws the same list inline), and at the right Saved · Alerts · Calendar · Messages and your
    avatar. **The avatar opens a small account menu** (owner 2026-11-11, "add it, keep ☰"; `AvatarMenu` in
    `lib/DesktopShell.jsx`): your name, then Your profile · Settings · Help & FAQ · Send feedback, and Sign out
    when signed in. It is a WAI-ARIA menu button (↑ ↓ Home End, Esc returns focus to the avatar, a click
    outside closes it). A guest's avatar still opens Sign in. The ☰ Menu is unchanged. **Typed search** (competitor review item 12, built 2026-11-05): when the words
    carry a grade or a discipline ("5.9 trad near Leavenworth", "WI4", "V4 in Squamish" —
    `parseTypedSearch` in `lib/typedSearch.js`, grades read by the one parser in `lib/grade.js`), the
    first row offers the Route finder with those filters, scoped to the place typed (top place hit),
    else the home state, else the state with the most climbs; the row names the scope. Picking it
    goes through App's finder opener (`openFinderAt`), which sets `finderJump` for `DbAreaBrowser`. Each climb hit carries its discipline's glyph (`DiscIcon`) with the grade in that
    discipline's colour, so a boulder, a trad route and an ice route read apart before the name does; the
    EMPTY box, focused, offers *Near me* (the Climbs map at your position, `nearJump` → `jumpToNearReq`)
    and the last five things typed (*Recent*, on this device only — `localStorage` `cm_recent_search`,
    never the database; a tap refills the box). The same component mounts INLINE under the phone Climbs
    tab's title (owner 2026-11-04, from the competitor review: KAYA, Gaia, Komoot and Mountain Project
    lead with search); there its hits run down the page.
  - **Drawn ~10% larger** (owner 2026-11-04, `ZOOM` = 1.1 in `lib/wideLayout.js`): the page column
    (`#appscroll`), the pages that open in it, the rail's cards, centred windows, the bell drop-down and
    both Messages panes are CSS-`zoom`ed, so the phone's 13px type reads as ~14.3px beside Mountain
    Project's 14 and Strava's 15. A fixed element zooms itself, so its own top/left/width are written
    divided by `ZOOM`; a Leaflet map is zoomed back to exactly 1 (its drag and click maths are unchanged —
    measured), but only one that sits inside a zoomed box: the fire map's full-window dialog is portalled
    to the body and stays at 1. A bar pinned by JS (`lib/usePinnedBar.js`, the Climbs search) divides the
    window pixels it measures by its wrapper's own zoom, and so do the topo viewers' drag and wheel zoom
    and the hour picker's centring (`boxZoom()` in `lib/wideLayout.js`). The header is not zoomed.
  - **Every tab shows its title** (owner 2026-11-04): the `quiet` `ScreenHero` title, hidden on a phone,
    is drawn as a 24px heading (`h1[data-cm-quiet-title]` in `wideCss`).
  - The **nav strip** (48px), the header's second row (owner 2026-11-11: "move home, climbs, partners,
    crews, groups, logbook and ranks above the screen and sticky below what is already at the top like a
    real website would"; `wideNavStrip`): Home · Climbs · Partners · Crews · Groups · Logbook · Ranks in a
    row, each an icon and its label, starting at the page column's left edge. The active tab is underlined
    in blue. It carries **no count badges** (owner 2026-11-11: they overlapped the labels): crew chat unread
    shows on the Messages icon and the rail's *Your crews*, unfinished climbs inside Logbook. It keeps the name *Primary*. It replaced the
    fixed left sidebar, which held the tabs, then *Your crews* and *Your groups* (those are rail cards now).
    Profile is the avatar, not a tab. No site links: those are the footer's.
  - The **page column**, and at **1280px and wider** a 300px **right rail** (`WideRail`): *Coming up*
    (agreed crew days); *Alerts*, which starts **open on the newest three** (owner 2026-11-04; it started
    collapsed from 2026-10-23, and a bare *ALERTS ›* header on every page read as empty) under its header
    (*Alerts · N new*; an amber dot when something waits on you, blue when only notifications are unread), with
    *See all alerts · N more ›*; the header still folds it. It is the **same list as
    Home's Alerts button** (`_alerts` in `ClimbMatch.jsx`, built once for both): what waits on you first (requests,
    invites, unread chats, a day or a climb to confirm, amber), then unread notifications not already one
    of those, and the SAME count. A guest is told to sign in. Then **Your crews** (owner 2026-11-11: crews
    and crew chats combined; `RailCrews`): each active crew, newest chat message first, named for its
    place, its last message under the name and its chat's unread count; a click opens the crew; five,
    then *See all N crews ›*. Then **Your groups** (`RailGroups`): five, a red dot when a group has posts
    you have not seen (`groupUnreadN`), drawn only when you are in a group. Both fold like Alerts. **Direct
    messages are not in the rail** (owner 2026-11-11): the top bar's Messages drop-down holds them and counts
    them. The rail's last slot is an ad (`ad`, off everywhere but route pages for now).
  - Between 1024 and 1279px there is no rail; the column is centred alone. Crews and groups are reached
    from their tabs and the ☰ Menu.
  - **The column and the rail are centred as one block** (owner 2026-11-11, "center as one block"; from
    2026-11-04 to 2026-11-11 a Facebook-style layout pinned a left sidebar and the rail to the window's
    edges and centred only the column): the block (700px column, 24px gap, 300px rail) is centred between
    12px on the left and 28px on the right (a Windows scrollbar), `wideGeom`: 1024 → column 150–850;
    1100 → 192–892; 1280 → 120–820, rail 844–1144; 1440 → 200–900, rail 924; 1920 → 440–1140, rail 1164.
    The ☰ and the avatar still hold the window's corners. The margins either side of the block are the
    left ad's place (`SideAd`, 1440px and up).
  - **Help & FAQ is a page on the website** (competitor review batch B, item 19, owner 2026-11-04): the footer's *Help & FAQ* link (and the Menu's *How ClimbMatch works* on a phone) opens the same `Help` (`lib/Help.jsx`) — the tour, the FAQ, and a CONTACT line — drawn in the column with ← Back (`page` prop, `_vHelp` in `_pageView`) at 1024px+ and as the dialog on a phone. The contact address is `CONTACT_EMAIL` in `lib/contact.js`, a placeholder on the reserved `.example` domain until the owner replaces it ("put a placeholder email for now i will do that later").
  - **The column has edges** (owner 2026-11-05, "a border around all the middle … audit how Strava does
    it"): a 1px `C.border` line down each side of the page column, from the top bar's border to the
    footer's, square, no shadow (`wideColumn`'s `boxShadow`, `COL_EDGES`, and the same rule in the boot
    placeholder). It is the frame X's feed and Strava's *activity* page draw; Strava's dashboard,
    Mountain Project, AllTrails and The Topo frame nothing and let cards carry the edges, and theCrag
    frames sidebar + content + rail as one sheet, which the edge-pinned layout above has no block for.
    A full-screen page placed in the column draws no edge of its own (it used to draw the same two
    lines; inside its 1.1 zoom a second stroke could land a device pixel beside the column's), the
    column's lines lie just outside it. The boot placeholder's copy of the column style in `index.html`
    is a hand copy with no guard (`check:boot` compares nav labels only): change `COL_W`, `GAP`,
    `EDGE_R` or `COL_EDGES` and change that `@media` block in step.
  - A site **footer** under every page, Strava-style (owner 2026-11-04: "look how strava does it …
    more branding"), **spanning the whole window** (owner 2026-11-05): a band the width of the window's
    client area (measured, not 100vw, so the Windows scrollbar never pushes it off the edge) that pulls
    itself out of the page column by `--cm-col-left` and paints above the fixed sidebar and rail at the
    page's end; its content is centred and capped at 1320px. In it: the mark, wordmark and one line on what the app is for, three link
    columns (Explore: the tabs; ClimbMatch: Help & FAQ, About us, Feedback, Rate the app, Settings;
    Legal: Terms, Privacy, Guidelines, Accessibility), then a thin © row with Back to top. It is the ONLY home of About,
    Help, Feedback, Privacy and Terms on desktop. The **directory of every state with climbs** heads it on
    the Climbs tab's route and area pages only (owner 2026-11-04, `showStates`); not the tab's own
    root, where the state picker above already lists every state under the country buttons. An **Install
    ClimbMatch** link ends the ClimbMatch column while the browser has offered an install
    (`beforeinstallprompt`, kept by `useInstallPrompt` in `lib/installPrompt.js`); Chrome and Edge offer
    one on the built site, Safari and Firefox never do, and an installed app is not offered again, so the
    link shows only when a click can really install (competitor review batch A, item 10).
  - **☰ Menu** fills the whole window, as on a phone, with its content centred in a 720px column.
  - **Full-screen views are pages.** Every view that covers the phone screen (Calendar, Messages, Edit
    profile, a group, an event, Settings' sub-pages, Best day, Manage areas, Terms…) is drawn in the
    page column under the top bar, so the top bar, sidebar and rail stay usable; the sidebar, the
    wordmark, the search, ★, the avatar, Calendar and Messages leave an open page first
    (`_closePages`); the Menu opens above an open page. Settings itself stays a small window, and hides while one of its pages is open.
  - **Route pages** (see route-page.md): breadcrumb, facts beside a photo, and at 1280px+ the route
    map takes the rail's place (`#cm-route-rail`) instead of the widgets.
  - **Messages are two panes**: the chat icon drops the inbox down under it (*Open messages* opens the
    page); on the page the inbox is a 280px left pane (`Inbox pane="side"`) and the conversation you
    pick opens to its right, the inbox staying open; *Choose a conversation* fills the right until then.
  - **The Climbs tab shows its regions as a grid** of cards with their climb counts (the countries
    as buttons when there are two or more) instead of two dropdowns; **Groups** lists its group
    cards three across, each under a cover band (App's `groupBand`: a colour chosen from the group's name, and its initial — groups have no cover photo), and *Your groups* on For you as the same banded tiles three across (owner 2026-11-04, after Meetup); the *Your groups* tab's rows stay two per row. Partner and crew cards are long, so they stay one per row.
  - **The Calendar has a month view** above its lists (`MonthGrid`): your crews' agreed climbing days and
    group events on a month grid with ‹ › and *Today*; each entry opens what the list would. Crew days and
    events only (owner).
  - **No emoji in the Calendar** (owner, 2026-10-23): its rows read *Drive from you* and *Daylight* as
    plain labels, its two notes carry the app's line `info` icon, and the empty state a line `calendar` icon
    (`lib/Calendar.jsx`). The meeting place keeps its `pin` line icon through `Lbl`.
  - **Crew chats in the rail** (1280px+): from 2026-11-04 to 2026-11-11 a *Chats* card (`RailChats`) held
    two folding sections, *Crews* and *Direct*. Since 2026-11-11 (owner) the crews' chats live in the *Your
    crews* card (last message, unread count) and direct chats only in the top bar's Messages drop-down.
  - **Three button looks, and green** (owner 2026-11-04, phone too): `lib/buttonStyles.js`' `BTN_PRIMARY`
    (the app's navy — the one main action), `BTN_SECONDARY` (bordered, plain text), `BTN_LINK` (no box), and
    `BTN_GO` (green, only Accept and Log). Applied to crew join requests, the partner card's Form crew / +
    Invite to crew, the Logbook list's actions and the profile's actions; the profile's four actions sit in
    ONE row on the website (Edit primary). The ✕ and ← Back stay popupChrome's, and are COMPACT (owner 2026-11-04, "way too large on phone and desktop"): `POP_CLOSE` a 36px circle, `POP_BACK` a 36px pill with 14px type, down from 48px; `lib/tapSlop.js` still lands a near touch on them. Groups' header is `quiet` like the other tabs.
  - **Nothing stretches across the page** (owner 2026-10-22): the page column is 700px (720 → 640 on
    2026-10-22, → 700 with the zoom on 2026-11-04), and an
    action button sizes to its label instead of filling the column — `wideCss`' rule for a `width:100%`
    button (and a lone `flex:1` one) in the page column or a page-view. List rows (space-between,
    left-aligned, flex-start) still run edge to edge; dialogs keep full-width footer buttons; on the route
    page the action buttons sit in one row across the header.
  - The **bell** opens Notifications as a drop-down under it at the shell's right edge. Home's Alerts button shows
    at every width (#2734), so a desktop Home has it beside the rail's card; both read `_alerts` and agree.
  - **Popups that slide up from the bottom** on a phone open as **centred windows** (rounded, at most
    85% of the window tall).
  - Controls brighten under the mouse; the browser tab names the page (*Coleman-Deming – ClimbMatch*).
  - **"Click", not "tap"** (owner 2026-11-04): the app's own sentences that say *tap…* go through `tx()`
    (`lib/tapWords.js`), which says *click* while the app is wide (App calls `__setTapWide(wide)` at the
    top of its render) and rewrites the three *Swipe…* hints. Climbers' own text never goes through it. A
    string built at module scope is read before App renders and stays phone wording, so a module-scope
    table (the Help tour's `HELP_FEATS`, Edit profile's setup cards, `AREA_EDIT_FIELDS` hints) is passed
    through `tx()` again where it renders.
  - **A mouse cannot swipe:** a `SwipeRow` whose content carries no other way to act — the inbox's
    conversation rows (`hover` prop) — shows its **Delete** as a button in a column beside the row while
    the row is pointed at or holds keyboard focus (`.cm-swipe` in `wideCss`); the column keeps its width
    while hidden, so nothing moves and nothing is covered (owner 2026-11-04: drawn over the row, "Clear"
    landed on a Past crew card's own buttons). Until pointed at they take no clicks either, and the hover
    reveal sits inside `@media (hover:hover)`, so a touch screen 1024px+ wide (an iPad held sideways)
    never hits a hidden Delete; it keeps the swipe. Rows that already act in-row get no column: a Past
    crew card has its own Archive and Clear buttons, a notification its ⋯ menu, a float plan its
    two-step Delete.
  - **Controls are website-height** (owner 2026-11-04, "are buttons and things too large on the desktop
    view?" — "do what you recommend"): a census at 1440px put the text at a median 13.8px rendered, level
    with Mountain Project and Strava, but the controls at a median 44–48px against their 35–43: the phone's
    44px touch minimum times the 1.1 zoom. The zoom stays and one `wideCss` block trims the controls,
    matched on the serialised inline style like the rules around it: the two floors index.html sets
    (every select 44px, every box-shaped button 40px) become 38 / 34, an inline `minHeight` of 44–46 or 48
    becomes 38 / 40 where the box rule does not reach (flex rows), a fixed 48px tile 40, and the unified
    `BTN` / `BTN_LG` paddings lose 2–3px. Buttons and selects only; popupChrome's ✕ / Back keep their 48px
    (told apart by their 24px radius). After: Home's median control 53 → 42px rendered, Crews 45 → 41,
    Logbook 44 → 39; the phone measures the same as before.
  - **Chip rows wrap** instead of scrolling sideways off the column (a `wideCss` rule for every
    `display:flex` + `overflow-x:auto` row in the page column or a page); a row holding photos (at any depth) and
    the hour picker keep scrolling.
  - **Maps:** the layer buttons stop short of the ⤢ Full screen button, and in a narrow map (the rail's)
    *Satellite* reads *Sat* (an `@container` rule in index.html), so none is hidden under it.
  - **The Climbs tab opens on the United States' regions** (`StatePicker`: an untouched country pick
    means the US), on desktop and — since the competitor review, owner 2026-11-04 — on a phone too, where
    it used to open on two empty selects; Canada is one tap away in the country select.

- **Loading screen and the sign-in screen.** While the bundle downloads, `index.html` paints a branded splash (`#cm-splash`: the app mark, wordmark and a moving bar; still under reduced motion) over the boot shell; while App restores the session it draws the same splash (`BootSplash`, `lib/BootSplash.jsx`) instead of a blank page. As the app's first screen (the real gate, or `LOGIN_FIRST`), the sign-in screen (`lib/AuthModal.jsx`) fills the screen under a branded header (the mark, the wordmark and what the app is for) instead of drawing a modal over a black page; opened from inside the app it is still the modal.
- **The sign-in look carries into the app.** Every screen header (`ScreenHero`, `lib/ScreenHero.jsx`) wears the sign-in screen's blue top glow (`HERO_BG`, `HERO_SHEEN`), as do the Me card, a climber's profile header and an area without a cover photo. Home's banner has the sign-in background itself (`HOME_GLOW`) and the mark (`BrandMark`, `src/components/BrandMark.tsx`) beside the wordmark; the Menu's header is the mark and wordmark too. The four icon squares at the top right are one plain dark style; their count badges carry the colour. Disclosure rows end in one chevron (`Chevron`, `src/components/Chevron.tsx`) instead of ▸/▾ text glyphs. Each header's line under the title is one short line. **The five top tabs have no boxed header** (owner, 2026-10-25): Climbs, Partners, Crew, Logbook and Ranks render `ScreenHero` with `quiet`, which drops the box and the big title (the title stays as a visually hidden `<h1>` for screen readers) and keeps the one-line caption as plain muted text, with Ranks' "?" beside it. The sub-tab bar names the view; the Logbook's unreadable-count warning stays in the caption.
- **One Edit button, one chevron.** Every section's Edit control — route, area, Profile, a pitch row — is the outlined `editBtnStyle` with a blue pencil (`EditPencil`, `lib/areaChrome.jsx`), never a filled blue pill. Open/close markers and the arrow at the end of a tappable row are `Chevron` (an `inline` mode sits in a line of text), grey at a row's end; blue only on an active control. Screen titles are sentence case.
- **No emoji, one button shape (polish round 3, 2026-10-25).** The app draws no emoji anywhere — an icon is an `ActionIcon` (`aria-hidden`, beside the words) or there is none; `Lbl` swaps a leading emoji it knows for its icon and drops one it does not; the one exception, since 2026-11-05, is reactions: emoji (`REACTIONS[].e`) in Facebook's floating bar (`ReactionPicker`) and stacked on the count line; route-tag chips, risk levels and challenge lists carry ActionIcon names. `check:no-emoji` holds the line. No typed › / → / ▸ / ▾ at a row end or on a toggle — `Chevron` everywhere (breadcrumb separators, month arrows and "→" inside a sentence stay text). A solid primary button takes its geometry from `lib/buttonStyles.js`: `BTN_SM` in a row, `BTN_LG` full width.
- **Loading rows, empty states, one card corner, palette tokens (polish round 4, 2026-10-25).** A section whose read is in flight shows `LoadingRows` (`src/components/LoadingRows.tsx`): its "Loading …" line (kept as real text — `render-settle.mjs` and `check:zero` read it) over pulsing grey placeholder rows, still under reduced motion. A list with nothing in it shows `EmptyState` (`src/components/EmptyState.tsx`): a muted `ActionIcon` in a circle over the unchanged sentence, with an optional next step. Cards (`background:C.card` + a border) round at 12; smaller inner boxes keep 8–10. White text on a solid fill is `C.onSolid`, and a pop-up's backdrop is `C.scrim` (0.6) or `C.scrimStrong` (0.88, photo viewers) — `lib/GpsSubmissionModal.jsx` keeps its own local palette.
- **A touch just off a small control still reaches it (2026-10-28).** Most controls are drawn under 44px (a route-page section toggle is 29px), so `installTapSlop` (`lib/tapSlop.js`, called once in `main.jsx`) sends a touch whose click landed on nothing tappable to the nearest control whose 44px box, centred on it, holds the touch. Every control competes on distance whatever its size, so a nearer big button keeps its tap; a tie, a mouse, a keyboard click, a hit on a control, and a tap inside a map, chart or field are left alone. The browser snaps a tap to a control under the finger first (Chrome and Safari both do), so this only reaches the taps that snap misses.
- **Every box-shaped button is at least 40px tall (2026-10-29).** Owner note: "the overall near me friends and by area boxes should be bigger. Find other places where the box is too small." One rule in `index.html`, beside the 44px `select` rule, gives any `<button>` that draws a border-radius and a 3-8px padding a 40px `min-height` (Material 3's button height): skill and belay chips, discipline and country pickers, Accept / Decline / Vouch / Remove, the route page's Fill in the missing chips, Report the road. Left alone: switches, buttons with their own height, map overlays (`position: absolute`), text links styled as buttons (no radius), and flex buttons that do not centre their content. An inline `minHeight` still wins. Measured by `scripts/oneoff/measure-target-size.mjs` (every tab, the route page, 70 popups).

## 2. How it works
`useWideScreen()` / `useFullWidth()` (in `lib/wideLayout.js`) are `matchMedia` hooks on `WIDE_MIN` (1024)
and `FULL_MIN` (1280). `wideGeom(full)` computes every horizontal position of the shell as CSS lengths;
`wideColumn`, `wideRail`, `wideTopBar`, `wideTopRow` and `wideNavStrip` turn it into styles; `HEAD_H` (64 + 48) is where everything under the header starts. When `wide`
is false none is applied, so phone styles are unchanged. Inline styles cannot take media queries, and
CLAUDE.md rules out a styling library, so the breakpoints are decided in JS. The two things inline styles
cannot do — hover, and re-shaping every existing bottom sheet and full-screen view — are `wideCss(g)`, a stylesheet App mounts
only while `wide`; the sheet rule matches the sheets' own serialised inline style
(`align-items: flex-end`). `navBadge(id,right)` is the one reader of the tab counts, used by the phone's bottom bar (the desktop nav strip draws no counts).
`index.html` repeats the numbers in `@media (min-width: 1024px)` / `(min-width: 1280px)` blocks so the
boot shell already has the website's shape.

**Views as pages.** The phone views share one inline shape — `position:fixed; inset:0; maxWidth:520`
(`check:overlay-width-cap` keeps them to it) — so `wideCss` places that shape in the column. The six
views `App` used to RETURN early (`legal`, `editDraft`, `dashOpen`, `guideAppOpen`, `calOpen`,
`inboxOpen`) are built as elements (`_vLegal` … `_vInbox`); a phone still returns them alone, while a
desktop draws `_pageView` in the column in place of `#appscroll` (Terms still replaces everything when
signed out). `coveringLayer` counts a cover that starts under the top bar.

The search, the rail, the avatar menu, the footer and `DocTitle` live in `lib/DesktopShell.jsx`. The search uses the
same `useRouteSearch` / `usePlaceSearch` the pickers use, and says so when a search fails rather than
showing "no matches".

**The scroll-lock trap.** `lib/dialogA11y.js` locks the page behind any fixed, opaque, full-height
element, which is how it spots a popup. The old left sidebar was all three, so it froze every desktop page
until #2560 taught the lock to skip `role="navigation"`. The header (not full height), the rail (starts
below the header) and the side ad (not full height) do not trip it. Any new fixed desktop panel must not either.

**Focus on open and close.** When a dialog opens, the same hook moves focus to its first control,
unless the dialog already holds focus (an `autoFocus` field, such as the Name box of *New custom
list*): that field keeps it. On close, focus goes back to the control that opened the dialog. That
control is read from the last `focusout` outside any dialog, because an `autoFocus` field has already
taken focus from it by the time the hook looks.

## 3. Files
| File | Key symbols |
|---|---|
| `lib/wideLayout.js` | `useWideScreen`, `useFullWidth`, `useAdSideWidth`, `wideGeom`, `wideColumn`, `wideRail`, `wideTopBar`, `wideTopRow`, `wideNavStrip`, `wideCss`, `WIDE_MIN`, `FULL_MIN`, `AD_SIDE_MIN`, `TOP_H`, `NAV_H`, `HEAD_H` |
| `lib/MonthGrid.jsx` | `MonthGrid` |
| `lib/DesktopShell.jsx` | `WideSearch`, `WideRail` (`RailCrews`, `RailGroups`, `FoldCard`), `AvatarMenu`, `WideFooter`, `DocTitle` |
| `lib/installPrompt.js` | `useInstallPrompt` |
| `lib/Ads.jsx` | `ADS_ON`, `adsActive`, `SideAd`, `RailAd`, `useRailFollow`, `FollowColumn` |
| `lib/dialogA11y.js` | `coveringLayer`, `pinDismiss`, `pinLayers` |
| `lib/tapSlop.js` | `installTapSlop`, `slopTarget`, `TAP_MIN` |
| `ClimbMatch.jsx` | `NAV`, `goTab`, `navBadge`, `_inChat`, `_known`, `_openMe`, `_closePages`, `_pageView`, `_isAdPage`, `_avatarItems` |
| `index.html` | `#cm-boot`, `.b-nav`, `#cm-splash` |
| `lib/BootSplash.jsx` | `BootSplash` |
| `lib/ScreenHero.jsx` | `ScreenHero`, `HERO_BG`, `HERO_SHEEN`, `HOME_GLOW` |
| `src/components/BrandMark.tsx` | `BrandMark` |
| `src/components/Chevron.tsx` | `Chevron` |

## 4. Data
Layout only. The footer reads the states list (`useStates`); the search reads the catalog.

**Ads, desktop only** (owner 2026-11-04: "ads on route pages … as you scroll down, ads will be on the
left panel and right panels"; shipped on "go"; owner 2026-11-11: **both side panels are future ad space**,
so no layout may drop one). `lib/Ads.jsx`: a 160×600 in the **left margin** beside the centred block
(`SideAd`, fixed under the header, 24px left of the column; only at `AD_SIDE_MIN` = 1440px and up, where
the margin holds it) and a 300×600 **last in the rail** (`RailAd`, zoomed back to 1 so it is drawn at its
true size inside the rail's 1.1 zoom). Which pages draw them is one function, `_isAdPage` in
`ClimbMatch.jsx`: route pages only, for now. The phone never draws one. **Off until a publisher id is
set**: the build reads `VITE_ADSENSE_CLIENT` and the two unit ids `VITE_ADSENSE_SLOT_SIDE` /
`VITE_ADSENSE_SLOT_RAIL` from deploy.yml's repository variables (Google AdSense, the one network a static
Pages site can carry); unset, nothing renders, not even a label. Turning them on adds a sentence to the
Privacy Policy's *What we collect* (`ADS_ON` in `lib/LegalView.jsx`), so bump `POLICY_VERSION` in the same
change. On the dev server `?ads=preview` draws labelled placeholder boxes in the two slots.

**One scrollbar.** The side panels no longer scroll on their own (owner 2026-11-04: "it needs to be one
consistent scroll bar"): `useRailFollow` slides a panel's column up with the page's scroll, by at most the
distance to its ad's top (the widgets or the map scroll away, the ad stays in view) or, with no ad, the amount
the column overflows (its last card comes into view, then it stops), as Facebook's right column does. The
rail's widgets (`WideRail`) and the route page's rail (`FollowColumn` around `#cm-route-rail`) follow; the
left ad is fixed and always in view.

## 5. Connections
- **Menu** (`menuOpen`): the same Menu on both widths, full-screen on both.
- **Overlays**: `check:overlay-width-cap` still holds every full-screen view to 520px, except the desktop Menu (exempt `menu-wide`).

## 6. Guards
`check:boot` (boot NAV labels match `NAV`), `check:overlay-width-cap`, `check:bottom-panels`,
`check:zindex`, `check:tap-slop` (the touch widening stays installed), `check:overlay-fullscreen` (a popup covers the phone screen and holds the app behind still). The browser walks drive a phone-width window, except `check:overflow -- --width 1280`, which walks every tab, the route page and every openable overlay on the desktop website (`render-guards.yml` runs it beside the 390px walk).

## 7. Last significant change
- **A website header, a centred block** (owner 2026-11-11): the left sidebar's tabs became a nav strip under the top bar; the column and rail are centred together; *Your crews* (with their chats) and *Your groups* moved to the rail and its Direct chats left it; the avatar opens an account menu (☰ kept); the left ad moved to the margin beside the block and the rail ad is drawn at its true 300px. Decided for later: URLs for route pages (then profile URLs, after a security review); not now: nav drop-downs, hover cards, full-width data pages.
- **The desktop website is walked** (2026-10-28): `check:overflow` takes `--width`, and CI runs it at 1280px as well as 390px, so a desktop screen that scrolls sideways fails a check.
- **Small controls are easier to hit** (owner note 2026-10-28, "Some clicks links are small"): a touch that lands on nothing goes to the nearest small control within 44px (`lib/tapSlop.js`, installed in `main.jsx`); dropdowns are 44px tall, the waypoint map picker's layer buttons 34px, the fire map's layer chips and the Reports condition rows 36px, and sign-in's text links have a bigger touch box (`TEXT_TAP`). Measured with `scripts/oneoff/probe-tap-targets.mjs`.
- **The sign-in look, app-wide** (owner, 2026-10-24): header glow, branded Home banner and Menu header, plain top-right icons, one chevron, one-line header text, Logbook sort & filter folded, Climbs regions as cards on a phone.
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
  left for the footer; *Best day to climb* left the right rail (and the app altogether on 2026-11-05).

## 8. Known gaps
- **Phase 2**: shipped (pages, bell and chat drop-downs, route page, Climbs grid, two-per-row lists,
  two-pane Messages).
- **Phase 3**: public route and area pages with real web addresses. **Phase 4**: printable route
  page, compare routes, full-month calendar, draw an approach → GPX, chat list in the rail, logbook
  CSV, embeddable route card.
- Only `check:overflow` runs at desktop width; the other browser walks are phone-only.
