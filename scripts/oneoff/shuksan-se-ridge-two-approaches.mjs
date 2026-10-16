// Mount Shuksan's Southeast Ridge is a summit-pyramid FINISH reached by two routes, and the row
// recorded only one of them. Its approach_variants held a single Sulphide entry, so its trailhead,
// pins, camps and stats were the Sulphide's while its road and hazard prose described Lake Ann and
// the Curtis Glacier — the page contradicted itself.
//
// This links each way in to the sibling route that IS it (lib/approaches.js): the page then shows
// that route's own trailhead, track, camps and numbers for whichever the climber picks. Nothing is
// computed here; the only new text is the Fisher Chimneys card, written for this page.
//
//   node scripts/oneoff/shuksan-se-ridge-two-approaches.mjs           # dry run
//   node scripts/oneoff/shuksan-se-ridge-two-approaches.mjs --write   # write + re-read
//   node scripts/oneoff/shuksan-se-ridge-two-approaches.mjs --rollback
//
// SPENT once written: a second --write refuses, because the row no longer has ONE variant.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ID = "wa_southeast_ridge_se_corner";
const AREA = "wa_mount_shuksan";
const SULPHIDE = "wa_mount_shuksan_sulphide_glacier";
const FISHER = "wa_mount_shuksan_fisher_chimneys";

const FISHER_VARIANT = {
  name: "Lake Ann and the Fisher Chimneys to the summit pyramid",
  viaRouteId: FISHER,
  season: "Jul-Sep",
  notes:
    "From the Lake Ann Trailhead on SR 542, follow the whole Fisher Chimneys route to the foot of the summit pyramid: Lake Ann Trail #600 to the saddle, the climbers' path east to the chimneys, about 1,000 ft of class 3–4 scrambling through them, Winnie's Slide onto the Upper Curtis Glacier, then Hell's Highway onto the upper Sulphide Glacier.\n\n" +
    "Longer, steeper and more technical than the Shannon Ridge approach, and most parties take two or three days, camping at Lake Ann or above the chimneys. Where the Fisher Chimneys route finishes up the central gully, this one trends right off the glacier and takes the southeast ridge instead.",
  baseFinding:
    "You arrive on the upper Sulphide from Hell's Highway, so the summit pyramid is ahead of you and the southeast ridge is its right-hand skyline. Do not head for the central gully, the line with the fixed rappel anchors, which is the standard finish. Work right across the top of the glacier to the notch where the ridge meets the snow. This is the same arrival the Shannon Ridge approach makes.",
  hazards: [
    "rockfall inside the Fisher Chimneys, especially with parties above",
    "steep snow or ice on Winnie's Slide, firm before the sun reaches it",
    "crevasses on the Upper Curtis Glacier",
    "Hell's Highway crosses exposed slopes below the Upper Curtis icefall",
  ],
};

const key = requireServiceKey();
const [row] = await selectAll("routes", "id,area_id,approach_variants", `id=eq.${ID}`, { key });
if (!row) throw new Error(`${ID} not found`);
if (row.area_id !== AREA) throw new Error(`${ID} is filed on ${row.area_id}, not ${AREA} — refusing`);
const sibs = await selectAll("routes", "id,area_id,name", `id=in.(${SULPHIDE},${FISHER})`, { key });
for (const s of [SULPHIDE, FISHER]) {
  const r = sibs.find((x) => x.id === s);
  if (!r || r.area_id !== AREA) throw new Error(`sibling ${s} missing or not on ${AREA} — refusing`);
}

const BEFORE_FILE = new URL("./shuksan-se-ridge-two-approaches.before.json", import.meta.url);
const fs = await import("node:fs");

if (process.argv.includes("--rollback")) {
  const before = JSON.parse(fs.readFileSync(BEFORE_FILE, "utf8"));
  await patchRow("routes", ID, { approach_variants: before });
  console.log("rolled back", ID);
  process.exit(0);
}

const cur = Array.isArray(row.approach_variants) ? row.approach_variants : [];
if (cur.some((v) => v && v.viaRouteId)) { console.log("SPENT: already linked —", cur.map((v) => v.viaRouteId).join(", ")); process.exit(0); }
if (cur.length !== 1) throw new Error(`expected exactly 1 stored variant, found ${cur.length} — read it before changing it`);

const next = [{ ...cur[0], viaRouteId: SULPHIDE, primary: true }, FISHER_VARIANT];
console.log(JSON.stringify(next.map((v) => ({ name: v.name, viaRouteId: v.viaRouteId, primary: !!v.primary })), null, 1));
if (!process.argv.includes("--write")) { console.log("dry run — pass --write"); process.exit(0); }

if (!fs.existsSync(BEFORE_FILE)) fs.writeFileSync(BEFORE_FILE, JSON.stringify(cur, null, 1));
await patchRow("routes", ID, { approach_variants: next });
const [after] = await selectAll("routes", "id,approach_variants", `id=eq.${ID}`, { key });
const ok = Array.isArray(after.approach_variants) && after.approach_variants.length === 2 &&
  after.approach_variants[0].viaRouteId === SULPHIDE && after.approach_variants[1].viaRouteId === FISHER &&
  after.approach_variants[0].baseFinding === cur[0].baseFinding;
console.log(ok ? "WRITTEN and re-read: 2 linked approaches, original Sulphide text intact" : "RE-READ MISMATCH");
process.exit(ok ? 0 : 1);
