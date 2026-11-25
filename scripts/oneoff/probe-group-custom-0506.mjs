// One-off: do 0506's rules hold? Replays every migration into PGlite (no network, no production), as
// probe-top-contributors-0486.mjs does, then as the database owner:
//   1. a group takes a welcome note, an announcement, two https links, a moderator title and a hex accent;
//   2. it refuses a 5th link, an http link, a link with no label, a 25-character title, a non-hex accent;
//   3. an RSVP and an invite to an event 3 days ago are refused ("This event has ended"); to yesterday's
//      and next week's they land (the database is a day more lenient than the app, on purpose);
//   4. cancelling an RSVP to a past event is still allowed;
//   5. the new text is screened: screening_text('group', ...) carries the announcement and a link label.
//   node scripts/oneoff/probe-group-custom-0506.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0, passes = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (c) passes++; else failures++; };
const dead = (m) => { console.error(`probe-group-custom-0506 FAILED: ${m}. Nothing below was checked.`); process.exit(1); };

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
const files = fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
for (const f of files) {
  try { await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit"); }
  catch (e) { await db.exec("rollback").catch(() => {}); dead(`${f} did not replay: ${e.message}`); }
}
if (!files.some((f) => f.startsWith("0506_"))) dead("0506 is not in supabase/migrations");
console.log(`probe-group-custom-0506: ${files.length} migrations replayed.`);

const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b";
const G = "00000000-0000-4000-8000-0000000000a1";
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@example.test'), ('${B}', 'b@example.test');
  insert into groups (id, name, created_by) values ('${G}', 'Probe Climbers', '${A}');
`);
const tries = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const set = (col, v) => tries(`update groups set ${col} = ${v} where id = '${G}'`);

// 1
ok(await set("welcome_text", "'Welcome! Read the rules, then say hi.'") === null, "a welcome note is stored");
ok(await set("announcement", "'Gym night moves to Thursday.'") === null, "an announcement is stored");
ok(await set("links", `'[{"label":"Website","url":"https://example.org"},{"label":"Instagram","url":"https://instagram.com/probe"}]'`) === null, "two https links are stored");
ok(await set("mod_title", "'Crew lead'") === null, "a moderator title is stored");
ok(await set("accent", "'#3fb950'") === null, "a hex accent is stored");
// 2
const five = JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ label: "L" + i, url: "https://example.org/" + i })));
ok(await set("links", `'${five}'`) !== null, "a 5th link is refused");
ok(await set("links", `'[{"label":"Site","url":"http://example.org"}]'`) !== null, "an http link is refused");
ok(await set("links", `'[{"label":"Site","url":"javascript:alert(1)"}]'`) !== null, "a javascript: link is refused");
ok(await set("links", `'[{"label":"","url":"https://example.org"}]'`) !== null, "a link with no label is refused");
ok(await set("mod_title", "'" + "x".repeat(25) + "'") !== null, "a 25-character moderator title is refused");
ok(await set("accent", "'red;background:url(x)'") !== null, "a non-hex accent is refused");
ok(await set("announcement", "'" + "a".repeat(301) + "'") !== null, "a 301-character announcement is refused");
// 3, 4
const ev = async (days) => { const r = await db.query(`insert into group_events (group_id, host, title, event_date) values ('${G}', '${A}', 'E', (now() at time zone 'utc')::date + ${days}) returning id`); return r.rows[0].id; };
const old = await ev(-3), yest = await ev(-1), next = await ev(7);
const rsvp = (e) => tries(`insert into group_event_rsvps (event_id, user_id) values ('${e}', '${B}')`);
const inv = (e) => tries(`insert into group_event_invites (event_id, invitee, invited_by) values ('${e}', '${B}', '${A}')`);
const r1 = await rsvp(old);
ok(r1 !== null && /has ended/.test(r1), "an RSVP to an event 3 days ago is refused: " + r1);
const i1 = await inv(old);
ok(i1 !== null && /has ended/.test(i1), "an invite to an event 3 days ago is refused: " + i1);
ok(await rsvp(yest) === null, "an RSVP to yesterday's event lands (a day of slack for time zones)");
ok(await rsvp(next) === null && await inv(next) === null, "an RSVP and an invite to next week's event land");
await db.exec(`update group_events set event_date = event_date - 10 where id = '${next}'`);
ok(await tries(`delete from group_event_rsvps where event_id = '${next}' and user_id = '${B}'`) === null, "cancelling an RSVP to a past event is still allowed");
// 5
await set("links", `'[{"label":"Probe label","url":"https://example.org"}]'`);
const t = (await db.query(`select screening_text('group', to_jsonb(g)) t from groups g where id = '${G}'`)).rows[0].t || "";
ok(t.includes("Gym night") && t.includes("Probe label") && t.includes("Crew lead") && t.includes("Welcome!"), "the new text is screened with the group");
// 0509: the link's address is printed on About, so it is screened too.
ok(!files.some((f) => f.startsWith("0509_")) || t.includes("example.org"), "a link's address is screened with its label (0509)");

console.log(`\nprobe-group-custom-0506: ${passes} passed, ${failures} failed.`);
process.exit(failures ? 1 : 0);
