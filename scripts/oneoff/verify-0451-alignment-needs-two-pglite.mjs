// verify-0451-alignment-needs-two-pglite.mjs — replays every migration into PGlite and checks 0451: a crew's
// safety alignment shows NO per-answer count (risk levels, flags) until two confirmed members have answered,
// while who has answered (done_ids) is always shown. `node scripts/oneoff/verify-0451-alignment-needs-two-pglite.mjs`.
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

const align = async (who) => (await as(who, async () => (await db.query("select * from public.crew_alignment($1)", [crew])).rows[0])).r;
const answer = (who, risk, gear) => db.query(
  "insert into public.crew_safety_answers (crew_id, user_id, risk_tolerance, answers) values ($1, $2, $3, $4) on conflict (crew_id, user_id) do update set risk_tolerance = excluded.risk_tolerance, answers = excluded.answers",
  [crew, U[who], risk, JSON.stringify({ physical: 0, gear, experience: 0, communication: 0 })]);
const counts = (a) => a ? [a.risk_conservative, a.risk_moderate, a.risk_aggressive, a.flag_fitness, a.flag_gear, a.flag_experience, a.flag_communication].join(",") : "none";

let a = await align("blake");
ok(a && a.done_ids.length === 0 && counts(a) === "0,0,0,0,0,0,0", "nobody answered: no counts");
await answer("org", "moderate", 3);
a = await align("blake");
ok(a && a.done_ids.length === 1, "ONE answer: who answered is shown (done_ids = 1)");
ok(a && counts(a) === "0,0,0,0,0,0,0", "ONE answer: every risk and flag count is 0, so it cannot be read as that climber's (got " + counts(a) + ")");
a = await align("org");
ok(a && counts(a) === "0,0,0,0,0,0,0", "...for the climber who answered, too");
await answer("blake", "aggressive", 0);
a = await align("casey");
ok(a && a.done_ids.length === 2, "TWO answers: both are listed as answered");
ok(a && a.risk_moderate === 1 && a.risk_aggressive === 1 && a.flag_gear === 1, "TWO answers: the counts show (got " + counts(a) + ")");
const out = await as("out", async () => (await db.query("select * from public.crew_alignment($1)", [crew])).rows);
ok(!!out.e, "an outsider still cannot read the alignment");

console.log(fails ? `\nverify-0451: ${fails} expectation(s) FAILED` : "\nverify-0451: ok — nothing per-answer shows until two have answered");
process.exit(fails ? 1 : 0);
