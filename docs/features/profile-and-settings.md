# Profile, résumé and settings — the `me` tab and the Settings sheet

`tab==="me"` in `ClimbMatch.jsx`. It is **not on the bottom bar** (NAV marks it `bar:false`); it opens from the Menu
(`menuOpen`, the avatar button top left), whose "You" card leads here. Settings is a separate full-screen dialog
(`settingsOpen` / `setSettingsOpen`, `aria-label="Settings"`) also opened from the Menu. A climber's own or another's
profile can also open as `FullProfile` and `Resume` overlays from anywhere (partner rows, crews, leaderboards).

## 1. What it does today
- **Profile (`me`)**: your header, trust score, verification, vouches, photo strip, availability and a link into edit.
- **Edit profile**: `lib/EditProfileScreen.jsx` over the `editDraft` state; `saveEdit` writes the draft back (see 2).
  Includes the owner-only zip code (feeds partner search distance; others never see it).
- **Résumé** (`Resume`): courses and training, plus an **Experience** list of notable climbs, most recent first, with a star for
  led/summited. Groups, in order: **Sport, Trad, Ice & Mixed, Alpine & Mountaineering, Bouldering, Scrambling**
  (the Objectives filter uses the same split except that it leads with Alpine and keeps Alpine, Mountaineering and Aid as separate chips). Sport = sport + top-rope; Trad = trad and everything that used to be "Crag";
  Scrambling = scrambling + hiking. A `discipline:"rock"` route resolves to its `style`. Exportable via `exportResume`.
  Visible to others only when the climber's `resume_public` allows it.
- **Trust score**: `TrustBadge` tier chip on the headline; a "what feeds your score" breakdown (`trustFactors`) that adds up to the headline.
  The authoritative number is the server's `compute_trust_score`; the highest earnable score is 84.
- **Verification** (0306): ✓ means you proved you read your inbox. Sign-up's autoconfirm no longer counts. `VerifyEmailPanel` on Profile emails a one-time code (`sendEmailCode`), you type it (`confirmEmailCode`) or tap the link in the same email, and `verifyMyEmail` writes the record; the server's `verify_my_email()` accepts only a session whose `amr` shows a code, link or reset link from the last 30 minutes. Your own ✓ comes from the record (`useVerificationRecords`), never the session; a failed read decides nothing and hides the "Verify" prompts (`verificationUnavailable`). Until a mail provider (SMTP) is connected, Supabase's built-in mailer only delivers to the project's team, and the panel says so.
- **Vouches**: `GiveVouch` (`lib/GiveVouch.jsx`) writes through `giveVouch` in `lib/db.js`.
- **Profile photos**: `uploadProfilePhoto` (location stripped first, public `topo-photos` bucket), `saveProfilePhotos`,
  `saveProfilePhotoAlts`, `removeProfilePhoto` (own photo only).
- **Settings**: units (imperial/metric), date format, notification switches, visibility switches (show full name `show_name`,
  `discoverable`, résumé visibility, trip-report visibility incl. the bulk `setAllMyTripReportVisibility`, mutual friends,
  visible while browsing), emergency contact, sign out.

## 2. How it works
1. **Real vs seed.** `ME` (`ClimbMatchCore.jsx`) is the seed global. `App` re-copies hook state onto it each render (legacy hack; do not extend).
   When signed in, `getProfile(id)` (`lib/auth.js`, `profiles` select `*`; `PGRST116` zero-rows returns `null`, any other error throws) hydrates `profile` (`useState` + `setProfile`)
   and the rest of the app reads it through `meLive`. The sign-in reset zeroes `ME`, so new code spreads `meLive` rather than `ME`.
2. **Cold load**: until `getProfile()` lands `ME.name` is the placeholder "Climber"; the Today greeting remembers the name per device to avoid a flash.
3. **Edit**: opening the editor seeds `editDraft`; `saveEdit` normalises it (`FALLBACK_AV` avatar placeholder becomes `""`, never stored; `setMyWeek(d.availWeek)`),
   then calls `saveProfile(id, fields)` (`lib/auth.js`), a PATCH of whatever object it is handed that invalidates every cached profile reader (`authProfileReaders`).
   Because it PATCHes a partial object blindly, a failed profile read must not open the editor (`check:profile-edit-gate`) and the photo strip uses
   its own one-column write (`saveProfilePhotos`).
4. **Other climbers**: `useFullProfile(userId)` and `fetchProfilesByIds` (`lib/db.js`) feed `FullProfile` / `Resume`; `profiles` is public read, blocked users cannot read it (0095).
5. **Résumé groups**: `Resume` maps `GROUPS` (the six labels above) over the climber's ticks; each tick resolves to a group via its discipline (`catOf`).
   Seed ticks hand-tagged `kind:"Crag"`/`"Other"` were re-tagged Trad/Scrambling in #2415, otherwise they matched no group and vanished.
6. **Units / date**: `units` and `dateFmt` are `App` state; each render calls `__set_UNITS(units)` and `__set_DLOCALE(dateFmtToLocale(dateFmt))`
   so module-level `UNITS` / `DLOCALE` (read by formatters) follow. Stored on-device by `loadUnits`/`saveUnits` (`lib/units-pref.js`, key `climbmatch-units`)
   and `loadDateFmt`/`saveDateFmt` (`lib/date-pref.js`); `currentDateLocale()` reads it outside React.
7. **Notification and browse switches** are device-local flag sets: `loadNotifPrefs`/`saveNotifPrefs` (`lib/notif-pref.js`, `climbmatch-notif-prefs`),
   `visibleWhileBrowsingPref`/`saveVisibleWhileBrowsing` (`lib/browse-visibility-pref.js`), built on `lib/prefs.js` (`defineFlagSet`). Onboarding shown-once: `lib/onboard-pref.js`.
8. **Trust inputs**: `useMyTrustCounts` (counts for the breakdown), compared to the server number; `trustFactors` builds the local list.

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `profile`/`setProfile`, `editDraft`, `saveEdit`, `settingsOpen`, `menuOpen`, `units`/`dateFmt`, `meLive`, `myVerificationQ`, `FALLBACK_AV` |
| `ClimbMatchCore.jsx` | `ME`, `UNITS`, `__set_UNITS`, `__set_DLOCALE`, `FullProfile`, `Resume`, `TrustBadge`, `trustFactors`, `exportResume` |
| `lib/EditProfileScreen.jsx` | `EditProfileScreen` (profile editor, zip field) |
| `lib/auth.js` | `getProfile`, `saveProfile`, `useSession`, `signOut`, `sendEmailCode`, `confirmEmailCode`, `inboxProofFresh` |
| `lib/VerifyEmailPanel.jsx` | `VerifyEmailPanel` (emailed-code verification on Profile, 0306) |
| `lib/db.js` | `uploadProfilePhoto`, `saveProfilePhotos`, `saveProfilePhotoAlts`, `removeProfilePhoto`, `useFullProfile`, `useMyZip`, `useMyEmergencyContact`, `useMyTrustCounts`, `useVerificationRecords`, `giveVouch`, `setAllMyTripReportVisibility`, `fetchProfilesByIds` |
| `lib/GiveVouch.jsx`, `lib/Onboarding.jsx` | vouch sheet; first-run onboarding |
| `lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`, `lib/inbox-pref.js`, `lib/onboard-pref.js`, `lib/prefs.js` | device-local preference modules |

## 4. Data
- **Supabase tables**: `profiles` (0009; `show_name` 0175; `discoverable` 0104/0110; `resume_public` 0177; certifications 0181), `profile_zips` (owner-only) + `zip_centroids` (0189),
  `verification_records` (policies 0058; `verify_my_email()` 0085, inbox proof 0306), vouches and `compute_trust_score` (0038; ranking-aware revisions 0194/0203), `blocked_users` (0088), storage bucket `topo-photos` for profile photos.
- **Device-local (localStorage)**: units, date format, notification switches, visible-while-browsing, onboarding-prompted.
  These do **not** follow a climber to another device.
- **Seed / in-memory**: `ME`, `CLIMBERS`/`FILLER_CLIMBERS` (gated by `DEMO_FILLERS`); seed résumé ticks (`ME.ticks`) are cleared by the sign-in reset.
  Signed-out or `USE_DB` off, everything on this tab is session state.

## 5. Connections
- **Partners**: `discoverable`, zip, `avail_week`, `hiking_speed_ft_hr` and verification feed `lib/PartnerSearch.jsx` and `compat()`.
- **Logbook**: résumé Experience is built from logged climbs; trip-report visibility is set here.
- **Crews / social**: `FullProfile` actions (connect, message, form crew, vouch); blocks hide profiles; emergency contact feeds float plans.
- **Leaderboards**: `lib/Leaderboards.jsx` reads `meLive`; ranking visibility (0177).
- **Whole app**: `UNITS`/`DLOCALE` change every distance, elevation and date formatter.

## 6. Guards
All present in `package.json`: `check:profile-edit-gate`, `check:profile-draft-persists`, `check:profile-claims`, `check:photo-removal`,
`check:verification-fallback`, `check:trust-breakdown`, `check:untracked-factors`, `check:visibility-switches`, `check:notification-switches`,
`check:onboarding-reach`, `check:real-profile-rows`, `check:policy-claims`, `check:units`, `check:date-locale`.
Notes: `docs/guards/settings-and-persistence.md`, `honesty-claims.md`, `units-and-formatting.md`, `seed-and-identity.md`, `outage-and-read-failures.md`.

## 7. Last significant change
- **#2415** — Résumé Experience groups now Sport · Trad · Ice & Mixed · Alpine & Mountaineering · Bouldering · Scrambling (was Crag … Other); seed ticks re-tagged (`ClimbMatchCore.jsx` only).

## 8. Known gaps
- Units, date format, notification and browse-visibility switches live in localStorage only (`lib/units-pref.js`, `lib/date-pref.js`, `lib/notif-pref.js`, `lib/browse-visibility-pref.js`): not synced across devices.
- `saveProfile` PATCHes any object it is handed; safety depends on callers sending only loaded fields (enforced by `check:profile-edit-gate`, not by the function).
- `ME.* = ...` mutation per render remains a second source of truth that the codebase asks not to extend.
