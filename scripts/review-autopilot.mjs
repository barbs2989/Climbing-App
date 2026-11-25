#!/usr/bin/env node
// THE REVIEW AUTOPILOT (owner 2026-11-25): the AI checks what climbers send, researches it online, and
// DECIDES the ones two independent sources settle. Everything else stays on the Review desk
// (review.html) marked "Needs you", with the reason.
//
//   node scripts/review-autopilot.mjs                 # research what is due, then act on the verdicts
//   node scripts/review-autopilot.mjs --limit 10      # at most 10 items researched this run (default 15)
//   node scripts/review-autopilot.mjs --no-research   # only act on verdicts already stored
//   node scripts/review-autopilot.mjs --no-apply      # only research (store verdicts, act on nothing)
//   node scripts/review-autopilot.mjs --dry           # research nothing, write nothing: print what it WOULD do
//   node scripts/review-autopilot.mjs --only <id,id> # just these items (a test, or one the owner wants now)
//   node scripts/review-autopilot.mjs --selftest      # prove decide() on built-in cases (no network)
//
// Runs on a schedule from launchd (scripts/review-autopilot.plist; install steps in its header).
//
// HOW IT ACTS. It signs in as the AI reviewer account (REVIEW_BOT_EMAIL / REVIEW_BOT_PASSWORD in
// .env.local, made once by scripts/review-bot-setup.mjs) and calls the SAME functions the owner's
// desk buttons call — approve_field_contribution, reject_field_contribution (never a strike),
// resolve_route_flag, approve_new_route / approve_new_area, reject_new_route (never a strike). So every
// decision is a moderation_actions row by that account: on the desk's History, with Take back.
//
// HOW IT RESEARCHES. Each due item goes to `claude -p` twice (a researcher, then a skeptic who re-opens
// every cited page), with ONLY WebSearch and WebFetch allowed and a JSON schema for the answer. The
// climber's text is data in the prompt; the model can return a verdict and nothing else, and what
// happens next is decided here by fixed rules (scripts/lib/review-ai.mjs decide()), not by the model.
//
// DATABASE MANNERS (owner's throttle rule). It takes a slot from ~/dev/db-throttle/dbslot.mjs when that
// tool exists, reads by status filters and id lists only, and spaces its writes a second apart.

import fs from "fs";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, requireServiceKey, headers, loadEnv } from "./lib/supabase-env.mjs";
import { decide, checkVerdict, researchPrompt, skepticPrompt, VERDICT_SCHEMA, isProposal } from "./lib/review-ai.mjs";
import { gradeNumFor } from "../lib/grade.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LIMIT = Number(opt("--limit", 15));
const DRY = has("--dry");
const MODEL = opt("--model", "sonnet");
// --only id,id: research and decide just these items (a test, or one item the owner wants checked now).
const ONLY = opt("--only", "") ? new Set(opt("--only", "").split(",").map((x) => x.trim()).filter(Boolean)) : null;
const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace("T", " "), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (has("--selftest")) { await selftest(); process.exit(0); }

const KEY = requireServiceKey();
const ENV = loadEnv();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "review-autopilot-"));

// ── the database slot ──
const SLOT = path.join(os.homedir(), "dev/db-throttle/dbslot.mjs");
const slotId = opt("--slot", "review-autopilot"); // a session that already holds a slot passes its own id
async function acquireSlot() {
  if (!fs.existsSync(SLOT)) return;
  log("waiting for a database slot…");
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [SLOT, "acquire", slotId], { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout.on("data", (d) => { if (/GRANTED/.test(String(d))) resolve(); });
    p.on("exit", (code) => code === 0 ? resolve() : reject(new Error("dbslot acquire exited " + code)));
  });
  log("database slot granted.");
}
function releaseSlot() { if (fs.existsSync(SLOT) && !has("--slot")) spawnSync(process.execPath, [SLOT, "release", slotId], { stdio: "ignore" }); }
function slotHealthy() { return !fs.existsSync(SLOT) || spawnSync(process.execPath, [SLOT, "check"], { stdio: "ignore" }).status === 0; }

// ── REST helpers ──
async function rest(method, p, body, key = KEY, extra = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method, headers: headers(key, { "Content-Type": "application/json", ...extra }),
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p.split("?")[0]} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
function exportQueue(all) {
  const out = path.join(TMP, all ? "all.json" : "due.json");
  const r = spawnSync(process.execPath, [path.join(HERE, "review-queue-export.mjs"), "--out", out, "--limit", String(all ? 1000 : LIMIT), ...(all ? ["--all"] : [])], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error("review-queue-export failed: " + (r.stderr || r.stdout));
  log(r.stdout.trim());
  return JSON.parse(fs.readFileSync(out, "utf8"));
}

// ── research ──
function askClaude(prompt) {
  return new Promise((resolve) => {
    const p = spawn("claude", ["-p", "--model", MODEL, "--output-format", "json", "--json-schema", JSON.stringify(VERDICT_SCHEMA),
      "--allowed-tools", "WebSearch,WebFetch", "--disallowed-tools", "Bash,Edit,Write,NotebookEdit,Agent,Task",
      "--permission-mode", "dontAsk", "--strict-mcp-config"], { cwd: TMP, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => p.kill("SIGTERM"), 15 * 60 * 1000);
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("exit", () => {
      clearTimeout(timer);
      try { const j = JSON.parse(out); resolve(j.structured_output || (j.result ? JSON.parse(j.result) : null)); }
      catch { log("  claude returned no verdict:", (err || out).slice(0, 200)); resolve(null); }
    });
    p.stdin.end(prompt);
  });
}
async function research(items) {
  const verdicts = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const it = items[next++];
      const label = `${(it.route && it.route.name) || (it.area && it.area.name) || it.item_id} · ${it.field_label || it.field}`;
      log("research:", label);
      const draft = await askClaude(researchPrompt(it));
      if (!draft) continue;
      const final = await askClaude(skepticPrompt(it, draft));
      if (!final) continue;
      const v = {
        item_kind: it.item_kind, item_id: it.item_id, item_hash: it.item_hash,
        route_id: it.route_id || null, area_id: it.area_id || null, field: it.field || null,
        current_value: it.current_value ?? null, suggested_value: it.suggested_value ?? null,
        ai_value: final.ai_value ?? (final.verdict === "agree" && it.item_kind === "contribution" && !isProposal(it) ? it.suggested_value : null),
        verdict: final.verdict, confidence: final.confidence, sources: final.sources || [],
        reasoning: final.reasoning, model: "claude " + MODEL + " (review-autopilot)",
      };
      const bad = checkVerdict(v);
      if (bad.length) { // fails the ledger: store it as an honest "unsure" so the owner sees it, never as a confident verdict
        log("  verdict failed the ledger (" + bad.join("; ") + "); stored as unsure.");
        Object.assign(v, { verdict: "unsure", confidence: "none", ai_value: null, reasoning: String(v.reasoning || "The AI's answer did not meet the source rules.").slice(0, 1100) });
      }
      log(`  → ${v.verdict} (${v.confidence})`);
      verdicts.push(v);
    }
  };
  await Promise.all([worker(), worker()]); // two at a time
  return verdicts;
}
function storeVerdicts(verdicts) {
  if (!verdicts.length) return;
  const f = path.join(TMP, "verdicts.json");
  fs.writeFileSync(f, JSON.stringify(verdicts));
  const r = spawnSync(process.execPath, [path.join(HERE, "review-verdicts-write.mjs"), f], { cwd: ROOT, encoding: "utf8" });
  log((r.stdout || r.stderr).trim());
  if (r.status !== 0) throw new Error("review-verdicts-write failed");
}

// ── acting as the AI reviewer account ──
async function botSession() {
  const email = ENV.REVIEW_BOT_EMAIL, password = ENV.REVIEW_BOT_PASSWORD;
  if (!email || !password) throw new Error("REVIEW_BOT_EMAIL / REVIEW_BOT_PASSWORD are not set in .env.local — run node scripts/review-bot-setup.mjs once");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error("AI reviewer sign-in failed: " + JSON.stringify(j).slice(0, 200));
  return { token: j.access_token, uid: j.user.id };
}
async function asBot(bot, method, p, body, extra) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method, headers: { apikey: anonKey(), Authorization: "Bearer " + bot.token, "Content-Type": "application/json", ...(extra || {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${p.split("?")[0]} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const rpc = (bot, fn, body) => asBot(bot, "POST", "rpc/" + fn, body);

async function duplicatesFor(it) {
  const v = it.suggested_value || {};
  const name = String(v.name || "").trim();
  if (name.length < 2) return 0;
  if (it.field === "new_route") return (await rest("POST", "rpc/catalog_find_route", { p_name: name, p_area_id: it.area_id })).length;
  const state = it.area && it.area.path ? String(it.area.path).split(".")[1] || null : (it.area && it.area.state) || null;
  return (await rest("POST", "rpc/catalog_find_area", { p_name: name, p_state: state, p_lat: v.lat ?? null, p_lng: v.lng ?? null })).length;
}

async function perform(bot, it, d) {
  const also = it.also_ids || [];
  switch (d.action) {
    case "approve": return rpc(bot, "approve_field_contribution", { p_id: it.item_id, p_value: null, p_also: also });
    case "approve_ai_value": return rpc(bot, "approve_field_contribution", { p_id: it.item_id, p_value: d.value, p_also: also });
    case "turn_down": return rpc(bot, "reject_field_contribution", { p_id: it.item_id, p_reason: d.reason.slice(0, 900), p_also: also, p_strike: false });
    case "dismiss_flag": return rpc(bot, "resolve_route_flag", { p_id: it.item_id, p_status: "dismissed", p_note: d.reason.slice(0, 900) });
    case "fix_flag": {
      const rows = await asBot(bot, "POST", "contributions", { route_id: it.route_id, kind: "field", field: it.field, value: d.value, contributor: bot.uid,
        reason: "Corrected by the AI reviewer from a climber's flag, with two published sources." }, { Prefer: "return=representation" });
      const c = Array.isArray(rows) ? rows[0] : rows;
      if (!c || !c.id) throw new Error("the correcting edit was not saved");
      try { await rpc(bot, "approve_field_contribution", { p_id: c.id, p_value: null, p_also: [] }); }
      catch (e) { await rest("DELETE", `contributions?id=eq.${c.id}&status=eq.pending`, undefined, KEY, { Prefer: "return=minimal" }).catch(() => {}); throw e; }
      return rpc(bot, "resolve_route_flag", { p_id: it.item_id, p_status: "fixed", p_note: "Thanks — we checked it against published sources and corrected it." });
    }
    case "approve_proposal": {
      if (it.field === "new_area") return rpc(bot, "approve_new_area", { p_contribution_id: it.item_id });
      const v = it.suggested_value || {};
      const g = gradeNumFor(v.grade, v.discipline);
      return rpc(bot, "approve_new_route", { p_contribution_id: it.item_id, p_grade_num: Number.isFinite(g) ? g : null });
    }
    case "reject_proposal": return rpc(bot, "reject_new_route", { p_contribution_id: it.item_id, p_note: d.reason.slice(0, 900), p_strike: false });
    default: return null;
  }
}

async function apply() {
  const q = exportQueue(true);
  const items = (q.items || []).filter((it) => !ONLY || ONLY.has(it.item_id));
  if (!items.length) { log("apply: nothing waiting."); return { acted: 0, owner: 0 }; }
  // The stored verdicts for these items, with the columns decide() needs.
  const ids = items.map((it) => it.item_id);
  const rows = [];
  for (let i = 0; i < ids.length; i += 100) {
    rows.push(...await rest("GET", `review_ai_verdicts?select=item_kind,item_id,item_hash,verdict,confidence,ai_value,reasoning,auto_action,auto_hash&item_id=in.(${ids.slice(i, i + 100).join(",")})`));
  }
  const vBy = Object.fromEntries(rows.map((r) => [r.item_kind + ":" + r.item_id, r]));
  // Without the AI reviewer account (scripts/review-bot-setup.mjs not run yet) it still marks what needs the
  // owner, and logs what it WOULD have decided, recording nothing for those so they are decided once it exists.
  const haveBot = !!(ENV.REVIEW_BOT_EMAIL && ENV.REVIEW_BOT_PASSWORD);
  if (!haveBot && !DRY) log("no AI reviewer account yet (run node scripts/review-bot-setup.mjs): marking what needs the owner, acting on nothing.");
  const bot = DRY || !haveBot ? null : await botSession();
  let acted = 0, owner = 0, failed = 0;
  for (const it of items) {
    const v = vBy[it.item_kind + ":" + it.item_id] || null;
    if (!v) continue; // not researched yet: the next run's research picks it up; nothing to record
    if (v.item_hash !== it.item_hash) continue; // changed since it was researched: the next research run refreshes it; record nothing
    if (v.auto_action && v.auto_hash === it.item_hash) continue; // already decided for this exact content
    if (!DRY && !slotHealthy()) { log("database slot check failed; stopping this run (the rest is decided next run)."); break; }
    const gradeOk = (g) => Number.isFinite(gradeNumFor(g, (it.route && it.route.discipline) || null));
    const d = decide(it, v, { gradeOk, ...(isProposal(it) && v.verdict === "agree" ? { duplicates: await duplicatesFor(it) } : {}) });
    const label = `${(it.route && it.route.name) || (it.suggested_value && it.suggested_value.name) || (it.area && it.area.name) || it.item_id} · ${it.field_label || it.field}`;
    log(`${d.action.padEnd(16)} ${label} — ${d.note}`);
    if (DRY) continue;
    let action = d.action, note = d.note;
    if (d.action !== "needs_owner" && !bot) { log("  (not acted: no AI reviewer account)"); continue; }
    if (d.action !== "needs_owner") {
      try { await perform(bot, it, d); acted++; }
      catch (e) {
        failed++;
        const m = String(e.message || e);
        // A timeout, a 5xx, a rate limit or an expired session is retried next run, unrecorded.
        if (!/-> 4\d\d/.test(m) || /-> (401|408|429)/.test(m)) { log("  failed (will retry next run):", m.slice(0, 200)); await sleep(1000); continue; }
        action = "needs_owner"; note = "The AI tried to act and the database refused: " + m.slice(0, 300); log("  refused:", note);
      }
    } else owner++;
    await rest("PATCH", `review_ai_verdicts?item_kind=eq.${it.item_kind}&item_id=eq.${it.item_id}`,
      { auto_action: action, auto_note: note.slice(0, 600), auto_at: new Date().toISOString(), auto_hash: it.item_hash }, KEY, { Prefer: "return=minimal" });
    await sleep(1000);
  }
  log(`apply: acted on ${acted}, left ${owner} for the owner, ${failed} refused by the database.`);
  return { acted, owner, failed };
}

async function main() {
  await acquireSlot();
  try {
    if (!has("--no-research") && !DRY) {
      const q = exportQueue(!!ONLY);
      const due = (q.items || []).filter((it) => !ONLY || ONLY.has(it.item_id));
      if (due.length) storeVerdicts(await research(due));
      else log("research: nothing due.");
    }
    if (!has("--no-apply")) await apply();
  } finally { releaseSlot(); fs.rmSync(TMP, { recursive: true, force: true }); }
}

async function selftest() {
  const base = { item_kind: "contribution", item_id: "x", item_hash: "h", field: "grade", field_label: "Grade", current_value: "5.8", suggested_value: "5.9", also_ids: [] };
  const v = (o) => ({ item_hash: "h", verdict: "agree", confidence: "2-source", ai_value: null, reasoning: "Two guidebooks say 5.9.", ...o });
  const cases = [
    ["no verdict", base, null, "needs_owner"],
    ["stale verdict", base, v({ item_hash: "old" }), "needs_owner"],
    ["unsure", base, v({ verdict: "unsure", confidence: "none" }), "needs_owner"],
    ["1-source agree", base, v({ confidence: "1-source" }), "needs_owner"],
    ["2-source agree", base, v({}), "approve"],
    ["agree, AI value = climber's (case/space)", { ...base, suggested_value: "Mount  Baker" }, v({ ai_value: "mount baker" }), "approve"],
    ["agree, AI refines", base, v({ ai_value: "5.9+" }), "approve_ai_value"],
    ["agree, AI value wrong shape", base, v({ ai_value: [1] }), "needs_owner"],
    ["removes something", { ...base, removes_something: true }, v({}), "needs_owner"],
    ["disagree, page right", base, v({ verdict: "disagree", ai_value: "5.8" }), "turn_down"],
    ["disagree, no value", base, v({ verdict: "disagree" }), "turn_down"],
    ["disagree, page also wrong", base, v({ verdict: "disagree", ai_value: "5.10a" }), "approve_ai_value"],
    ["partly, no value", base, v({ verdict: "partly" }), "needs_owner"],
    ["partly with value", base, v({ verdict: "partly", ai_value: "5.9" }), "approve"],
    ["flag, page right", { ...base, item_kind: "flag", suggested_value: null }, v({ verdict: "disagree" }), "dismiss_flag"],
    ["flag, fix", { ...base, item_kind: "flag", suggested_value: null }, v({ ai_value: "5.10a" }), "fix_flag"],
    ["flag, AI = page", { ...base, item_kind: "flag", suggested_value: null }, v({ ai_value: "5.8" }), "dismiss_flag"],
    ["flag, no value", { ...base, item_kind: "flag", suggested_value: null }, v({}), "needs_owner"],
    ["flag, whole route", { ...base, item_kind: "flag", field: null }, v({ ai_value: "x" }), "needs_owner"],
    ["proposal agree, no dupes", { ...base, field: "new_route", suggested_value: { name: "X" } }, v({}), "approve_proposal", { duplicates: 0 }],
    ["proposal agree, dupes", { ...base, field: "new_route", suggested_value: { name: "X" } }, v({}), "needs_owner", { duplicates: 2 }],
    ["proposal disagree (never auto-rejected)", { ...base, field: "new_area", suggested_value: { name: "X" } }, v({ verdict: "disagree" }), "needs_owner"],
    ["AI value carries a link", { ...base, field: "descent" , current_value: "Walk off.", suggested_value: "Rap the route." }, v({ ai_value: "See www.example.com" }), "needs_owner"],
    ["AI grade that is not a grade", base, v({ ai_value: "hard" }), "needs_owner", { gradeOk: (g) => /^5\./.test(g) }],
    ["flag pin off the map", { ...base, item_kind: "flag", field: "parking_pin", current_value: { lat: 47.5, lng: -120.7 }, suggested_value: null }, v({ ai_value: { lat: 147.5, lng: -120.7 } }), "needs_owner"],
    ["proposal partly", { ...base, field: "new_route", suggested_value: { name: "X" } }, v({ verdict: "partly", ai_value: { grade: "5.7" } }), "needs_owner"],
  ];
  let bad = 0;
  for (const [name, it, ver, want, extra] of cases) {
    const got = decide(it, ver, extra).action;
    if (got !== want) { bad++; console.log(`✗ ${name}: got ${got}, want ${want}`); } else console.log(`✓ ${name}`);
  }
  const ledger = [
    [{ item_kind: "flag", item_id: "00000000-0000-0000-0000-000000000000", item_hash: "h", verdict: "agree", confidence: "2-source", sources: [{ url: "https://a.com/x", quote: "abc" }, { url: "https://a.com/y", quote: "abc" }], reasoning: "r" }, false],
    [{ item_kind: "flag", item_id: "00000000-0000-0000-0000-000000000000", item_hash: "h", verdict: "agree", confidence: "2-source", sources: [{ url: "https://www.fs.usda.gov/x", quote: "abc" }], reasoning: "r" }, true],
    [{ item_kind: "flag", item_id: "00000000-0000-0000-0000-000000000000", item_hash: "h", verdict: "agree", confidence: "2-source", sources: [{ url: "https://a.com/x", quote: "abc" }, { url: "https://b.org/y", quote: "abc" }], reasoning: "r" }, true],
  ];
  ledger.forEach(([v2, ok], i) => { const pass = !checkVerdict(v2).length; if (pass !== ok) { bad++; console.log(`✗ ledger #${i}`); } else console.log(`✓ ledger #${i}`); });
  console.log(bad ? `review-autopilot selftest: ${bad} FAILED` : `review-autopilot selftest: all ${cases.length + ledger.length} passed`);
  if (bad) process.exit(1);
}

if (!has("--selftest")) {
  main().catch((e) => { log("review-autopilot failed:", e.message || e); releaseSlot(); process.exit(1); });
}
