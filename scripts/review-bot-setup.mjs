#!/usr/bin/env node
// ONE-TIME: make the AI reviewer account the review autopilot signs in as (scripts/review-autopilot.mjs).
//
//   node scripts/review-bot-setup.mjs            # creates it if missing, writes its login to .env.local
//
// What it makes: an auth user `review-bot@climbmatch.app` with a random 40-character password, confirmed,
// named "ClimbMatch AI review", and made an ADMIN — approving a proposed climb or area is admin-only (0505),
// and the autopilot must be able to do what the desk's buttons do. It is never a climber: it signs in only
// from the owner's Mac, by this script's .env.local entry, and its every decision is a moderation_actions
// row the owner can take back on the desk's History.
//
// is_admin can only be set by an admin (prevent_self_admin, 0425/0530), so the grant runs as SQL through
// `npx supabase db query --linked` with the request's JWT subject set to an EXISTING admin — the same
// check a button press would pass. Needs the linked project (supabase/.temp) and the service key.
// Re-running is safe: it finds the account, resets nothing it does not need to, and re-writes .env.local
// only when the password changed.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { SUPABASE_URL, requireServiceKey, headers, loadEnv } from "./lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = requireServiceKey();
const EMAIL = "review-bot@climbmatch.app";
const NAME = "ClimbMatch AI review";

async function auth(method, p, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${p}`, { method, headers: headers(KEY, { "Content-Type": "application/json" }), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} auth/${p} -> ${res.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

const env = loadEnv();
let password = env.REVIEW_BOT_EMAIL === EMAIL ? env.REVIEW_BOT_PASSWORD : null;

// Find the account (the admin list is paged; the bot is created once, so a page scan is fine).
let user = null;
for (let page = 1; page < 50 && !user; page++) {
  const r = await auth("GET", `admin/users?page=${page}&per_page=200`);
  const list = (r && r.users) || [];
  user = list.find((u) => (u.email || "").toLowerCase() === EMAIL) || null;
  if (list.length < 200) break;
}
if (!user) {
  password = crypto.randomBytes(30).toString("base64url");
  user = await auth("POST", "admin/users", { email: EMAIL, password, email_confirm: true, user_metadata: { name: NAME, full_name: NAME } });
  console.log("created the AI reviewer account", user.id);
} else if (!password) {
  password = crypto.randomBytes(30).toString("base64url");
  await auth("PUT", `admin/users/${user.id}`, { password });
  console.log("found the AI reviewer account; set a new password", user.id);
} else console.log("found the AI reviewer account", user.id);

// .env.local in the MAIN checkout's root (the file the autopilot reads); never committed (.gitignore).
const envFile = path.join(ROOT, ".env.local");
let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
text = text.split("\n").filter((l) => !/^REVIEW_BOT_(EMAIL|PASSWORD)=/.test(l)).join("\n").replace(/\n*$/, "\n");
text += `REVIEW_BOT_EMAIL=${EMAIL}\nREVIEW_BOT_PASSWORD=${password}\n`;
fs.writeFileSync(envFile, text, { mode: 0o600 });
console.log("wrote REVIEW_BOT_EMAIL / REVIEW_BOT_PASSWORD to", envFile);

const sql = `begin;
select set_config('request.jwt.claims', json_build_object('sub', (select id from profiles where is_admin and id <> '${user.id}' order by created_at limit 1), 'role', 'authenticated')::text, true);
update profiles set is_admin = true, name = '${NAME}', discoverable = false where id = '${user.id}';
select id, name, is_admin from profiles where id = '${user.id}';
commit;`;
const tmp = path.join(fs.mkdtempSync(path.join(ROOT, ".review-bot-")), "grant.sql");
fs.writeFileSync(tmp, sql);
const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp], { cwd: ROOT, encoding: "utf8" });
fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
console.log((r.stdout || "") + (r.stderr || ""));
if (r.status !== 0) { console.error("granting admin failed"); process.exit(1); }
