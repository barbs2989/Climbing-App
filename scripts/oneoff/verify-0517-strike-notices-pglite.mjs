// verify-0517-strike-notices-pglite.mjs — replays every migration into PGlite and re-runs the 0505 proposal checks,
// then the two things the 2026-11-23 QA run found and 0517 fixed: a strike notice names any contribution (not only a
// route edit) and does not double a reason's full stop; a restricted climber's field edit is refused with a sentence,
// not the RLS policy's own error.
// No production database: run `node scripts/oneoff/verify-0517-strike-notices-pglite.mjs`. Exits 1 on failure.
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

const U = { owner: "00000000-0000-4000-8000-0000000000c1", climber: "00000000-0000-4000-8000-0000000000c2", vet: "00000000-0000-4000-8000-0000000000c3",
  vet2: "00000000-0000-4000-8000-0000000000c4", bad: "00000000-0000-4000-8000-0000000000c5" };
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
// prevent_self_admin (0425) refuses even this superuser setup write; replica mode skips user triggers.
await db.exec("set session_replication_role = replica");
await db.query("update public.profiles set is_admin = true where id = $1", [U.owner]);
await db.query("update public.profiles set created_at = now() - interval '30 days' where id = $1", [U.vet2]);
await db.exec("set session_replication_role = origin");
const route = (await db.query("select id from public.routes limit 1")).rows[0];

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
// Run fn as a caller (a key of U, or null = anon) inside a transaction so the role never leaks.
async function as(who, fn) {
  await db.exec("begin");
  try {
    if (who) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[who]]); await db.exec("set local role authenticated"); }
    else { await db.query("select set_config('request.jwt.claim.sub', '', true)"); await db.exec("set local role anon"); }
    const r = await fn();
    await db.exec("commit");
    return { r };
  } catch (e) { await db.exec("rollback"); return { e }; }
}
const propose = (who, kind = "new_route", name = "Test Climb") => as(who, async () => (await db.query(
  "insert into public.contributions (kind, area_id, route_id, field, value, contributor) values ($1, null, null, null, $2::jsonb, $3) returning id",
  [kind, JSON.stringify({ name }), who ? U[who] : "anon"])).rows[0].id);
const reject = (who, id, note, strike) => as(who, () => strike === undefined
  ? db.query("select public.reject_new_route($1, $2)", [id, note])
  : db.query("select public.reject_new_route($1, $2, $3)", [id, note, strike]));
const standing = async (who) => (await db.query("select status, strikes from public.contribution_standing where user_id = $1", [U[who]])).rows[0] || { status: "ok", strikes: 0 };

// 1. A new account (< 7 days) may propose 2 a day, climbs and areas counted together.
const p1 = await propose("climber");
ok(!p1.e, "a climber can propose a climb" + (p1.e ? " — " + p1.e.message : ""));
const p2 = await propose("climber", "new_area", "Test Crag");
ok(!p2.e, "...and an area" + (p2.e ? " — " + p2.e.message : ""));
const p3 = await propose("climber");
ok(!!p3.e && /a lot of climbs and areas today/.test(p3.e.message), "a new account's 3rd proposal in a day is refused with the daily-cap sentence" + (p3.e ? " (" + p3.e.message + ")" : ""));
const a1 = await propose(null);
ok(!!a1.e, "a signed-out visitor cannot propose" + (a1.e ? " (" + a1.e.message + ")" : ""));

// 2. An older account may propose 5 a day.
await db.exec("set session_replication_role = replica");
await db.query("update public.profiles set created_at = now() - interval '30 days' where id = $1", [U.vet]);
await db.exec("set session_replication_role = origin");
let vetOk = 0, vetErr = null;
for (let i = 0; i < 6; i++) { const r = await propose("vet", "new_route", "Vet Climb " + i); if (r.e) { vetErr = r.e; break; } vetOk++; }
ok(vetOk === 5 && vetErr && /a lot of climbs and areas today/.test(vetErr.message), "an older account gets 5 a day, and the 6th is refused (" + vetOk + " went in)");

// 3. Turning down: admin only, a reason of 10+ characters, proposals only, a strike unless told otherwise.
const nr = await reject("climber", p1.r, "Not a real climb at all.", true);
ok(!!nr.e, "a climber cannot turn a proposal down" + (nr.e ? " (" + nr.e.message + ")" : ""));
const shortR = await reject("owner", p1.r, "nope", true);
ok(!!shortR.e && /at least 10 characters/.test(shortR.e.message), "a reason under 10 characters is refused");
const r1 = await reject("owner", p1.r, "No such climb on this crag.", true);
ok(!r1.e, "the owner turns a proposal down" + (r1.e ? " — " + r1.e.message : ""));
const s1 = await standing("climber");
ok(s1.strikes === 1 && s1.status === "warned", "...which is a strike: the climber is warned (" + JSON.stringify(s1) + ")");
const st = (await db.query("select status, review_note from public.contributions where id = $1", [p1.r])).rows[0];
ok(st.status === "rejected" && st.review_note === "No such climb on this crag.", "the proposal is rejected and keeps the reason");
const r2 = await reject("owner", p2.r, "Duplicate of an existing crag.", false);
ok(!r2.e && (await standing("climber")).strikes === 1, "an honest mistake (p_strike false) adds no strike" + (r2.e ? " — " + r2.e.message : ""));
const twoArg = await propose("vet2", "new_route", "Two Arg");
const r3 = await reject("owner", twoArg.r, "Checking the old two-argument call.");
ok(!twoArg.e && !r3.e && (await standing("vet2")).strikes === 1, "the old 2-argument call still works and strikes by default" + ((twoArg.e || r3.e) ? " — " + (twoArg.e || r3.e).message : ""));
const notice = (await db.query("select count(*)::int n from public.user_notices where user_id = $1", [U.climber])).rows[0].n;
ok(notice >= 2, "the climber was told (" + notice + " notices)");

// 4. A field edit cannot be rejected through reject_new_route.
const fe = route ? await as("vet2", async () => (await db.query(
  "insert into public.contributions (kind, route_id, field, value, contributor) values ('field', $1, 'approach', '\"walk in\"'::jsonb, $2) returning id", [route.id, U.vet2])).rows[0].id) : { e: new Error("no route in the replay") };
const rf = fe.e ? { e: fe.e } : await reject("owner", fe.r, "Wrong function for this row.", true);
ok(!!rf.e && /not a proposed climb or area/.test(rf.e.message), "reject_new_route refuses a field edit" + (rf.e ? " (" + rf.e.message + ")" : ""));

// 5. A restricted or banned contributor cannot propose.
await db.query("insert into public.contribution_standing (user_id, status, strikes, until) values ($1, 'restricted', 3, now() + interval '90 days') on conflict (user_id) do update set status = 'restricted', strikes = 3, until = now() + interval '90 days'", [U.bad]);
const pb = await propose("bad");
ok(!!pb.e && /paused on your account/.test(pb.e.message), "a restricted contributor's proposal is refused with the standing sentence" + (pb.e ? " (" + pb.e.message + ")" : ""));
await db.query("update public.contribution_standing set status = 'banned', until = null where user_id = $1", [U.bad]);
const pb2 = await propose("bad", "new_area", "Banned Crag");
ok(!!pb2.e, "a banned contributor cannot propose an area" + (pb2.e ? " (" + pb2.e.message + ")" : ""));
const ow = await propose("owner");
ok(!ow.e, "the owner is never capped" + (ow.e ? " — " + ow.e.message : ""));


// ── 0517 ──────────────────────────────────────────────────────────────────────────────────────────
const warn = (await db.query("select title, body from public.user_notices where user_id = $1 and kind = 'contribution_warning'", [U.climber])).rows[0];
ok(!!warn && warn.title === "One of your contributions was turned down", "the strike warning names a contribution, not a route edit (" + (warn && warn.title) + ")");
ok(!!warn && !/\.\./.test(warn.body), "the reason's full stop is not doubled (" + (warn && warn.body) + ")");
await db.query("update public.contribution_standing set status = 'restricted', until = now() + interval '90 days' where user_id = $1", [U.bad]);
const fe2 = route ? await as("bad", async () => (await db.query(
  "insert into public.contributions (kind, route_id, field, value, contributor) values ('field', $1, 'approach', '\"walk in\"'::jsonb, $2) returning id", [route.id, U.bad])).rows[0].id) : { e: new Error("no route in the replay") };
ok(!!fe2.e && /Editing is paused on your account/.test(fe2.e.message), "a restricted climber's field edit is refused with a sentence (" + (fe2.e && fe2.e.message) + ")");

console.log(fails ? `\nverify-0517: ${fails} expectation(s) FAILED` : "\nverify-0517: ok — proposals share the edit rules, and strike notices and refusals read right");
process.exit(fails ? 1 : 0);
