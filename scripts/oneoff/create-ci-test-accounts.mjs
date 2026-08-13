#!/usr/bin/env node
// ONE-TIME: create the two durable accounts check:signed-in signs in as in CI.
//
// WHY THIS EXISTS. check:signed-in is the only guard not in CI, because CI must not hold the
// production service key — it bypasses RLS. The consequence is the failure render-guards.yml
// exists to fix: a guard that runs only when somebody remembers is a guard you do not have.
// It went ~40 merged commits without running, because on a loaded machine "hand-run" often
// means "cannot run".
//
// The fix is to move the privileged half OUT of CI rather than into it. The service key is
// used exactly once — here, locally — to create two accounts and seed what they own. CI then
// only ever signs in with the ANON key and a password, which is what a real user does.
//
// WHAT WAS RULED OUT, so nobody re-derives it:
//
//   A dedicated test PROJECT. Rejected by the owner; also needed a schema dump per change.
//
//   Per-run accounts on the anon key. Tempting, because `mailer_autoconfirm` is true and
//   `disable_signup` is false, so a plain signup is immediately usable with no service key at
//   all. It fails on CLEANUP: there is no delete_own_account RPC in this schema and Supabase
//   has no self-delete, so every CI run would leak an auth user forever. Two durable accounts
//   leak nothing because they are reused.
//
// SAFETY. Both profiles are written with `discoverable = false`, so they cannot surface in
// partner browse — the objection CLAUDE.md raises against a permanent QA account. That flag is
// the whole reason this is acceptable, so the script VERIFIES it by reading back, and refuses
// to finish if either row is discoverable.
//
// Emails are on the reserved .invalid domain (RFC 2606): a stray confirmation can never route
// anywhere. Sign-in does not need the mail to arrive, because mailer_autoconfirm is on.
//
// USAGE (local, once):
//   node scripts/oneoff/create-ci-test-accounts.mjs            # create/repair, print secrets
//   node scripts/oneoff/create-ci-test-accounts.mjs --dry-run  # say what it would do
//
// Idempotent: re-running repairs drift (a missing profile flag, a lost crew member) rather
// than making a second pair. Passwords are generated once and printed ONLY on creation — if
// you lose them, pass --reset-password to set a fresh one on the existing accounts.

import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";
import { randomBytes } from "node:crypto";

const DRY = process.argv.includes("--dry-run");
const RESET = process.argv.includes("--reset-password");
const SERVICE = requireServiceKey();

// Stable, self-describing, and obviously not a person. If either of these ever shows up in a
// product surface, the discoverable=false contract has broken and that is worth noticing.
const OWNER = "climbmatch-ci-owner@ci.invalid";
const MATE = "climbmatch-ci-mate@ci.invalid";
const NAMES = { [OWNER]: "CI Fixture Owner", [MATE]: "CI Fixture Mate" };
const ROUTE_ID = "wa_mount_baker_north_ridge"; // what ui-fixture.mjs pins; see check-signed-in.

const admin = (path, init = {}) => fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
  ...init,
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) },
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const rest = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation", ...(init.headers || {}) },
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const say = (...a) => console.log(...a);
const newPassword = () => randomBytes(18).toString("base64url");

async function findUser(email) {
  // per_page is capped; filter server-side rather than paging the whole user table.
  const { body } = await admin(`admin/users?filter=${encodeURIComponent(email)}&per_page=50`);
  return (body?.users || []).find((u) => u.email === email) || null;
}

async function ensureUser(email) {
  const existing = await findUser(email);
  if (existing) {
    if (!RESET) return { user: existing, password: null, created: false };
    const pw = newPassword();
    if (!DRY) {
      const { status, body } = await admin(`admin/users/${existing.id}`, { method: "PUT", body: JSON.stringify({ password: pw }) });
      if (status >= 300) throw new Error(`password reset for ${email} failed (${status}): ${JSON.stringify(body)}`);
    }
    return { user: existing, password: pw, created: false };
  }
  const pw = newPassword();
  if (DRY) return { user: { id: "(dry-run)" }, password: pw, created: true };
  // email_confirm so sign-in works regardless of the project's confirmation setting later.
  const { status, body } = await admin("admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: pw, email_confirm: true }),
  });
  if (status >= 300) throw new Error(`create ${email} failed (${status}): ${JSON.stringify(body)}`);
  return { user: body, password: pw, created: true };
}

async function run() {
  say(`${DRY ? "[dry-run] " : ""}target ${SUPABASE_URL}`);

  const owner = await ensureUser(OWNER);
  const mate = await ensureUser(MATE);
  say(`  owner ${OWNER} ${owner.created ? "CREATED" : "exists"} (${owner.user.id})`);
  say(`  mate  ${MATE} ${mate.created ? "CREATED" : "exists"} (${mate.user.id})`);
  if (DRY) { say("\n[dry-run] stopping before any profile or fixture write."); return; }

  // discoverable:false is the safety contract, so it is written explicitly rather than left
  // to a column default that could change.
  for (const u of [owner, mate]) {
    const { status, body } = await rest(`profiles?on_conflict=id`, {
      method: "POST",
      body: JSON.stringify({
        id: u.user.id, name: NAMES[u.user.email], username: u.user.email.split("@")[0],
        location: "CI", discoverable: false,
      }),
    });
    if (status >= 300) throw new Error(`profile for ${u.user.email} failed (${status}): ${JSON.stringify(body)}`);
  }
  say("  profiles written with discoverable=false");

  // Verify the safety contract by READING IT BACK. A 200 on the write is not evidence the
  // flag landed, and this is the one property that keeps a permanent account acceptable.
  const ids = [owner.user.id, mate.user.id];
  const { body: check } = await rest(`profiles?id=in.(${ids.join(",")})&select=id,name,discoverable`);
  const bad = (check || []).filter((p) => p.discoverable !== false);
  if ((check || []).length !== 2 || bad.length) {
    throw new Error(`SAFETY CHECK FAILED — expected 2 profiles with discoverable=false, read back ${JSON.stringify(check)}. These accounts could appear in partner browse; fix before using them.`);
  }
  say("  verified: both profiles read back discoverable=false");

  say("\nAdd these to GitHub Actions secrets (Settings > Secrets > Actions):");
  say(`  CI_TEST_OWNER_EMAIL     ${OWNER}`);
  say(`  CI_TEST_MATE_EMAIL      ${MATE}`);
  if (owner.password) say(`  CI_TEST_OWNER_PASSWORD  ${owner.password}`);
  if (mate.password) say(`  CI_TEST_MATE_PASSWORD   ${mate.password}`);
  if (!owner.password && !mate.password) {
    say("  (passwords unchanged — they are only printed on creation. Use --reset-password to mint new ones.)");
  }
  say(`\nVITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are already CI secrets for the other guards.`);
  say(`The anon key is all CI needs beyond the above: no service key leaves this machine.`);
  say(`\nRoute the fixture hangs work off: ${ROUTE_ID}`);
}

run().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
