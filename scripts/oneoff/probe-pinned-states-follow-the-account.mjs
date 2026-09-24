#!/usr/bin/env node
/* DOES A PINNED STATE FOLLOW THE ACCOUNT TO A SECOND BROWSER? (0187)
 *
 * The report: "My pinned Washington didn't show up when I signed out and back in on a different
 * browser." It could not — "Pinned states" was the offline-download list in one browser's
 * IndexedDB. 0187 gives the pin a column; this proves the round trip with REAL accounts.
 *
 * The SHIPPED savePinnedStates() runs (lib/db.js bundled with the real lib/supabase.js client),
 * signed in with the ANON key as each climber — the service key only creates and deletes the two
 * throwaway accounts, because it bypasses RLS and would prove nothing about the policy.
 *
 *   1. a new account reads NULL ("never set") — which is what arms the one-time seed
 *   2. browser A pins Washington through savePinnedStates()
 *   3. a SEPARATE session ("browser B") signs in and reads it back the way getProfile does
 *   4. unpinning sticks (an empty list is stored, not ignored)
 *   5. another climber cannot write it — savePinnedStates THROWS rather than reading as saved
 *
 * Writes only to the two accounts it creates, and removes them in `finally`.
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SERVICE = requireServiceKey();
const ANON = anonKey();
const DOMAIN = "climbmatch-qa.invalid";
let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const no = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const check = (c, m) => (c ? ok(m) : no(m));
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() {} close() {} };

const SVC = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-pins-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));

// Each "browser" is its own module instance, so its supabase client holds its own session.
async function browser(tag) {
  const entry = path.join(tmp, `entry-${tag}.mjs`), out = path.join(tmp, `b-${tag}.mjs`);
  fs.writeFileSync(entry, `export { savePinnedStates } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};\nexport { supabase } from ${JSON.stringify(path.join(ROOT, "lib/supabase.js"))};\n`);
  await build({
    entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    jsx: "automatic", loader: { ".jsx": "jsx", ".js": "jsx" },
    external: ["react", "react-dom", "@tanstack/react-query"],
    define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: ANON, VITE_USE_DB: "true" }) },
  });
  return import(out);
}

const made = [];
async function account(tag) {
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-pins-${tag}-${stamp}@${DOMAIN}`, password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const u = await (await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: SVC,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Pins Probe " + tag, terms_version: "2026-08-19" } }) })).json();
  if (!u || !u.id) throw new Error("could not create fixture account: " + JSON.stringify(u).slice(0, 200));
  made.push(u.id);
  return { id: u.id, email, password };
}

try {
  const A = await account("a"), B = await account("b");
  ok("two throwaway accounts created");

  const browserA = await browser("a"), browserB = await browser("b"), other = await browser("other");
  check(browserA.supabase !== browserB.supabase, "the two browsers are separate client instances");

  const sa = await browserA.supabase.auth.signInWithPassword({ email: A.email, password: A.password });
  check(!sa.error, "browser A signed in as climber A (anon key — RLS live)");

  const r0 = await browserA.supabase.from("profiles").select("*").eq("id", A.id).single();
  check(!r0.error && r0.data.pinned_states === null, `1. a new account reads pinned_states = NULL (got ${JSON.stringify(r0.data && r0.data.pinned_states)})`);

  const wrote = await browserA.savePinnedStates(A.id, ["Washington", "Washington", ""]);
  check(JSON.stringify(wrote) === '["Washington"]', `2. savePinnedStates pinned Washington from browser A (duplicates/blanks dropped: ${JSON.stringify(wrote)})`);

  const sb = await browserB.supabase.auth.signInWithPassword({ email: A.email, password: A.password });
  check(!sb.error, "browser B — a separate session — signed in as the same climber");
  const r1 = await browserB.supabase.from("profiles").select("*").eq("id", A.id).single();
  check(!r1.error && JSON.stringify(r1.data.pinned_states) === '["Washington"]', `3. browser B reads the pin back: ${JSON.stringify(r1.data && r1.data.pinned_states)}`);

  await browserB.savePinnedStates(A.id, []);
  const r2 = await browserA.supabase.from("profiles").select("pinned_states").eq("id", A.id).single();
  check(Array.isArray(r2.data.pinned_states) && r2.data.pinned_states.length === 0, "4. unpinning on B sticks, and A sees it (empty list stored, not ignored)");

  const so = await other.supabase.auth.signInWithPassword({ email: B.email, password: B.password });
  check(!so.error, "a third client signed in as a DIFFERENT climber");
  let threw = false;
  try { await other.savePinnedStates(A.id, ["Utah"]); } catch (e) { threw = true; }
  check(threw, "5. another climber writing A's pins THROWS (RLS refusal surfaces, never reads as saved)");
  const r3 = await (await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${A.id}&select=pinned_states`, { headers: SVC })).json();
  check(Array.isArray(r3) && JSON.stringify(r3[0].pinned_states) === "[]", `   ...and A's row is untouched: ${JSON.stringify(r3[0] && r3[0].pinned_states)}`);

  let threwOut = false;
  try { await browserA.savePinnedStates(null, ["Utah"]); } catch (e) { threwOut = true; }
  check(threwOut, "savePinnedStates with no signed-in id refuses instead of writing");
} catch (e) {
  no("probe crashed: " + (e.stack || e.message));
} finally {
  for (const id of made) {
    const d = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: SVC });
    console.log(`  teardown: removed fixture account ${id.slice(0, 8)}… (${d.status})`);
  }
}
console.log(bad ? `\n${bad} FAIL of ${ran}` : `\nok — a pinned state follows the account to another browser (${ran} assertions)`);
process.exit(bad ? 1 : 0);
