// A second run of c3 re-applied a replace_text whose replacement contains its own find string, so the Waptus
// sentence was inserted twice into Little Big Chief NE Face's approach. Restore the value backed up just before it.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/route-tab-consistency/scripts/lib/supabase-env.mjs";
const key = requireServiceKey();
const T = "/Users/nathanbarber/.claude/jobs/24876501/tmp";
const id = "wa_little_big_chief_mountain_northeast_face";
const good = JSON.parse(fs.readFileSync(`${T}/structural-confirm_out_c3_json-1790429628486.json`)).backups.find(b => b.id === id).approach;
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=approach&id=eq.${id}`, { headers: headers(key) })).json())[0].approach;
const live = await get();
const n = s => s.split("A second long approach comes from the southeast").length - 1;
console.log("live copies:", n(live), "backup copies:", n(good));
if (n(live) !== 2 || n(good) !== 1 || live.length <= good.length) { console.log("state not as expected; no write"); process.exit(1); }
await patchRow("routes", id, { approach: good });
const after = await get();
console.log(after === good ? "restored, copies now " + n(after) : "VERIFY FAILED");
