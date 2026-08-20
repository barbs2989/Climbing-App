// A guide application reaches a reviewer, and reaches nobody else.
//
// Two real accounts: the mate APPLIES (creating its own profile, credential and document
// exactly as the app's own flow does, under RLS), the owner REVIEWS. The negatives run before
// admin is granted, because "an admin can see it" is worthless without "a stranger cannot".
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import pwPkg from "/Users/nathanbarber/dev/Climbing-App/node_modules/playwright-core/index.js";
const { chromium } = pwPkg;
const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/top-contributors-photo-crew-resume";
const { createFixture, sessionForStorage, STORAGE_KEY } = await import(ROOT + "/scripts/lib/ui-fixture.mjs");
const { loadEnv } = await import(ROOT + "/scripts/lib/supabase-env.mjs");
const env = loadEnv();
const SB = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_KEY;
const svcH = { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json" };
const asUser = (t) => ({ apikey: ANON, Authorization: "Bearer " + t, "Content-Type": "application/json", Prefer: "return=representation" });
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; process.exitCode = 1; };
const signIn = async (u) => (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) })).json());
const sql = (q) => execFileSync("npx", ["supabase", "db", "query", "--linked", q], { cwd: ROOT, encoding: "utf8" });

let f = null, browser = null, server = null, restoreEnv = null, madeAdmin = false, docPath = null;
try {
  f = await createFixture(() => {});
  const ownerSess = await signIn(f.owner), mateSess = await signIn(f.mate);
  const ownerTok = ownerSess.access_token, mateTok = mateSess.access_token;

  // --- the mate applies, through RLS, as the app's own flow does ---
  const mk = async (table, body) => {
    const r = await fetch(`${SB}/rest/v1/${table}`, { method: "POST", headers: asUser(mateTok), body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    return { status: r.status, row: Array.isArray(j) ? j[0] : j };
  };
  // Deliberately submitted with ONE attestation missing, so the refusal path is exercised first.
  const prof = await mk("guide_profiles", {
    id: f.mate.id, status: "submitted", title: "AMGA Single Pitch Instructor", base_location: "Leavenworth, WA",
    insurance_carrier_name: "Probe Mutual", submitted_at: new Date().toISOString(),
    insurance_attested: true, permit_attested: true, waiver_process_attested: true,
    independent_contractor_attested: false,
  });
  if (prof.row && prof.row.id) ok("a climber submits a guide application"); else { fail("could not create the application: " + JSON.stringify(prof).slice(0, 180)); throw new Error("no profile"); }

  const cred = await mk("guide_credentials", { guide_id: f.mate.id, kind: "primary_track", cert_track: "SPI", label: "AMGA SPI", issuing_org: "AMGA", cert_number: "PROBE-1" });
  if (cred.row && cred.row.id) ok("with a primary-track credential"); else fail("credential insert failed: " + JSON.stringify(cred).slice(0, 160));

  // A real document in the private bucket, uploaded as the applicant.
  docPath = `${f.mate.id}/cert_card/probe-${Date.now()}.txt`;
  const up = await fetch(`${SB}/storage/v1/object/guide-documents/${docPath}`, { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + mateTok, "Content-Type": "text/plain" }, body: "probe certification card" });
  if (up.ok) ok("and a document in the private bucket"); else fail(`document upload failed ${up.status}: ${(await up.text()).slice(0, 120)}`);
  const doc = await mk("guide_documents", { guide_id: f.mate.id, doc_type: "cert_card", storage_path: docPath, credential_id: cred.row && cred.row.id });
  if (!(doc.row && doc.row.id)) fail("guide_documents insert failed: " + JSON.stringify(doc).slice(0, 160));

  // --- NEGATIVES, before admin exists ---
  const readAs = async (tok) => fetch(`${SB}/rest/v1/guide_profiles?status=eq.submitted&select=id,title`, { headers: asUser(tok) }).then((x) => x.json());
  const strangerSees = await readAs(ownerTok);
  if (Array.isArray(strangerSees) && strangerSees.length === 0) ok("a NON-admin cannot see a submitted application");
  else fail("a stranger read the application: " + JSON.stringify(strangerSees).slice(0, 140));

  const strangerDoc = await fetch(`${SB}/rest/v1/guide_documents?select=id,storage_path`, { headers: asUser(ownerTok) }).then((x) => x.json());
  if (Array.isArray(strangerDoc) && strangerDoc.length === 0) ok("nor their uploaded documents");
  else fail("a stranger read documents: " + JSON.stringify(strangerDoc).slice(0, 140));

  const strangerPatch = await fetch(`${SB}/rest/v1/guide_credentials?id=eq.${cred.row.id}`, { method: "PATCH", headers: asUser(ownerTok), body: JSON.stringify({ status: "verified" }) }).then(async (x) => (await x.json().catch(() => [])).length);
  if (strangerPatch === 0) ok("and cannot verify a credential"); else fail(`a non-admin verified ${strangerPatch} credential(s)`);

  // --- grant admin ---
  try { sql(`set session_replication_role = replica; update profiles set is_admin = true where id = '${f.owner.id}'; set session_replication_role = default;`); madeAdmin = true; ok("reviewer granted admin"); }
  catch (e) { fail("could not grant admin: " + String(e.message).slice(0, 120)); throw e; }

  const adminSees = await readAs(ownerTok);
  if (Array.isArray(adminSees) && adminSees.length === 1) ok("an ADMIN sees the application — it reaches somebody who can act");
  else fail("admin read: " + JSON.stringify(adminSees).slice(0, 140));

  // --- render ---
  const port = await (async () => { for (let p = 5920; p < 5960; p++) { const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); }); if (free) return p; } })();
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const envLocal = ROOT + "/.env.local", hidden = envLocal + ".probe-hidden";
  if (fs.existsSync(envLocal)) { fs.renameSync(envLocal, hidden); restoreEnv = () => fs.existsSync(hidden) && fs.renameSync(hidden, envLocal); }
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore",
    env: { ...process.env, VITE_SUPABASE_URL: SB, VITE_SUPABASE_ANON_KEY: ANON, VITE_USE_DB: "true", VITE_DEMO_AUTOLOGIN: "" } });
  let up2 = false;
  for (let i = 0; i < 150; i++) { try { const x = await fetch(base); if (x.ok) { up2 = true; break; } } catch {} await new Promise((r) => setTimeout(r, 2000)); }
  if (!up2) { fail("dev server never came up"); throw new Error("no server"); }

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 180)));
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(sessionForStorage(ownerSess))]);
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 200000 });
  await page.waitForTimeout(13000);
  const boot = await page.evaluate(() => document.body.innerText);
  if (/This screen hit a bug/.test(boot)) { fail("app crashed: " + boot.slice(0, 160)); throw new Error("crashed"); }
  ok("app is on screen as a signed-in admin");

  const navText = () => page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.getAttribute("aria-label") || "") === "Profile"); return b ? (b.innerText || "").trim() : "?"; });
  const nav = await navText();
  if (/\d/.test(nav)) ok("the Profile tab badge counts it: " + JSON.stringify(nav)); else fail("no badge for a waiting application: " + JSON.stringify(nav));

  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.getAttribute("aria-label") || "") === "Profile"); if (b) b.click(); });
  await page.waitForTimeout(9000);
  const t = await page.evaluate(() => document.body.innerText);
  if (/GUIDE APPLICATIONS/i.test(t)) ok("the Guide applications section renders"); else fail("the section did not render");
  // A heading with an ERROR under it renders identically to a heading with a working empty
  // queue under it. The first draft of this probe reported "rendered without the application"
  // when the truth was that the query had 42703'd on a column I invented -- the message sent me
  // looking at the component instead of the select.
  if (/Couldn.t load the queue/.test(t)) fail("the queue is showing its ERROR state: " + t.slice(t.search(/Couldn.t load the queue/), t.search(/Couldn.t load the queue/) + 170));
  else ok("and is not in its error state");
  if (/No applications waiting/.test(t)) fail("the queue says there is nothing waiting, but one was just submitted");
  if (/AMGA Single Pitch Instructor/.test(t)) ok("with the application on screen"); else fail("the section rendered without the application in it");
  if (/Probe Mutual/.test(t)) ok("and the insurer they named"); else fail("insurer not shown");
  if (/Cannot be listed until the guide attests/.test(t)) ok("and REFUSES to offer listing while an attestation is missing, saying which");
  else fail("the missing attestation was not explained");

  const listBtn = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => /List this guide/.test(e.innerText || "")); return b ? { disabled: b.disabled } : null; });
  if (listBtn && listBtn.disabled) ok("the List button is disabled, so the database constraint is never hit as a raw error");
  else fail("List button state: " + JSON.stringify(listBtn));

  // Verifying without an expiry must be impossible from the UI.
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "Verify"); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(800);
  if (clicked) {
    const confirm = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "Confirm"); return b ? { disabled: b.disabled } : null; });
    if (confirm && confirm.disabled) ok("Confirm is disabled until an expiry date is entered — no invented expiry");
    else fail("Confirm state without an expiry: " + JSON.stringify(confirm));
  } else fail("no Verify control found");

  if (errs.length) fail("page errors: " + errs.join(" | ")); else ok("no page errors");

  // --- the write path, at the API, with the same rules the UI enforces ---
  const patchCred = await fetch(`${SB}/rest/v1/guide_credentials?id=eq.${cred.row.id}`, { method: "PATCH", headers: asUser(ownerTok), body: JSON.stringify({ status: "verified", verified_at: new Date().toISOString(), verified_expires_at: "2028-01-01T12:00:00Z", reviewed_by: f.owner.id }) }).then((x) => x.json());
  if (Array.isArray(patchCred) && patchCred.length === 1 && patchCred[0].status === "verified") ok("an admin verifies the credential, with an expiry");
  else fail("credential verify failed: " + JSON.stringify(patchCred).slice(0, 160));

  const badList = await fetch(`${SB}/rest/v1/guide_profiles?id=eq.${f.mate.id}`, { method: "PATCH", headers: asUser(ownerTok), body: JSON.stringify({ status: "active" }) });
  if (!badList.ok) ok("the DATABASE also refuses listing while an attestation is missing (" + badList.status + ") — the UI check is not the only guard");
  else fail("the database allowed an active guide with a missing attestation");

  await fetch(`${SB}/rest/v1/guide_profiles?id=eq.${f.mate.id}`, { method: "PATCH", headers: asUser(mateTok), body: JSON.stringify({ independent_contractor_attested: true }) });
  const goodList = await fetch(`${SB}/rest/v1/guide_profiles?id=eq.${f.mate.id}`, { method: "PATCH", headers: asUser(ownerTok), body: JSON.stringify({ status: "active", listed_at: new Date().toISOString() }) }).then((x) => x.json());
  if (Array.isArray(goodList) && goodList.length === 1 && goodList[0].status === "active") ok("and once every attestation is in, the guide can be listed");
  else fail("listing failed: " + JSON.stringify(goodList).slice(0, 160));
} catch (e) { fail("threw: " + e.message); }
finally {
  if (restoreEnv) restoreEnv();
  if (browser) await browser.close();
  if (server) server.kill();
  if (docPath) await fetch(`${SB}/storage/v1/object/guide-documents/${docPath}`, { method: "DELETE", headers: svcH }).catch(() => {});
  if (f) {
    await fetch(`${SB}/rest/v1/guide_documents?guide_id=eq.${f.mate.id}`, { method: "DELETE", headers: svcH }).catch(() => {});
    await fetch(`${SB}/rest/v1/guide_credentials?guide_id=eq.${f.mate.id}`, { method: "DELETE", headers: svcH }).catch(() => {});
    await fetch(`${SB}/rest/v1/guide_profiles?id=eq.${f.mate.id}`, { method: "DELETE", headers: svcH }).catch(() => {});
  }
  if (f && madeAdmin) { try { sql(`set session_replication_role = replica; update profiles set is_admin = false where id = '${f.owner.id}'; set session_replication_role = default;`); console.log("  admin revoked"); } catch (e) { console.log("  REVOKE FAILED:", String(e.message).slice(0, 100)); } }
  if (f) { const l = await f.cleanup().catch(() => ["threw"]); console.log("  accounts left:", l && l.length ? l : "none"); }
  const gp = await fetch(`${SB}/rest/v1/guide_profiles?select=id`, { headers: svcH }).then((x) => x.json()).catch(() => null);
  const gd = await fetch(`${SB}/rest/v1/guide_documents?select=id`, { headers: svcH }).then((x) => x.json()).catch(() => null);
  const adm = await fetch(`${SB}/rest/v1/profiles?is_admin=is.true&select=id`, { headers: svcH }).then((x) => x.json()).catch(() => null);
  console.log(`  left behind — guide_profiles:${Array.isArray(gp) ? gp.length : "?"} guide_documents:${Array.isArray(gd) ? gd.length : "?"} admins:${Array.isArray(adm) ? adm.length : "?"}`);
  console.log(bad ? `\n${bad} FAILED` : "\nall assertions passed");
}
