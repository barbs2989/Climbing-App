#!/usr/bin/env node
// END-TO-END TEST of the review autopilot with a REAL climber account (owner 2026-11-25: "Test out real
// examples with real accounts"). Read the cases below before running: every one is filed on a real route
// or area as a real climber would, through the same REST calls the app makes, under a throwaway account.
//
//   node scripts/oneoff/review-autopilot-e2e.mjs file      # make the test climber, file the cases, save ids
//   node scripts/review-autopilot.mjs --slot <id>          # the autopilot researches and decides them
//   node scripts/oneoff/review-autopilot-e2e.mjs report    # what became of each case
//   node scripts/oneoff/review-autopilot-e2e.mjs cleanup   # take back anything applied, delete the rows + account
//
// State (the test account and the filed ids) is kept in $TMPDIR/review-autopilot-e2e.json, never committed.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const STATE = path.join(os.tmpdir(), "review-autopilot-e2e.json");
const cmd = process.argv[2];
const CASES_FILE = process.argv[3];

async function call(method, url, body, hdrs) {
  const res = await fetch(url, { method, headers: hdrs, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(SUPABASE_URL, "")} -> ${res.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const svc = (method, p, body, extra) => call(method, `${SUPABASE_URL}/${p}`, body, headers(KEY, { "Content-Type": "application/json", ...(extra || {}) }));
const asUser = (tok, method, p, body, extra) => call(method, `${SUPABASE_URL}/rest/v1/${p}`, body, { apikey: anonKey(), Authorization: "Bearer " + tok, "Content-Type": "application/json", ...(extra || {}) });

if (cmd === "file") {
  // cases: [{label, kind:'field'|'flag'|'new_route'|'new_area', route_id?, area_id?, field?, value?, reason?, note?, expect}]
  const cases = JSON.parse(fs.readFileSync(CASES_FILE, "utf8"));
  // A second `file` run adds to the same test climber (its throwaway password is kept in the temp state file).
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : null;
  const email = prev ? prev.email : `e2e-review-${Date.now()}@climbmatch.app`, password = prev ? prev.password : crypto.randomBytes(24).toString("base64url");
  const u = prev ? { id: prev.user } : await svc("POST", "auth/v1/admin/users", { email, password, email_confirm: true, user_metadata: { name: "E2E Test Climber" } });
  if (!prev) await svc("PATCH", `rest/v1/profiles?id=eq.${u.id}`, { discoverable: false, name: "E2E Test Climber" }, { Prefer: "return=minimal" });
  const s = await call("POST", `${SUPABASE_URL}/auth/v1/token?grant_type=password`, { email, password }, { apikey: anonKey(), "Content-Type": "application/json" });
  const tok = s.access_token;
  const out = prev || { user: u.id, email, password, filed: [] };
  for (const c of cases) {
    try {
      let id;
      if (c.kind === "flag") {
        const r = await asUser(tok, "POST", "rpc/file_route_flag", { p_route_id: c.route_id, p_field: c.field, p_note: c.note });
        id = typeof r === "string" ? r : (r && (r.id || r[0]?.id));
      } else {
        const row = { kind: c.kind, route_id: c.route_id || null, area_id: c.area_id || null, field: c.field || null, value: c.value, contributor: u.id, ...(c.reason ? { reason: c.reason } : {}) };
        const r = await asUser(tok, "POST", "contributions", row, { Prefer: "return=representation" });
        id = r[0].id;
      }
      out.filed.push({ ...c, id });
      console.log("filed", c.label, id);
    } catch (e) { console.log("REFUSED", c.label, String(e.message).slice(0, 240)); out.filed.push({ ...c, id: null, refused: String(e.message).slice(0, 240) }); }
  }
  fs.writeFileSync(STATE, JSON.stringify(out, null, 1));
  console.log("state:", STATE);
} else if (cmd === "report" || cmd === "cleanup") {
  const st = JSON.parse(fs.readFileSync(STATE, "utf8"));
  for (const c of st.filed.filter((x) => x.id)) {
    const isFlag = c.kind === "flag";
    const row = (await svc("GET", `rest/v1/${isFlag ? "route_flags" : "contributions"}?id=eq.${c.id}&select=*`))[0] || {};
    const v = (await svc("GET", `rest/v1/review_ai_verdicts?item_id=eq.${c.id}&select=verdict,confidence,ai_value,reasoning,auto_action,auto_note`))[0] || null;
    if (cmd === "report") {
      console.log(`\n■ ${c.label}  (expect ${c.expect})\n  status: ${row.status}${row.review_note ? " — " + String(row.review_note).slice(0, 160) : ""}${row.resolution_note ? " — " + String(row.resolution_note).slice(0, 160) : ""}`);
      console.log(v ? `  AI: ${v.verdict} ${v.confidence} · auto: ${v.auto_action || "-"}${v.auto_note ? " — " + v.auto_note : ""}\n  why: ${String(v.reasoning).slice(0, 300)}${v.ai_value != null ? "\n  ai_value: " + JSON.stringify(v.ai_value).slice(0, 160) : ""}` : "  AI: no verdict yet");
    } else {
      await svc("DELETE", `rest/v1/review_ai_verdicts?item_id=eq.${c.id}`, undefined, { Prefer: "return=minimal" });
      await svc("DELETE", `rest/v1/${isFlag ? "route_flags" : "contributions"}?id=eq.${c.id}`, undefined, { Prefer: "return=minimal" });
      console.log("deleted", c.label);
    }
  }
  if (cmd === "cleanup") {
    await svc("DELETE", `auth/v1/admin/users/${st.user}`);
    console.log("deleted the test account", st.email);
  }
} else {
  console.error("usage: review-autopilot-e2e.mjs file <cases.json> | report | cleanup"); process.exit(2);
}
