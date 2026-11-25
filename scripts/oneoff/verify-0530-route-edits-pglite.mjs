// verify-0530-route-edits-pglite.mjs: replays every migration into PGlite and proves 0530. A waiting or turned-down edit
// is private; a field edit is checked when sent (numbers, grades, pins, links, screened words); a flag note needs 5
// characters; an approval can be taken back (grade and area values restored); the reviewer role cannot ban; the
// audit worklist is admin-only. No production database: node scripts/oneoff/verify-0530-route-edits-pglite.mjs. Exits 1 on failure.
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
// Same stand-ins as scripts/check-migration-replay.mjs, plus Supabase's default grants.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create role authenticator noinherit; create role supabase_admin;
  create schema extensions; create schema auth; create schema storage;
  create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text,
    raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', email_confirmed_at timestamptz,
    last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
    is_anonymous boolean default false, deleted_at timestamptz, banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table storage.buckets (id text primary key, name text not null, owner uuid, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[], avif_autodetection boolean default false,
    created_at timestamptz default now(), updated_at timestamptz default now());
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
    name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[], version text,
    created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
for (const f of fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit");
}

const U = { owner: "00000000-0000-4000-8000-0000000000d1", climber: "00000000-0000-4000-8000-0000000000d2", other: "00000000-0000-4000-8000-0000000000d3", rev: "00000000-0000-4000-8000-0000000000d4" };
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
await db.exec("set session_replication_role = replica");
await db.query("update public.profiles set is_admin = true where id = $1", [U.owner]);
await db.query("update public.profiles set created_at = now() - interval '30 days'");
await db.exec("set session_replication_role = origin");
await db.query("insert into public.screening_terms (term, category) values ('zzbadword', 'hate') on conflict do nothing");

let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg + (cond || !extra ? "" : "  -- " + extra)); if (!cond) fails++; };
async function as(who, fn) {
  await db.exec("begin");
  try {
    if (who) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[who]]); await db.exec("set local role authenticated"); }
    else { await db.query("select set_config('request.jwt.claim.sub', '', true)"); await db.exec("set local role anon"); }
    const r = await fn(); await db.exec("commit"); return { r };
  } catch (e) { await db.exec("rollback"); return { e }; }
}
const q = (sql, p) => db.query(sql, p);
const errOf = (x) => (x.e ? x.e.message : "");

// A route with a position, an empty watch_out and a 5.9 grade; an area with a position and a description.
const R = (await q("select id, area_id from public.routes where area_id is not null limit 1")).rows[0];
if (!R) throw new Error("the replay seeded no route with an area");
await db.exec("set session_replication_role = replica");
await q("update public.routes set lat = 48.0, lng = -121.0, discipline = 'sport', grade = '5.9', watch_out = null where id = $1", [R.id]);
await q("update public.areas set lat = 48.0, lng = -121.0, blurb = 'The original area description, long enough.' where id = $1", [R.area_id]);
await db.exec("set session_replication_role = origin");
const edit = (who, field, value, area) => as(who, async () => (await q(
  "insert into public.contributions (kind, route_id, area_id, field, value, contributor) values ('field', $1, $2, $3, $4::jsonb, $5) returning id",
  [area ? null : R.id, area ? R.area_id : null, field, JSON.stringify(value), U[who]])).rows[0].id);

console.log("\nB/C. checks when an edit is sent");
for (const [f, v, good, why] of [
  ["highPointFt", 999999, false, "an impossible high point"], ["highPointFt", 14411, true, "a real high point"], ["highPointFt", "14411", true, "a high point typed as text"],
  ["highPointFt", "tall", false, "a word where a number goes"], ["gain", 7000, false, "7000 m of gain"], ["pitchCount", 0, false, "zero pitches"],
  ["angle", 200, false, "a 200-degree angle"], ["angle", 95, true, "an overhanging 95 degrees"], ["bolts", 12, true, "12 bolts"],
  ["watchOut", "Loose block at the second bolt, see www.example.com", false, "a link in prose"],
  ["watchOut", "Email me at a@b.co for beta", false, "an email in prose"], ["watchOut", "Loose block at the second bolt.", true, "plain prose"],
  ["watchOut", "this is a zzbadword sentence", false, "a screened word"],
  ["permitUrl", "recreation.gov/permits", false, "a permit link with no scheme"], ["permitUrl", "https://www.recreation.gov/permits/1", true, "a permit link"],
  ["grade", "this route is pretty hard honestly", false, "a sentence as a grade"], ["grade", "super hard", false, "junk as a grade"],
  ["waypoints", [{ name: "Trailhead", lat: 48.01, lng: -121.02 }], true, "a pin 2 km away"],
  ["waypoints", [{ name: "Trailhead", lat: 47.0, lng: -121.0 }], false, "a pin 111 km away"],
  ["waypoints", [{ name: "x", lat: 0, lng: 0 }], false, "a pin at 0,0"],
]) { const x = await edit("climber", f, v); ok(good ? !x.e : !!x.e, (good ? "accepted: " : "refused: ") + why, errOf(x) || "accepted"); }
// Every grade the pickers offer must pass (ClimbMatchCore.jsx ADDR_*), plus common typed forms.
const core = fs.readFileSync(path.join(process.cwd(), "ClimbMatchCore.jsx"), "utf8");
const lists = {}; for (const n of ["YDS", "VS", "WIS", "MS", "AIDS", "CLS"]) lists[n] = JSON.parse(core.match(new RegExp("const ADDR_" + n + "=(\\[[^\\]]*\\])"))[1]);
const all = [...new Set([...Object.values(lists).flat(), "5.0", "5.1", "5.2", "5.3", "Easy Snow", "Mod. Snow", "Steep Snow", "III 5.8", "AD+", "PD", "5.10a R", "WI4 M5", "Class 2-3", "AI3", "D+", "TD-", "V-easy", "V-easy R", "V?", "B1", "B1-", "Difficult Class 2", "Grade II Snow", "3rd"])];
const bad = [];
for (const g of all) { const p = (await q("select public._field_value_problem($1, null, 'grade', $2::jsonb) p", [R.id, JSON.stringify(g)])).rows[0].p; if (p) bad.push(g + ": " + p); }
ok(bad.length === 0, "every grade the pickers offer (" + all.length + ") passes the grade check", bad.slice(0, 5).join(" | "));
const prob = (await q("select public._field_value_problem(null, $1, 'parking_pin', $2::jsonb) p", [R.area_id, JSON.stringify({ lat: 46.0, lng: -121.0 })])).rows[0].p;
ok(/km from this climb/.test(prob || ""), "an area parking pin 220 km off is refused", prob);

console.log("\nA. who can read a waiting edit");
const pendX = await edit("climber", "watchOut", "Loose block near the second bolt.");
const pend = pendX.r; ok(!!pend, "a plain edit goes in", errOf(pendX));
const see = async (who) => { const x = await as(who, () => q("select id from public.contributions where id = $1", [pend])); return x.e ? "ERR " + x.e.message : x.r.rows.length; };
ok((await see(null)) === 0, "signed out cannot read a pending edit");
ok((await see("other")) === 0, "another climber cannot read it");
ok((await see("climber")) === 1, "its sender can");
ok((await see("owner")) === 1, "an admin can");
const ph = await as("climber", async () => (await q("insert into public.contributions (kind, route_id, value, contributor) values ('photo', $1, $2::jsonb, $3) returning id", [R.id, JSON.stringify({ url: "https://x/y.jpg" }), U.climber])).rows[0].id);
ok(!!ph.r && (await as(null, () => q("select id from public.contributions where id = $1", [ph.r]))).r.rows.length === 1, "a route photo stays public (live at insert)", errOf(ph));

console.log("\nE. flag notes");
ok(!!(await as("climber", () => q("select public.file_route_flag($1, 'season', 'no')", [R.id]))).e, "a 2-character flag note is refused");
const fl = await as("climber", () => q("select public.file_route_flag($1, 'season', 'Season is wrong, it is winter only')", [R.id]));
ok(!fl.e, "a real flag note is accepted", errOf(fl));

console.log("\n9. the reviewer role");
ok(!!(await as("climber", () => q("update public.profiles set is_reviewer = true where id = $1", [U.climber]))).e, "a climber cannot make themselves a reviewer");
ok(!!(await as("climber", () => q("select public.set_reviewer($1, true)", [U.climber]))).e, "a climber cannot call set_reviewer");
const sr = await as("owner", () => q("select public.set_reviewer($1, true)", [U.rev]));
ok(!sr.e, "the admin makes someone a reviewer", errOf(sr));
ok((await see("rev")) === 1, "a reviewer can read a pending edit");
const ap = await as("rev", () => q("select public.approve_field_contribution($1)", [pend]));
ok(!ap.e, "a reviewer can approve a field edit", errOf(ap));
ok(!!(await as("rev", () => q("select public.set_contribution_standing($1, 'banned', 5, null, 'reviewer tries to ban')", [U.climber]))).e, "a reviewer cannot set standing (no bans)");
ok(!!(await as("rev", () => q("select public.set_route_field_confidence($1, 'grade', 'low', 'reviewer unlock')", [R.id]))).e, "a reviewer cannot unlock a field");
ok(!!(await as("rev", () => q("select public.resolve_worklist_item(gen_random_uuid(), 'done')"))).e, "a reviewer cannot work the audit worklist");
const ra = await as("rev", () => q("select count(*)::int n from public.moderation_actions where target_kind = 'contribution'"));
ok(!ra.e && ra.r.rows[0].n >= 1, "a reviewer reads edit actions in the history", errOf(ra));
const rb = await as("rev", () => q("select count(*)::int n from public.moderation_actions where target_kind = 'profile'"));
ok(!rb.e && rb.r.rows[0].n === 0, "...but not the admin's other actions (reviewer grants, bans)");

console.log("\nD. taking an approval back");
const lvl = async () => (await q("select public.route_field_level($1, 'watchOut') l", [R.id])).rows[0].l;
ok((await lvl()) === "high", "approved watchOut is HIGH (locked)");
const pv = (await q("select prior_value from public.contributions where id = $1", [pend])).rows[0].prior_value;
ok(pv && "v" in pv && pv.v === null, "the approval recorded what was there before (nothing)", JSON.stringify(pv));
ok(!!(await as("climber", () => q("select public.withdraw_approval($1, 'I changed my mind about it')", [pend]))).e, "a climber cannot take an approval back");
ok(!!(await as("owner", () => q("select public.withdraw_approval($1, 'short')", [pend]))).e, "taking back needs a 10-character reason");
const w = await as("owner", () => q("select public.withdraw_approval($1, 'Checked the guidebook again: wrong bolt')", [pend]));
ok(!w.e, "the admin takes the approval back", errOf(w));
const row = (await q("select status, review_note from public.contributions where id = $1", [pend])).rows[0];
ok(row.status === "rejected" && /^Approval taken back:/.test(row.review_note), "the row is marked taken back");
ok((await lvl()) === "low", "the field is unlocked again (back to its computed level)");
ok((await q("select count(*)::int n from public.user_notices where user_id = $1 and kind = 'contribution_withdrawn'", [U.climber])).rows[0].n === 1, "the climber is told");
ok(!(await q("select 1 from public.contribution_standing where user_id = $1 and strikes > 0", [U.climber])).rows.length, "no strike was added");
const ge = (await edit("owner", "grade", "5.10a")).r;
const ga = await as("owner", () => q("select public.approve_field_contribution($1)", [ge]));
ok(!ga.e && (await q("select grade from public.routes where id = $1", [R.id])).rows[0].grade === "5.10a", "an approved grade is written to the route", errOf(ga));
const gw = await as("owner", () => q("select public.withdraw_approval($1, 'Two guidebooks say 5.9, not 5.10a')", [ge]));
ok(!gw.e && (await q("select grade from public.routes where id = $1", [R.id])).rows[0].grade === "5.9", "taking it back restores 5.9", errOf(gw));
const ae = (await edit("climber", "blurb", "A new description of this area that is long enough.", true)).r;
const aa = await as("owner", () => q("select public.approve_field_contribution($1)", [ae]));
ok(!aa.e && /A new description/.test((await q("select blurb from public.areas where id = $1", [R.area_id])).rows[0].blurb), "an approved area blurb is written to the area", errOf(aa));
const aw = await as("owner", () => q("select public.withdraw_approval($1, 'The old description was more accurate')", [ae]));
ok(!aw.e && (await q("select blurb from public.areas where id = $1", [R.area_id])).rows[0].blurb === "The original area description, long enough.", "taking it back restores the area's old text", errOf(aw));
await db.exec("set session_replication_role = replica");
const old = (await q("insert into public.contributions (kind, route_id, field, value, contributor, status, reviewed_by, reviewed_at) values ('field', $1, 'grade', '\"5.11a\"', $2, 'approved', $3, now()) returning id", [R.id, U.climber, U.owner])).rows[0].id;
await db.exec("set session_replication_role = origin");
ok(/undone automatically/.test(errOf(await as("owner", () => q("select public.withdraw_approval($1, 'Old approval without a prior value')", [old])))), "an old grade approval with no recorded value says to use Edit value");

console.log("\n7. the audit worklist");
await q("insert into public.review_worklist (audit, item_key, route_id, title) values ('audit:test', 'k1', $1, 'Test finding')", [R.id]);
ok((await as("climber", () => q("select * from public.review_worklist"))).r.rows.length === 0, "a climber cannot read the worklist");
ok(!!(await as("climber", () => q("insert into public.review_worklist (audit, item_key, title) values ('x','y','z')"))).e, "a climber cannot write it");
ok((await as("owner", () => q("select * from public.review_worklist"))).r.rows.length === 1, "the admin reads it");
const wid = (await q("select id from public.review_worklist limit 1")).rows[0].id;
ok(!(await as("owner", () => q("select public.resolve_worklist_item($1, 'done', 'fixed it')", [wid]))).e, "the admin closes an item");

console.log(fails ? `\nverify-0530: ${fails} FAILED` : "\nverify-0530: ok — edits private, checked when sent, undoable; reviewer role; worklist");
process.exit(fails ? 1 : 0);
