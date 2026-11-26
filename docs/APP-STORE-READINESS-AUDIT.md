# App Store and Google Play readiness: safety, moderation and listing audit (2026-11-26)

The owner asked (Apple Note, 2026-11-26): how reporting works; reports should reach the admin dashboard so they
can be reviewed and acted on; what the rules are for safety and moderation; and where the gaps are for getting
accepted on the Apple App Store and Google Play.

This audit builds on [SAFETY-AND-MODERATION-PLAN.md](SAFETY-AND-MODERATION-PLAN.md) (2026-10-07/08), which
built most of the moderation system. What changed since: #2727 (2026-10-24) removed the in-app reviewer queues
for safety reports, appeals and reported photos, so **a report reached nobody who could act on it** except
through the Supabase table editor. This PR puts them on the Review desk.

## 1. How reporting works now (end to end)

| Step | What happens | Where |
|---|---|---|
| A climber reports a person | Profile or Ranks → Report. Reasons: harassment, unsafe behaviour, fake profile, threatening messages, spam or scam, faked climbs, someone in danger, other. Optional "also block" (not offered for "someone in danger"). | `src/components/ReportModal.tsx` → `submitReport` → `user_reports` |
| A climber reports content | Messages, crew chat, group posts and events, comments, trip reports, groups, topos, topo lines, lists, profiles. The **server** copies what was reported (`snapshot`), so the reviewer sees it as it was and nobody can quote words that were never written. 30 reports a day per climber. | `lib/ReportContentSheet.jsx` → `report_content()` (0263, 0492, 0539) |
| A climber reports a route photo | Not this route / inappropriate / not their photo / other. | `reportPhoto` → `content_reports` (0156) |
| Automatic screening | Every new post, message, comment, trip report, group, topo and list is checked against `screening_terms` (31 terms) inside the write. A match is hidden from everyone but its author and filed as a report by "Automatic screening". An AI pass is wired (`screen-content`) but answers "not screened" until an Anthropic key is set. | 0265, 0429 |
| Three reporters | Content three different climbers report is hidden automatically until a person decides. | 0263 |
| **The admin is told** | **New (0551):** every admin gets a notice in the app's bell for each report, reported photo or appeal; tapping it opens the Review desk's Safety section. The email (`notify-safety-report`) is built but sends nothing until `RESEND_API_KEY` and `SAFETY_ALERT_EMAIL` are set. | `_notify_admins_safety()` |
| **The admin acts** | **New:** review.html → **Safety reports**. Waiting (severe reasons first, then oldest; red from 20 h), Reported photos, Appeals, Closed, and How to decide. | `review/SafetySection.jsx` |
| Content actions | Remove it (hidden from everyone but its author, who is told why and can appeal), Hide while I decide, Keep it up. A profile: clear bio and photos. Each closes every open report about that item and is logged in `moderation_actions`. | `moderate_content()` (0263) |
| Account actions | Suspend 1–365 days (read-only: can sign in and read, cannot post, message, comment or send requests), Ban (cannot sign in; optionally remove everything they posted), Reinstate. The climber sees the reason on every tab and can appeal. | `set_account_standing()` (0264) |
| Appeals | Reverse (content restored or account reinstated) or Keep the decision, with a note. | `decide_appeal()` |
| The reporter | Settings shows their filed reports as Filed / Being looked at / Closed, never the decision about someone else. | `MyFiledReports` |
| Block / restrict | Enforced in the database for messages, crew invites, profile reads, friend requests and group invites; Restrict quietly moves messages to requests. | 0088, 0094, 0095, 0257, 0260, 0269 |

Measured 2026-11-26 (service key): 0 reports, 0 photo reports, 0 appeals, 0 suspended or banned accounts,
31 screening terms, 1 moderation action. The app has no public users yet, so nothing is waiting.

## 2. The rules the admin follows

The desk's **How to decide** tab carries them. In short:

- **Every report within 24 hours.** Mark "I'm looking at this" if a decision takes longer.
- **A child at risk / sexual content involving a minor:** do not download, screenshot or forward it; remove it,
  ban with "remove everything they posted", and report to the NCMEC CyberTipline (report.cybertip.org) the same
  day. US law (18 U.S.C. § 2258A) requires a provider to report apparent CSAM once it knows of it. Never send
  such an image to an AI tool.
- **Threats, violence, someone in danger:** emergency services first if anyone may be in immediate danger;
  remove and ban or suspend.
- **Harassment, hate, adult sexual content, doxxing:** remove; first time suspend 7 days; repeat or severe, ban.
- **Spam, scams, fake profiles, impersonation:** ban and remove everything.
- **Dangerous or false safety information, wrong photos:** remove, or keep if it is a fair disagreement.
- **Appeals:** a person decides every one (the Terms promise this).

## 3. What the stores require, measured against the app

Sources: Apple App Review Guidelines (developer.apple.com/app-store/review/guidelines, last updated 16 Oct 2026),
Apple developer news (developer.apple.com/news), Google Play User Generated Content policy (support.google.com/googleplay/android-developer/answer/9876937),
Child Safety Standards (…/answer/9878809), account deletion (…/answer/13327111).

| # | Requirement | Store | Status | Notes |
|---|---|---|---|---|
| 1 | Terms with zero tolerance for objectionable content and abusive users, accepted before posting | Both | **MET** | Community Guidelines + required "I agree" at sign-up (email and Google), version stamped. |
| 2 | A method for filtering objectionable material | Apple 1.2 | **MET (floor)** | Term list inside every write. AI layer needs an API key (owner, §5). |
| 3 | Report offensive content, with timely responses | Both | **MET as of this PR** | Was a gap: since #2727 nobody was told and there was no screen. Now the bell notice + desk. |
| 4 | Block abusive users | Both | **MET** | Server-enforced. Gap: a blocked person's *existing* crew-chat messages and posts are not hidden from the blocker. |
| 5 | Act on reports: remove content, eject the user | Both | **MET** | Remove / hide / suspend / ban / appeal, all audited. |
| 6 | Published contact information | Apple 1.2, 1.5 | **GAP — owner** | Nothing public lists an address. App Store Connect also requires a Support URL. |
| 7 | In-app account deletion | Apple 5.1.1(v) | **MET** | Settings → Your data → Delete my account; immediate (0266). |
| 8 | Web page to request deletion | Google | **MET as of this PR** | `?legal=delete` on the app's URL explains the steps; deletion works on the web app itself. |
| 9 | Privacy Policy URL | Both | **MET as of this PR** | `?legal=privacy` (and `?legal=terms`). Before this PR the policies had no URL of their own. |
| 10 | CSAE standards page (public), in-app feedback, act on CSAM, NCMEC reporting, named child-safety contact | Google (social apps) | **MOSTLY MET** | Guidelines "Children" section is public at `?legal=child-safety`; reporting is in-app; NCMEC procedure is now written (desk + §2). Named contact: owner, in Play Console. |
| 11 | Sign in with Apple when a third-party login (Google) is offered | Apple 4.8 | **GAP — owner** | The button exists and turns on by itself once the Apple provider is enabled in Supabase; it needs an Apple Developer account, a Services ID and a key. |
| 12 | More than a repackaged website | Apple 4.2 | **RISK — build** | The app is a web app. A store build needs a native wrapper (e.g. Capacitor) using native features (push notifications, camera, location, share sheet, offline) and review notes naming them. |
| 13 | Age rating questionnaire, including the new Shared Location and Dating and Relationships declarations (due 12 Jan 2027) | Apple | **OWNER** | Recommended answers in §4. |
| 14 | 18+ | Both | **MET** | 18+ checkbox at sign-up; Terms say 18+. Rate the app 18+ (strangers meet in person). |
| 15 | Privacy nutrition label / Data safety form | Both | **OWNER** | Draft in §4. |
| 16 | Disclose sharing personal data with a third-party AI | Apple 5.1.2 | **MET when switched on** | The Guidelines disclose automatic screening; the Privacy Policy must name the AI vendor the day the key is set. |
| 17 | Demo accounts and review notes that show report and block | Apple 2.1 | **OWNER** | Two test accounts that can report and block each other, plus an admin login for the reviewer if asked. |
| 18 | Google Play: new personal developer accounts need a 14-day closed test with 12 testers | Google | **OWNER** | Organization accounts (D-U-N-S) are exempt. Secondary sources only; check Play Console. |
| 19 | Texas SB 2420 age assurance (enforceable since June 2026; Utah and Louisiana dates disputed, 2026–2027) | Both | **WATCH** | Apple and Google carry most of it at the store level; apps can read the age signal (Declared Age Range API, Play Age Signals). With an 18+ rating and the 18+ check, the app refuses minors. Revisit before launch. |

## 4. Recommended store answers (decided on the owner's behalf)

- **Age rating:** 18+. Unrestricted web access: no. User-generated content: yes, moderated. Messaging and chat: yes.
  **Shared Location: yes** (partner search shows a rounded distance and a home city; crews share a meeting place).
  **Dating and Relationships: no.** ClimbMatch matches climbing partners on disciplines, grades, objectives and
  availability; it has no romantic matching, no swiping and no dating profile fields, so Apple's 1.1.4 "hookup
  app" exclusion does not apply. Answer honestly if this ever changes.
- **Category:** Sports (primary), Social Networking (secondary). Google: Sports, with "Social" declared for the
  Child Safety Standards.
- **Data collected (both forms):** name, email, user ID, photos, user content (posts, messages, trip reports),
  coarse location (home city, zip, distance), precise location only when the climber checks in at a climb
  ("I'm at the base") or attaches a GPS track to a log, crash diagnostics (`app_errors`). Linked to the user; not used for tracking; not sold.
- **Review notes:** describe report → bell notice → desk → remove / suspend / ban → appeal, and the 24-hour target.
  Describe the moderation honestly: "reviewed by ClimbMatch Safety, with automatic screening". Never say "our
  moderation team" (Part 4 of the safety plan).

## 5. Owner to-dos (only the owner can do these)

1. **A contact address** (e.g. safety@ and support@ on a domain you own). Then it goes in the Guidelines,
   Terms, Settings and both listings.
2. **Safety alert email:** Resend account + verified domain, then
   `npx supabase secrets set RESEND_API_KEY=… SAFETY_ALERT_EMAIL=…`. The bell notice works without it.
3. **AI text screening:** `npx supabase secrets set ANTHROPIC_API_KEY=…` (Claude Haiku, about $0.06 per 1,000 messages).
4. **Image screening:** AWS IAM user limited to `rekognition:DetectModerationLabels`, then set its keys.
5. **Sign in with Apple:** Apple Developer Program ($99/yr), Services ID + key, enable the Apple provider in Supabase.
6. **Google Play Console:** developer account (organization with D-U-N-S avoids the 12-tester rule), named
   child-safety contact, Data safety form, `?legal=delete` as the deletion URL, `?legal=child-safety` as the
   CSAE standards URL.
7. **App Store Connect:** Support URL, Privacy Policy URL (`?legal=privacy`), age rating questionnaire (by 12 Jan 2027),
   privacy label, demo accounts.
8. **A native wrapper build** (Capacitor) for guideline 4.2. A separate project; not started.
9. **Legal sign-off** on the Terms, Privacy Policy and Guidelines (legal packet already exists).

## 6. Gaps left in the app (not done in this PR)

- A blocked person's existing crew-chat messages and group posts still show to the blocker.
- No push notifications (needs the native wrapper); the admin alert is in-app and, once configured, email.
- The reported-user report (no content attached) carries no copy of what happened; the reviewer relies on the
  reporter's note. Content reports do carry a copy.

## 7. What competitors do (for the record)

Hinge and Bumble: anonymous reports, reported pairs stop seeing each other, a Safety Center page with
meet-in-public advice, human moderators with automated escalation. Strava: block, flag and report plus a separate
unwanted-contact path. ClimbMatch matches the reporting, blocking and enforcement; the Guidelines' "Meeting
partners" and "If you are in danger" sections are its safety-tips page.
