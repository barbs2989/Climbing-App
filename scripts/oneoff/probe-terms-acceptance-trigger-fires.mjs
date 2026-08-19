// Does the policy-acceptance trigger actually FIRE? 0145 shipped it, pg_proc says the body is
// right, and profiles.terms_accepted_version is null on every row — because no account has been
// created through the real form since. Untested is not verified, so: sign up exactly the way the
// app does (anon key, terms_version in user metadata), read the stamp back, and clean up.
//
// Two accounts, because the guard against fail-open coercion is the half that matters: a signup
// WITHOUT the metadata must leave the column NULL rather than stamping now(). If both stamp, the
// column records nothing.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ANON = anonKey(), SVC = requireServiceKey();
const tag = `probe${Date.now().toString(36)}`;
const made = [];

async function signup(email, password, meta) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: meta }),
  });
  const b = await r.json().catch(() => ({}));
  return { status: r.status, body: b };
}
async function svc(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
}

const VERSION = "2026-08-13";
let fail = 0;
try {
  // A: the app's real shape — name + terms_version
  const a = await signup(`${tag}-a@climbmatch.invalid`, "Probe-passw0rd!", { name: "Probe With Terms", terms_version: VERSION });
  console.log(`A signup (with terms_version): ${a.status}`);
  if (a.body?.id) made.push(a.body.id); else if (a.body?.user?.id) made.push(a.body.user.id);

  // B: negative control — no terms_version at all
  const b = await signup(`${tag}-b@climbmatch.invalid`, "Probe-passw0rd!", { name: "Probe No Terms" });
  console.log(`B signup (no terms_version):   ${b.status}`);
  if (b.body?.id) made.push(b.body.id); else if (b.body?.user?.id) made.push(b.body.user.id);

  if (made.length !== 2) { console.error(`FAIL: expected 2 users, got ${made.length}`, JSON.stringify(a.body).slice(0,300), JSON.stringify(b.body).slice(0,300)); process.exit(1); }

  await new Promise(r => setTimeout(r, 1200)); // the trigger is AFTER INSERT on auth.users

  const rows = await svc(`/rest/v1/profiles?id=in.(${made.join(",")})&select=id,name,terms_accepted_version,terms_accepted_at`);
  console.log("\nprofiles read back:");
  for (const p of rows.body || []) console.log(`  ${p.name.padEnd(20)} version=${p.terms_accepted_version ?? "(null)"}  at=${p.terms_accepted_at ?? "(null)"}`);

  const withT = (rows.body || []).find(p => p.id === made[0]);
  const noT   = (rows.body || []).find(p => p.id === made[1]);

  console.log("");
  if (withT?.terms_accepted_version === VERSION) console.log(`ok   stamped the version the client sent (${VERSION})`);
  else { console.log(`FAIL stamped "${withT?.terms_accepted_version}" — expected "${VERSION}"`); fail++; }

  if (withT?.terms_accepted_at) console.log("ok   stamped an acceptance time");
  else { console.log("FAIL no acceptance time"); fail++; }

  if (noT && noT.terms_accepted_version === null && noT.terms_accepted_at === null)
    console.log("ok   NEGATIVE CONTROL: no metadata leaves BOTH columns null — a never-shown Terms stays distinguishable");
  else { console.log(`FAIL negative control stamped anyway: version=${noT?.terms_accepted_version} at=${noT?.terms_accepted_at}`); fail++; }
} finally {
  for (const id of made) {
    await svc(`/rest/v1/profiles?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
  const left = await svc(`/rest/v1/profiles?id=in.(${made.join(",")})&select=id`);
  console.log(`\ncleanup: ${made.length} accounts removed, ${(left.body || []).length} profile rows left behind`);
}
process.exit(fail ? 1 : 0);

// Measured 2026-08-19 against the live project, twice, exit 0 both times:
//   Probe With Terms  version=2026-08-13  at=2026-08-19T21:43:35Z
//   Probe No Terms    version=(null)      at=(null)
//   cleanup: 2 accounts removed, 0 profile rows left behind
//
// Injection-tested 2/2 — this repo's rule is that a probe whose expected result is "everything
// passed" must be shown to fail first, or it proves nothing:
//   1. Client sends a version the assertion does not expect  -> FAIL, and it names both values.
//      This is the case worth having: it proves the trigger stamps WHAT THE CLIENT SENT rather
//      than a constant of its own, so shown-version and recorded-version cannot drift.
//   2. The negative control also sends metadata               -> FAIL "negative control stamped
//      anyway". Without this half, a trigger that stamped now() unconditionally would pass every
//      other assertion here while recording nothing — the fail-open coercion 0145's own comment
//      is written against.
//
// Why this is a oneoff and not a check:* guard: it needs the SERVICE key (to delete the accounts
// it creates — Supabase has no self-delete) and it writes to auth on the live project. Neither
// belongs in CI, which must never hold that key. Re-run it by hand after any change to 0145, to
// stamp_policy_acceptance, or to the signUp call in lib/auth.js.
