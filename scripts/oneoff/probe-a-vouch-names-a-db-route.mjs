// Does a vouch that names a CATALOG climb survive the round trip?
//
// Owner note: "Does vouching actually work for db routes?" Since 2026-11-26 the vouch form saves
// the picked climb's catalog id (`routeId`) beside its name inside `vouches.reason` (JSON, no
// column), and VouchCard opens that climb. This probe writes a vouch exactly as giveVouch() does
// (a plain INSERT under the VOUCHER's own JWT, never the service key), edits it as updateVouch()
// does (only `reason` is writable, 0238), reads it back as the RECIPIENT, checks the id names a
// real routes row, then revokes it.
//
// Writes to the live project: a per-run fixture (two accounts), one vouch row, all deleted;
// leaks reported. Hand-run only, behind the DB gate (~/dev/db-throttle/dbslot.mjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];
const SUPA = (envVal("VITE_SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");
if (!SUPA || !ANON) { console.error("needs VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY"); process.exit(1); }

const ROUTE_ID = "wa_mount_baker_north_ridge";
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const api = (p, tok, init = {}) => fetch(`${SUPA}/rest/v1/${p}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
const signIn = async (u) => {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const b = await r.json(); if (!b.access_token) throw new Error(`sign-in failed (${r.status})`); return b.access_token;
};

let fixture = null, vouchId = null, ownerTok = null;
try {
  fixture = await createFixture(console.log);
  ownerTok = fixture.session.access_token;
  const mateTok = await signIn(fixture.mate);

  const rr = await api(`routes?id=eq.${ROUTE_ID}&select=id,name`, ownerTok);
  const route = (await rr.json())[0];
  must(!!route, `the catalog climb exists (${ROUTE_ID})`);

  // 1. give, as GiveVouchSheet does: JSON.stringify({route, routeId, ratings, skills, text, ...})
  const reason = { route: route.name, routeId: route.id, ratings: { belay: 5 }, skills: [], text: "Probe vouch.", wouldClimbAgain: true };
  const g = await api("vouches", ownerTok, { method: "POST", body: JSON.stringify({ from_id: fixture.owner.id, to_id: fixture.mate.id, reason: JSON.stringify(reason) }) });
  const gRows = await g.json().catch(() => null);
  must(g.ok && Array.isArray(gRows) && gRows.length === 1, `the voucher can give it under their own session (HTTP ${g.status})`);
  vouchId = gRows && gRows[0] && gRows[0].id;

  // 2. edit, as updateVouch does: only `reason` changes
  const e = await api(`vouches?from_id=eq.${fixture.owner.id}&to_id=eq.${fixture.mate.id}`, ownerTok, { method: "PATCH", body: JSON.stringify({ reason: JSON.stringify({ ...reason, text: "Probe vouch, edited." }) }) });
  const eRows = await e.json().catch(() => null);
  must(e.ok && Array.isArray(eRows) && eRows.length === 1, `the voucher can edit it (HTTP ${e.status}, ${Array.isArray(eRows) ? eRows.length : "?"} row)`);

  // 3. the recipient reads it, as useClimberVouches(to_id) does
  const b = await api(`vouches?to_id=eq.${fixture.mate.id}&select=id,reason`, mateTok);
  const bRows = await b.json().catch(() => []);
  const parsed = bRows[0] ? JSON.parse(bRows[0].reason) : {};
  must(bRows.length === 1, "the recipient can read it");
  must(parsed.routeId === route.id && parsed.route === route.name, `it still names the climb by id AND name (${parsed.routeId} / ${parsed.route})`);
  must(parsed.text === "Probe vouch, edited.", "the edit landed");

  // 4. revoke, as revokeVouch does
  const d = await api(`vouches?from_id=eq.${fixture.owner.id}&to_id=eq.${fixture.mate.id}`, ownerTok, { method: "DELETE" });
  const dRows = await d.json().catch(() => null);
  must(d.ok && Array.isArray(dRows) && dRows.length === 1, `the voucher can withdraw it (HTTP ${d.status})`);
  if (d.ok) vouchId = null;
} catch (err) {
  console.error(String(err && err.stack || err).slice(0, 800)); bad++;
} finally {
  if (vouchId && ownerTok) await api(`vouches?id=eq.${vouchId}`, ownerTok, { method: "DELETE" }).catch(() => {});
  if (fixture) {
    const left = await fixture.cleanup().catch((x) => [`cleanup threw: ${x}`]);
    if (left && left.length) { console.error("LEAKED: " + left.join(", ")); bad++; } else console.log("  fixture removed.");
  }
}
console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
