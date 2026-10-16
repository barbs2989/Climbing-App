#!/usr/bin/env node
/* Does the "show my name while browsing" switch actually keep its promise?
 *
 * check:visibility-switches proves the WIRING — that the value is stored through the guarded
 * helper, comes back, is saved, reaches `useRoutePresence` and that presence.js branches on it.
 * It cannot prove the two things a climber would care about, because both need the code RUN:
 *   1. the default really is INVISIBLE, so shipping this control made nobody more visible;
 *   2. "invisible" really means the name never enters the broadcast — not that it is filtered by
 *      whoever receives it.
 *
 * No browser and no database: the preference is a localStorage round trip and the broadcast is a
 * ternary, so both are answerable by executing the real code against a shim.
 *
 * The broadcast expression is LIFTED FROM SOURCE with ANCHOR LOST rather than retyped. A retyped
 * copy would agree with itself whatever presence.js did, which is the entire question.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let ok = 0, bad = 0;
const t = (label, cond) => { if (cond) { ok++; console.log("  ok    " + label); } else { bad++; console.log("  FAIL  " + label); } };
const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

/* ── a localStorage shim, installed before the module under test is imported ───────────────── */
let store = {}, mode = "ok";
globalThis.localStorage = {
  getItem: (k) => { if (mode === "throw") throw new Error("SecurityError: storage is blocked"); return k in store ? store[k] : null; },
  setItem: (k, v) => { if (mode === "throw") throw new Error("QuotaExceededError"); store[k] = String(v); },
};

const mod = await import(path.join(ROOT, "lib", "browse-visibility-pref.js"));
const { visibleWhileBrowsingPref, saveVisibleWhileBrowsing } = mod;
if (typeof visibleWhileBrowsingPref !== "function" || typeof saveVisibleWhileBrowsing !== "function")
  dead("lib/browse-visibility-pref.js does not export the loader and saver — ANCHOR LOST");

console.log("--- 1. the preference itself ---");
store = {};
t("an account that has never seen this control reads INVISIBLE, so shipping it exposed nobody", visibleWhileBrowsingPref() === false);

saveVisibleWhileBrowsing(true);
t("opting in survives a reload", visibleWhileBrowsingPref() === true);
saveVisibleWhileBrowsing(false);
t("opting back out survives a reload too — the direction a privacy switch must never lose", visibleWhileBrowsingPref() === false);

/* A stored value is user-writable from devtools and survives deploys, so it is validated on READ.
   Anything unrecognised must read as the SAFE value rather than as truthy junk. */
store["climbmatch-visible-browsing"] = "yes please";
t("junk left in the key by an older build reads as INVISIBLE, not as truthy", visibleWhileBrowsingPref() === false);
store["climbmatch-visible-browsing"] = "true";
t("even a plausible-looking `true` is refused — the valid set is the contract", visibleWhileBrowsingPref() === false);

/* localStorage THROWS in Safari private mode and when a profile is out of quota, and is undefined
   entirely under renderToStaticMarkup — which is how a dozen guards render this app. A privacy
   preference must never be able to take a screen down with it. */
mode = "throw";
let threw = false;
try { visibleWhileBrowsingPref(); saveVisibleWhileBrowsing(true); } catch { threw = true; }
t("a storage backend that throws does not take the screen down", threw === false);
t("...and the value it reports in that state is INVISIBLE", (() => { try { return visibleWhileBrowsingPref() === false; } catch { return false; } })());
mode = "ok";

console.log("\n--- 2. the broadcast omits the identity, rather than the receiver hiding it ---");
const src = fs.readFileSync(path.join(ROOT, "lib", "presence.js"), "utf8");
const m = /channel\.track\(\s*(m\.visible\s*\?[\s\S]*?)\s*\);/.exec(src);
if (!m) dead("could not lift the channel.track(...) expression from lib/presence.js — ANCHOR LOST");
const payload = new Function("m", "return (" + m[1] + ");");

const ME = { id: "u-1", name: "Robin Belay", avatar: "https://example.test/a.png" };
const off = payload({ ...ME, visible: false });
const on = payload({ ...ME, visible: true });

/* NON-VACUITY FIRST: "the name is absent" is equally true of an expression that sends nothing at
   all, so the ON case has to carry the identity before the OFF case means anything. */
t("with the switch ON the broadcast carries the name", on.name === ME.name);
t("...and the avatar", on.avatar === ME.avatar);

const offJson = JSON.stringify(off);
t("with the switch OFF the name is NOT IN THE PAYLOAD — omission at source, so no receiver has anything to filter", !("name" in off) && !offJson.includes(ME.name));
t("...nor the avatar", !("avatar" in off) && !offJson.includes(ME.avatar));
t("...and you are still COUNTED, which is exactly what the control's own copy promises", off.id === ME.id && off.visible === false);

console.log("\n--- 3. the two halves meet: the DEFAULT is the omitting branch ---");
store = {};
t("a climber who has never touched this control broadcasts no name", !("name" in payload({ ...ME, visible: visibleWhileBrowsingPref() })));

console.log("\n" + ok + " passed, " + bad + " failed");
if (bad) process.exitCode = 1;
