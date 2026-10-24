# Profile, résumé and settings — the `me` tab and the Settings sheet

`tab==="me"` in `ClimbMatch.jsx`. It is **not on the bottom bar** (NAV marks it `bar:false`); it opens from the Menu
(`menuOpen`, the avatar button top left), whose "You" card leads here. Settings is a separate full-screen dialog
(`settingsOpen` / `setSettingsOpen`, `aria-label="Settings"`) also opened from the Menu. A climber's own or another's
profile can also open as `FullProfile` and `Resume` overlays from anywhere (partner rows, crews, leaderboards).

## 1. What it does today
- **Profile (`me`)**: your header (verification, photo strip, résumé and public-profile buttons) stays on top — your photo and name, then your disciplines as one full-width row of pills from the card's left edge (not squeezed into the column beside the photo, where six wrapped into three ragged rows), then your bio and the photo strip; under it, tabs (`meTab`, read as `meTabOn`): **Profile** (At a glance, availability, speed, certifications, vouches you’ve received (`myVouchesShown`, the two newest in full and *See all*), vouches you’ve given, Edit profile; At a glance, Availability and Certifications & Skills each carry a ✎ *Edit* (`MeEdit`) that opens the editor scrolled to that part, `ep-grades` / `ep-availability` / `ep-certs`) · **Activity** (Year in Climbing banner, Your Logbook, sends by grade, Belay & Catch Record, reports you’ve filed). A catch notification opens Activity and Home’s availability gap opens Profile. Walks reach a tab with `?mt=` (overlay scaffold). The speed card prints its number over ONE line, *ft/hr gain · Trail / Approach*.
- **Menu › Review** (admins only, `isAdmin`; was a *Review* sub-tab on Profile until 2026-10-23): one tile per queue — Guide applications, Route proposals, Area proposals, Route edits, Flagged details, Contributor standing, Accessibility reports — each with its waiting count from `useAdminQueueCounts` as a corner badge. Area proposals has no badge of its own: `useAdminQueueCounts` counts `new_route` and `new_area` together, into the Route proposals tile. A tile opens that one queue full-screen (`reviewQueue` / `setReviewQueue`, ← Back); opening a route or a profile from a queue closes it first. The Safety reports, Appeals and Reported photos queues, and Home's admin 24-hour banner that pointed at them, were removed on 2026-10-24 (owner: "I don't need that feature"); climbers still report, block and appeal, and those rows are read in the Supabase dashboard (the `notify-safety-report` email still fires).
- **Menu › Blocked climbers** (Help & settings rows): always listed, with the count when anyone is blocked; it opens the same `blockedOpen` page as Settings › Privacy.
- **Menu card and tiles**: the card (avatar, name) opens Profile; under it, for a signed-in or demo climber, *View profile* and *Edit profile* (`openEdit`) sit side by side, then availability (Weekday mornings · Weekday evenings · Weekend mornings · Weekend evenings, `AVAIL_SLOT_OPTS`, each a block of the week grid) and the emergency contact. Tile groups: *Plan & log* (Log a climb, Your ascents, Add a climb, Float plans, Best day, Your conditions, Downloads, Hire a guide) · *Saved & lists* (Saved areas and Saved searches open Logbook › Saved with `savedKind` set to `areas`/`searches`; Everything saved; Objectives & your lists; Challenges; Climbing lists sets `challengeListsAt`, which `Challenges` reads as `listsAt` to open its curated-lists dialog) · *Yours* (Friends, Crews · N, Groups, Requests (its waiting count, friend + crew + group requests + crew invites, is a red badge in the tile's top-right corner like the header icons' badges, not " · N" on the label), Listed areas, contributions, Year in Climbing, share/invite, guide).
- **Menu › Your crews** (signed in or demo, under the card, above *Your groups* and the tiles): up to five of `activeCrews` — the Crews tab's own list — each named by `placeOf` (its route or area) with its unread count (`crewUnread`); a tap opens that crew (`setOpenCrewId`) on the Crews tab, and *See all ›* appears past five. No active crews means no section; a failed read (`crewsUnavailable`) says so.
- **Menu › Your groups** (signed in or demo, under *Your crews*, above the tiles): up to five of the groups you are in (`myGroupsNow`, ordered by `groupsByLastPost`), each with its new-post count (`groupUnreadN`); a tap opens that group (`setOpenGroupId`) over Groups › Your groups, and *See all ›* appears past five. No groups means no section; a failed read (`groupsUnavailable`) says so instead of an empty list.
- **View public profile** (`openMyPublicProfile`): your own `FullProfile`, built from `meLive`. `meLive` reads the pace
  (`mySpeedFtHr`, saved to `hiking_speed_ft_hr`) and the certifications, skills and belay devices from `profile`
  directly, so the Speed and Safety tabs show what you saved. Your objectives are public (as Mountain Project's to-do
  list is) because partner search matches on them; on your own view the Objectives tab says so, and no row reads
  "You both want this!". Belay devices are set in Edit profile; the Profile tab's Certifications & Skills card has a
  button that opens it.
- **Edit profile**: `lib/EditProfileScreen.jsx` over the `editDraft` state; `saveEdit` writes the draft back (see 2). `openEdit(sec)` takes an optional section key (`editFocus` → the `focus` prop) and the editor scrolls to `ep-<key>`: the Profile tab's ✎ Edit buttons (`MeEdit`: grades, availability, certs) and Home's *Finish setting up* rows (grades, bio, availability, zip, photo) use it. A key in `SETUP` (the Finish-setting-up ones) also gets a *Finish setting up* card naming the task, why it matters and what to tap, and the section outlined. A plain Edit button passes an event, so it opens at the top. Its *Experience level* boxes are one row of equal-share boxes on every phone width from 320px, never wrapping a box onto its own line; the four availability boxes on the Menu card, the Profile tab and a climber's profile follow the same rule (a long label breaks inside its box).
  Includes the owner-only zip code (feeds partner search distance; others never see it).
  **Certifications** are typed or picked: `certMatches` offers matches from `CERT_GROUPS` (wilderness medicine,
  avalanche, climbing instruction, guiding, rescue, gym & competition, clubs & courses — 66, named by their
  issuers: NOLS/SOLO/WMA, AIARE/A3/Avalanche Canada, AMGA, PCGI, PCIA, ACMG, UK Mountain Training, IFMGA,
  USA Climbing, The Mountaineers, Leave No Trace) as you type, and *Browse certifications* lists them all. A pick
  only fills the box, so the expiry date still applies; anything not listed is added as typed. **Skills** are the
  `SKILLS` chips in `SKILL_GROUPS` (seven groups, 42 skills incl. technique and rescue) plus free-text ones;
  the vouch form offers the same groups, and `rappel` stays retired.
  - **Home city + state are a LABEL, never geocoded.** The city is free text with a `US_CITIES` datalist; the state comes
    from the dropdown. They show on your profile and partner rows, and the state orders namesakes in search
    (`homeStatePath`). They place you nowhere: partner and crew distance come only from the zip.
  - **The zip is the only thing that places you**: `zip_centroids` (Census ZCTA) gives its point, and `partners_near` and
    CrewFinder's *Nearest* measure from it. While you type, `useZipCentroid` checks a changed zip against that same table
    and the field says whether it is recognised, which state it is in (`zipState`), and when it disagrees with the state you
    picked. A zip typed with no state chosen fills the state in; a chosen state is never overwritten.
  - The photo button reads *Add photo* when there is none (the draft's `FALLBACK_AV` silhouette is not a photo).
- **Onboarding** (`lib/Onboarding.jsx`, first run and *Edit areas, disciplines & grades*): home area, disciplines, and
  *Your grades*: Sport, Trad and Boulder always, plus **Ice, Mixed and Aid once that discipline is tapped** (or a grade
  is already on file), on the profile editor's `PROFILE_GRADES` ladders. Those three are saved to `climb_grades`, merged
  with any lead/follow role already there, by the same `saveProfile` call as the rest.
- **Add a photo from Profile**: with no photo, the Profile header's avatar carries a **+** and opens the photo picker itself
  (`avaAdding`); it uploads and saves the avatar column at once (`uploadProfilePhoto` + `saveProfileAvatar`), as the editor
  does. Not offered until the profile has been read, so a loading or failed read cannot replace a stored photo.
- **Résumé** (`Resume`): courses and training, plus an **Experience** list of notable climbs, most recent first, with a star for
  led/summited. Groups, in order: **Sport, Trad, Ice & Mixed, Alpine & Mountaineering, Bouldering, Scrambling**
  (the Objectives filter uses the same split except that it leads with Alpine and keeps Alpine, Mountaineering and Aid as separate chips). Sport = sport + top-rope; Trad = trad and everything that used to be "Crag";
  Scrambling = scrambling + hiking. A `discipline:"rock"` route resolves to its `style`. Exportable via `exportResume`.
  Visible to others only when the climber's `resume_public` allows it.
  **Stored (0342, `climber_resumes`)**: the headline, courses and past climbs you add by hand are saved to your account (`saveClimberResume`, debounced, after `useClimberResume` has hydrated them below the sign-in reset) and reach other climbers: their résumé shows your headline, courses (self-reported) and hand-added climbs ("added by hand") beside your public logged climbs. Until 2026-10-22 all three were session state, so another real climber's résumé showed only logged climbs. A failed read says so; it is not an empty résumé.
  Example climbers (`FILLER_CLIMBERS`, behind `DEMO_FILLERS`) carry their own `ticks` — a few seed routes in their disciplines, with a style from `RESUME_STYLES` (never Solo) — so their résumé is not empty; until 2026-10-21 it read "0 climbs · hasn't shared any climbs" under a card saying "23 climbs". The partner card's *N climbs* chip, which opens that résumé, counts what it lists (`resumeClimbCount`), not the stored `routesLogged` total (156 above a résumé of 9 for Maya); Ranks still reads `routesLogged`.
  An example climber's **catch record** has a total but no last-catch date, so its caption names how many partners signed those catches; it read "No catches logged yet" under "29 Total Catches" until 2026-10-23.
  *Edit résumé › Add a past climb* asks how you climbed it from a list per discipline (`RESUME_STYLES`): routes offer Lead / Onsight / Flash / Redpoint / Follow / Top-rope (trad and ice add Solo; alpine and ice add Swapped leads), boulders Send / Flash, mountaineering Summit / Lead / Follow / Solo, scrambling Summit / Completed / Solo. Changing the discipline resets a style the new one lacks.
- **No trust score** (removed 2026-10-21, owner decision): no screen computes, shows, filters, sorts or gates on one. What a climber judges a partner by is the ✓ (verification), the vouches they received and their belay record. 0335 dropped `compute_trust_score` and `trust_scores_view` from the database too.
- **Verification** (0306): ✓ means you proved you read your inbox. Sign-up's autoconfirm no longer counts. `VerifyEmailPanel` on Profile emails a one-time code (`sendEmailCode`), you type it (`confirmEmailCode`) or tap the link in the same email, and `verifyMyEmail` writes the record; the server's `verify_my_email()` accepts only a session whose `amr` shows a code, link or reset link from the last 30 minutes. Your own ✓ comes from the record (`useVerificationRecords`), never the session; a failed read decides nothing and hides the "Verify" prompts (`verificationUnavailable`). Until a mail provider (SMTP) is connected, Supabase's built-in mailer only delivers to the project's team, and the panel says so. **There is no ID verification** (0339, owner decision 2026-10-21): no screen asks for an identity document, `verification_records` no longer accepts the kind `id`, and the unused client writer that could file one is gone. Email is the only verification a climber does.
- **Sign out** (Menu's *Sign out*, Settings' *Log out*): `signOut` ends the session on the server, drops every cached per-climber query, and goes back to signed-out. If the logout request cannot reach the server (offline, outage), it still signs THIS device out — supabase-js would otherwise keep the session while the app said "Signed out" — and the server-side refresh token simply expires.
- **Logging a catch**: `LogCatch` (`ClimbMatchCore.jsx`) asks who, which way, the climb (optional) and the date, then writes through `logBelajCatch`; the climb's id rides in `belay_catches.description` (the table has no route column) and is read back as `routeId`. Its climb picker (2026-10-21) searches the full catalog as you type (`useRouteSearch`, up to `ROUTE_PICK_LIM`), each row naming its crag and grade; finds a peak or crag by name and opens its climbs (`PlaceMatches`); offers *Browse by area* (`DbClimbPicker`); and with the box empty lists climbs *Climbed with* that partner (shared crews, logs naming them), your recent logged climbs and climbs you viewed recently. Since 2026-10-23 the sheet is portalled to `<body>`, capped at the visible screen (`100dvh`), and split in three: the header with the app's 48px `POP_CLOSE` ✕ pinned at the top, one scrolling body, and *Log catch* pinned at the foot above the home indicator (it was one `85vh` box, so on a phone the who-picker and the button sat under the browser bars). **Who** offers your partners (friends and past crew-mates) and a search of every climber with a profile (`useClimberSearch`: by @username, or by name only when they show it publicly; blocked climbers and you are left out); another climber's profile offers *Log a belay catch* for any real account, while *Vouch* keeps the friends-or-crew gate.
- **A catch counts once BOTH climbers have recorded it** (0361, the Strava "add others" model): `confirmed_catches()` keeps a (belayer, climber, day) only when the belayer and the climber have each filed a row, and `counted_catch_count`, `belay_ledgers` and the rank board all read it. Whoever logs it first, the other's *Confirm* files their own copy, and the list folds the two into one row (`catchHasTwin`); a one-sided row says it is waiting. A climb log's caught fall no longer counts on its own. The insert trigger `guard_belay_catch_parties` refuses a catch with yourself or with a climber who blocked you. Until 0361 the caught climber's word alone counted, so anyone could add catches to someone else's Belay board.
- **Vouches**: `GiveVouch` (`lib/GiveVouch.jsx`) writes through `giveVouch` in `lib/db.js`. The sheet is portalled
  above a climber's profile (z 9850 over `FullProfile`'s 9800), and the profile and the Friends list stay OPEN beneath
  it, so closing or posting returns you to where you vouched from; App prefetches its chunk when a profile opens.
  (It used to draw at z 220, under most overlays, so callers closed theirs first and whatever else was open, such as
  the résumé, showed instead.) Its climb picker searches the DB catalog (`useRouteSearch`) and stores the route NAME
  in the vouch's `reason` JSON. Skills come from `SKILLS`/`SKILL_GROUPS` in core (32 in six groups since
  2026-10-21; keys are never renamed or reused), the same list the profile editor's *Safety skills* uses.
- **The ✕ on another climber's profile** sticks to the top while the profile scrolls (zero-height sticky row,
  `POP_CLOSE_MEDIA`; the card is `overflow:clip` because `hidden` would stop sticky working, which is also why the
  résumé's "sticky" header never stuck until now).
- **Another climber's belay record** (0315): FullProfile's Safety tab reads `belay_ledgers()` (`useBelayLedgers`) — the catches that count on the Belay board (`counted_catch_count`), the climbers caught and the last catch. `CatchLedger`'s `otherReal` branch shows no High-Factor tile: nothing records a fall's severity.
- **Profile photos**: `uploadProfilePhoto` (location stripped first, public `topo-photos` bucket), `saveProfilePhotos`,
  `saveProfilePhotoAlts`, `removeProfilePhoto` (own photo only).
  Every `topo-photos` upload passes `photoUploadOptions` (`lib/photoUpload.js`): a one-year cache, since a photo's path is
  unique and never overwritten. The default was one hour, and the resized copies (`photoThumb`) inherit it, so an hour after
  a climber last looked, the Profile's avatar and strip were each resized again before they drew (0.6–1.1 s each, measured
  2026-10-21; 50–65 ms cached). After an upload, `warmThumbs` requests the avatar and strip sizes so the first look is cached too.
  Avatars (`Av`, and the stacked avatar strips) load EAGERLY, never `loading="lazy"`: a lazy image inside the
  `#appscroll` pane is requested only once it is on screen, so every avatar used to start loading as it scrolled in,
  after its row's text had drawn. A cold thumbnail costs about as much as a cold original (0.3–0.6 s, measured
  2026-10-23), so the head start is what matters. `Av` draws the `FALLBACK_AV` silhouette behind the photo while it loads.
- **First-run setup** (`lib/Onboarding.jsx`, opened once per device for an account with no disciplines — `lib/onboard-pref.js`; the Home card and *Replay the tour* reopen it): full screen, one question per step with a progress bar, ← Back and *Skip setup*: welcome → **photo** (signed in only: *Use my Google photo* when the session carries a Google picture, `user_metadata.avatar_url`, copied into our own storage, or choose one; saved at once with `saveProfileAvatar`) → **home area** (*Use my current location*: `homeFromDevice` in `lib/homeFromDevice.js` rounds the position to ~1 km, asks the map search's place-name lookup for the town, fills "City, ST", and offers the found zip for partner search behind a ticked box; never stores the position) → **climbing** (disciplines, required; grades) → **about you** (gender, optional) → **alerts** (the three Settings › Notifications switches themselves). `onFinish` writes the same columns `saveEdit` does, plus the zip through `saveMyZip`. Opened over a profile that already has disciplines it is the climbing step alone. There are no phone push notifications to ask for: the alerts step governs the in-app list.
- **Gender** (0359, `profiles.gender`: `woman` / `man` / `non_binary`, NULL = prefer not to say): asked in setup and in the profile editor, optional; shown beside the home area on your profile and on the one other climbers open (`genderLabel`, `GENDERS` in core). Partner rows from a name or browse read carry it (`PARTNER_COLS`); `partners_near` rows do not yet. Nothing filters on it.
- **Settings**: units (imperial/metric), date format, notification switches, visibility switches (show full name `show_name`,
  `discoverable`, résumé visibility, trip-report visibility incl. the bulk `setAllMyTripReportVisibility`, mutual friends,
  visible while browsing), emergency contact, sign out.
- **Settings is four pages** (Facebook's layout): the sheet lists *Privacy & safety*, *Notifications*, *Your data & account*
  and *Legal & help*; each opens full screen with ← Back (`settingsPrivacyOpen`, `settingsNotifsOpen`, `settingsDataOpen`,
  `settingsLegalOpen`). Privacy & safety: every visibility and who-can-reach-you control, the inbox filter, the résumé switch,
  restricted and blocked climbers. Notifications: the three switches. Your data & account: sign in/out, Edit profile, the guide
  entries, Edit areas/disciplines/grades, Your conditions, Readiness defaults, units and date format (*Display*), then export,
  opt out and delete. Legal & help: the four documents and How ClimbMatch works.
  When the Terms or Privacy Policy change, a signed-in account sees `PolicyUpdateNotice` pinned to the bottom (Read Terms ·
  Read Privacy · I accept; not dismissible). *I accept* records the version (`acceptCurrentPolicy`) and then closes the notice
  AND any document it opened, returning the climber to the app.
  The Accessibility document (`lib/LegalView.jsx`, its own `ACCESS_UPDATED` date) ends in a *Report an accessibility problem* form
  (`AccessReportForm` → `fileAccessibilityReport` → `file_accessibility_report()`, 0343/0354). A signed-out visitor can file one
  too, with an email to reply to: the sign-in screen links to the statement ("Accessibility — report a problem", `lib/AuthModal.jsx`),
  because the visitor who most needs the form may be the one who cannot get through sign-up. The owner sees open reports in
  Menu › Review › *Accessibility reports* (`AccessibilityReportQueue`, `lib/AccessibilityReports.jsx`, oldest first, with the
  address to reply to from `accessibility_report_queue()`), counted into the Accessibility reports tile badge (and the Menu button badge), and gets an email per report from
  `notify-accessibility-report` once Resend is configured. The statement promises a reply within 5 business days. Before 0343 the
  statement pointed at Feedback, which sends nothing. Four flags rather than one, so each page is
  its own overlay the browser walks open by name. `closeSettings` closes the sheet and any open page when a row leaves Settings.

- **The sign-in screen** (`lib/AuthModal.jsx`, `LoginScreen`): the live site opens on it (`LOGIN_FIRST` in `ClimbMatchCore.jsx`,
  set by `VITE_LOGIN_FIRST` in deploy.yml alongside `VITE_DEMO_AUTOLOGIN`), unless this device already holds a real session.
  *View as guest* (`onGuest`) enters the app with the sample content, remembered for the tab only (`markGuest`/`wasGuest` in
  `lib/auth.js`), so the next visit opens on sign-in again. *Sign in with Apple* and *Continue with Google* always render, Apple
  first at the same size (App Store guideline 4.8); a provider the Supabase project has not switched on yet
  (`useOAuthProviders`) answers a tap with "coming soon" instead of redirecting. *Create account* asks for the email and the
  password twice and refuses a mismatch before the request (paste is allowed in both).

- **Badges (trophy case)**: the profile's overview opens with *Badges · N* -- what that climber earned (`useBadges` + `trophies`, see logbook-crews-home.md); nothing for another climber with none, a one-line nudge on your own.

## 2. How it works
1. **Real vs seed.** `ME` (`ClimbMatchCore.jsx`) is the seed global. `App` re-copies hook state onto it each render (legacy hack; do not extend).
   When signed in, `getProfile(id)` (`lib/auth.js`, `profiles` select `*`; `PGRST116` zero-rows returns `null`, any other error throws) hydrates `profile` (`useState` + `setProfile`)
   and the rest of the app reads it through `meLive`. The sign-in reset zeroes `ME`, so new code spreads `meLive` rather than `ME`.
2. **Cold load**: until `getProfile()` lands `ME.name` is the placeholder "Climber"; the Today greeting uses the name this device remembered for the account, else the session's sign-up name, never the placeholder.
   App paints a blank shell until `useSession` first answers (`session===undefined`) even with demo autologin on, as production is, or the demo climber's home flashes for a frame before the account's.
3. **Edit**: opening the editor seeds `editDraft`; `saveEdit` normalises it (`FALLBACK_AV` avatar placeholder becomes `""`, never stored; `setMyWeek(d.availWeek)`),
   then calls `saveProfile(id, fields)` (`lib/auth.js`), a PATCH of whatever object it is handed that invalidates every cached profile reader (`authProfileReaders`).
   Because it PATCHes a partial object blindly, a failed profile read must not open the editor (`check:profile-edit-gate`) and the photo strip uses
   its own one-column write (`saveProfilePhotos`). The **avatar** is not drafted either: "Change photo" uploads and then writes `profiles.avatar`
   at once (`saveProfileAvatar`, one column), and "Remove photo" clears it at once (`removeProfileAvatar`); both tell App through `onAvatarChange`.
   It used to wait for Save, so Cancel dropped an uploaded photo, and Save is disabled until the climber has a username, which no signup sets
   (`handle_new_user` stores only `id, name`). The empty-username reason now shows without touching the field.
   Walked end to end by `scripts/oneoff/probe-profile-photos-stick.mjs` (fixture accounts, headless Chrome).
4. **Other climbers**: `useFullProfile(userId)` and `fetchProfilesByIds` (`lib/db.js`) feed `FullProfile` / `Resume`, and `useClimberResume(userId)` their résumé's hand-written parts (0342); `profiles` is public read, blocked users cannot read it (0095).
5. **Résumé groups**: `Resume` maps `GROUPS` (the six labels above) over the climber's ticks; each tick resolves to a group via its discipline (`catOf`).
   Seed ticks hand-tagged `kind:"Crag"`/`"Other"` were re-tagged Trad/Scrambling in #2415, otherwise they matched no group and vanished.
6. **Units / date**: `units` and `dateFmt` are `App` state; each render calls `__set_UNITS(units)` and `__set_DLOCALE(dateFmtToLocale(dateFmt))`
   so module-level `UNITS` / `DLOCALE` (read by formatters) follow. Stored on-device by `loadUnits`/`saveUnits` (`lib/units-pref.js`, key `climbmatch-units`)
   and `loadDateFmt`/`saveDateFmt` (`lib/date-pref.js`); `currentDateLocale()` reads it outside React.
7. **Notification and browse switches** are device-local flag sets: `loadNotifPrefs`/`saveNotifPrefs` (`lib/notif-pref.js`, `climbmatch-notif-prefs`),
   `visibleWhileBrowsingPref`/`saveVisibleWhileBrowsing` (`lib/browse-visibility-pref.js`), built on `lib/prefs.js` (`defineFlagSet`). Onboarding shown-once: `lib/onboard-pref.js`.
8. **Your counted catches**: `useMyTrustCounts` (RPC `my_trust_counts`, 0203) feeds the Belay & Catch Record's counted total.

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `profile`/`setProfile`, `editDraft`, `saveEdit`, `settingsOpen`, `menuOpen`, `units`/`dateFmt`, `meLive`, `myVerificationQ`, `FALLBACK_AV` |
| `ClimbMatchCore.jsx` | `ME`, `UNITS`, `__set_UNITS`, `__set_DLOCALE`, `FullProfile`, `Resume`, `exportResume` |
| `lib/EditProfileScreen.jsx` | `EditProfileScreen` (profile editor, zip field) |
| `lib/auth.js` | `getProfile`, `saveProfile`, `useSession`, `signOut`, `sendEmailCode`, `confirmEmailCode`, `inboxProofFresh` |
| `lib/VerifyEmailPanel.jsx` | `VerifyEmailPanel` (emailed-code verification on Profile, 0306) |
| `lib/db.js` | `useClimberResume`, `saveClimberResume`, `uploadProfilePhoto`, `saveProfilePhotos`, `saveProfileAvatar`, `saveProfilePhotoAlts`, `removeProfilePhoto`, `useFullProfile`, `useMyZip`, `useMyEmergencyContact`, `useMyTrustCounts`, `useVerificationRecords`, `giveVouch`, `setAllMyTripReportVisibility`, `fetchProfilesByIds` |
| `lib/GiveVouch.jsx` | vouch sheet |
| `lib/Onboarding.jsx` | `Onboarding` (first-run setup) |
| `lib/homeFromDevice.js` | `homeFromDevice` (onboarding's *Use my current location*) |
| `lib/LegalView.jsx` | `LegalView` (Terms, Privacy, Guidelines, Accessibility), `AccessReportForm`, `ACCESS_UPDATED` |
| `lib/AppFeedback.jsx` | `FeedbackForm`, `RateForm` (the Menu's Feedback and Rate app sheets), `AppFeedbackQueue` (Menu › Review › Feedback & ratings), `devicePlatform`, `storeListing`, `APP_VERSION` |
| `lib/AccessibilityReports.jsx` | `AccessibilityReportQueue` — the owner's queue of accessibility reports in Menu › Review |
| `supabase/functions/notify-accessibility-report/index.ts` | emails the owner when a report is filed (needs `RESEND_API_KEY`) |
| `lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`, `lib/inbox-pref.js`, `lib/onboard-pref.js`, `lib/prefs.js` | device-local preference modules |

## 4. Data
- **Supabase tables**: `profiles` (0009; `show_name` 0175; `gender` 0359; `discoverable` 0104/0110; `resume_public` 0177; certifications 0181), `climber_resumes` (0342: owner, or anyone while `resume_public`), `profile_zips` (owner-only) + `zip_centroids` (0189),
  `verification_records` (policies 0058; `verify_my_email()` 0085, inbox proof 0306), vouches, `my_trust_counts` (0203; the counts only — `compute_trust_score` was dropped in 0335), `blocked_users` (0088), `accessibility_reports` (0343; since 0354 filed only through `file_accessibility_report()`, guests included, with `contact_email`; read own / admin updates; admin list via `accessibility_report_queue()`), `app_feedback` (0365: Feedback notes and app ratings, filed only through `file_app_feedback()`, guests included; read own / admin updates; admin list via `app_feedback_queue()`, rating average via `app_rating_summary()`, each account's latest rating once), storage bucket `topo-photos` for profile photos.
- **Device-local (localStorage)**: units, date format, notification switches, visible-while-browsing, onboarding-prompted.
  These do **not** follow a climber to another device.
- **Seed / in-memory**: `ME`, `CLIMBERS`/`FILLER_CLIMBERS` (gated by `DEMO_FILLERS`); seed résumé ticks (`ME.ticks`) are cleared by the sign-in reset.
  Signed-out or `USE_DB` off, everything on this tab is session state.

## 5. Connections
- **Partners**: `discoverable`, zip, `avail_week`, `hiking_speed_ft_hr` and verification feed `lib/PartnerSearch.jsx` and `compat()`.
- **Logbook**: résumé Experience is built from logged climbs; trip-report visibility is set here and ONLY here (the log form has no chooser since 2026-10-21). A non-public report still feeds the route's conditions anonymously (0329).
- **Crews / social**: `FullProfile` actions (connect, message, form crew, vouch); blocks hide profiles; emergency contact feeds float plans.
- **Leaderboards**: `lib/Leaderboards.jsx` reads `meLive`; ranking visibility (0177). How Ranks scores: `docs/features/ranks.md`.
- **Whole app**: `UNITS`/`DLOCALE` change every distance, elevation and date formatter.

## 6. Guards
All present in `package.json`: `check:profile-edit-gate`, `check:profile-draft-persists`, `check:profile-claims`, `check:photo-removal`,
`check:verification-fallback`, `check:visibility-switches`, `check:notification-switches`,
`check:onboarding-reach`, `check:real-profile-rows`, `check:policy-claims`, `check:units`, `check:date-locale`.
Notes: `docs/guards/settings-and-persistence.md`, `honesty-claims.md`, `units-and-formatting.md`, `seed-and-identity.md`, `outage-and-read-failures.md`.

## 7. Last significant change
- **Feedback and Rate app actually reach the team** (0365) — Feedback sends a note (Something's broken / An idea / Something else, optional reply email for guests) instead of only copying it; Rate app records 1–5 stars and an optional comment. The owner reads both in Menu › Review › *Feedback & ratings*, with the app's average rating on top. **No review gating**: Apple 5.6.1 and Google Play forbid sending only happy raters to the store, which is what the old sheet's 4–5 stars → thanks / 1–3 → feedback split did; when a store listing exists for the climber's device (`VITE_APP_STORE_ID` for iPhone/iPad, `VITE_PLAY_STORE_ID` for Android, both unset today because ClimbMatch is a web app), *Rate us on the App Store / Google Play* shows first, to everyone. About us lost its "demo build" lines and gained Send feedback / Rate ClimbMatch buttons and the real version.
- **Accessibility reports from guests, and a queue** (0354) — a signed-out visitor can file one with an email; the owner sees them in Menu › Review and its tile badge; the statement promises a reply within 5 business days.
- **Accessibility reports reach someone** (0343) — the statement's report form saves to `accessibility_reports`; it used to point at the Feedback button, which only copies to the clipboard.
- **Profile: Vouches you’ve received** — what partners said about you (ratings, words, skills, would climb again) shows on your own Profile tab above the vouches you gave, as LinkedIn keeps Received above Given; it was reachable only through View public profile, the tab showed just a count.
- **Menu: Your crews + shortcuts first** — a Crews tile and a *Your crews* list; both shortcut lists sit above the tiles.
- **Menu: Saved & lists + Edit profile** — saved areas, saved searches, challenges and climbing lists get Menu tiles; Edit profile sits beside View profile on the card.
- **Menu lists your groups** — a *Your groups* section with up to five, newest post first, each opening the group.
- **Résumé past-climb style per discipline** — a scramble no longer offers Lead or Top rope (`RESUME_STYLES`).
- **Real climbers, batch 4** (0315) — another real climber's belay record reaches their profile.
Real climbers, batch 3: the résumé header, export title and "hasn't shared" lines, and the share card (`ShareCard`), name a real climber — you included — by `pubName`; `meLive` carries `showName` when signed in.
- **#2415** — Résumé Experience groups now Sport · Trad · Ice & Mixed · Alpine & Mountaineering · Bouldering · Scrambling (was Crag … Other); seed ticks re-tagged (`ClimbMatchCore.jsx` only).

## 8. Known gaps
- **No app store listing yet.** Rate app names a store only once `VITE_APP_STORE_ID` / `VITE_PLAY_STORE_ID` are set in the deploy env (`.github/workflows/deploy.yml`); until then ratings come only to the team. A new feedback note has no email alert, only the Review tile badge.
- The email alert for a new accessibility report (`notify-accessibility-report`) sends nothing until `RESEND_API_KEY` is set (the company-email wait in pending actions); until then the Menu › Review tile badge is the only signal, and only while the owner has the app open.
- Units, date format, notification and browse-visibility switches live in localStorage only (`lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`): not synced across devices.
- `saveProfile` PATCHes any object it is handed; safety depends on callers sending only loaded fields (enforced by `check:profile-edit-gate`, not by the function).
- `ME.* = ...` mutation per render remains a second source of truth that the codebase asks not to extend.
