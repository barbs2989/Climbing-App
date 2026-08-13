// Is the database actually reachable before a browser guard spends half an hour finding out?
//
// THE FAILURE THIS EXISTS FOR, measured on 2026-08-13. Supabase went unreachable — a bare
// `select=id&limit=1` timing out at 20s — and `check:overflow` was CANCELLED at its 25-minute
// job wall having walked 6 tabs, 6 route sub-tabs and 29 of 53 overlays. It produced no
// diagnosis at all: the reader is left with a cancelled job, no failure message, and no way
// to tell an outage from a real regression. 25 minutes spent, nothing learned.
//
// The arithmetic is the whole story. These guards decide "this screen is done" by waiting for
// its text to stop changing (see render-settle.mjs), and with no data arriving NOTHING ever
// settles — so every screen burns its full timeout instead of a second or two. 53 overlays at
// 45s is ~40 minutes on its own. The guard was never stuck; it was doing 50-odd futile waits
// at full price.
//
// So ask ONE cheap question up front. A guard that cannot read the data it is about should
// say so in twenty seconds, not discover it forty minutes later by running out of clock.
//
// It fails CLOSED, deliberately: an unreachable database means the run proves nothing, and
// "proves nothing" must never be reported as a pass. Same stance as check:field-renders,
// check:counts over an empty read, and check:migration-claims with no token.
//
// It is NOT a substitute for the guard's own assertions. It answers "could the data have
// arrived at all", never "did the screen render correctly".
import { loadEnv } from "./supabase-env.mjs";

// Generous on purpose, and it was NOT generous enough on the first attempt. 10s x 2 produced
// a FALSE ABORT in CI the moment the project came back: check:overflow gave up at 37s while
// check:zero, on the same commit and minutes apart, got its answer and went on to pass — so
// the database was reachable and this pinged it during a cold spell. A preflight that cries
// outage on a slow-but-live project is worse than no preflight, because the whole point is to
// tell those two states apart, and people would learn to re-run it blindly.
//
// So budget for the bad case rather than the typical one. Measured here: 554ms warm, 2.7s
// cold, and 3.8-6.4s for a cold connection per the note in CLAUDE.md — but a project that has
// just come back has empty caches and is slower than any of those. Three attempts at 20s is
// up to ~65s before abandoning, which is still nothing against the 25 minutes of silence this
// exists to prevent, and it makes a false abort much harder to provoke.
//
// The asymmetry is deliberate: being slow to declare an outage costs a minute; declaring one
// wrongly costs a red job somebody has to investigate.
const PING_TIMEOUT_MS = 20000;
const ATTEMPTS = 3;
// Backoff between attempts, so three tries actually sample three moments rather than hammering
// one bad instant.
const BACKOFF_MS = 1500;

// Returns "skipped" when no DB is configured. That is NOT a failure: several of these guards
// run against seed data on a fresh clone or in a worktree with no dotfiles, and the app then
// never asks Supabase for anything. Refusing to run there would break the guard everywhere
// except CI, which is the opposite of the point.
// A single timed read that REPORTS rather than exits, for use when a guard has already
// failed and needs to say whether the database is why.
//
// The preflight above catches a DEAD project. It cannot catch a DEGRADED one: a database
// answering `routes?limit=1` in 900ms passes it comfortably and then still cannot fill a
// route list inside a settle timeout. That gap produced a genuinely misleading failure on
// 2026-08-13 — check:ui reported "this is the route list or the search box, not missing
// data" while the actual cause was Postgres taking seconds per query. Guessing between the
// two costs a CI cycle each time; measuring costs one request.
export async function probeDbLatency() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return { state: "skipped" };
  const started = Date.now();
  try {
    const r = await fetch(`${url}/rest/v1/routes?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    const ms = Date.now() - started;
    return r.ok ? { state: "ok", ms } : { state: "error", ms, err: `HTTP ${r.status}` };
  } catch (e) {
    return {
      state: "error", ms: Date.now() - started,
      err: e && e.name === "TimeoutError" ? `no response within ${PING_TIMEOUT_MS / 1000}s` : String((e && e.message) || e),
    };
  }
}

export async function assertDbReachable(opts) {
  const label = (opts && opts.label) || "this guard";
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const useDb = env.VITE_USE_DB === "true" || process.env.VITE_USE_DB === "true";
  if (!url || !key || !useDb) {
    console.log(`  db preflight: skipped — no DB configured, so ${label} is walking seed data.`);
    return "skipped";
  }
  let lastErr = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, BACKOFF_MS));
    const started = Date.now();
    try {
      const r = await fetch(`${url}/rest/v1/routes?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      if (r.ok) {
        const ms = Date.now() - started;
        console.log(`  db preflight: ok (${ms}ms${attempt > 1 ? `, on attempt ${attempt}` : ""})`);
        return "ok";
      }
      lastErr = `HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 140)}`;
    } catch (e) {
      // Name our own abort. "The operation was aborted due to timeout" reads like a message
      // from the server; this one is ours and the distinction changes where you look.
      lastErr = e && e.name === "TimeoutError"
        ? `no response within ${PING_TIMEOUT_MS / 1000}s (aborted by this preflight, not by the server)`
        : String((e && e.message) || e);
    }
  }
  console.log("");
  console.log("THE DATABASE IS UNREACHABLE — abandoning before walking anything.");
  console.log(`  ${lastErr}`);
  console.log(`  ${label} feeds its screens from this database. With no data arriving nothing`);
  console.log("  settles, so every screen would burn its full timeout and the run would end at the");
  console.log("  job wall having proved nothing — check:overflow did precisely that on 2026-08-13,");
  console.log("  cancelled at 25 minutes with 29 of 53 overlays walked and no failure message.");
  console.log("  Stopping here instead. This is NOT a finding about the app: re-run it once the");
  console.log("  project answers.");
  process.exit(1);
}
