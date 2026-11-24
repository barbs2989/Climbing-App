#!/usr/bin/env node
// check:trip-reports — RELIABILITY'S RULES, executed against the real migrations (0519).
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
// to 0519's tables or functions, or to the reliability reads in lib/db.js.

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
if (!files.some((f) => /^0519_/.test(f))) dead("migration 0519 (crew trip reports) is not in supabase/migrations");
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
const LEFT = "10000000-0000-4000-8000-000000000004";     // a trip yesterday that C leaves
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
  const r = (await db.query(`select r.outcome, (select count(*)::int from crew_trip_replies y where y.trip_crew = r.trip_crew and y.trip_date = r.trip_date and y.reporter_id = r.reporter_id and y.about_id = r.about_id and y.outcome = r.outcome) n from crew_trip_reports r where crew_id = '${CREW}' and reporter_id = '${A}' and about_id = '${B}'`)).rows[0];
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
  if (!noShow.error && !cancelled.error) ok("someone who left can be given any answer (0523: when they left says nothing certain about whether they came)");
  else fail(`about a departed climber: no_show ${noShow.error || "ok"}, cancelled_late ${cancelled.error || "ok"}`);
  // The organizer removing B AFTER the day is recorded (0524), marked as a removal, so B stays on the trip's roster:
  // reportable, and able to report the organizer. (Before the day it is not a departure: section 11.)
  const removed = await as("authenticated", A, `delete from crew_members where crew_id = $1 and user_id = $2`, [LEFT, B]);
  const depB = (await db.query(`select removed_by_other from crew_departures where crew_id = '${LEFT}' and user_id = '${B}'`)).rows[0];
  const bReports = await report(B, LEFT, A, "no_show");
  if (!removed.error && depB && depB.removed_by_other === true && !bReports.error) ok("a member the organizer removes AFTER the day stays on the trip (marked removed) and can still report the organizer (0524)");
  else fail(`removal after the day: ${removed.error || "ok"}; departure ${JSON.stringify(depB)}; B reporting A: ${bReports.error || "ok"}`);
  await db.exec(`delete from crew_trip_reports where crew_id = '${LEFT}' and reporter_id = '${B}'`);
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
  // 0521: an older vouch rated the retired "punctuality", and it counts when the vouch has no reliability rating;
  // a vouch that has both counts its reliability rating.
  await db.exec(`
    insert into vouches (from_id, to_id, reason) values
      ('${D}', '${A}', '{"ratings":{"punctuality":3}}'),
      ('${C}', '${A}', '{"ratings":{"punctuality":1,"reliability":5}}');
  `);
  const a = (await rel(B, [A]))[A];
  if (a.rel_n === 2 && Number(a.rel_avg) === 4) ok("a punctuality-only vouch counts as reliability (3), and a vouch with both counts its reliability rating (5, not 1): 4.0 from 2");
  else fail(`A's vouch reliability with a punctuality-only vouch reads ${JSON.stringify(a)}`);
}

// ── 10. the two reviews of 2026-11-24 (0522, 0523) ─────────────────────────────────────────────────────────────
{
  const id = (n) => `10000000-0000-4000-8000-0000000000${n}`;
  const E = U("e5");
  // The trip's "today" is the date at UTC-12 (0523): dates below are built from it, so the test does not depend on
  // the hour it runs at.
  const T = `((now() at time zone 'utc') - interval '12 hours')::date`;
  const crew = async (n, dayExpr, members) => db.exec(`
    insert into crews (id, route_id, created_by, agreed_date) values ('${id(n)}', 'r1', '${B}', to_char(${dayExpr}, 'YYYY-MM-DD'));
    insert into crew_members (crew_id, user_id, status, invited_by) values ${members.map((m) => `('${id(n)}', '${m}', 'confirmed', '${B}')`).join(", ")};`);
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${E}', 'e@example.test', '{"name":"Emery"}');`);

  // (a) A crew deleted afterwards (maintenance, or an account's deletion): two reports about one trip still count once,
  //     and a crewmate's "called off" still clears its trip.
  await crew(11, `${T} - 1`, [C, E]); await crew(12, `${T} - 1`, [C, E]);
  await report(B, id(11), E, "no_show"); await report(C, id(11), E, "no_show");
  await report(B, id(12), E, "no_show"); await report(C, id(12), null, "called_off");
  await ageAll(id(11), 8); await ageAll(id(12), 8);
  await db.exec(`delete from crews where id in ('${id(11)}', '${id(12)}')`);
  let e = (await rel(D, [E]))[E];
  if (e.trips === 1 && e.no_show === 1) ok("after the crews are deleted, two reports about one trip still count once, and a crewmate's \"called off\" still clears its trip");
  else fail(`after deleting the crews E reads ${JSON.stringify(e)} — want 1 trip, 1 no-show`);
  await db.exec(`delete from crew_trip_reports where about_id = '${E}'`);

  // (b) 0523: leaving AFTER the day still leaves you reportable, with any answer (a no-show cannot dodge by leaving).
  await crew(14, `${T} - 2`, [E]);
  await as("authenticated", E, `delete from crew_members where crew_id = '${id(14)}' and user_id = $1`, [E]);
  const late = await report(B, id(14), E, "no_show");
  if (!late.error) ok("a crewmate who did not show and then left the crew after the day can still be reported (0523)");
  else fail(`leaving after the day dodged the report: ${late.error}`);

  // (c) 0523: a crew with crewmates cannot be disbanded by its organizer while its trip is reportable; before the day it can.
  await crew(15, `${T} - 1`, [E]); await crew(16, `${T} + 5`, [E]);
  const blocked = await as("authenticated", B, `delete from crews where id = $1 returning id`, [id(15)]);
  const before = await as("authenticated", B, `delete from crews where id = $1 returning id`, [id(16)]);
  if (blocked.error && /can be reported on until/.test(blocked.error) && !before.error && before.rows.length === 1) ok("a crew cannot be disbanded while its trip can be reported on, and can before the day (0523)");
  else fail(`disband in the window: ${blocked.error || "ALLOWED"}; before the day: ${before.error || before.rows?.length + " row(s)"}`);

  // (d) 0523: a second trip on one crew is its own trip; the first trip's report is not overwritten.
  await crew(17, `${T} - 3`, [E]);
  await report(B, id(17), E, "on_time");
  await db.exec(`update crews set agreed_date = to_char(${T} - 1, 'YYYY-MM-DD') where id = '${id(17)}'`);
  await report(B, id(17), E, "no_show");
  await ageAll(id(17), 8);
  e = (await rel(D, [E]))[E];
  const n17 = (await db.query(`select count(*)::int n from crew_trip_reports where trip_crew = '${id(17)}' and about_id = '${E}'`)).rows[0].n;
  if (n17 === 2 && e.on_time === 1 && e.no_show >= 1) ok("a second trip on the same crew is reported as its own trip; the first is kept (0523)");
  else fail(`two trips on one crew: ${n17} report row(s); E reads ${JSON.stringify(e)}`);
  await db.exec(`delete from crew_trip_reports where about_id = '${E}'; delete from crew_trip_replies where about_id = '${E}'`);

  // (e) 0523: "I was there" survives the reporter taking the report back and filing it again; a DIFFERENT answer is new.
  await crew(18, `${T} - 1`, [E]);
  await report(B, id(18), E, "no_show");
  await report(E, id(18), B, "on_time");                     // E files, so the report is revealed to E
  const rep = (await db.query(`select id from crew_trip_reports where trip_crew = '${id(18)}' and about_id = '${E}'`)).rows[0];
  await as("authenticated", E, `select reply_to_trip_report($1, 'was_there', null)`, [rep.id]);
  await as("authenticated", B, `select withdraw_trip_report($1, $2)`, [id(18), E]);
  await report(B, id(18), E, "no_show");
  e = (await rel(D, [E]))[E];
  if (e.no_show === 0 && e.trips === 0) ok("taking a report back and filing the same answer again meets the same \"I was there\" (0523)");
  else fail(`after withdraw and re-file, E reads ${JSON.stringify(e)} — the dispute was erased`);
  await report(B, id(18), E, "late");
  e = (await rel(D, [E]))[E];
  if (e.late === 1) ok("...while a DIFFERENT answer is a new claim the dispute does not cover");
  else fail(`after changing to late, E reads ${JSON.stringify(e)}`);
  // (f) a note added after "I was there" keeps the dispute (0522), on a claim answered with both.
  await report(B, id(18), E, "no_show");
  const rep2 = (await db.query(`select id from crew_trip_reports where trip_crew = '${id(18)}' and about_id = '${E}'`)).rows[0];
  await as("authenticated", E, `select reply_to_trip_report($1, 'note', 'I was at the trailhead at 5')`, [rep2.id]);
  const y = (await db.query(`select reply, note, outcome from crew_trip_replies where trip_crew = '${id(18)}' and about_id = '${E}'`)).rows[0];
  if (y && y.reply === "was_there" && y.note === "I was at the trailhead at 5" && y.outcome === "no_show") ok("a note added after \"I was there\" keeps the dispute, and the note");
  else fail(`after was_there then a note, the reply row reads ${JSON.stringify(y)}`);

  // (g) 0523: the window is the trip's day to 14 days after, by the date at UTC-12: never open before the day anywhere.
  await crew(19, `${T} + 1`, [E]); await crew(20, `${T}`, [E]); await crew(21, `${T} - 14`, [E]); await crew(22, `${T} - 15`, [E]);
  const r19 = await report(B, id(19), E, "on_time"), r20 = await report(B, id(20), E, "on_time"), r21 = await report(B, id(21), E, "on_time"), r22 = await report(B, id(22), E, "on_time");
  if (r19.error && !r20.error && !r21.error && r22.error) ok("the window opens on the trip's day and closes 14 days later, by the date at UTC-12 (never early)");
  else fail(`window: day before ${r19.error ? "refused" : "ACCEPTED"}, the day ${r20.error || "ok"}, day 14 ${r21.error || "ok"}, day 15 ${r22.error ? "refused" : "ACCEPTED"}`);
}

// ── 11. the third review (0524): a trip is fixed once its day comes ──────────────────────────────────────────────
{
  const id = (n) => `10000000-0000-4000-8000-0000000000${n}`;
  const T = `((now() at time zone 'utc') - interval '12 hours')::date`;
  const F = U("f6"), G = U("a7");
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${F}', 'f@example.test', '{"name":"Finley"}'), ('${G}', 'g@example.test', '{"name":"Gray"}');`);
  const crew = async (n, dayExpr, members) => db.exec(`
    insert into crews (id, route_id, created_by, agreed_date) values ('${id(n)}', 'r1', '${F}', to_char(${dayExpr}, 'YYYY-MM-DD'));
    ${members.length ? `insert into crew_members (crew_id, user_id, status, invited_by) values ${members.map((m) => `('${id(n)}', '${m}', 'confirmed', '${F}')`).join(", ")};` : ""}`);

  // (a) The organizer cannot move or clear the day after it has come (the reports and the disband guard hang on it);
  //     before the day they can.
  await crew(31, `${T} - 1`, [G]); await crew(32, `${T} + 5`, [G]);
  const move = await as("authenticated", F, `update crews set agreed_date = to_char(${T} + 3, 'YYYY-MM-DD') where id = $1 returning id`, [id(31)]);
  const clear = await as("authenticated", F, `update crews set agreed_date = null where id = $1 returning id`, [id(31)]);
  const early = await as("authenticated", F, `update crews set agreed_date = to_char(${T} + 6, 'YYYY-MM-DD') where id = $1 returning id`, [id(32)]);
  if (move.error && clear.error && /stays/.test(move.error) && !early.error && early.rows.length === 1) ok("a crew's day cannot be moved or cleared once it has come, and can before (0524)");
  else fail(`move: ${move.error || "ALLOWED"}; clear: ${clear.error || "ALLOWED"}; before the day: ${early.error || early.rows?.length + " row(s)"}`);

  // (b) Declining after the day is coming off the crew: recorded, and still reportable.
  await crew(33, `${T} - 1`, [G]);
  await as("authenticated", G, `update crew_members set status = 'declined' where crew_id = $1 and user_id = $2`, [id(33), G]);
  const dec = (await db.query(`select count(*)::int n from crew_departures where crew_id = '${id(33)}' and user_id = '${G}'`)).rows[0].n;
  const decRep = await report(F, id(33), G, "no_show");
  if (dec === 1 && !decRep.error) ok("setting your own status to declined after the day is recorded and stays reportable (0524)");
  else fail(`declined after the day: ${dec} departure(s); report ${decRep.error || "ok"}`);

  // (c) The organizer removing someone BEFORE the day is not that someone bailing.
  await crew(34, `${T} + 5`, [G]);
  await as("authenticated", F, `delete from crew_members where crew_id = $1 and user_id = $2`, [id(34), G]);
  const pre = (await db.query(`select count(*)::int n from crew_departures where crew_id = '${id(34)}'`)).rows[0].n;
  if (pre === 0) ok("the organizer removing someone before the day is not recorded as a departure");
  else fail(`a removal before the day was recorded (${pre})`);

  // (d) A departure belongs to ITS trip: one recorded for an earlier day does not put them on the next trip.
  await crew(35, `${T} - 1`, []);
  await db.exec(`insert into crew_departures (crew_id, user_id, agreed_date, left_at) values ('${id(35)}', '${G}', ${T} - 3, now() - interval '2 days')`);
  const other = await report(F, id(35), G, "no_show");
  const recap = (await as("authenticated", F, `select * from crew_recap($1)`, [id(35)])).rows || [];
  if (other.error && !recap.some((r) => r.about_id === G)) ok("a departure from an earlier trip does not put them on this trip's roster (0524)");
  else fail(`report about a climber who left an EARLIER trip: ${other.error ? "refused" : "ACCEPTED"}; listed: ${recap.some((r) => r.about_id === G)}`);

  // (e) Flip-flopping cannot wipe a dispute: answers have one reply each.
  await crew(36, `${T} - 1`, [G]);
  await report(F, id(36), G, "no_show");
  await report(G, id(36), F, "on_time");
  const r1 = (await db.query(`select id from crew_trip_reports where trip_crew = '${id(36)}' and about_id = '${G}'`)).rows[0].id;
  await as("authenticated", G, `select reply_to_trip_report($1, 'was_there', null)`, [r1]);
  await report(F, id(36), G, "late");
  await as("authenticated", G, `select reply_to_trip_report($1, 'note', 'I was late, the road was closed')`, [r1]);
  await report(F, id(36), G, "no_show");
  const g = (await rel(D, [G]))[G];
  if (g.no_show === 0 && g.trips === 0) ok("switching to another answer and back cannot wipe \"I was there\" (one reply per answer, 0524)");
  else fail(`after no_show, was_there, late, a note on late, no_show again: G reads ${JSON.stringify(g)}`);
}

const FLOOR = 20;
if (ran < FLOOR) dead(`only ${ran} assertions ran, expected at least ${FLOOR}`);
console.log(failures ? `\n${failures} problem(s).` : `\nok — the trip-report rules hold (${ran} assertions)`);
process.exit(failures ? 1 : 0);
