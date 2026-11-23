// verify-0483-crew-day-rank-pglite.mjs — replays every migration into PGlite and acts as the organiser, two
// confirmed members, an invitee and an outsider against one crew: a member's ORDER of the proposed days
// (crew_day_acks.rank, 0483). A new "I can make it" goes to the end of that member's order; crew_rank_day moves one
// day and renumbers the rest; nobody orders for anybody else; a row from before 0483 stays unordered.
// No production database, no service key: `node scripts/oneoff/verify-0483-crew-day-rank-pglite.mjs`.
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
// Same stand-ins as scripts/check-migration-replay.mjs, plus Supabase's default grants BEFORE the replay.
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

const U = {
  org: "00000000-0000-4000-8000-0000000000b1", blake: "00000000-0000-4000-8000-0000000000b2",
  casey: "00000000-0000-4000-8000-0000000000b3", inv: "00000000-0000-4000-8000-0000000000b4",
  out: "00000000-0000-4000-8000-0000000000b5",
};
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
const route = (await db.query("select id from public.routes limit 1")).rows[0];
const area = (await db.query("select id from public.areas limit 1")).rows[0];
if (!route && !area) { console.log("no route or area in seed — cannot place a crew"); process.exit(1); }

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
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
const place = route ? { col: "route_id", val: route.id, disc: null } : { col: "area_id", val: area.id, disc: "sport" };
const made = await as("org", async () => (await db.query(
  `insert into public.crews (${place.col}, discipline, created_by, cap, private) values ($1, $2, $3, 6, true) returning id`,
  [place.val, place.disc, U.org])).rows[0]);
ok(!made.e, "the organiser creates a crew" + (made.e ? " — " + made.e.message : ""));
const crew = made.r.id;
// Seat the roster as the app would end up: Blake and Casey confirmed, inv still invited.
for (const [who, st] of [["blake", "confirmed"], ["casey", "confirmed"], ["inv", "invited"]]) {
  await db.query("insert into public.crew_members (crew_id, user_id, status, invited_by) values ($1, $2, $3, $4) on conflict (crew_id, user_id) do update set status = excluded.status", [crew, U[who], st, U.org]);
}
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const [D1, D2, D3, D4, D5] = [5, 6, 7, 8, 9].map(day);
const order = async (uid) => (await db.query(
  "select date::text as d, rank from public.crew_day_acks where crew_id = $1 and user_id = $2 order by rank nulls last, date", [crew, U[uid]])).rows;
const says = async (uid) => (await order(uid)).map((x) => x.d + ":" + x.rank).join(" ");
const propose = (who, d) => as(who, () => db.query("select public.crew_propose_day($1, $2::date)", [crew, d]));
const ack = (who, d) => as(who, () => db.query("insert into public.crew_day_acks (crew_id, user_id, date) values ($1, $2, $3::date)", [crew, U[who], d]));
const unack = (who, d) => as(who, () => db.query("delete from public.crew_day_acks where crew_id = $1 and user_id = $2 and date = $3::date", [crew, U[who], d]));
const rank = (who, d, n) => as(who, () => db.query("select public.crew_rank_day($1, $2::date, $3)", [crew, d, n]));

// A row from BEFORE 0483: the trigger is switched off for one insert, so Casey holds an unranked day.
await db.exec("alter table public.crew_day_acks disable trigger crew_day_acks_default_rank");
await db.query("update public.crews set dates = $2::jsonb where id = $1", [crew, JSON.stringify([D1])]);
await db.query("insert into public.crew_day_acks (crew_id, user_id, date) values ($1, $2, $3::date)", [crew, U.casey, D1]);
await db.exec("alter table public.crew_day_acks enable trigger crew_day_acks_default_rank");

let r;
for (const d of [D2, D3, D4, D5]) { r = await propose("org", d); if (r.e) break; }
ok(!r.e, "the organiser proposes four more days" + (r.e ? " — " + r.e.message : ""));
ok(await says("org") === `${D2}:1 ${D3}:2 ${D4}:3 ${D5}:4`, "…and each lands at the END of her order (1, 2, 3, 4): " + await says("org"));

r = await ack("blake", D3); const r2 = await ack("blake", D1); const r3 = await ack("blake", D5);
ok(!r.e && !r2.e && !r3.e, "Blake says he can make three days with the plain row insert the app uses");
ok(await says("blake") === `${D3}:1 ${D1}:2 ${D5}:3`, "…and they are ordered as he tapped them: " + await says("blake"));

r = await rank("blake", D5, 1);
ok(!r.e, "Blake makes the last one his 1st choice" + (r.e ? " — " + r.e.message : ""));
ok(await says("blake") === `${D5}:1 ${D3}:2 ${D1}:3`, "…the other two close up behind it, no two days share a place: " + await says("blake"));
r = await rank("blake", D5, 3);
ok(!r.e && await says("blake") === `${D3}:1 ${D1}:2 ${D5}:3`, "…and moving it to 2nd backup moves the others up: " + await says("blake"));
r = await rank("blake", D2, 2);
ok(!r.e && await says("blake") === `${D3}:1 ${D2}:2 ${D1}:3 ${D5}:4`, "ordering a day he had NOT picked says he can make it, at that place: " + await says("blake"));
r = await rank("blake", D4, 10);
ok(!r.e && await says("blake") === `${D3}:1 ${D2}:2 ${D1}:3 ${D5}:4 ${D4}:5`, "a place past the end is the end (a 4th backup, the 5th of five days): " + await says("blake"));

r = await unack("blake", D2);
ok(!r.e && await says("blake") === `${D3}:1 ${D1}:3 ${D5}:4 ${D4}:5`, "taking a day back leaves a gap, which the app reads as an order: " + await says("blake"));
r = await ack("blake", D2);
ok(!r.e && (await order("blake")).slice(-1)[0].d === D2, "…and saying yes again goes to the end of his order: " + await says("blake"));

ok(await says("casey") === `${D1}:null`, "Casey's row from before 0483 has no place");
r = await ack("casey", D3);
ok(!r.e && await says("casey") === `${D1}:null ${D3}:null`, "…and a new day does not hand her a 1st choice she never picked: " + await says("casey"));
r = await rank("casey", D3, 1);
ok(!r.e && await says("casey") === `${D3}:1 ${D1}:2`, "…until she orders them herself, which places every day she can make: " + await says("casey"));

ok(await says("org") === `${D2}:1 ${D3}:2 ${D4}:3 ${D5}:4`, "nobody's order moved anybody else's: " + await says("org"));

r = await rank("blake", day(40), 1);
ok(!!r.e, "a day the crew has not proposed cannot be ordered" + (r.e ? " — " + r.e.message : ""));
r = await rank("blake", D3, 0);
ok(!!r.e, "place 0 is refused"); r = await rank("blake", D3, 11); ok(!!r.e, "…and so is place 11");
r = await rank("inv", D3, 1);
ok(!!r.e, "an INVITED climber cannot order the crew's days" + (r.e ? " — " + r.e.message : ""));
r = await rank("out", D3, 1);
ok(!!r.e, "an outsider cannot" + (r.e ? " — " + r.e.message : ""));
r = await as(null, () => db.query("select public.crew_rank_day($1, $2::date, 1)", [crew, D3]));
ok(!!r.e, "anon cannot call crew_rank_day at all" + (r.e ? " — " + r.e.message : ""));
r = await as("out", () => db.query("select rank from public.crew_day_acks where crew_id = $1", [crew]));
ok(!r.e && r.r.rows.length === 0, "an outsider reads nobody's order (the table's own read policy)");
r = await as("casey", () => db.query("select rank from public.crew_day_acks where crew_id = $1 and user_id = $2 and rank is not null", [crew, U.blake]));
ok(!r.e && r.r.rows.length === 5, "a confirmed crewmate reads Blake's order — that is the point");
r = await as("blake", () => db.query("insert into public.crew_day_acks (crew_id, user_id, date, rank) values ($1, $2, $3::date, 0)", [crew, U.blake, day(41)]));
ok(!!r.e, "the table refuses a rank below 1");

console.log(fails ? `\n${fails} expectation(s) FAILED` : "\n0483 crew day order: every expectation holds");
process.exit(fails ? 1 : 0);
