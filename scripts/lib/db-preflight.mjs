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

// Short on purpose. This is a liveness ping, not a query under test: the anon statement
// timeout fires at 3s and a cold connection costs 3.8-6.4s, so a project that cannot answer
// `limit=1` in 10s is not going to carry 53 screens.
const PING_TIMEOUT_MS = 10000;

// Two attempts, because a single cold connection can legitimately be slow and a preflight
// that cries outage on one blip is worse than no preflight — it would train people to ignore
// it. Both must fail before the run is abandoned.
const ATTEMPTS = 2;

// Returns "skipped" when no DB is configured. That is NOT a failure: several of these guards
// run against seed data on a fresh clone or in a worktree with no dotfiles, and the app then
// never asks Supabase for anything. Refusing to run there would break the guard everywhere
// except CI, which is the opposite of the point.
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
