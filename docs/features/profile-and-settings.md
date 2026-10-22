# Profile, résumé and settings — the `me` tab and the Settings sheet

`tab==="me"` in `ClimbMatch.jsx`. It is **not on the bottom bar** (NAV marks it `bar:false`); it opens from the Menu
(`menuOpen`, the avatar button top left), whose "You" card leads here. Settings is a separate full-screen dialog
(`settingsOpen` / `setSettingsOpen`, `aria-label="Settings"`) also opened from the Menu. A climber's own or another's
profile can also open as `FullProfile` and `Resume` overlays from anywhere (partner rows, crews, leaderboards).

## 1. What it does today
- **Profile (`me`)**: your header (verification, photo strip, résumé and public-profile buttons) stays on top; under it, tabs (`meTab`, read as `meTabOn`): **Profile** (At a glance, availability, speed, certifications, vouches you’ve given, Edit profile) · **Activity** (Year in Climbing banner, Your Logbook, sends by grade, Belay & Catch Record, reports you’ve filed) · **Review** (admins only: the eight safety and catalog queues). A catch notification opens Activity, Home’s availability gap opens Profile, and the admin banner and the Menu card (when items wait) open Review. Walks reach a tab with `?mt=` (overlay scaffold).
- **Menu card and tiles**: the card (avatar, name) opens Profile; under it, for a signed-in or demo climber, *View profile* and *Edit profile* (`openEdit`) sit side by side, then availability and the emergency contact. Tile groups: *Plan & log* (Log a climb, Your ascents, Add a climb, Float plans, Best day, Your conditions, Downloads, Hire a guide) · *Saved & lists* (Saved areas and Saved searches open Logbook › Saved with `savedKind` set to `areas`/`searches`; Everything saved; Objectives & your lists; Challenges; Climbing lists sets `challengeListsAt`, which `Challenges` reads as `listsAt` to open its curated-lists dialog) · *Yours* (Friends, Crews · N, Groups, Requests, Listed areas, contributions, Year in Climbing, share/invite, guide).
- **Menu › Your crews** (signed in or demo, under the card, above *Your groups* and the tiles): up to five of `activeCrews` — the Crews tab's own list — each named by `placeOf` (its route or area) with its unread count (`crewUnread`); a tap opens that crew (`setOpenCrewId`) on the Crews tab, and *See all ›* appears past five. No active crews means no section; a failed read (`crewsUnavailable`) says so.
- **Menu › Your groups** (signed in or demo, under *Your crews*, above the tiles): up to five of the groups you are in (`myGroupsNow`, ordered by `groupsByLastPost`), each with its new-post count (`groupUnreadN`); a tap opens that group (`setOpenGroupId`) over Groups › Your groups, and *See all ›* appears past five. No groups means no section; a failed read (`groupsUnavailable`) says so instead of an empty list.
- **Edit profile**: `lib/EditProfileScreen.jsx` over the `editDraft` state; `saveEdit` writes the draft back (see 2).
  Includes the owner-only zip code (feeds partner search distance; others never see it).
- **Résumé** (`Resume`): courses and training, plus an **Experience** list of notable climbs, most recent first, with a star for
  led/summited. Groups, in order: **Sport, Trad, Ice & Mixed, Alpine & Mountaineering, Bouldering, Scrambling**
  (the Objectives filter uses the same split except that it leads with Alpine and keeps Alpine, Mountaineering and Aid as separate chips). Sport = sport + top-rope; Trad = trad and everything that used to be "Crag";
  Scrambling = scrambling + hiking. A `discipline:"rock"` route resolves to its `style`. Exportable via `exportResume`.
  Visible to others only when the climber's `resume_public` allows it.
  *Edit résumé › Add a past climb* asks how you climbed it from a list per discipline (`RESUME_STYLES`): routes offer Lead / Onsight / Flash / Redpoint / Follow / Top-rope (trad and ice add Solo; alpine and ice add Swapped leads), boulders Send / Flash, mountaineering Summit / Lead / Follow / Solo, scrambling Summit / Completed / Solo. Changing the discipline resets a style the new one lacks.
- **No trust score** (removed 2026-10-21, owner decision): no screen computes, shows, filters, sorts or gates on one. What a climber judges a partner by is the ✓ (verification), the vouches they received and their belay record. 0335 dropped `compute_trust_score` and `trust_scores_view` from the database too.
- **Verification** (0306): ✓ means you proved you read your inbox. Sign-up's autoconfirm no longer counts. `VerifyEmailPanel` on Profile emails a one-time code (`sendEmailCode`), you type it (`confirmEmailCode`) or tap the link in the same email, and `verifyMyEmail` writes the record; the server's `verify_my_email()` accepts only a session whose `amr` shows a code, link or reset link from the last 30 minutes. Your own ✓ comes from the record (`useVerificationRecords`), never the session; a failed read decides nothing and hides the "Verify" prompts (`verificationUnavailable`). Until a mail provider (SMTP) is connected, Supabase's built-in mailer only delivers to the project's team, and the panel says so.
- **Sign out** (Menu's *Sign out*, Settings' *Log out*): `signOut` ends the session on the server, drops every cached per-climber query, and goes back to signed-out. If the logout request cannot reach the server (offline, outage), it still signs THIS device out — supabase-js would otherwise keep the session while the app said "Signed out" — and the server-side refresh token simply expires.
- **Vouches**: `GiveVouch` (`lib/GiveVouch.jsx`) writes through `giveVouch` in `lib/db.js`.
- **Another climber's belay record** (0315): FullProfile's Safety tab reads `belay_ledgers()` (`useBelayLedgers`) — the catches that count on the Belay board (`counted_catch_count`), the climbers caught and the last catch. `CatchLedger`'s `otherReal` branch shows no High-Factor tile: nothing records a fall's severity.
- **Profile photos**: `uploadProfilePhoto` (location stripped first, public `topo-photos` bucket), `saveProfilePhotos`,
  `saveProfilePhotoAlts`, `removeProfilePhoto` (own photo only).
- **Settings**: units (imperial/metric), date format, notification switches, visibility switches (show full name `show_name`,
  `discoverable`, résumé visibility, trip-report visibility incl. the bulk `setAllMyTripReportVisibility`, mutual friends,
  visible while browsing), emergency contact, sign out.
- **Settings is four pages** (Facebook's layout): the sheet lists *Privacy & safety*, *Notifications*, *Your data & account*
  and *Legal & help*; each opens full screen with ← Back (`settingsPrivacyOpen`, `settingsNotifsOpen`, `settingsDataOpen`,
  `settingsLegalOpen`). Privacy & safety: every visibility and who-can-reach-you control, the inbox filter, the résumé switch,
  restricted and blocked climbers. Notifications: the three switches. Your data & account: sign in/out, Edit profile, the guide
  entries, Edit areas/disciplines/grades, Your conditions, Readiness defaults, units and date format (*Display*), then export,
  opt out and delete. Legal & help: the four documents and How ClimbMatch works. Four flags rather than one, so each page is
  its own overlay the browser walks open by name. `closeSettings` closes the sheet and any open page when a row leaves Settings.

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
4. **Other climbers**: `useFullProfile(userId)` and `fetchProfilesByIds` (`lib/db.js`) feed `FullProfile` / `Resume`; `profiles` is public read, blocked users cannot read it (0095).
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
| `lib/db.js` | `uploadProfilePhoto`, `saveProfilePhotos`, `saveProfileAvatar`, `saveProfilePhotoAlts`, `removeProfilePhoto`, `useFullProfile`, `useMyZip`, `useMyEmergencyContact`, `useMyTrustCounts`, `useVerificationRecords`, `giveVouch`, `setAllMyTripReportVisibility`, `fetchProfilesByIds` |
| `lib/GiveVouch.jsx`, `lib/Onboarding.jsx` | vouch sheet; first-run onboarding |
| `lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`, `lib/inbox-pref.js`, `lib/onboard-pref.js`, `lib/prefs.js` | device-local preference modules |

## 4. Data
- **Supabase tables**: `profiles` (0009; `show_name` 0175; `discoverable` 0104/0110; `resume_public` 0177; certifications 0181), `profile_zips` (owner-only) + `zip_centroids` (0189),
  `verification_records` (policies 0058; `verify_my_email()` 0085, inbox proof 0306), vouches, `my_trust_counts` (0203; the counts only — `compute_trust_score` was dropped in 0335), `blocked_users` (0088), storage bucket `topo-photos` for profile photos.
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
- **Menu: Your crews + shortcuts first** — a Crews tile and a *Your crews* list; both shortcut lists sit above the tiles.
- **Menu: Saved & lists + Edit profile** — saved areas, saved searches, challenges and climbing lists get Menu tiles; Edit profile sits beside View profile on the card.
- **Menu lists your groups** — a *Your groups* section with up to five, newest post first, each opening the group.
- **Résumé past-climb style per discipline** — a scramble no longer offers Lead or Top rope (`RESUME_STYLES`).
- **Real climbers, batch 4** (0315) — another real climber's belay record reaches their profile.
Real climbers, batch 3: the résumé header, export title and "hasn't shared" lines, and the share card (`ShareCard`), name a real climber — you included — by `pubName`; `meLive` carries `showName` when signed in.
- **#2415** — Résumé Experience groups now Sport · Trad · Ice & Mixed · Alpine & Mountaineering · Bouldering · Scrambling (was Crag … Other); seed ticks re-tagged (`ClimbMatchCore.jsx` only).

## 8. Known gaps
- Units, date format, notification and browse-visibility switches live in localStorage only (`lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`): not synced across devices.
- `saveProfile` PATCHes any object it is handed; safety depends on callers sending only loaded fields (enforced by `check:profile-edit-gate`, not by the function).
- `ME.* = ...` mutation per render remains a second source of truth that the codebase asks not to extend.
