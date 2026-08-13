// Does `npm run audit:trailhead-agreement` actually REPORT? Answered with no database.
//
// The audit was promoted out of scripts/oneoff/ on 2026-08-13, and the Supabase project was
// unreachable for the rest of that day (PGRST002 — PostgREST could not query the database for
// its schema cache), so its report half could not be run end to end after the move. "Byte-identical
// to a script that worked earlier" is an argument, not a measurement, and this repo has been
// bitten by exactly that gap: check:field-renders passed GREEN for weeks while silently laundering
// a timeout into a coverage verdict.
//
// So this stands a local HTTP server in for PostgREST — the same technique that injection-tested
// check:field-renders' fail-closed path — and serves fixtures whose right answer is known BY
// CONSTRUCTION. The printed numbers are then checked rather than believed.
//
// It runs the audit TWICE. The second run moves one fixture's blob coordinate 50 km; if the summary
// does not move with it, the audit is not reading its input and the first run proved nothing.
// Prove a probe can FAIL before believing what it says. [[ssr-probes-must-match-escaped-html]]
//
// It then asks the more important question — does the audit REFUSE to report when the read fails?
// A false pass about a database it never read is the realistic failure of a script like this, and
// it is not hypothetical: check:field-renders spent weeks turning a silent timeout into a coverage
// verdict, and during one outage advised deleting correct bookkeeping on the strength of it. Three
// cases, mirroring that guard's own injection tests: a healthy 200 carrying [] (the dangerous one —
// indistinguishable from a clean catalog), a persistent 500, and fail-twice-then-succeed. The last
// one matters in both directions: retries must actually rescue the run AND say so, because a
// recovery absorbed in silence turns a measurable flake into an invisible one.
//
// Touches no real credentials: the audit resolves its dotfiles relative to its own location, so a
// COPY is placed in a temp tree carrying fake ones. The real .env/.env.local are never read, moved
// or written, and the fake URL points at 127.0.0.1 — this cannot reach the live project.
//
//   node scripts/oneoff/verify-trailhead-audit-reports-without-a-db.mjs
import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
const run = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 8099;

const sb = fs.mkdtempSync(path.join(os.tmpdir(), "th-audit-"));
fs.mkdirSync(path.join(sb, "scripts", "lib"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "scripts/audit-trailhead-agreement.mjs"), path.join(sb, "scripts/audit-trailhead-agreement.mjs"));
fs.copyFileSync(path.join(ROOT, "scripts/lib/supabase-env.mjs"), path.join(sb, "scripts/lib/supabase-env.mjs"));
fs.writeFileSync(path.join(sb, ".env"), "SUPABASE_SERVICE_KEY=sandbox-not-a-real-key\n");
fs.writeFileSync(path.join(sb, ".env.local"),
  `VITE_SUPABASE_URL=http://127.0.0.1:${PORT}\nVITE_SUPABASE_ANON_KEY=sandbox-not-a-real-key\n`);

// wa_a  agrees (0 m apart; the names differ only in wording norm() is supposed to strip)
// wa_b  disagrees ~113 km with a DIFFERENT NAME -> the strongest finding shape
// wa_c  typed Trailhead pin with NO coords beside usable blob coords -> SHADOWED, not a disagreement
// wa_d  blob carries no coords at all -> only one record, must NOT be counted in `both`
// wa_e  disagrees ~3.3 km but the SAME NAME after norm() -> a finding, without [NAME DIFFERS]
const fixture = aLng => ([
  { id: "wa_a_agree", name: "A", area_id: "wa_x",
    waypoints: [{ type: "Trailhead", name: "Blue Lake TH", lat: 48.5, lng: -120.7 }],
    approach_logistics: { trailhead: "Blue Lake Trailhead (SR-20)", trailheadLat: 48.5, trailheadLng: aLng } },
  { id: "wa_b_far_named", name: "B", area_id: "wa_x",
    waypoints: [{ type: "Trailhead", name: "Fryingpan Creek Trailhead", lat: 46.9, lng: -121.5 }],
    approach_logistics: { trailhead: "White River Trailhead", trailheadLat: 47.8, trailheadLng: -120.8,
      trailheadDirection: "From Hwy 2 near Lake Wenatchee" } },
  { id: "wa_c_shadowed", name: "C", area_id: "wa_x",
    waypoints: [{ type: "Trailhead", name: "Sunrise Mine Trailhead", lat: null, lng: null }],
    approach_logistics: { trailhead: "Sunrise Mine Trailhead", trailheadLat: 48.03, trailheadLng: -121.48 } },
  { id: "wa_d_lognull", name: "D", area_id: "wa_x",
    waypoints: [{ type: "Trailhead", name: "Cascade Pass Trailhead", lat: 48.47, lng: -121.07 }],
    approach_logistics: { trailhead: "Cascade Pass Trailhead" } },
  { id: "wa_e_far_samename", name: "E", area_id: "wa_x",
    waypoints: [{ type: "Trailhead", name: "Colchuck Lake Trailhead", lat: 47.53, lng: -120.82 }],
    approach_logistics: { trailhead: "Colchuck Lake TH", trailheadLat: 47.56, trailheadLng: -120.82 } },
]);

let rows = fixture(-120.7);
let mode = "ok", hits = 0;
// selectAll paginates by keyset: `id=like.wa_*` and then a second `id=gt.<last>` on later pages,
// so the id param appears twice and URLSearchParams.get would return only the first.
const server = http.createServer((req, res) => {
  const m = req.url.match(/id=gt\.([^&]*)/);
  const after = m ? decodeURIComponent(m[1]) : "";
  const limit = Number((req.url.match(/limit=(\d+)/) || [])[1] || 60);
  // `mode` drives the fail-closed cases below. A healthy 200 carrying [] is the dangerous one:
  // it is indistinguishable from a clean catalog unless the audit refuses it explicitly.
  if (mode === "empty") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end("[]"); }
  if (mode === "down") { res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" })); }
  if (mode === "flaky" && ++hits <= 2) { res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" })); }
  const page = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1))
    .filter(r => !after || r.id > after).slice(0, limit);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(page));
});
await new Promise(r => server.listen(PORT, "127.0.0.1", r));

// Returns stdout on success; on a non-zero exit returns the error so the fail-closed cases can
// assert BOTH the exit code and what it said. A guard that dies for the wrong reason is not a catch.
const exec = async () => {
  try {
    const { stdout } = await run(process.execPath, ["scripts/audit-trailhead-agreement.mjs"],
      { cwd: sb, maxBuffer: 1 << 24 });
    return { code: 0, out: stdout, err: "" };
  } catch (e) { return { code: e.code ?? 1, out: e.stdout || "", err: e.stderr || "" }; }
};
const grab = (out, re) => { const m = out.match(re); return m ? m[1] : null; };
const summarise = out => ({
  routes: grab(out, /wa: (\d+) routes/), both: grab(out, /· (\d+) carry BOTH/),
  agree: grab(out, /agree within 500 m: (\d+)/), disagree: grab(out, /disagree: (\d+)/),
  shadowed: grab(out, /SHADOWED: (\d+) routes/), named: grab(out, /disagreements, (\d+) also give/),
});

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };

const runA = await exec();
const outA = runA.out;
const a = summarise(outA);
console.log(outA);
check(runA.code === 0, "a healthy read exits 0");
for (const [k, v] of Object.entries({ routes: "5", both: "3", agree: "1", disagree: "2", shadowed: "1", named: "1" }))
  check(a[k] === v, `${k}: got ${a[k]}, expected ${v}`);
for (const [id, want] of [["wa_b_far_named", true], ["wa_e_far_samename", true], ["wa_a_agree", false], ["wa_d_lognull", false]])
  check(new RegExp(`m  ${id}`).test(outA) === want, `${id} listed=${want}`);
check(/m  wa_b_far_named   \[NAME DIFFERS\]/.test(outA), "wa_b marked [NAME DIFFERS]");
check(!/m  wa_e_far_samename   \[NAME DIFFERS\]/.test(outA), "wa_e NOT marked [NAME DIFFERS] (norm() strips TH/Trailhead)");
check(/wa_c_shadowed/.test(outA), "wa_c named in the SHADOWED block");

// Falsification. Move wa_a's blob ~50 km: agree must fall to 0 and disagree rise to 3.
rows = fixture(-120.03);
const b = summarise((await exec()).out);
console.log(`\nfalsification: agree ${a.agree} -> ${b.agree}, disagree ${a.disagree} -> ${b.disagree}`);
check(b.agree === "0" && b.disagree === "3",
  "the summary moves with the data (otherwise run 1 proved nothing)");

// FAIL-CLOSED. The realistic failure of an audit like this is a false PASS about a database it
// never read — the shape check:field-renders shipped, where a silent timeout became a coverage
// verdict and the run then advised deleting correct bookkeeping. Three cases:
rows = fixture(-120.7);
console.log("");

// 1. A healthy 200 carrying []. Indistinguishable from a clean catalog unless refused explicitly.
mode = "empty";
const empty = await exec();
check(empty.code !== 0, `200 [] exits non-zero (got ${empty.code})`);
check(/refusing to report/.test(empty.err + empty.out), "200 [] says it is REFUSING to report");
check(!/agree within/.test(empty.out), "200 [] prints no summary — an empty read must not look clean");

// 2. The database is down for every attempt. Must exhaust retries and die, never report 0 findings.
mode = "down";
const down = await exec();
check(down.code !== 0, `a persistent 500 exits non-zero (got ${down.code})`);
check(/57014|GET routes/.test(down.err + down.out), "a persistent 500 names the failed read");
check(!/agree within/.test(down.out), "a persistent 500 prints no summary");
check((down.out.match(/attempt \d+ failed/g) || []).length >= 3, "it retried, and PRINTED each retry");

// 3. Fails twice then succeeds — retries must actually rescue the run, not merely be logged,
//    and the recovery must be announced rather than absorbed into an apparently clean run.
mode = "flaky"; hits = 0;
const flaky = await exec();
check(flaky.code === 0, "a transient 500 recovers and exits 0");
check(/succeeded on attempt 3/.test(flaky.out), "the recovery is PRINTED, not absorbed");
check(summarise(flaky.out).disagree === "2", "the recovered run reports the same findings");

server.close();
fs.rmSync(sb, { recursive: true, force: true });
console.log(bad ? `\n${bad} assertion(s) failed` : "\nok — the audit reports end to end, and its numbers track its input");
process.exit(bad ? 1 : 0);
