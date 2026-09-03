// Does the guides copy claim more than the app enforces?
//
// The screen pitched "Hire a vetted, certified guide", the apply screen said "ClimbMatch lists
// only vetted, certified guides", and the CTA said "so every guide here is vetted". Two separate
// gates decide what is actually true, and they are NOT the same gate:
//
//   LISTED   useGuides() filters `.eq("status","active")` — a profile does not go live until an
//            application is approved. So the REVIEW claim is true and was left alone.
//   BADGED   isGuideVerified() wants a `primary_track` credential that is `status:"verified"`
//            AND not past `verified_expires_at`. DbGuides computes it PER GUIDE and does not
//            filter on it.
//
// So a listed guide can lack the badge — a credential lapses after approval, and the badge
// correctly drops while the listing remains. The universal quantifiers ("only", "every") were the
// overclaim; the review process was not. This asserts the distinction rather than the wording.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.guideclaims-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

execFileSync("npx", ["esbuild", path.join(ROOT, "lib", "db.js"),
  "--bundle", "--format=esm", "--platform=node",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--external:@supabase/supabase-js",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const { isGuideVerified } = await import(out + "?t=" + Date.now());
if (typeof isGuideVerified !== "function") { console.error("ANCHOR LOST — lib/db.js no longer exports isGuideVerified."); process.exit(1); }

let bad = 0;
const must = (c, m) => { console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const DAY = 86400000;

// ---- 1. the badge really can be absent from a guide who is listed ----
const verified = [{ kind: "primary_track", status: "verified", verified_expires_at: new Date(Date.now() + 365 * DAY).toISOString() }];
const lapsed   = [{ kind: "primary_track", status: "verified", verified_expires_at: new Date(Date.now() - DAY).toISOString() }];
const pending  = [{ kind: "primary_track", status: "submitted", verified_expires_at: null }];
const other    = [{ kind: "insurance", status: "verified", verified_expires_at: null }];

must(isGuideVerified(verified) === true, "a current primary-track certification earns the badge");
must(isGuideVerified(lapsed) === false, "an EXPIRED certification loses it — the copy's \"lapses\" is real");
must(isGuideVerified(pending) === false, "a submitted-but-unverified certification does not earn it");
must(isGuideVerified(other) === false, "insurance alone does not earn it");
must(isGuideVerified([]) === false && isGuideVerified(null) === false, "no credentials, no badge");

// ---- 2. the two gates are genuinely different, which is why "only/every" was false ----
const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const guidesQ = /useGuides\(\)\s*\{[\s\S]{0,700}?\}\)/.exec(db);
must(!!guidesQ && /\.eq\("status",\s*"active"\)/.test(guidesQ[0]),
  "listing is gated on status=active — so \"before your profile goes live we verify\" is TRUE");
const gl = fs.readFileSync(path.join(ROOT, "lib", "DbGuides.jsx"), "utf8");
must(/_verified:\s*isGuideVerified\(/.test(gl), "DbGuides computes the badge per guide");
must(!/filter\([^)]*_verified/.test(gl), "and does NOT filter the list on it — a listed guide may lack the badge");

// ---- 3. so no copy may claim ALL listed guides are vetted ----
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const all = app + core + gl;
must(!/lists only vetted/i.test(all), "no screen says it lists ONLY vetted guides");
must(!/every guide here is vetted/i.test(all), "no screen says EVERY listed guide is vetted");
must(!/Hire a vetted, certified guide/i.test(all), "the Discover pitch no longer asserts it of all guides");
must(/badge/i.test(app), "the Discover pitch points at the badge instead");

clean();
if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\n  The copy now claims what the two gates actually enforce: reviewed before listing,");
console.log("  badged only while the certification is verified and current.");
