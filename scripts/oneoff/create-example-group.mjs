// Create ONE example group so the Groups tab can be seen working.
//
// The Groups tab is empty for every real account today: `GROUPS` in ClimbMatchCore.jsx is
// `DEMO_FILLERS ? [...] : []` and DEMO_FILLERS is an unconditional false (that gate is a
// recorded decision — demo groups are cosmetic-only and must stay off), and the live table
// holds two rows, both CI fixtures, both `visibility:'private'`. So there was nothing to look
// at and no way to see how the screen behaves.
//
// This writes a row shaped EXACTLY as `createGroupRow` writes one, so what you get is
// indistinguishable from a group made through the form — same columns, same defaults, and the
// `accent` derived with the app's own expression rather than a colour picked here. The
// `groups_add_owner` trigger seats the creator as owner, so the owner controls (rename,
// visibility, + Mod, disband) all appear.
//
// Idempotent: it refuses if a group of this name already exists rather than making a second.
// `--delete` removes it again, which is the whole reversal — `groups delete by creator` is the
// live policy and the owner is the account named below.
//
//   node scripts/oneoff/create-example-group.mjs [--delete]

import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const OWNER = "36612763-33a4-442b-8f5b-c8a550cda48a"; // Nate Barber / @Nater1
const NAME = "Wasatch Alpine Start";

// The app derives a group's accent from its own name; reproducing the expression rather than
// choosing a colour keeps this row identical to one the form would produce.
const PALETTE = ["#3fb950", "#3b89f7", "#f0883e", "#a371f7", "#2cc9b8", "#e3b341"]; // C.green/blue/orange/purple/teal/amber, read from ClimbMatchCore.jsx
const accent = PALETTE[(NAME.length + (NAME.charCodeAt(0) || 0)) % 6];

const FIELDS = {
  name: NAME,
  blurb: "An example group, here so the Groups tab can be seen working — early starts in Little and Big Cottonwood, and Wasatch alpine objectives through the summer. Safe to delete.",
  location: "Salt Lake City, UT",
  disciplines: ["Alpine", "Trad", "Scrambling", "Mountaineering"],
  accent,
  policy: "open",
  event_policy: "anyone",
  visibility: "public",
  created_by: OWNER,
};

const url = SUPABASE_URL, key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

async function existing() {
  const r = await fetch(url + "/rest/v1/groups?select=id,name,visibility,created_by,created_at&name=eq." + encodeURIComponent(NAME), { headers: H });
  if (!r.ok) throw new Error("read failed " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

const del = process.argv.includes("--delete");
const found = await existing();

if (del) {
  if (!found.length) { console.log("nothing to delete — no group named " + JSON.stringify(NAME)); process.exit(0); }
  for (const g of found) {
    const r = await fetch(url + "/rest/v1/groups?id=eq." + g.id, { method: "DELETE", headers: { ...H, Prefer: "return=representation" } });
    const body = await r.json();
    if (!r.ok || !body.length) throw new Error("delete matched nothing — " + r.status + " " + JSON.stringify(body).slice(0, 200));
    console.log("deleted " + g.id + "  " + g.name);
  }
  process.exit(0);
}

if (found.length) {
  console.log("already exists — refusing to make a second:");
  found.forEach(g => console.log("   " + g.id + "  " + g.name + "  " + g.visibility));
  process.exit(0);
}

const r = await fetch(url + "/rest/v1/groups", {
  method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(FIELDS),
});
const body = await r.json();
if (!r.ok || !body.length) throw new Error("insert matched nothing — " + r.status + " " + JSON.stringify(body).slice(0, 300));
const row = body[0];
console.log("created group " + row.id);
console.log("   name       " + row.name);
console.log("   visibility " + row.visibility + "   policy " + row.policy + "   events " + row.event_policy);
console.log("   owner      " + row.created_by);

// The owner row is the trigger's job, not the client's — prove it fired rather than assume it.
const mem = await (await fetch(url + "/rest/v1/group_members?select=user_id,role&group_id=eq." + row.id, { headers: H })).json();
console.log("   roster     " + JSON.stringify(mem));
if (!mem.some(x => x.user_id === OWNER && x.role === "owner")) {
  throw new Error("groups_add_owner did not seat the creator — the group would render with no owner controls");
}
console.log("\nok — the owner is seated, so rename / visibility / + Mod / disband all appear.");
console.log("Remove it again with:  node scripts/oneoff/create-example-group.mjs --delete");
