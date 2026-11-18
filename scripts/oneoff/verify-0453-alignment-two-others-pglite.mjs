// verify-0453-alignment-two-others-pglite.mjs — replays every migration into PGlite and checks 0453: a crew's safety
// alignment shows per-answer counts only once at least TWO members OTHER than the caller have answered, so no single
// crewmate's answer can be worked out from your own; a crew of two never sees them.
// `node scripts/oneoff/verify-0453-alignment-two-others-pglite.mjs`. Exits 1 on the first broken expectation.
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


const align = async (who, c) => (await as(who, async () => (await db.query("select * from public.crew_alignment($1)", [c])).rows[0])).r;
const answer = (c, who, risk) => db.query(
  "insert into public.crew_safety_answers (crew_id, user_id, risk_tolerance, answers) values ($1, $2, $3, $4) on conflict (crew_id, user_id) do update set risk_tolerance = excluded.risk_tolerance",
  [c, U[who], risk, JSON.stringify({ physical: 0, gear: 3, experience: 0, communication: 0 })]);
const shown = (a) => a && (a.risk_conservative + a.risk_moderate + a.risk_aggressive + a.flag_gear) > 0;

// Crew of three: org, blake, casey (inv is still only invited).
await answer(crew, "org", "moderate");
ok(!shown(await align("blake", crew)), "3-crew, only org answered: blake sees no counts");
await answer(crew, "blake", "aggressive");
ok(!shown(await align("blake", crew)), "3-crew, org + blake answered: BLAKE sees none (one other answer would be org's)");
ok(!shown(await align("org", crew)), "...and ORG sees none (the one other answer is blake's)");
let a = await align("casey", crew);
ok(shown(a) && a.risk_moderate === 1 && a.risk_aggressive === 1, "...but CASEY, who has not answered, sees them (two others answered)");
await answer(crew, "casey", "moderate");
for (const w of ["org", "blake", "casey"]) ok(shown(await align(w, crew)), "3-crew, all answered: " + w + " sees the counts");
ok(((await align("blake", crew)) || {}).done_ids.length === 3, "who has answered is always shown (3)");

// Crew of two: org + casey only.
const two = (await as("org", async () => (await db.query(`insert into public.crews (${place.col}, discipline, created_by, cap, private) values ($1, $2, $3, 2, true) returning id`, [place.val, place.disc, U.org])).rows[0])).r.id;
await db.query("insert into public.crew_members (crew_id, user_id, status, invited_by) values ($1, $2, 'confirmed', $3) on conflict (crew_id, user_id) do update set status = 'confirmed'", [two, U.casey, U.org]);
await answer(two, "org", "moderate"); await answer(two, "casey", "aggressive");
ok(!shown(await align("org", two)) && !shown(await align("casey", two)), "2-crew, both answered: NEITHER sees counts (each could subtract their own)");
ok(((await align("org", two)) || {}).done_ids.length === 2, "...but both see that both answered");

console.log(fails ? `\nverify-0453: ${fails} expectation(s) FAILED` : "\nverify-0453: ok — counts only once two OTHER climbers have answered; a crew of two never sees them");
process.exit(fails ? 1 : 0);
