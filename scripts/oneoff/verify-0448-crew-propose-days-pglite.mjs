// verify-0448-crew-propose-days-pglite.mjs — replays every migration into PGlite (as check:migration-replay
// does) and acts as five callers against one crew: the organiser, two confirmed members (Blake, Casey),
// an invitee who has not accepted, and an outsider. Checks the owner's rule for 0448: anyone in the crew
// can propose a day; the day's proposer or the organiser can take it back; nobody else can do either.
// No production database, no service key: `node scripts/oneoff/verify-0448-crew-propose-days-pglite.mjs`.
// Exits 1 on the first broken expectation.
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
const D1 = day(7), D2 = day(8), D3 = day(9), PAST = day(-2);
const propose = (who, d) => as(who, () => db.query("select public.crew_propose_day($1, $2::date)", [crew, d]));
const unpropose = (who, d) => as(who, () => db.query("select public.crew_unpropose_day($1, $2::date)", [crew, d]));
const row = async () => (await db.query("select dates, date_proposers, agreed_date, date_forced from public.crews where id = $1", [crew])).rows[0];
const acks = async (d) => (await db.query("select user_id from public.crew_day_acks where crew_id = $1 and date = $2::date", [crew, d])).rows.map((r) => r.user_id);

let r = await propose("blake", D2);
ok(!r.e, "a confirmed MEMBER (Blake) proposes a day" + (r.e ? " — " + r.e.message : ""));
let c = await row();
ok(JSON.stringify(c.dates) === JSON.stringify([D2]) && c.date_proposers[D2] === U.blake, "…it is in crews.dates and Blake is recorded as its proposer");
ok((await acks(D2)).includes(U.blake), "…and proposing it says Blake can make it");
r = await propose("org", D1);
ok(!r.e, "the organiser proposes a day too");
ok(JSON.stringify((await row()).dates) === JSON.stringify([D1, D2]), "days stay sorted");
r = await propose("casey", D3);
ok(!r.e, "Casey (member) proposes a third day");
r = await propose("inv", day(10));
ok(!!r.e, "an INVITEE who has not accepted cannot propose");
r = await propose("out", day(10));
ok(!!r.e, "an outsider cannot propose");
r = await propose(null, day(10));
ok(!!r.e, "anon cannot propose");
r = await propose("blake", PAST);
ok(!!r.e, "a past day is refused");

r = await unpropose("casey", D2);
ok(!!r.e, "Casey cannot take back Blake's day");
r = await unpropose("blake", D1);
ok(!!r.e, "Blake cannot take back the organiser's day");
r = await unpropose("out", D2);
ok(!!r.e, "an outsider cannot take back a day");
// Lock D2 the organiser's way, then let its proposer take it back: the lock must go with it.
await db.query("update public.crews set agreed_date = $2, date_forced = true where id = $1", [crew, D2]);
await db.query("insert into public.crew_day_acks (crew_id, user_id, date) values ($1, $2, $3::date) on conflict do nothing", [crew, U.casey, D2]);
r = await unpropose("blake", D2);
ok(!r.e, "Blake takes back the day he proposed" + (r.e ? " — " + r.e.message : ""));
c = await row();
ok(!c.dates.includes(D2) && !(D2 in c.date_proposers), "…it leaves dates and date_proposers");
ok(c.agreed_date === null && c.date_forced === false, "…the lock on it is cleared");
ok((await acks(D2)).length === 0, "…and its 'I can make it' rows are gone");
r = await unpropose("org", D3);
ok(!r.e, "the organiser can take back a MEMBER's day (Casey's)");
ok(JSON.stringify((await row()).dates) === JSON.stringify([D1]), "…leaving only the organiser's day");

// A member still cannot UPDATE the crew row directly (0036's organiser-only policy is untouched).
const direct = await as("blake", () => db.query("update public.crews set meet_place = 'hijack' where id = $1 returning id", [crew]));
ok(!direct.e && direct.r.rows.length === 0, "a member still cannot rewrite the crew row directly");
// Realtime
const pub = (await db.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('crews','crew_members','crew_day_acks') order by 1")).rows.map((x) => x.tablename);
ok(pub.join() === "crew_day_acks,crew_members,crews", "crews, crew_members and crew_day_acks are on Realtime");

console.log(fails ? `\nverify-0448: ${fails} expectation(s) FAILED` : "\nverify-0448: ok — any member proposes; proposer or organiser takes back; nobody else");
process.exit(fails ? 1 : 0);
