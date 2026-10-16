#!/usr/bin/env node
// THE SELF-ROW FALLBACK FIRES ON A SECOND PATH, AND THAT PATH IS WHAT THE CI DUMP SHOWS.
//
// `probe-group-self-row-carries-your-id.mjs` proves the defect on the APPEND path — you are the
// creator, `mem` does NOT contain you, so a row is appended and `_asMember` returns null for it
// "by CONSTRUCTION". That reasoning is correct about that path and was read as if it were the
// ONLY path, which is what made check:signed-in's failing dump look self-contradictory: the
// appended row is LAST (`mem.concat([_meGid])`), and the dump's owner row is FIRST.
//
// It is not the only path. `_asMember(id)` returns null for ANY id absent from `_profMap`, and
// `_profMap` is the result of a react-query read — so while that read is unresolved it is EMPTY
// and EVERY id misses, including your own, even when `mem` contains you. The fallback then fires
// on a row that came out of `mem` itself, in `mem` order.
//
// THAT REPRODUCES THE FAILING DUMP EXACTLY (run 34432418081, attempt 1 vs 2, same commit):
//
//     MEMBERS · 2                  <- mem holds BOTH, so nothing is appended
//     @climbmatch-ci-owner         <- your row, FIRST, from the fallback (ME carries your handle)
//     Member / + Mod / X           <- pre-fix ME.id was 0, so all four id tests read false
//     @aclimber                    <- the mate, placeholder: the same read had not resolved
//     Member / + Mod / X
//
// and the passing attempt shows a "Moderators" strip that the failing one does not — `mods` is
// `modIds.map(_asMember).filter(Boolean)` with NO fallback, so an unresolved read empties it.
// One cause, four symptoms, correct row order.
//
// The expressions are LIFTED FROM SOURCE and executed, never re-typed: a copy would agree with
// itself whatever the app does, which is the whole question. ANCHOR LOST if either moves.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

const start = src.indexOf("var _rosterIds=");
if (start < 0) { console.error("ANCHOR LOST: `var _rosterIds=` is not in ClimbMatch.jsx — the group roster moved"); process.exit(1); }
const modsAt = src.indexOf("var mods=", start);
if (modsAt < 0) { console.error("ANCHOR LOST: could not bound the _roster expression"); process.exit(1); }
let block = src.slice(start, modsAt).replace(/\/\*[\s\S]*?\*\//g, " ");
if (!/_rosterIds/.test(block) || !/_asMember/.test(block)) { console.error("ANCHOR LOST: the lifted block is not the roster shape"); process.exit(1); }

// `mods` is lifted too, because its ABSENCE is one of the four symptoms and asserting it from a
// re-typed copy would prove nothing about the app.
const modsEnd = src.indexOf(";", modsAt);
const modsBlock = src.slice(modsAt, modsEnd).replace(/\/\*[\s\S]*?\*\//g, " ");
if (!/modIds\.map\(_asMember\)/.test(modsBlock)) { console.error("ANCHOR LOST: `mods` is no longer modIds.map(_asMember)"); process.exit(1); }

const OWNER = "11111111-1111-4111-8111-111111111111";
const MATE = "22222222-2222-4222-8222-222222222222";
// The app's own ME: CLAUDE.md — "ME.id is NEVER reassigned — it is 0 signed in or out" — and after
// sign-in it carries the real account's profile name, which is why the dump's row shows the
// owner's own handle on a row whose id is wrong.
const ME = { id: 0, name: "Quinn Fixture", username: "climbmatch-ci-owner" };

function build({ mem, resolvable }) {
  const _asMember = (id) => (resolvable.indexOf(id) >= 0
    ? { id, name: "@" + id.slice(0, 4), avatar: "", username: id.slice(0, 4), showName: false, _profile: true }
    : null);
  const roster = new Function("mem", "isMod", "_meGid", "_asMember", "ME", block + " return _roster;")
    (mem, true, OWNER, _asMember, ME);
  const mods = new Function("modIds", "_asMember", modsBlock + "; return mods;")([OWNER], _asMember);
  return { roster, mods };
}

// THE PATH THE DUMP SHOWS: `mem` HOLDS BOTH, and the profiles read has not resolved.
const unresolved = build({ mem: [OWNER, MATE], resolvable: [] });
const r = unresolved.roster;

if (r.length === 2) ok("2 rows — nothing was appended, because `mem` already contains you");
else fail(`expected 2 rows, got ${r.length} — this fixture no longer exercises the non-append path`);

// THE CLAIM THAT DISSOLVES THE CONTRADICTION: your row is FIRST here, in `mem` order, where the
// append path would put it LAST. Position is asserted deliberately — it is the whole point.
if (r[0] && r[0].id === OWNER) ok("your own row is FIRST, in `mem` order — the append path cannot produce this");
else fail(`row 0 is ${JSON.stringify(r[0] && r[0].id)} — the dump's owner-then-placeholder order is not reproduced`);

if (r[1] && r[1].id === MATE && r[1].name === "A climber") ok('the mate is the "A climber" placeholder, second — matching the dump');
else fail(`row 1 is ${JSON.stringify(r[1] && r[1].name)} — expected the placeholder`);

// Your row is the ME fallback, which is why the dump shows YOUR REAL HANDLE on a row whose id
// tests all read false. Asserted on the name, since the id is the thing under repair.
if (r[0] && r[0].name === ME.name) ok("your row came from the ME fallback — it carries your real name, so the dump's handle is explained");
else fail(`your row's name is ${JSON.stringify(r[0] && r[0].name)} — expected ME's, or the dump's handle has another source`);

// THE FOURTH SYMPTOM: `mods` has no fallback, so the same unresolved read empties it and the
// "Moderators" strip disappears — present in the passing attempt, absent in the failing one.
if (unresolved.mods.length === 0) ok('`mods` is empty on this path — the missing "Moderators" strip is the SAME cause');
else fail(`mods has ${unresolved.mods.length} entries — the strip's absence is not explained by this path`);

// THE FIX MUST COVER THIS PATH TOO. All four readers, executed rather than described.
const ownerId = OWNER, modIds = [OWNER], meGid = OWNER;
const subtitle = (c) => (ownerId === c.id ? "Owner" : (modIds.indexOf(c.id) >= 0 ? "Moderator" : "Member"));
const offersMod = (c) => c.id !== meGid;

if (r[0] && subtitle(r[0]) === "Owner") ok('your row is labelled "Owner" on this path');
else fail(`your row is labelled "${r[0] && subtitle(r[0])}" — the #1701 fix does not cover the non-append path`);

if (r[0] && !offersMod(r[0])) ok("no + Mod / remove on your own row on this path");
else fail("the roster offers + Mod on YOUR OWN row — the id carried by the fallback is still wrong here");

// NON-VACUITY. With the read resolved, the same fixture must behave normally, or every
// assertion above is satisfied by a roster that renders nothing useful.
const resolved = build({ mem: [OWNER, MATE], resolvable: [OWNER, MATE] });
if (resolved.roster.length === 2 && resolved.roster[0].id === OWNER && resolved.roster[1].id === MATE) ok("with the read resolved the same roster is unchanged in shape");
else fail("the resolved control changed shape — this fixture is not measuring what it claims");
if (resolved.mods.length === 1) ok('with the read resolved the "Moderators" strip returns');
else fail(`the resolved control has ${resolved.mods.length} moderators — expected 1`);

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the self-row fallback also fires when `mem` CONTAINS you and the profiles read has not resolved,");
console.log("     which reproduces the failing dump's row order, its handle, and its missing Moderators strip.");
