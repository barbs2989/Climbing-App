// verify-0510-climbed-crews-pglite.mjs — replays every migration into PGlite (as check:migration-replay does) and
// asks crew_listings, as a signed-in outsider and as anon, which of eight crews it offers to a climber looking
// for one. A crew that has CLIMBED (a crew-tagged climb log, or a locked day gone by) must not be listed.
// No production database, no service key: run `node scripts/oneoff/verify-0510-climbed-crews-pglite.mjs`.
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
// Same stand-ins as scripts/check-migration-replay.mjs.
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
  grant select, insert, update, delete on storage.objects to anon, authenticated;
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

const ORG = "00000000-0000-4000-8000-0000000000b1", OUT = "00000000-0000-4000-8000-0000000000b2";
for (const id of [ORG, OUT]) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, id.slice(-2) + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, 'Climber') on conflict (id) do nothing", [id]);
}
const route = (await db.query("select id from public.routes limit 1")).rows[0];
if (!route) { console.log("no route in seed — cannot place a crew"); process.exit(1); }
const ymd = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mk = async (agreed, dates) => (await db.query(
  "insert into public.crews (route_id, created_by, cap, dates, agreed_date) values ($1, $2, 6, $3, $4) returning id",
  [route.id, ORG, JSON.stringify(dates), agreed])).rows[0].id;
const C = {
  open: await mk(null, [ymd(10)]),
  undated: await mk(null, []),
  loggedWithDayAhead: await mk(null, [ymd(-5), ymd(10)]),
  loggedUndated: await mk(null, []),
  lockedPastDayAhead: await mk(ymd(-5), [ymd(-5), ymd(10)]),
  lockedToday: await mk(ymd(0), [ymd(0)]),
  lockedAhead: await mk(ymd(7), [ymd(7)]),
  badAgreed: await mk("someday", [ymd(10)]),
};
for (const k of ["loggedWithDayAhead", "loggedUndated"])
  await db.query("insert into public.climb_logs (user_id, route_id, discipline, date_climbed, crew_id) values ($1, $2, 'alpine', $3, $4)", [ORG, route.id, ymd(-5), C[k]]);

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
async function listed(who) {
  await db.exec("begin");
  if (who) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who]); await db.exec("set local role authenticated"); }
  else { await db.query("select set_config('request.jwt.claim.sub', '', true)"); await db.exec("set local role anon"); }
  const rows = (await db.query("select id, agreed_date from public.crew_listings")).rows;
  await db.exec("commit");
  return rows;
}
const want = { open: true, undated: true, loggedWithDayAhead: false, loggedUndated: false, lockedPastDayAhead: false, lockedToday: true, lockedAhead: true, badAgreed: true };
for (const [who, label] of [[OUT, "a signed-in outsider"], [null, "anon"]]) {
  const rows = await listed(who), ids = new Set(rows.map((r) => r.id));
  for (const [k, w] of Object.entries(want)) ok(ids.has(C[k]) === w, `${label}: ${k} ${w ? "IS" : "is NOT"} listed`);
  const ahead = rows.find((r) => r.id === C.lockedAhead), bad = rows.find((r) => r.id === C.badAgreed);
  ok(!!ahead && ahead.agreed_date === ymd(7), `${label}: the locked day reaches the listing`);
  ok(!!bad && bad.agreed_date === null, `${label}: a malformed agreed_date is listed as null, not cast`);
}
console.log(fails ? `\n${fails} expectation(s) FAILED` : "\nall expectations hold");
process.exit(fails ? 1 : 0);
