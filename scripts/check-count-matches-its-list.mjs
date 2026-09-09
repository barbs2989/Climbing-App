#!/usr/bin/env node
// A COUNT AND THE LIST UNDER IT MUST AGREE.
//
// `check:ui` asserts that two SCREENS counting one list agree (#1203, where the Profile said
// "3 active" and the Logbook "4 climbs to go"). Home does it to ITSELF, twice, and no walk can
// see it because both surfaces are correct in isolation and only their combination is a lie.
//
// 1. HOME SAID "NOTHING NEEDS YOU RIGHT NOW" WHILE LISTING WHAT DID. Its UNFINISHED BUSINESS
//    list builds from EIGHT sources; the empty-state gate tested five of them. So a real climber
//    with a DB-backed crew invite -- an actual invitation from another climber -- or a crew
//    waiting on them to confirm a day, saw "Nothing needs you right now" rendered directly above
//    the item that needed them. The Crew tab badge, meanwhile, counted both correctly, so ONE of
//    the three derivations of "what needs you" was complete and the others were quietly short.
//
// 2. THE BELL BADGED A NUMBER ITS PANEL DOES NOT LIST. The badge counted
//    `friendReqIn.length+crewReqIn.length+groupReqs.length+<unread notifs>`, and `NotifPanel`
//    renders only `requests` and `notifs` -- neither crew invites nor group requests. On the
//    seeded demo that is three phantom items, and with only those pending the bell reads "3"
//    over a panel whose own `empty` test says you have nothing. `_reqClimber` also returns null
//    for a seed id absent from CLIMBERS, so even the friend half could exceed its own list.
//
// THE RULE IS ONE-DIRECTIONAL, and that matters: a gate may legitimately cover MORE than the list
// beneath it (Home also tests unread notifications and the friend feed, which UNFINISHED BUSINESS
// does not build from). What it may never do is cover LESS -- claim emptiness while something it
// renders is waiting.
//
// Static (one source read), so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

let failures = 0, cases = 0;
const ok = (m) => console.log("ok    " + m);
const fail = (m) => { failures++; console.log("FAIL  " + m); };
const dead = (m) => { console.error("\nBROKEN GUARD: " + m + "\n(this run proved nothing — it is not a pass)"); process.exit(1); };

// ── 1. HOME'S EMPTY STATE vs THE LIST IT RENDERS.
//
//    The sources are read off the UNFINISHED BUSINESS builder rather than listed here, so a
//    source added there is covered without editing this file — which is the whole point, since
//    both live defects were a source added to the list and not to the gate.
{
  const i = src.indexOf("var unfinished=[];");
  if (i < 0) dead("the UNFINISHED BUSINESS builder moved — this run would compare nothing");
  const j = src.indexOf("unfinished.length", i);
  if (j < 0 || j - i < 400) dead("the UNFINISHED BUSINESS builder parsed short — its sources would go uncounted");
  const block = src.slice(i, j);

  // Each entry is pushed from a `.forEach` over one source. `(x.data||[]).forEach` is the shape a
  // react-query list takes, and matching only the bare identifier misses exactly the DB-backed
  // source that was the defect.
  const sources = [...block.matchAll(/(?:\((\w+)\.data\|\|\[\]\)|([A-Za-z_$][\w$]*))\.forEach\(/g)]
    .map((m) => m[1] || m[2]);
  const uniq = [...new Set(sources)];
  if (uniq.length < 5) dead(`only ${uniq.length} source(s) parsed out of the list — with none, every comparison below passes vacuously`);

  // The gate: Home's empty-state test, plus the definition of whatever it tests through.
  const g = src.indexOf('{(!reqN&&');
  if (g < 0) dead("Home's empty-state gate moved — its coverage cannot be read");
  const gateEnd = src.indexOf(")?", g);
  if (gateEnd < 0) dead("Home's empty-state gate does not close");
  let gate = src.slice(g, gateEnd);
  // FOLLOW A NAME ONLY WHERE THE GATE ACTUALLY REACHES IT. A first version appended `reqN`'s and
  // `_pendingForMe`'s definitions unconditionally — so with `reqN` reverted to its longhand the
  // gate no longer used `_pendingForMe`, and the guard still credited it with everything
  // `_pendingForMe` counts. It reported full coverage of a gate that had just lost a source, and
  // only the injection said so. Expansion is transitive from what the gate names, bounded by a
  // short-definition cap so a gate helper is followed and a component never is.
  {
    const seen = new Set();
    for (let depth = 0; depth < 4; depth++) {
      const names = new Set([...gate.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]));
      let grew = false;
      for (const n of names) {
        if (seen.has(n)) continue;
        const d = src.indexOf("const " + n + "=");
        if (d < 0) continue;
        const e = src.indexOf(";", d);
        if (e < 0 || e - d > 400) continue;   // an arithmetic helper, never a component
        seen.add(n);
        gate += " " + src.slice(d, e);
        grew = true;
      }
      if (!grew) break;
    }
  }
  if (!/Nothing needs you/.test(src)) dead("the empty state's copy is gone — the gate would be guarding nothing");

  for (const s of uniq) {
    cases++;
    if (gate.includes(s)) ok(`Home's empty state accounts for ${s}`);
    else fail(`Home's UNFINISHED BUSINESS list renders an entry for every ${s}, and the empty-state gate does not test it — so "Nothing needs you right now" can render directly above one`);
  }
}

// ── 2. THE BELL BADGE vs THE PANEL IT OPENS.
//
//    Asserted structurally rather than by comparing two expressions: the badge must count the
//    SAME array the panel is handed. Two expressions that happen to agree today is what this
//    whole guard exists to stop.
{
  const p = src.indexOf("<NotifPanel requests={");
  if (p < 0) dead("NotifPanel's call site moved — the badge cannot be compared against its list");
  const open = src.indexOf("{", src.indexOf("requests=", p));
  let d = 0, prop = null;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) { prop = src.slice(open + 1, k).trim(); break; }
  }
  if (!prop) dead("the requests prop does not close");

  cases++;
  if (/^[A-Za-z_$][\w$]*$/.test(prop)) ok(`the panel's request list is one named array (${prop})`);
  else fail(`NotifPanel's requests prop is an expression rather than a named array (${prop.slice(0, 60)}) — nothing else can count the same list, so the badge must re-derive it and the two can drift`);

  // The badge: the rendered number beside the bell.
  const b = src.indexOf('ActionIcon name="bell"');
  if (b < 0) dead("the alerts bell moved — its badge cannot be read");
  const badge = src.slice(b, b + 900);
  cases++;
  if (/^[A-Za-z_$][\w$]*$/.test(prop) && badge.includes(prop + ".length")) {
    ok("the bell badge counts that same array");
  } else {
    const counted = ["friendReqIn", "crewReqIn", "groupReqs"].filter((x) => badge.includes(x + ".length"));
    fail(`the bell badge does not count the array NotifPanel renders${counted.length ? ` — it counts ${counted.join(", ")}, and the panel lists none of ${counted.filter((x) => x !== "friendReqIn").join(", ") || "them"}` : ""}. A badge over a panel that shows nothing is a dead end.`);
  }
}

if (cases < 6) dead(`only ${cases} assertion(s) ran — a guard that quietly stops asking still exits 0`);
console.log();
if (failures) { console.log(`${failures} failure(s) across ${cases} assertions`); process.exit(1); }
console.log(`ok — every count agrees with the list under it (${cases} assertions)`);
