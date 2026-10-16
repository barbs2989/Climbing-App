// Does the migrations folder rebuild the database from EMPTY — and is what it builds the live schema?
//
// This is what a Supabase preview branch does on every PR that touches supabase/migrations/ (the
// "Supabase Preview" check, on since 2026-09-26): an empty project, every file in filename order,
// each recorded by its number prefix, then supabase/seed.sql. It failed on the first PR that added a
// migration, and the preview's logs are not reachable from here, so this runs the same replay locally
// in PGlite (Postgres compiled to WASM — no Docker, no server).
//
// When it was first run (2026-09-30) the folder did NOT rebuild, for five separate reasons, every one
// of which reads as fine on production because production applied these files by hand, in a different
// order, around columns made in the SQL editor:
//   * 13 numbers were shared by 28 files — the tracking table's primary key refuses the second;
//   * data files wrote columns that never existed (`routes.updated_at`, `routes.state`, `route_id`),
//     or were not SQL at all (`alpine_draws = [object Object]`);
//   * a grant named a signature that never existed, so 0037 never created `climb_logs`;
//   * catalog inserts need parents that only an import creates, and a preview has no catalog;
//   * two columns and four indexes existed only because someone made them by hand.
//
// --compare-live then diffs the rebuilt schema (columns with type and nullability, tables and views,
// functions, policies, triggers, indexes) against production. That is the claim that matters: a
// replay that succeeds into the WRONG schema is not a rebuild. Needs the linked Supabase CLI.
//
// Hand-run (~30s), not in the build: it needs an extra dependency's WASM and is only relevant to a
// change under supabase/. Run it before pushing any migration.
//
//   npm run check:migration-replay                    # replay + seed
//   npm run check:migration-replay -- --compare-live  # ...and diff against production
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
const SEED = path.join(ROOT, "supabase", "seed.sql");
const compareLive = process.argv.includes("--compare-live");

let PGlite, ltree, pg_trgm, pgcrypto, uuid_ossp;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ ltree } = await import("@electric-sql/pglite/contrib/ltree"));
  ({ pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm"));
  ({ pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto"));
  ({ uuid_ossp } = await import("@electric-sql/pglite/contrib/uuid_ossp"));
} catch {
  console.error("check:migration-replay FAILED — @electric-sql/pglite is not installed (npm install). Nothing was replayed.");
  process.exit(1);
}

const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });

// What a Supabase project has before migration 1. Minimal stand-ins: the roles policies grant to,
// the auth and storage objects migrations reference, and the realtime publication 0071 extends.
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
  create schema supabase_migrations;
  create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
`);

// Filename order, keyed by the digit prefix — the Supabase CLI's rule.
const files = fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
if (files.length < 200) { console.error(`check:migration-replay FAILED — only ${files.length} migrations found in ${DIR}; refusing a partial replay.`); process.exit(1); }
let applied = 0;
for (const f of files) {
  const [, version, name] = f.match(/^(\d+)_(.*)\.sql$/);
  const sql = fs.readFileSync(path.join(DIR, f), "utf8");
  try {
    await db.exec("begin");
    await db.exec(sql);
    await db.query("insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)", [version, name]);
    await db.exec("commit");
    applied++;
  } catch (e) {
    await db.exec("rollback").catch(() => {});
    const at = e.position ? `\n  near: …${sql.slice(Math.max(0, e.position - 100), +e.position + 40).replace(/\s+/g, " ")}…` : "";
    console.error(`check:migration-replay FAILED at ${f} (${applied}/${files.length} applied before it)\n  ${e.message}${at}`);
    console.error(`\nA Supabase preview branch stops at the same file. See supabase/migrations/README-numbering.md.`);
    process.exit(1);
  }
}
try { await db.exec(fs.readFileSync(SEED, "utf8")); }
catch (e) { console.error(`check:migration-replay FAILED — all ${applied} migrations replayed, then supabase/seed.sql failed:\n  ${e.message}`); process.exit(1); }
console.log(`check:migration-replay: ${applied}/${files.length} migrations and seed.sql replay into an empty database.`);

if (!compareLive) process.exit(0);

// ── the rebuilt schema against production ──────────────────────────────────────────────────────────
const SCHEMA_SQL = `select json_build_object(
  'columns', (select json_agg(c order by c) from (
      select table_name || '.' || column_name || ' ' || udt_name || case when is_nullable = 'NO' then ' notnull' else '' end as c
        from information_schema.columns where table_schema = 'public') s),
  'tables and views', (select json_agg(r order by r) from (
      select relname || ' ' || relkind::text as r from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and relkind in ('r','v','m')) s),
  'functions', (select json_agg(f order by f) from (
      select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as f
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) s),
  'policies', (select json_agg(p order by p) from (select tablename || ': ' || policyname as p from pg_policies where schemaname = 'public') s),
  'triggers', (select json_agg(t order by t) from (
      select c.relname || ': ' || t.tgname as t from pg_trigger t join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal) s),
  'indexes', (select json_agg(i order by i) from (select tablename || ': ' || indexname as i from pg_indexes where schemaname = 'public') s)
) as schema`;

const rebuilt = (await db.query(SCHEMA_SQL)).rows[0].schema;
const tmp = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || "/tmp"), "migration-replay-"));
const qfile = path.join(tmp, "schema.sql");
fs.writeFileSync(qfile, SCHEMA_SQL);
let live;
try {
  const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", qfile, "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
  const parsed = JSON.parse(out.slice(out.indexOf("{")));
  const rows = Array.isArray(parsed) ? parsed : parsed.rows;
  live = typeof rows[0].schema === "string" ? JSON.parse(rows[0].schema) : rows[0].schema;
} catch (e) {
  console.error(`check:migration-replay FAILED — could not read the live schema (is the Supabase CLI linked? see docs/codebase/supabase-scripts.md):\n  ${String(e.message).split("\n")[0]}`);
  process.exit(1);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

let differences = 0;
for (const kind of Object.keys(rebuilt)) {
  const L = new Set(live[kind] || []), R = new Set(rebuilt[kind] || []);
  if (!L.size) { console.error(`check:migration-replay FAILED — the live read returned no ${kind}; refusing to call that a match.`); process.exit(1); }
  const onlyLive = [...L].filter((x) => !R.has(x)), onlyRebuilt = [...R].filter((x) => !L.has(x));
  differences += onlyLive.length + onlyRebuilt.length;
  console.log(`  ${kind.padEnd(16)} live ${String(L.size).padStart(4)}   rebuilt ${String(R.size).padStart(4)}${onlyLive.length + onlyRebuilt.length ? "" : "   same"}`);
  for (const x of onlyLive) console.log(`      live only     ${x}`);
  for (const x of onlyRebuilt) console.log(`      rebuilt only  ${x}`);
}
if (differences) {
  console.error(`\ncheck:migration-replay FAILED — ${differences} difference(s) between a rebuild and production.
A "live only" object was made by hand or by a migration not yet merged: declare it in a migration.
A "rebuilt only" object was dropped by hand: drop it in a migration.`);
  process.exit(1);
}
console.log("check:migration-replay: the rebuilt schema IS the live schema.");
