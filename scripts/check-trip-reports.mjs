#!/usr/bin/env node
// check:trip-reports — RELIABILITY'S RULES, executed against the real migrations (0518).
//
// Owner, 2026-11-23: reliability (showed up, on time, didn't bail) is recorded by the crew after the trip. One
// crewmate's report counts; the climber it is about can reply "I was there", which takes it out; a report is hidden
// from the climber it is about until they file their own recap or 7 days pass; turning back for weather or safety
// marks nobody; and it is shown as COUNTS. Every one of those is a rule in SQL, and a rule in SQL that nothing runs
// is a comment. This replays every migration into PGlite (as check:migration-replay does, with Supabase's default
// grants, as check:profile-privacy does), builds three climbers and real-shaped crews, and drives each rule as the
// climber who would try to break it.
//
//   node scripts/check-trip-reports.mjs
//
// Hand-run, like check:profile-privacy (~40 s of WASM replay, no credential, no network): before pushing any change
// to 0518's tables or functions, or to the reliability reads in lib/db.js.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; failures++; console.log("  FAIL  " + m); };
const dead = (m) => { console.error(`check:trip-reports FAILED — ${m}. Nothing below was checked.`); process.exit(1); };

let PGlite, ltree, pg_trgm, pgcrypto, uuid_ossp;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ ltree } = await import("@electric-sql/pglite/contrib/ltree"));
  ({ pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm"));
  ({ pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto"));
  ({ uuid_ossp } = await import("@electric-sql/pglite/contrib/uuid_ossp"));
} catch { dead("@electric-sql/pglite is not installed (npm install)"); }

const replaySrc = fs.readFileSync(path.join(ROOT, "scripts", "check-migration-replay.mjs"), "utf8");
const preStart = replaySrc.indexOf("await db.exec(`");
if (preStart < 0) dead("could not find check:migration-replay's setup block");
const pre = replaySrc.slice(preStart + 15, replaySrc.indexOf("`);", preStart));

const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
await db.exec(pre);
await db.exec(`
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
const files = fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
if (!files.some((f) => /^0518_/.test(f))) dead("migration 0518 (crew trip reports) is not in supabase/migrations");
for (const f of files) {
  try { await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit"); }
  catch (e) { await db.exec("rollback").catch(() => {}); dead(`${f} did not replay: ${e.message}`); }
}
console.log(`check:trip-reports: ${files.length} migrations replayed with Supabase's default grants.`);

// ── fixtures: A organises, B and C are crewmates, D is a stranger ──────────────────────────────────────────────────
const U = (c) => `00000000-0000-4000-8000-0000000000${c}`;
const A = U("a1"), B = U("b2"), C = U("c3"), D = U("d4");
const CREW = "10000000-0000-4000-8000-000000000001";     // a trip yesterday: A, B, C
const OLD = "10000000-0000-4000-8000-000000000002";      // a trip 20 days ago: reports closed
const SOON = "10000000-0000-4000-8000-000000000003";     // a trip next week
const LEFT = "10000000-0000-4000-8000-000000000004";     // a trip yesterday that C left 3 days before
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'a@example.test', '{"name":"Avery"}'), ('${B}', 'b@example.test', '{"name":"Blake"}'),
    ('${C}', 'c@example.test', '{"name":"Casey"}'), ('${D}', 'd@example.test', '{"name":"Drew"}');
  insert into crews (id, route_id, created_by, agreed_date) values
    ('${CREW}', 'r1', '${A}', to_char(current_date - 1, 'YYYY-MM-DD')),
    ('${OLD}',  'r1', '${A}', to_char(current_date - 20, 'YYYY-MM-DD')),
    ('${SOON}', 'r1', '${A}', to_char(current_date + 7, 'YYYY-MM-DD')),
    ('${LEFT}', 'r1', '${A}', to_char(current_date - 1, 'YYYY-MM-DD'));
  insert into crew_members (crew_id, user_id, status, invited_by) values
    ('${CREW}', '${B}', 'confirmed', '${A}'), ('${CREW}', '${C}', 'confirmed', '${A}'),
    ('${OLD}',  '${B}', 'confirmed', '${A}'), ('${SOON}', '${B}', 'confirmed', '${A}'),
    ('${LEFT}', '${B}', 'confirmed', '${A}'), ('${LEFT}', '${C}', 'confirmed', '${A}');
`);
if ((await db.query(`select count(*)::int n from crew_members where crew_id = '${CREW}' and status = 'confirmed'`)).rows[0].n !== 3) dead("the fixture crew does not have its three confirmed members");

// Run `sql` as a client role with a JWT subject (null = signed out). The transaction is COMMITTED (a probe that
// rolled back every write could not test what a later call sees). Resolves { rows } or { error }.
async function as(role, uid, sql, params = []) {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [uid || "", role]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params);
    await db.exec("commit");
    return { rows: r.rows };
  } catch (e) {
    await db.exec("rollback").catch(() => {});
    return { error: e.message };
  }
}
const report = (uid, crew, about, outcome) => as("authenticated", uid, `select submit_trip_report($1, $2, $3) as id`, [crew, about, outcome]);
const rel = async (uid, ids) => {
  const r = await as("authenticated", uid, `select * from reliability_of_users($1::uuid[])`, [ids]);
  if (r.error) return { error: r.error };
  return Object.fromEntries(r.rows.map((x) => [x.id, x]));
};
const aboutMe = (uid) => as("authenticated", uid, `select * from my_trip_reports_about_me()`);
const ageAll = (crew, days) => db.exec(`update crew_trip_reports set updated_at = now() - interval '${days} days' where crew_id = '${crew}'`);

// ── 1. nobody reads a report row by row ────────────────────────────────────────────────────────────────────────────
for (const t of ["crew_trip_reports", "crew_trip_replies", "crew_departures"]) {
  const anon = await as("anon", null, `select * from ${t} limit 1`), auth = await as("authenticated", A, `select * from ${t} limit 1`);
  const ins = await as("authenticated", A, `insert into crew_trip_reports (crew_id, reporter_id, about_id, trip_date, outcome) values ('${CREW}', '${A}', '${B}', current_date, 'no_show')`);
  if (anon.error && auth.error && ins.error) ok(`${t}: neither signed out nor signed in can read it directly, and a direct insert is refused`);
  else fail(`${t} is reachable directly (anon: ${anon.error ? "refused" : "READ"}, signed in: ${auth.error ? "refused" : "READ"}, insert: ${ins.error ? "refused" : "WROTE"}) — the reveal rule is decoration`);
}
const anonRel = await as("anon", null, `select * from reliability_of_users(array['${B}']::uuid[])`);
if (anonRel.error) ok("signed out cannot call reliability_of_users (signed-in only, like partner_counts)");
else fail("signed out can read reliability counts");

// ── 2. who may report, and when ────────────────────────────────────────────────────────────────────────────────────
{
  const stranger = await report(D, CREW, B, "no_show");
  const self = await report(B, CREW, B, "on_time");
  const notMate = await report(A, CREW, D, "no_show");
  const early = await report(A, SOON, B, "no_show");
  const late = await report(A, OLD, B, "no_show");
  const anon = await as("anon", null, `select submit_trip_report('${CREW}', '${B}', 'no_show')`);
  const bogus = await report(A, CREW, B, "flaked");
  const names = await report(A, CREW, B, "called_off");
  const checks = [["a stranger", stranger], ["yourself", self], ["someone not on the crew", notMate], ["before the day", early],
    ["more than 14 days after", late], ["signed out", anon], ["an unknown outcome", bogus], ["a 'called off' that names somebody", names]];
  const let_through = checks.filter(([, r]) => !r.error);
  if (!let_through.length) ok(`refused: ${checks.map((c) => c[0]).join(", ")}`);
  else fail(`a report was ACCEPTED from/for: ${let_through.map((c) => c[0]).join(", ")}`);
}

// ── 3. one report counts, but only once revealed ───────────────────────────────────────────────────────────────────
{
  const r = await report(A, CREW, B, "no_show");
  if (r.error) dead(`a crewmate's report was refused: ${r.error}`);
  const hidden = await aboutMe(B), counted = await rel(D, [B]);
  if (!hidden.error && hidden.rows.length === 0 && counted[B].trips === 0) ok("a fresh report is HIDDEN from the climber it is about, and changes nobody's counts yet");
  else fail(`before the reveal, B sees ${hidden.rows?.length} report(s) and counts show ${counted[B]?.trips} trip(s) — the reveal rule leaks`);
  // B files their own recap for the crew: the reveal opens (Airbnb's simultaneous reveal).
  await report(B, CREW, A, "on_time");
  const shown = await aboutMe(B), now = await rel(D, [B]);
  if (shown.rows?.length === 1 && shown.rows[0].outcome === "no_show" && shown.rows[0].reporter_id === A && now[B].trips === 1 && now[B].no_show === 1)
    ok("once B files their own recap, B sees A's report (naming A) and B's counts read 1 trip, 1 no-show — one report counts");
  else fail(`after B's own recap: B sees ${JSON.stringify(shown.rows)}; counts ${JSON.stringify(now[B])}`);
  // ...and A's on-time report about... A is hidden from A until A files (A filed about B: so it is revealed).
  const aSees = await aboutMe(A);
  if (aSees.rows?.length === 1 && aSees.rows[0].outcome === "on_time") ok("A filed first, so B's report about A is shown to A at once");
  else fail(`A sees ${JSON.stringify(aSees.rows)}`);
}

// ── 4. the 7-day reveal, for a climber who never files ─────────────────────────────────────────────────────────────
{
  await report(A, CREW, C, "late");
  const before = await aboutMe(C);
  await ageAll(CREW, 8);
  const after = await aboutMe(C);
  if (before.rows?.length === 0 && after.rows?.length === 1) ok("a climber who never files sees the report about them after 7 days");
  else fail(`C saw ${before.rows?.length} report(s) before and ${after.rows?.length} after 7 days`);
}

// ── 5. "I was there" takes it out; a note does not ─────────────────────────────────────────────────────────────────
{
  const mine = (await aboutMe(B)).rows[0];
  const wrongPerson = await as("authenticated", C, `select reply_to_trip_report($1, 'was_there', null)`, [mine.id]);
  if (wrongPerson.error) ok("only the climber a report is about can answer it"); else fail("a crewmate answered a report about somebody else");
  const note = await as("authenticated", B, `select reply_to_trip_report($1, 'note', 'Car broke down on the pass; I messaged at 6am')`, [mine.id]);
  const withNote = await rel(D, [B]);
  if (!note.error && withNote[B].no_show === 1) ok("a NOTE adds context and the report still counts");
  else fail(`a note: ${note.error || "ok"}; counts ${JSON.stringify(withNote[B])}`);
  const there = await as("authenticated", B, `select reply_to_trip_report($1, 'was_there', null)`, [mine.id]);
  const disputed = await rel(D, [B]);
  if (!there.error && disputed[B].trips === 0 && disputed[B].no_show === 0) ok("\"I was there\" disputes it: the report stops counting");
  else fail(`"I was there": ${there.error || "ok"}; counts ${JSON.stringify(disputed[B])} — a disputed report still counts`);
  // The REPORTER sees the answer on their recap: a note only its writer could read would be context for nobody.
  const back = (await as("authenticated", A, `select * from crew_recap($1)`, [CREW])).rows?.find((r) => r.about_id === B);
  const strangerRecap = await as("authenticated", D, `select * from crew_recap($1)`, [CREW]);
  if (back && back.their_reply === "was_there" && back.my_outcome === "no_show" && strangerRecap.rows?.length === 0) ok("the reporter's recap shows the crewmate's answer, and a stranger's recap of the crew is empty");
  else fail(`A's recap row about B: ${JSON.stringify(back)}; stranger's recap rows: ${JSON.stringify(strangerRecap.rows || strangerRecap.error)}`);
  const emptyNote = await as("authenticated", B, `select reply_to_trip_report($1, 'note', '   ')`, [mine.id]);
  if (emptyNote.error) ok("an empty note is refused"); else fail("an empty note was accepted");
}

// ── 6. changing a report clears its answer and hides it again ──────────────────────────────────────────────────────
{
  await db.exec(`delete from crew_trip_reports where crew_id = '${CREW}' and reporter_id = '${B}'`); // B un-files, so the reveal depends on time
  await report(A, CREW, B, "cancelled_late");
  const r = (await db.query(`select r.outcome, (select count(*)::int from crew_trip_replies y where y.report_id = r.id) n from crew_trip_reports r where crew_id = '${CREW}' and reporter_id = '${A}' and about_id = '${B}'`)).rows[0];
  const seen = await aboutMe(B);
  if (r.outcome === "cancelled_late" && r.n === 0 && seen.rows.length === 0) ok("a CHANGED report drops the old reply and is hidden again until the reveal");
  else fail(`after a change: ${JSON.stringify(r)}; B sees ${seen.rows.length}`);
}

// ── 7. called off marks nobody — unless it is the reported climber excusing themself ───────────────────────────────
{
  await ageAll(CREW, 8);
  const beforeC = (await rel(D, [C]))[C];
  const selfExcuse = await report(C, CREW, null, "called_off");
  const stillC = (await rel(D, [C]))[C];
  if (!selfExcuse.error && beforeC.late === 1 && stillC.late === 1) ok("the reported climber saying \"called off\" does not excuse themself");
  else fail(`C's own "called off": ${selfExcuse.error || "ok"}; C's late count ${beforeC.late} -> ${stillC.late}`);
  const callOff = await report(B, CREW, null, "called_off");
  const afterC = (await rel(D, [C]))[C];
  if (!callOff.error && afterC.trips === 0) ok("a crewmate saying the crew called it off (weather, conditions, safety) takes the trip off everyone else's record");
  else fail(`B's "called off": ${callOff.error || "ok"}; C's counts ${JSON.stringify(afterC)}`);
  const bRows = (await db.query(`select count(*)::int n from crew_trip_reports where crew_id = '${CREW}' and reporter_id = '${B}' and about_id is not null`)).rows[0].n;
  if (bRows === 0) ok("calling it off replaces the caller's per-person reports"); else fail(`B still has ${bRows} per-person report(s) beside a "called off"`);
}

// ── 8. leaving the crew: a departure stays reportable, a removal is not a departure ────────────────────────────────
{
  // C leaves LEFT by their own hand (auth.uid() = C), dated 3 days before the day.
  const leave = await as("authenticated", C, `delete from crew_members where crew_id = $1 and user_id = $2`, [LEFT, C]);
  await db.exec(`update crew_departures set left_at = now() - interval '4 days' where crew_id = '${LEFT}'`);
  const dep = (await db.query(`select count(*)::int n from crew_departures where crew_id = '${LEFT}' and user_id = '${C}'`)).rows[0].n;
  if (!leave.error && dep === 1) ok("a confirmed member leaving a crew with an agreed day is recorded as a departure");
  else fail(`leaving: ${leave.error || "ok"}; departures ${dep}`);
  const recap = await as("authenticated", A, `select * from crew_recap($1)`, [LEFT]);
  const listed = recap.rows?.find((r) => r.about_id === C);
  if (listed && listed.departed === true) ok("the recap sheet still lists the climber who left, marked as left");
  else fail(`crew_recap after C left: ${JSON.stringify(recap.rows || recap.error)}`);
  const noShow = await report(A, LEFT, C, "no_show"), cancelled = await report(A, LEFT, C, "cancelled_late");
  if (noShow.error && !cancelled.error) ok("someone who left can be reported as cancelling, not as a no-show");
  else fail(`about a departed climber: no_show ${noShow.error ? "refused" : "ACCEPTED"}, cancelled_late ${cancelled.error || "ok"}`);
  // The organizer removing B is not B bailing.
  const removed = await as("authenticated", A, `delete from crew_members where crew_id = $1 and user_id = $2`, [LEFT, B]);
  const depB = (await db.query(`select count(*)::int n from crew_departures where crew_id = '${LEFT}' and user_id = '${B}'`)).rows[0].n;
  if (!removed.error && depB === 0) ok("a member the ORGANIZER removed is not recorded as having left");
  else fail(`removal by the organizer: ${removed.error || "ok"}; B's departures ${depB}`);
  // Deleting a crew keeps the reports about it (crew_id set null), so an organizer cannot wipe a no-show that way.
  await ageAll(LEFT, 8);
  const keep = (await rel(D, [C]))[C];
  await db.exec(`delete from crews where id = '${LEFT}'`);
  const kept = (await rel(D, [C]))[C];
  if (keep.cancelled_late === 1 && kept.cancelled_late === 1) ok("deleting the crew does not delete what its crewmates reported");
  else fail(`C's cancelled-late count ${keep.cancelled_late} -> ${kept.cancelled_late} after the crew was deleted`);
}

// ── 9. benefit of the doubt, and vouch stars ───────────────────────────────────────────────────────────────────────
{
  // Every earlier report about C goes, the one section 8 kept from the DELETED crew included (a separate trip, which
  // would make this read 2 trips and prove nothing about one trip with two reporters).
  await db.exec(`delete from crew_trip_reports where crew_id = '${CREW}' or about_id = '${C}'`);
  await report(A, CREW, C, "no_show");
  await report(B, CREW, C, "late");
  await ageAll(CREW, 8);
  const c = (await rel(D, [C]))[C];
  if (c.trips === 1 && c.late === 1 && c.no_show === 0) ok("two crewmates who disagree about one trip count ONCE, at the more favourable outcome");
  else fail(`two reports about C's one trip read ${JSON.stringify(c)}`);
  await db.exec(`
    insert into vouches (from_id, to_id, reason) values
      ('${A}', '${D}', '{"ratings":{"reliability":5,"safety":4}}'),
      ('${B}', '${D}', '{"ratings":{"reliability":"4"}}'),
      ('${C}', '${D}', 'Great partner, plain text from before vouches had ratings');
  `);
  const d = (await rel(A, [D]))[D];
  if (d.rel_n === 2 && Number(d.rel_avg) === 4.5 && d.trips === 0) ok("vouch Reliability stars are averaged (5 and \"4\" -> 4.5 from 2), and a plain-text vouch is skipped, not an error");
  else fail(`D's vouch reliability reads ${JSON.stringify(d)}`);
}

const FLOOR = 20;
if (ran < FLOOR) dead(`only ${ran} assertions ran, expected at least ${FLOOR}`);
console.log(failures ? `\n${failures} problem(s).` : `\nok — the trip-report rules hold (${ran} assertions)`);
process.exit(failures ? 1 : 0);
