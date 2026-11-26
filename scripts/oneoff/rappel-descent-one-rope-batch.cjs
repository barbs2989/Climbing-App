// Builds audits/rappels-single-rope/batch-23-descent.json: the DESCENT paragraph beside RAPPELS,
// on routes carrying rappel data, rewritten sentence by sentence so it too speaks of one rope.
// Only the sentences that described a two-rope setup change; every other word is kept.
// Usage: node scripts/oneoff/rappel-descent-one-rope-batch.cjs <descent14.json>
const fs = require("fs");
const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const EDITS = {
  wa_chianti_spire_east_face: [["The usual descent is four double-rope rappels using two ropes (a single 60m may work for some stations but isn't the norm), starting from the summit block, then anchors near the top of pitch 5, then continuing stations down the route generally trending climber's-right.",
    "The usual line starts at the summit block, then uses anchors near the top of pitch 5, then continues down the route trending climber's right; its stations are spaced for longer rappels than one 60 m rope reaches, and no single-rope sequence is documented."]],
  wa_east_face: [["Make one double-rope rappel to the notch between Middle and South Gunsight, then a second, loose and dirty one into the moat at the base of the notch.",
    "Rappel to the notch between Middle and South Gunsight, then make a second, loose and dirty rappel into the moat below it. Neither rappel's length is documented, so whether one rope reaches is not known."]],
  wa_east_face_2: [["Thread both 60m ropes through the horn slings.", "Thread the rope through the horn slings."],
    ["First double-rope rappel descends to the large slung horn at the top of pitch 2.", "The first rappel descends to the large slung horn at the top of pitch 2; whether one 60 m rope reaches it is not documented."],
    ["Reanchor ropes there for the second rappel", "Rig again there for the second rappel"]],
  wa_garfield_mountain_leaning_spire_west_route: [["then the slab (two double-rope rappels if you rope it) and the dirt gully.",
    "then the slab (its rappel stations are spaced farther apart than one rope reaches) and the dirt gully."]],
  wa_jack_mountain_south_face: [["bring at least a 45m single rope (a 60m rope, or a double-rope rappel with two shorter ropes, gives real margin).",
    "bring at least a 45 m rope; a single 60 m rope gives real margin."]],
  wa_lexington_tower_east_face: [["one documented descent of the face took 7 double-rope (60m) rappels, built from a mix of slung horns/rap rings and a couple of fixed/bolted anchors encountered on route.",
    "one descent of the face took 7 long rappels from slung horns, rap rings and a couple of fixed or bolted anchors, spaced farther apart than one 60 m rope reaches, so no single-rope count is known."]],
  wa_liberty_bell_beckey_route: [["from the bolted anchor there, one double-rope rappel (or two single-rope rappels if only carrying one rope) reaches the Liberty Bell-Concord notch.",
    "from the bolted anchor there, two single-rope rappels reach the Liberty Bell-Concord notch."]],
  wa_liberty_bell_overexposure: [["from the bolted anchor there, one double-rope rappel (or two single-rope rappels if only carrying one rope) reaches the Liberty Bell-Concord notch.",
    "from the bolted anchor there, two single-rope rappels reach the Liberty Bell-Concord notch."]],
  wa_mount_olympus_blue_glacier: [[", and some parties join two ropes to make one long rappel to the base of the block instead of two shorter ones.", ", taken as two shorter rappels to the base of the block."]],
  wa_mount_thomson_west_ridge: [["A common approach is a single double-rope rappel (60m rope, doubled) off the initial tree anchor",
    "A common approach is one rappel on a single 60 m rope off the initial tree anchor"]],
  wa_olympus_summit_block_north_face: [["Bring a full 60 m rope, or plan to link two 30 m ropes, or use the lower intermediate station some parties have rigged to split it into two shorter rappels if carrying a shorter (30–40 m) rope.",
    "Bring a full 60 m rope, or, with a shorter (30–40 m) rope, use the lower intermediate station some parties have rigged to split it into two shorter rappels."],
    ["This single double-rope rappel lands you back on the snow", "This single rappel lands you back on the snow"]],
  wa_the_scoop_2: [["is to rappel the route itself: with two 60m ropes tied together, descend via a sequence of natural anchors — slung trees and horns down the crack systems below Launch Ledge — there are no bolts",
    "is to rappel the route itself on natural anchors — slung trees and horns down the crack systems below Launch Ledge. No single-rope sequence is documented, and there are no bolts"]],
  wa_the_tempest: [["the route can also be rappelled with two 60m ropes, avoiding the loose walk-off.", "that avoids the loose walk-off."],
    ["Over the route's ~9 pitches (roughly 1,000+ ft) that works out to somewhere around 7-9 tree-anchor rappels with double 60m ropes.",
      "Over the route's ~9 pitches (roughly 1,000+ ft) no single-rope count is documented, so check that one rope reaches each tree before committing."]],
  wa_the_tiger: [["Descend via double-rope rappels down the line of The Tiger using 70m ropes;",
    "Rappelling the line of The Tiger takes longer rappels than one rope reaches;"]],
};
const out = {};
for (const r of rows) {
  const e = EDITS[r.id];
  if (!e) throw new Error("no edit for " + r.id);
  let t = r.descent_text;
  for (const [a, b] of e) {
    if (t.split(a).length !== 2) throw new Error(`${r.id}: "${a.slice(0, 50)}" found ${t.split(a).length - 1} times`);
    t = t.replace(a, b);
  }
  out[r.id] = { area: r.area_id, set: { descent_text: t }, review: { confidence: "medium", sources: [], changed: "Two-rope sentences in the DESCENT paragraph rewritten for one rope; every other word kept." } };
}
fs.writeFileSync("audits/rappels-single-rope/batch-23-descent.json", JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "entries");
