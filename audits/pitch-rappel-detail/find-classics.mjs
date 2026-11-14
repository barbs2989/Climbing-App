// Look up a hand-picked list of famous multipitch climbs in the catalog (exact-ish name match),
// reporting each candidate's id, area, pitches and how much pitch/rappel detail it already has.
// Usage: node audits/pitch-rappel-detail/find-classics.mjs out.json
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "../../scripts/lib/supabase-env.mjs";
const NAMES = [
  ["Royal Arches", "California"], ["Snake Dike", "California"], ["Nutcracker", "California"], ["After Six", "California"],
  ["East Buttress", "California"], ["Central Pillar of Frenzy", "California"], ["Serenity Crack", "California"], ["Sons of Yesterday", "California"],
  ["Braille Book", "California"], ["Regular Northwest Face", "California"], ["The Nose", "California"], ["Lunatic Fringe", "California"],
  ["Crimson Chrysalis", "Nevada"], ["Epinephrine", "Nevada"], ["Solar Slab", "Nevada"], ["Frogland", "Nevada"], ["Dark Shadows", "Nevada"], ["Black Orpheus", "Nevada"], ["Cat in the Hat", "Nevada"],
  ["High Exposure", "New York"], ["Arrow", "New York"], ["Shockley's Ceiling", "New York"], ["CCK", "New York"], ["Madame Grunnebaum's Wulst", "New York"],
  ["Ancient Art", "Utah"], ["Kor-Ingalls Route", "Utah"], ["North Chimney", "Utah"], ["Moonlight Buttress", "Utah"], ["Prodigal Sun", "Utah"], ["Fine Jade", "Utah"],
  ["Ruper", "Colorado"], ["Yellow Spur", "Colorado"], ["Bastille Crack", "Colorado"], ["Casual Route", "Colorado"], ["The Naked Edge", "Colorado"], ["Culp-Bossier", "Colorado"], ["Petit Grepon", "Colorado"], ["Hallett Direct", "Colorado"],
  ["Exum Ridge", "Wyoming"], ["Irene's Arete", "Wyoming"], ["Durrance Route", "Wyoming"], ["El Cracko Diablo", "Wyoming"],
  ["Outer Space", "Washington"], ["Becky Route", "Washington"], ["Beckey-Chouinard", "Washington"], ["Liberty Crack", "Washington"], ["Davis-Holland", "Washington"], ["Godzilla", "Washington"],
  ["Monkey Face", "Oregon"], ["Wherever I May Roam", "Oregon"], ["Spiderman", "Oregon"], ["Dancing in the Swell", "Oregon"],
  ["Whitney-Gilman Ridge", "New Hampshire"], ["Thin Air", "New Hampshire"], ["Recompense", "New Hampshire"], ["Moby Grape", "New Hampshire"], ["Standard Route", "New Hampshire"],
  ["Prince of Darkness", "Nevada"], ["Levitation 29", "Nevada"], ["Unimpeachable Groping", "Nevada"],
  ["Tunnel Vision", "Utah"], ["The Black Corridor", "Nevada"], ["Pillar of Faith", "Utah"],
];
const out = [];
for (const [name, state] of NAMES) {
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,grade,pitches,pitch_detail,rappel_detail&name=ilike.${encodeURIComponent(name)}&limit=20`;
  const rows = await (await fetch(q, { headers: headers(anonKey()) })).json();
  const prefix = { California: "ca_", Nevada: "nv_", "New York": "ny_", Utah: "ut_", Colorado: "co_", Wyoming: "wy_", Washington: "wa_", Oregon: "or_", "New Hampshire": "nh_" }[state];
  const hits = (Array.isArray(rows) ? rows : []).filter(r => r.id.startsWith(prefix));
  for (const r of hits) out.push({ want: name, id: r.id, name: r.name, area: r.area_id, disc: r.discipline, grade: r.grade, pitches: r.pitches, pd: (r.pitch_detail || []).length, rd: (r.rappel_detail || []).length });
  if (!hits.length) out.push({ want: name, missing: true });
}
for (const r of out) console.log(r.missing ? `-- ${r.want}: not found` : `${r.id} | ${r.name} | ${r.area} | ${r.disc} ${r.grade} p${r.pitches} pd${r.pd} rd${r.rd}`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
