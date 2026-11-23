// Example reports for LATEST FROM THIS AREA (0478), authored by the four TEST example accounts of
// scripts/manual-test-accounts.mjs, so the card at Leavenworth, WA has enough to page, sort and filter:
// 16 public rows — five sport, four trad, three bouldering, two ice, one top rope, one alpine; nine
// with a write-up (trip reports), seven with condition tags only (logged climbs); five in the last 30
// days, ten in the last 90, fourteen in the last 12 months (counted from 2026-11-19, the day they were
// written; the date filters drift as the rows age). No hazard tag, so they raise no hazard badge.
//
//   node scripts/oneoff/area-latest-examples.mjs create   # insert (1 s apart); ids -> the state file
//   node scripts/oneoff/area-latest-examples.mjs remove   # delete exactly the recorded rows
//   node scripts/oneoff/area-latest-examples.mjs status   # how many of the recorded rows still exist
//
// The state file is area-latest-examples.local at the repo root (gitignored); from a worktree set
// AREA_LATEST_EXAMPLES_FILE to the main checkout's copy. Needs the service key (.env.local). Deleting
// the example accounts (manual-test-accounts.mjs delete) takes these rows with them.
// scripts/oneoff/probe-area-latest-more.mjs walks the card against exactly these rows.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE = process.env.AREA_LATEST_EXAMPLES_FILE || path.join(ROOT, "area-latest-examples.local");
const ACCOUNTS = process.env.MANUAL_ACCOUNTS_FILE || path.join(ROOT, "manual-test-accounts.local");
const H = headers(requireServiceKey(), { "Content-Type": "application/json", Prefer: "return=representation" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The owner's throttle rule: paced writes, and a slow database stops the run rather than piling on.
async function rest(p, init) {
  const t = Date.now();
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + p, { ...init, headers: H });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (Date.now() - t > 5000) throw new Error("slow database (" + (Date.now() - t) + " ms): stopping. Re-run when it is healthy.");
  return { status: res.status, body };
}

const T = " TEST example report.";
// [who, route, discipline, day climbed, tick, stars, write-up or null, condition tags]
const PLAN = [
  ["avery", "wa_icicle_buttress_good_gravy", "sport", "2026-11-15", "Redpoint", 4, "Cold fingers but the rock was dry by noon. Bolts are in good shape and the anchor has two new rings." + T, ["Dry", "Cold"]],
  ["blake", "wa_14_years", "bouldering", "2026-11-12", "Send", 5, null, ["Dry", "Good friction"]],
  ["casey", "wa_crowbar_crag_feelin_stabby", "trad", "2026-11-08", "Onsight", 4, "Takes small cams the whole way. Walk-off to climber's left is easy to find." + T, ["Dry"]],
  ["drew", "wa_30_rock_funcooker", "sport", "2026-11-02", "Flash", 3, null, ["Crowded"]],
  ["avery", "wa_30_rock_coming_in_quartz", "toprope", "2026-10-28", "Top-rope", 3, "Set it up from the anchors of the route to the left. Thin and fun." + T, ["Dry", "Shaded"]],
  ["blake", "wa_purina_crags_crude_buddha", "sport", "2026-10-11", "Attempt", 4, "Fell at the crux bulge twice. Shade after 2 pm makes it much easier to hold on." + T, ["Shaded"]],
  ["casey", "wa_1999", "bouldering", "2026-10-03", "Send", 3, null, ["Good friction"]],
  ["drew", "wa_upper_castle_angel_dreads", "trad", "2026-09-20", "Redpoint", 5, "One of the best pitches at the Castle. Doubles in finger sizes." + T, ["Dry", "Crowded"]],
  ["avery", "wa_north_face_of_the_mole", "alpine", "2026-09-06", "Summit", 4, "Long day from the car. The approach gully was dry and the route was in the shade until early afternoon." + T, ["Dry", "Shaded"]],
  ["blake", "wa_careno_crag_skyfall_direct", "trad", "2026-08-30", "Follow", 4, null, ["Dry"]],
  ["casey", "wa_2001", "bouldering", "2026-06-14", "Flash", 4, "Good landing, one pad is enough. Morning shade." + T, ["Shaded"]],
  ["drew", "wa_icicle_buttress_good_gravy", "sport", "2026-05-23", "Onsight", 4, null, ["Dry", "Crowded"]],
  ["avery", "wa_hubba_hubba_2_center_flow", "ice", "2026-01-17", "Lead", 4, "Fat and plastic after a cold week. Took screws the whole way." + T, ["Cold"]],
  ["blake", "wa_eightmile_buttress_ice_2_buttress_left", "ice", "2025-12-28", "Follow", 3, null, ["Cold"]],
  ["casey", "wa_crowbar_crag_feelin_stabby", "trad", "2025-09-13", "Redpoint", 4, "Second time on it. Still good." + T, ["Dry"]],
  ["drew", "wa_purina_crags_crude_buddha", "sport", "2025-07-04", "Redpoint", 5, null, ["Dry", "Shaded"]],
];

const cmd = process.argv[2];
if (cmd === "create") {
  if (existsSync(STATE) && JSON.parse(readFileSync(STATE, "utf8")).length) throw new Error(STATE + " already lists rows — run `remove` first, or the examples would be doubled.");
  if (!existsSync(ACCOUNTS)) throw new Error(ACCOUNTS + " not found — the example accounts come from scripts/manual-test-accounts.mjs create.");
  const idOf = {};
  for (const a of JSON.parse(readFileSync(ACCOUNTS, "utf8")).accounts) idOf[a.email.split("@")[0]] = a.id;
  const made = [];
  try {
    for (const [who, route_id, discipline, date_climbed, tick_type, stars, notes, cond_tags] of PLAN) {
      if (!idOf[who]) throw new Error("no example account named " + who);
      const { status, body } = await rest("climb_logs?select=id,route_id,user_id,date_climbed", { method: "POST", body: JSON.stringify({ user_id: idOf[who], route_id, discipline, date_climbed, tick_type, stars, notes, cond_tags, trip_report_visibility: "public" }) });
      if (status >= 300 || !Array.isArray(body) || body.length !== 1) throw new Error("insert failed (" + status + "): " + JSON.stringify(body).slice(0, 300));
      made.push(body[0]);
      console.log("  +", body[0].id, route_id, date_climbed);
      await sleep(1000);
    }
  } finally {
    writeFileSync(STATE, JSON.stringify(made, null, 1));
    console.log("recorded " + made.length + " of " + PLAN.length + " rows in " + STATE);
  }
} else if (cmd === "remove" || cmd === "status") {
  if (!existsSync(STATE)) throw new Error(STATE + " not found — nothing recorded to " + cmd + ".");
  const made = JSON.parse(readFileSync(STATE, "utf8"));
  if (cmd === "status") {
    const { status, body } = await rest("climb_logs?select=id&id=in.(" + made.map((m) => m.id).join(",") + ")");
    if (status >= 300 || !Array.isArray(body)) throw new Error("read failed (" + status + ")");
    console.log(body.length + " of " + made.length + " recorded example rows exist.");
  } else {
    const left = [];
    for (const m of made) {
      const { status, body } = await rest("climb_logs?id=eq." + m.id, { method: "DELETE" });
      if (status < 300 && Array.isArray(body) && body.length === 1) console.log("  -", m.id);
      else { const seen = await rest("climb_logs?select=id&id=eq." + m.id); if (Array.isArray(seen.body) && seen.body.length) { left.push(m); console.log("  NOT removed:", m.id, status); } else console.log("  already gone:", m.id); }
      await sleep(1000);
    }
    writeFileSync(STATE, JSON.stringify(left, null, 1));
    console.log("removed " + (made.length - left.length) + " of " + made.length + "; " + left.length + " still recorded.");
  }
} else {
  console.log("usage: node scripts/oneoff/area-latest-examples.mjs create | remove | status");
}
