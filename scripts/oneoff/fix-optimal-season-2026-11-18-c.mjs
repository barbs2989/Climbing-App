// audit:optimal-season, third pass (owner "keep going", 2026-11-18). Pass two moved Mount Lawson's
// header and Optimal window to late June through September (fix-optimal-season-2026-11-18-b.mjs);
// its `best_season`, which prints as "When to go" on the Conditions tab, still said
// "June through August", so the page named two seasons. Same facts, one spelling.
// Dry by default; --apply writes, pinned to the value read. Rollback: audits/optimal-season/2026-11-18-c.rollback.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");
const ID = "wa_mount_lawson_standard", FROM = "June through August", TO = "Late June through September";

requireServiceKey();
const [r] = await selectAll("routes", "id,best_season", `id=eq.${ID}`, { pageSize: 10 });
if (!r || r.best_season !== FROM) { console.error(`REFUSE ${ID}: best_season is ${JSON.stringify(r && r.best_season)}`); process.exit(1); }
console.log(`${APPLY ? "WRITE" : "would"} ${ID}: best_season "${FROM}" -> "${TO}"`);
if (!APPLY) process.exit(0);
const dir = path.join(ROOT, "audits", "optimal-season");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "2026-11-18-c.rollback.json"), JSON.stringify([{ id: ID, best_season: FROM }], null, 1) + "\n");
await patchRow("routes", ID, { best_season: TO }, { filter: `best_season=eq.${encodeURIComponent(FROM)}` });
const [a] = await selectAll("routes", "id,best_season", `id=eq.${ID}`, { pageSize: 10 });
console.log(a.best_season === TO ? `landed ${ID}` : `NOT LANDED ${ID}`);
process.exit(a.best_season === TO ? 0 : 1);
