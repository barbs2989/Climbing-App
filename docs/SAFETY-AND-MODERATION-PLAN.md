# Safety, moderation and app-store readiness — audit and plan (2026-10-07)

This is the audit behind the "friends + moderation" PR, and a **proposal** for the moderation system
the App Store and Google Play require. Nothing in Part 3 onward is built yet; it needs the owner's
approval (new features need sign-off, see memory `polish-only-features-need-approval`).

Line numbers are as of `fec36dec`; grep the symbol if they have moved.

---

## Part 1 — Friends: what was broken, and what this PR fixed

Measured two ways:

- **Code audit:** every friend control was traced from UI → handler → `lib/db.js` → table → RLS.
- **Live database probe** with three real accounts, using the anon key plus each climber's own JWT:
  `node scripts/oneoff/probe-friend-request-lifecycle.mjs`. It ends with **24 passed, 0 failed** after
  0257. Before 0257 it reported 13 passed and 6 behaviour gaps.

The 0087 policies already held. Nobody can forge a request, accept their own, answer or delete
someone else's, read a stranger's, or push an accepted friendship back to pending. The defects were
in the lifecycle and in the client.

| # | Defect | Fix |
|---|---|---|
| 1 | **Crew › Friends crashed the whole app** for a real account with 2+ un-friended partners on its logs. `Object.keys(byP).map(Number)` turned uuids into `NaN`, and the sort threw. | Partners are looked up through `useProfilesByIds`. Seed ids stay integers. "N to add" counts only who actually renders. Blocked climbers are excluded. |
| 2 | **Friend state was read once per sign-in.** New requests never appeared, the requester never saw an accept, and an unfriend never reached the other side. Pull-to-refresh said "Up to date" over all of it. | The hydration effect replaces the uuid half of `connections`, `friendReqIn` and `friendReqOut` on **every** read. `useMyConnections` polls every 60 s. |
| 3 | **False "You and X are now connected"** when the request had already been withdrawn. Decline and Remove had the same shape. | Accept, decline and remove first check that a real row exists. If not, they refetch and say the request is no longer open. |
| 4 | **"You already have a connection with X"** appeared on every duplicate-key (23505) error: crossed requests, your own earlier decline, your own pending request. | `_resolvePairClash` re-reads the row. It **accepts** a request they sent first, **re-asks** someone you declined earlier, or says your request is already out. |
| 5 | **Blocking did not end a friendship.** The block sheet promises "removes them as a friend and clears any friend requests". After a reload the friend was back. | **0257** adds a trigger on `blocked_users` that deletes the pair's `connections` row. The client re-reads, and hydration filters blocked ids. |
| 6 | **A blocked climber could still send friend requests** to their blocker, and the blocker's read returned them. | **0257** adds a `SECURITY DEFINER` guard that refuses a request across a block in either direction. Its message never says "block". |
| 7 | **The request note was silently dropped.** The Add-friend sheet offers a 300-character note, but there was no column. | **0257** adds `connections.note` (≤300 characters, readable only by the pair, immutable). It is sent, read back, and shown under Requests. |
| 8 | **Hidden real names leaked** in the Add-friend sheet, the crew-invite sheet, the Remove dialog, "Start a chat", "Note from …" and the block toast. | All use `pubFirst`/`pubName`, which honour "show my real name". |
| 9 | Friends-list search and A–Z sorting used the **hidden** real name, so searching the visible @handle found nothing. | Both use `pubName` plus the username. |
| 10 | **"0 online now"** appeared for real friends, though no presence system exists. | The chip renders only when friends carry presence data (seed). |
| 11 | The bell said **"You're all caught up"** when the friends read had failed. | It now says it couldn't load. |
| 12 | The mutual-friends ask was capped at 64 **sorted** ids, which could drop the profile you had just opened. | The open profile and the mutuals sheet are asked first. |
| 13 | Sign-out left the previous account's friends, requests and blocks in memory. | They are cleared on sign-out. |
| 14 | The Inbox message-request button said **"✓ Accept friend"** but sends a request. | It now reads "+ Add friend". |
| 15 | **Join a crew** printed **"undefined · undefined"** for a real crew. The finder ignored the route row App fetches for each crew, and one live crew points at a climb that has left the catalog (`bridalveil_falls`). Its member chips also printed hidden real names. | The finder reads the crew's own `_route`. A crew whose climb no longer exists is left out. The chips use `pubFirst`. |

**The browser walk is green on friends again.** `npm run check:new-climber-journey` had been failing
since 2026-09-30, because the walk clicked Remove without the confirm sheet #2024 added and expected
a disabled "Requested" where b46f3225 made it "Requested · undo". The walk is updated. It now proves
in a real browser that Remove deletes the row and survives a reload, and that a sent request is
pending, addressed correctly, and still known after a reload.

**Decline stays quiet, as on Facebook and LinkedIn.** The requester keeps seeing "Requested", and
can withdraw and ask again. Block is the hard stop. Nothing yet limits how often someone can
withdraw and re-ask; see Part 5.

**Not fixed here, deliberately:**

- **"Report this group"** shows a toast and writes nothing. PR **#2258** (another session) already
  replaces it with a real Report group / Report post dialog.
- **People-you-may-know is seed-only.** A real version needs a definer RPC; that is a feature (Part 5).
- **The message badge counts threads hidden under "friends & crew only".** This is a messaging defect,
  left for a messaging pass.

---

## Part 2 — Where the app stands against the store rules

### What the stores require

**Apple 1.2**, plus App Review's standard rejection checklist for social apps:

1. Users agree to terms (an EULA) that say there is **zero tolerance** for objectionable content or
   abusive users.
2. A **filter** for objectionable content.
3. A way to **flag** content.
4. A way to **block** users.
5. The developer **acts on reports within 24 hours** by removing the content and **ejecting the user**.
6. **Published contact information**.

Apple 5.1.1(v) also requires **in-app account deletion**.

**Google Play** UGC policy:

1. Terms accepted before anyone posts.
2. "Robust, effective, and ongoing" moderation.
3. In-app reporting and blocking.
4. Action against content and users.

Google Play's **Child Safety Standards** policy, if the app is listed as Social:

1. A published CSAE standards page.
2. An in-app feedback mechanism.
3. A CSAM process that reports to NCMEC.
4. A named child-safety contact.

Google Play also requires a **web URL for account deletion**.

### Measured against the app

| Requirement | Status | Evidence |
|---|---|---|
| Terms with zero-tolerance clause, affirmatively accepted | **PARTIAL** | Consent is only implied ("By creating an account… you agree", `lib/AuthModal.jsx:218`). There are no Community Guidelines and no zero-tolerance wording. `terms_accepted_version` is stamped for email sign-ups only; OAuth sign-ups get null. |
| Filter for objectionable content | **MISSING** | The only filter is a 17-word substring list applied to the username (`BADWORDS`, `ClimbMatchCore.jsx:2338`). Display names, bios, DMs, crew chat, group posts, comments, trip reports and every image are unfiltered. |
| Flag content | **PARTIAL** | A user can be reported (profile, Ranks), and so can a route photo (`content_reports`). Messages, crew chat, comments, group posts, trip reports, topos, reviews and lists cannot. A user report points at no content, and the admin cannot read a reported DM. |
| Block | **PRESENT, now stronger** | Enforced server-side for DMs (0088), crew invites (0094), profile reads (0095) and, from 0257, friend requests and friendships. **Not** enforced for crew chat, group invites, or hiding a blocked person's existing content from the blocker. |
| Act within 24 h | **MISSING** | Nobody is alerted. The only signal is a nav badge, refreshed every 2 minutes while the admin has the app open. There is a single admin and no SLA. |
| Remove content | **PARTIAL** | The admin can take down route photos only, and the storage file stays at its public URL (`lib/db.js` ~3154). They cannot remove comments, posts, trip reports, messages, profiles, topos, reviews or groups. |
| **Eject the user** | **MISSING, and contradicted by a standing decision** | No suspension or ban exists, by the 2026-08-19 decision (memory `moderation-outcomes-decided-no-suspension`). **Apple's checklist names this explicitly**, so the decision has to be revisited for listing. |
| Contact info | **MISSING** | "Email support is not set up in this demo build yet" (`ClimbMatch.jsx` ~1462). |
| In-app account deletion | **PARTIAL** | Writes a `data_requests` row that nothing processes. Several foreign keys with no ON DELETE action would block a hand delete: `crews.created_by`, `topos.created_by`, `content_reports.reporter`, `reviewed_by`. |
| Age | **PRESENT** | 18+ checkbox at sign-up (not stored). Recommend an 18+ store rating, since the app introduces strangers who then meet in person. |

**Claims to correct before submission:**

- Terms §8 and §10 say "We may suspend accounts", but nothing can (F15 in the legal packet).
- `GpsSubmissionModal` promises review in "24-48 hours".
- "Our moderators will take a look" on the group report; #2258 removes it.

### Update 2026-10-08: what phases 1–2 changed (owner approved the plan 2026-10-07)

The table above is the state measured on 2026-10-07. Since then:

| Requirement | Now | How |
|---|---|---|
| Flag content | **PRESENT** | `report_content()` (0263) covers DMs, crew chat, group posts and events, comments, trip reports, groups, topos, lists and profiles, with a server-side snapshot of what was reported. Group members can also report a post or comment to that group's own moderators (`group_reports`, 0260, #2277). |
| Act within 24 h | **PARTIAL** | The queue shows how long each report has waited. An admin-only Home banner counts waiting reports and appeals, red from 20 h. `notify-safety-report` (deployed) emails each report **once `RESEND_API_KEY` and `SAFETY_ALERT_EMAIL` are set — not yet**. |
| Remove content | **PRESENT** | `moderate_content()` removes, holds or restores; it is audited and closes every report about the item. Three independent reporters hold an item automatically. An admin can now delete a reported photo's file. |
| Eject the user | **PRESENT** | `set_account_standing()` (0264). **Suspend** leaves the account read-only for N days; it can still sign in to see why and appeal. **Ban** stops sign-in (`auth.users.banned_until`) and removes everything they posted. A restrictive write gate closes the hour an old token would otherwise live. Terms §8/§10 ("we may suspend") are now backed. |
| Statement of reasons + appeal | **PRESENT** | A restricted account sees the reason and end date on every tab. Removed content is labelled for its author. One-tap appeal for both; the reviewer reverses or keeps the decision. |
| Block | **PRESENT** | Plus group invites since 0260 (#2277). Crew chat and existing content are still not hidden from the blocker. |
| Filter | **PRESENT (term floor), AI layer ready** | 0265: every new or edited post, message, comment, trip report (once not private), group, topo and list is checked against `screening_terms` inside the write. A match is held and queued as "Automatic screening". Live probe: 13/13 (climbing jargon passes; word boundaries hold). The `screen-content` function (Claude Haiku 5.5 for text, AWS Rekognition for images) is deployed but **inert until keys are set** (see below). |
| Terms "I agree" (zero tolerance) | **PRESENT** | Community Guidelines added, with an explicit zero-tolerance clause and part of the Terms. A **required "I agree" checkbox** at sign-up, gated on both the email and Google paths. `POLICY_VERSION` 2026-10-08, so existing users get the update notice. |
| In-app account deletion | **PRESENT** | 0266 + `delete-account`: files, then contributions, then the auth user (everything else cascades; nine blocking foreign keys fixed). Live probe: 12/12, including the file's public URL going dead. Terms and Privacy updated to match. |
| Published contact info | **MISSING — needs your address** | Nothing lists a contact yet, deliberately: only an address someone actually reads should be published. |

### What only the owner can do (each switches a built feature on)

1. **Safety alert emails.** Create a Resend account and verify a sending domain, then run `npx supabase secrets set RESEND_API_KEY=… GPS_NOTIFY_FROM=… SAFETY_ALERT_EMAIL=you@…`.
2. **AI text screening.** Create an Anthropic API key, run `npx supabase secrets set ANTHROPIC_API_KEY=…`, then wire the hook once: `insert into app_settings (key, value) values ('screen_hook_url', 'https://ofuofhojhbcrcahuotya.supabase.co/functions/v1/screen-content');`
3. **Image screening.** Create an AWS IAM user with `rekognition:DetectModerationLabels` only, then set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_REGION` the same way.
4. **A contact address** for Safety and Support. It goes in the Guidelines, Settings and both store listings.
5. **Google Play Child Safety Standards:** a public web page (the Guidelines' "Children" section covers the content) and a named child-safety contact in Play Console.

Also found and closed on the way: a DM **recipient could rewrite the sender's message** (UPDATE policy with no WITH CHECK). Live probes: `probe-reports-reach-the-content.mjs` 29/29, `probe-suspend-ban-and-appeal.mjs` 28/28.

---

## Part 3 — Proposed moderation system: AI screens, a person decides

The design keeps a **human in the loop for every enforcement decision**. AI does two things:

- It **screens** content as it is posted.
- It **triages** reports, so the person reviewing them sees the worst first with a summary.

That is what makes "act within 24 hours" achievable for one person, and it is honest to describe.

### 3a. Screening (the filter)

- **One `moderation_status` column** (`visible` / `held` / `removed`) on every user-generated
  table: `messages`, `crews_messages`, `group_posts`, `comments`, `climb_logs` (notes),
  `connections.note`, profile bio/name, and photo rows.
  - The read policies show non-`visible` rows only to their author, who sees "Under review".
- **Synchronous floor, which no client can bypass:** a `BEFORE INSERT` trigger runs a maintained
  word and regex list (slurs, explicit terms, phone and email patterns in first contact). A hit
  inserts the row as `held`.
- **AI pass:**
  - An `AFTER INSERT` trigger calls an edge function `moderate` through `pg_net`.
  - The function classifies the text and either sets `held`/`removed` or leaves it `visible`.
  - Anything flagged opens a `moderation_queue` row, with the model's category, a confidence, a
    one-line reason, and a snapshot of the content.
- **Images:**
  - Uploads land as `pending`.
  - The edge function runs an image classifier and flips the row to `visible` or `held`.
  - **Never send a suspected CSAM image to any LLM.** Hash-match it (PhotoDNA, or Cloudflare's CSAM
    scanning if storage is served through a Cloudflare zone), preserve it, and report it to NCMEC.

**Vendor options** (prices checked 2026-10-07):

| Job | Option | Cost | Notes |
|---|---|---|---|
| Text screening | **Claude Haiku 5.5** (`claude-haiku-5-5`) | $0.10 / $0.50 per M tokens, about **$0.06 per 1,000 messages** | Cheapest Claude model. Handles context well (scams, solicitation, doxxing, harassment that is not keyword-shaped). |
| Text screening | Claude Opus 5.5 (`claude-opus-5-5`) | $4 / $20 per M tokens, about $2+ per 1,000 messages before thinking tokens | Most capable model. Overkill for screening every message. |
| Text screening | OpenAI `omni-moderation-latest` | Free | Fixed categories. Whether it is free for non-OpenAI content is **unconfirmed**; get it in writing. |
| Images | AWS Rekognition `DetectModerationLabels` | about $1 per 1,000 | Claude declines to process explicit images under its usage policy, so it is not the image filter. |
| Images | OpenAI omni-moderation (image input) | Free | Same terms question as above. |
| Report triage | Claude Opus 5.5 | Low volume | Judgment matters here: summarize the thread, rank severity, suggest an action. |

Which model screens every message is a cost-against-quality call for the owner. **Do not adopt Google
Perspective**: it shuts down on 2026-12-31.

### 3b. Reporting

- **A Report control on every surface:** message (long-press), crew-chat message, group post,
  comment, trip report, photo, profile, group.
- **One `content_reports` shape** with `target_kind`, `target_id` and a **snapshot** of the reported
  content.
  - The snapshot is how the reviewer sees a reported DM without blanket DM access. The reporter
    could already read it.
- **Auto-hide on report** for high-severity reasons (threats, sexual content, a minor at risk), or
  after a few independent reports. The content stays hidden until a person reviews it.
- **Instant alert to the reviewer** through the existing Resend mailer
  (`supabase/functions/_shared/mailer.ts`): one email per high-severity report and a daily digest
  for the rest.
- The queue shows **time open** against a 24-hour target.

### 3c. Enforcement: the decision to revisit

- **Remove content:** soft-delete (`removed`) through admin `SECURITY DEFINER` RPCs. Every action is
  logged in a `moderation_actions` audit table.
- **Eject the user.** Supabase Auth has a native **ban** (`ban_duration` through the admin API), so
  a banned account cannot sign in or refresh a session. Pair it with one `is_active_user()` check
  in the INSERT policies of the user-generated tables, so writes stop at once rather than when the
  current token expires (≤1 h).
  - The 2026-08-19 decision rejected suspension because enforcing it across about 33 tables looked
    like a half-measure. The auth-level ban plus one shared write check removes that objection.
- **Tell the affected user why** (a statement of reasons), and give them one **Appeal** button that
  returns the case to the human queue.

### 3d. Policy surfaces

- **Community Guidelines** page with an explicit **zero tolerance** clause.
- Terms updated to match what is actually built (suspension becomes true; automated screening
  disclosed).
- An **"I agree" checkbox** at sign-up for both email and OAuth, stored with the version.
- A **safety contact address** in Settings, Help, and both store listings.
- A **Child Safety Standards** page (Google), and a written NCMEC reporting procedure.
- **Automated account deletion:** an edge function that deletes the auth user. Fix the foreign keys
  first, and remove storage files.
- **App Review notes** that describe exactly this pipeline, plus two demo accounts so the reviewer
  can report and block each other.

### Suggested order

1. **Contact info, Guidelines and the zero-tolerance "I agree".** Copy and one column. Small.
2. **Report-everything, admin alert email, and remove-content RPCs.** Meets "flag" and "24 h".
3. **Ban / eject**, plus the statement of reasons and the appeal.
4. **AI screening:** text first, then images and the CSAM path.
5. **Automated account deletion.**

Items 1–3 are enough for a credible first submission. Item 4 is what makes the filter requirement
unambiguous.

---

## Part 4 — "A team of moderators": what to say, honestly

**Do not describe a human moderation team that does not exist.**

- It is a material claim about a safety feature people rely on, which is FTC Section 5 territory.
- App Review rejects dishonest review notes (guideline 2.3.1(b): "if you're dishonest, we don't want
  to do business with you").
- If EU or UK users ever matter, the DSA (Arts. 14, 16(6), 17(3)(c)) and the UK Online Safety Act
  (s.10(7)) **require** disclosing automated moderation.

What works, and is true once Part 3 exists:

- **Brand the function, not a headcount.** "ClimbMatch Safety" with a `safety@` address is a real
  function, staffed by you and assisted by automated tools. Plenty of small companies operate this way.
- **Copy that holds up:**
  - "Reports are reviewed by the ClimbMatch Safety team, with help from automated screening —
    usually within 24 hours."
  - "Posts and messages are screened automatically. A person reviews anything that's reported."
  - "Content can be removed automatically. You can appeal, and a person will review it."
- **Avoid:**
  - "our moderators" or "trained safety specialists" (implies staff)
  - "24/7"
  - a removal notice that says "a moderator reviewed this" when only the model did
  - any number of reviewers
- The existing "reviewed by our team" (Report sheet) is defensible **only if** you personally review
  the queue. Make that true with the alert email in 3b.

---

## Part 5 — Friends: what Facebook and LinkedIn do that is worth copying

**Update 2026-10-08: items 1–6 are built** (0267; live probe `probe-friend-request-limits.mjs` 19/19):

- **Item 1:**
  - a 21-day per-pair cooldown after a withdrawal or decline (the decliner is exempt);
  - 50 requests a week.
- **Item 2:** the "Who can send you friend requests" setting (Everyone / Friends of friends / Nobody), enforced in the insert guard.
- **Item 3:** a stranger's DM may carry a photo only once you're friends, crewmates, or they've replied.
- **Item 4:**
  - an "X accepted your friend request" notification;
  - a Requests you've sent list with Withdraw (the confirmation names the 3-week wait).
- **Item 5:** a real people-you-may-know RPC. It never suggests blocked, suspended or banned accounts, or anyone closed to requests (and, since #2300, the app drops anyone you have Restricted). Someone hidden from discovery is suggested only to people they've climbed or crewed with.
- **Item 6:** pending requests expire after 90 days.

**Update 2026-10-08 (#2300): items 7 and 8 are built** (0269, 0270; live probes `probe-restrict-is-private.mjs` 10/10 and `probe-trip-reports-for-friends.mjs` 10/10):

- **Item 7, Restrict:**
  - a button on any real climber's profile, between Report and Block;
  - their messages land under Message requests and never badge, and their friend requests stop badging;
  - they cannot read that the row exists, and nothing refuses them, so nothing tells them;
  - Settings › Safety lists everyone you have restricted, with Unrestrict.
- **Item 8, the Friends tier, trip reports only:**
  - "My friends" on a logged climb is enforced in the `climb_logs` read policy through `are_friends()`;
  - unfriending revokes it;
  - the conditions consensus, the rankings and `report_content` honour it, while the leaderboard stays public-only.

  **Availability has no Friends tier yet.** Today it has no visibility setting at all (`profiles.availability` is readable as the profile is), so adding one is a separate decision.

**Update 2026-10-08 (0272, 0273): trip reports are readable by everyone unless the climber changes that** (the owner's rule). Live probe `probe-trip-reports-default.mjs` 15/15.

- **The setting:** Settings › Privacy & safety › "Who can read your trip reports" (Everyone / My friends / Just me), stored in `profiles.trip_reports_default`, default Everyone.
  - Every new report starts from it, and the log form can still pick differently for one report.
  - Changing it offers to apply it to earlier reports. A link stays under the setting while any earlier report differs.
- **The database fallback:** a report written without a visibility now takes the author's setting. The 0037 column default `'crew'` is gone; with no crew, it had made a report readable by nobody.
- **0273 fixes a regression from 0269.** Signed-out visitors could not read ANY trip report or route conditions: the read policy named `are_friends`, which they may not run, so every read returned 401. The policy now calls `is_my_friend()`, which answers only about the caller's own friendships. Signed-in climbers can no longer call `are_friends` on two other people, which had let anyone map friendships around "Show mutual friends".

The original proposal follows. Items are ordered by safety value for an app whose friendships turn into meetups.

1. **Request limits:**
   - a weekly cap on outgoing requests;
   - a cooldown before re-asking someone who declined or after you withdrew (LinkedIn uses up to 3
     weeks);
   - automatic restriction for accounts whose requests are mostly ignored or reported.

   This closes the withdraw-and-re-ask loop noted in Part 1.
2. **"Who can send me friend requests":** Everyone / Friends of friends / Nobody. It must be enforced
   in the 0257 insert guard, not just hidden in the UI.
3. **Message requests from non-friends stay text-only until accepted** (no images or links). This
   copies Messenger's request folder.
4. **"X accepted your request"** notification, plus a **Sent requests** list with cancel.
5. **People you may know** from real signals (shared crews, log partners, mutuals, shared
   objectives) through a definer RPC. It must exclude blocked and reported accounts.
6. **Pending requests expire** after 90 days.
7. **Restrict:** a quiet alternative to block. Their messages go to requests without notifications,
   and they are not told.
8. **A "Friends" visibility tier** for trip reports and availability. Today friendship unlocks
   nothing on the server, so "friends only" cannot be offered honestly yet.
