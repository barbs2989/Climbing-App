// verify-0433-review-ai-verdicts-pglite.mjs — replays every migration into PGlite (as check:migration-replay
// does) and checks review_ai_verdicts (0433): the service key writes and upserts, the owner (admin) reads,
// a signed-in climber and a signed-out visitor read nothing and cannot write.
// No production database: run `node scripts/oneoff/verify-0433-review-ai-verdicts-pglite.mjs`. Exits 1 on failure.
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

const U = { owner: "00000000-0000-4000-8000-0000000000b1", climber: "00000000-0000-4000-8000-0000000000b2" };
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
// prevent_self_admin (0425) refuses even this superuser setup write; replica mode skips user triggers.
await db.exec("set session_replication_role = replica");
await db.query("update public.profiles set is_admin = true where id = $1", [U.owner]);
await db.exec("set session_replication_role = origin");
const route = (await db.query("select id from public.routes limit 1")).rows[0];

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
// Run fn as a caller ("service", a key of U, or null = anon) inside a transaction so the role never leaks.
async function as(who, fn) {
  await db.exec("begin");
  try {
    if (who === "service") { await db.exec("set local role service_role"); }
    else if (who) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[who]]); await db.exec("set local role authenticated"); }
    else { await db.query("select set_config('request.jwt.claim.sub', '', true)"); await db.exec("set local role anon"); }
    const r = await fn();
    await db.exec("commit");
    return { r };
  } catch (e) { await db.exec("rollback"); return { e }; }
}
const row = ["flag", "11111111-1111-4111-8111-111111111111", route ? route.id : null, "grade", "h1", "agree", "2-source", JSON.stringify([{ url: "https://a.gov/x", quote: "5.9" }]), "Two sources agree."];
const ins = (who) => as(who, () => db.query(
  "insert into public.review_ai_verdicts (item_kind,item_id,route_id,field,item_hash,verdict,confidence,sources,reasoning) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) on conflict (item_kind,item_id) do update set item_hash = excluded.item_hash returning id", row));

const svc = await ins("service");
ok(!svc.e && svc.r.rows.length === 1, "the service key writes a verdict" + (svc.e ? " — " + svc.e.message : ""));
const again = await ins("service");
ok(!again.e && (await db.query("select count(*)::int n from public.review_ai_verdicts")).rows[0].n === 1, "a re-check upserts the same item, not a second row");
const read = (who) => as(who, async () => (await db.query("select id from public.review_ai_verdicts")).rows);
ok(((await read("owner")).r || []).length === 1, "the owner (admin) reads verdicts");
const cr = await read("climber");
ok(!cr.e && cr.r.length === 0, "a signed-in climber reads none");
const an = await read(null);
ok(!!an.e || an.r.length === 0, "a signed-out visitor reads none" + (an.e ? " (" + an.e.message + ")" : ""));
const ci = await ins("climber");
ok(!!ci.e, "a signed-in climber cannot plant a verdict" + (ci.e ? " (" + ci.e.message + ")" : ""));
const oi = await ins("owner");
ok(!!oi.e, "even the owner's browser cannot write one (service key only)" + (oi.e ? " (" + oi.e.message + ")" : ""));
const bad = await as("service", () => db.query("insert into public.review_ai_verdicts (item_kind,item_id,item_hash,verdict,confidence,reasoning) values ('flag', gen_random_uuid(), 'x', 'maybe', 'none', 'r')"));
ok(!!bad.e, "an unknown verdict is refused by the check constraint");

console.log(fails ? `\nverify-0433: ${fails} expectation(s) FAILED` : "\nverify-0433: ok — verdicts are admin-read, service-written");
process.exit(fails ? 1 : 0);
