# App Store readiness — what is left before submission

A point-in-time audit, taken 2026-10-25 from the repo and the live Supabase auth settings. Each row
says how it was checked. Re-run the checks before relying on a row, since the live settings move.

The short version: the app's in-app obligations are mostly built. What blocks submission is a
native shell that does not exist yet, a support address the owner has not supplied, and a few
switches that are deliberately off until launch.

## Built and checked

| Guideline | What it asks | State | Checked by |
|---|---|---|---|
| 5.1.1(v) account deletion | In-app deletion | Built: Settings → Your data, through the `delete-account` edge function. | `supabase/functions/delete-account/index.ts` exists; `lib/db.js` calls it |
| 5.6.1 store reviews | Never gate the store link on stars | Built: the store link is not gated. | `lib/AppFeedback.jsx` header |
| 1.2 user-generated content | Report, block, moderation, appeal | Built per the moderation plan (report, block, filter, suspend/ban with appeal). | `docs/SAFETY-AND-MODERATION-PLAN.md`; not re-tested here |
| 5.1.2 tracking | Disclose and prompt for tracking | Not triggered. No analytics, ad or tracking SDK in `package.json`, `index.html` or `src/`. The privacy text says the same. No ATT prompt is needed. | Dependency and source grep |
| 3.1.1 in-app purchase | Digital goods must use IAP | Not triggered today. No payment SDK is present. Revisit if any paid digital feature is added. | Dependency grep |
| 4.8 sign-in options | Offer Sign in with Apple beside any other third-party login | Partly built. The Apple and Google buttons render in `lib/AuthModal.jsx`, but only when the Supabase provider is on. See the table below. | Live `/auth/v1/settings` |

## Blocking, or required before submission

| # | Item | State | Owner or Claude |
|---|---|---|---|
| 1 | **Native shell.** The App Store will not accept a bare web view as a whole app (guideline 4.2, minimum functionality). The repo has no iOS project and no Capacitor dependency. | Missing. This Mac has only the Command Line Tools installed, with no full Xcode, so an iOS binary cannot be built or signed here. | Owner decides the wrapper. Capacitor fits the existing web build. Needs an Apple Developer account and a bundle ID. |
| 2 | **Privacy manifest and export answers**, needed for the native build. Declare the required-reason APIs the wrapper uses, and set the encryption answer to uses only exempt HTTPS. | Not started; depends on #1. | Claude, once #1 exists |
| 3 | **Usage strings** for each device feature the app reads. Location: `navigator.geolocation` is called in `lib/mapKit.jsx`, `lib/PartnerSearch.jsx`, `lib/AddArea.jsx`, `lib/DbAreaBrowser.jsx` and `lib/homeFromDevice.js`. Photos: file inputs in `lib/Onboarding.jsx`, `lib/EditProfileScreen.jsx`, `lib/AddRoute.jsx` and `lib/LogAscent.jsx`. Each feature must carry a plain-English reason. | Not started; depends on #1. | Claude, once #1 exists |
| 4 | **Support contact.** The App Store needs a support URL and a contact. The app publishes none: the Privacy Policy says "Settings → Your data", and no address appears in `lib/LegalView.jsx`. | Missing. The owner must supply an address someone answers. | Owner |
| 5 | **Sign in with Apple, live.** The Supabase `apple` provider is `false`. Google is `false` too. Email is the only working login today, so guideline 4.8 is not triggered yet. Enabling Google alone would trigger it. | Off. Enabling it needs an Apple Services ID and key from the Apple Developer account. | Owner, in the Supabase dashboard |
| 6 | **"Coming soon" buttons on the live sign-in screen.** With both providers off, the screen shows Apple and Google as "coming soon". Reviewers can read placeholder controls as an incomplete app (guideline 2.1). | Live now. The owner decided these always render (`docs/features/profile-and-settings.md`). Hiding them until enabled is a product call. | Owner decides |
| 7 | **Demo auto-sign-in.** `VITE_DEMO_AUTOLOGIN` is on in the deploy, so production opens signed in as the demo user. Reviewers need real credentials, given in the App Store Connect review notes. | On. The owner's launch switch turns it off. | Owner's launch switch |
| 8 | **CAPTCHA** on sign-up, and the email-code send. | Wired but inert. Needs Turnstile keys and the Supabase setting. | Owner (`pending-user-actions` memory) |
| 9 | **Email confirmation.** `mailer_autoconfirm` is `true` on the live project, so sign-up is not verified by email. | Live. Verification by emailed code (0306) needs SMTP. | Owner (SMTP) |
| 10 | **Age rating and the 18+ position.** The Privacy Policy says the app is for adults, and sign-up has an 18+ gate. The App Store age-rating questionnaire is not filled in. | Not started. | Owner, in App Store Connect |
| 11 | **Public privacy policy URL**, reachable without signing in. The policy is in-app on the Legal screen. | Not verified. Check the public Pages address serves it. | Claude |
| 12 | **Safety-alert and AI screening switches**: Resend for alert emails, an Anthropic key for text screening, AWS Rekognition for photos. | Built and deployed, but off until the owner has a company domain and keys. Screening today is the term list only. | Owner (`docs/SAFETY-AND-MODERATION-PLAN.md`, Part 2) |
| 13 | **App Privacy labels** in App Store Connect. The data inventory is in the Privacy Policy `PRIVACY` list in `lib/LegalView.jsx`. | Not started. | Owner, in App Store Connect |

## Google Play (for the same release)

- Child-safety declaration: a public page and a named contact. Waits on #4.
- Play Console data-safety form: mirror #13.

## How to re-check

- Live providers: `curl -s "$VITE_SUPABASE_URL/auth/v1/settings" -H "apikey: $VITE_SUPABASE_ANON_KEY"`. Read the `external` object, and the `mailer_autoconfirm` and `disable_signup` flags. Do not print the key.
- Contact address: `grep -n -i "support\|@" lib/LegalView.jsx`.
- Native shell: `ls ios android` and `grep capacitor package.json`.
