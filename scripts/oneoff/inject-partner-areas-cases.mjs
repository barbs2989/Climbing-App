// Injection-test check:partner-areas — prove each rule can FAIL, and prove the edit landed before
// believing what the guard says about it. The guard replays supabase/migrations/ end-state, so the
// cases edit the migration that creates the objects (0300) and lib/db.js, run the guard, and restore.
import fs from "fs";
import { execSync } from "child_process";

const MIG = "supabase/migrations/0300_partner_areas.sql";
const MIG2 = "supabase/migrations/0303_partners_by_objective_alpine_only.sql";
const DB = "lib/db.js";
const APP = "ClimbMatch.jsx";
const files = { [MIG]: fs.readFileSync(MIG, "utf8"), [MIG2]: fs.readFileSync(MIG2, "utf8"), [DB]: fs.readFileSync(DB, "utf8"), [APP]: fs.readFileSync(APP, "utf8") };

const CASES = [
  {
    name: "1. partners_in_area keeps only the INSIDE direction (ancestor reach dropped)",
    file: MIG, expect: "partners_in_area (0300_partner_areas.sql)",
    edit: (s) => s.replace("where pa.user_id <> auth.uid() and (la.path <@ tp or la.path @> tp)", "where pa.user_id <> auth.uid() and (la.path <@ tp)"),
  },
  {
    name: "2. match_objectives_of_users forgets the PEAK clause (trad on a peak stops counting)",
    file: MIG, expect: "match_objectives_of_users (0300_partner_areas.sql)",
    edit: (s) => s.replace("and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')", "and (rt.discipline not in ('trad','sport','toprope','aid','bouldering'))"),
  },
  {
    name: "3. the crag list forks — `aid` added to the table CHECK only",
    file: MIG, expect: "crag list has forked",
    edit: (s) => s.replace("check (disciplines <@ array['trad','sport','toprope','aid','bouldering']::text[])", "check (disciplines <@ array['trad','sport','toprope','bouldering']::text[])"),
  },
  {
    name: "4. a PUBLIC read policy on partner_areas (the opt-out and blocks walked around)",
    file: MIG, expect: "partner_areas",
    edit: (s) => s.replace('create policy "owner reads own partner areas" on public.partner_areas\n  for select using (auth.uid() = user_id);', 'create policy "anyone reads partner areas" on public.partner_areas\n  for select using (true);'),
  },
  {
    name: "5. partner_area_counts stops applying the block list",
    file: MIG, expect: "partner_area_counts:",
    edit: (s) => s.replace("        and p.discoverable = true and not profile_owner_blocked_me(p.id))\n    from unnest(p_area_ids)", "        and p.discoverable = true)\n    from unnest(p_area_ids)"),
  },
  {
    name: "6. the validate trigger stops refusing a peak",
    file: MIG, expect: "partner_areas_validate refuses",
    edit: (s) => s.replace("if t in ('peak', 'world', 'country') then", "if t in ('world', 'country') then"),
  },
  {
    name: "8. the SEARCH (0303) forgets the match rule — crag objectives match again",
    file: MIG2, expect: "partners_by_objective (0303_partners_by_objective_alpine_only.sql)",
    edit: (s) => s.replace("        and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')\n", ""),
  },
  {
    name: "9. App scores the viewer from the raw wishlist again",
    file: APP, expect: "ME.matchObjectiveIds",
    edit: (s) => s.replace("ME.matchObjectiveIds=wishlist.filter(function(id){var r=routeById(id);return !!r&&!CRAG_CATS.includes(catOf(r));});", "ME.matchObjectiveIds=wishlist;"),
  },
  {
    name: "10. the raw per-user objectives read comes back",
    file: DB, expect: "no longer exports useObjectivesOfUsers",
    edit: (s) => s.replace("export function useMatchObjectivesOfUsers(userIds) {", "export function useObjectivesOfUsers(userIds) { return useMatchObjectivesOfUsers(userIds); }\nexport function useMatchObjectivesOfUsers(userIds) {"),
  },
  {
    name: "7. an objective write no longer refreshes the match reader",
    file: DB, expect: "saving or removing an objective refreshes",
    edit: (s) => s.replace(', ["match-objectives-of-users"]];', "];"),
  },
];

let pass = 0;
for (const c of CASES) {
  const orig = files[c.file];
  const next = c.edit(orig);
  if (next === orig) { console.log("SKIP (edit did not land):", c.name); continue; }
  fs.writeFileSync(c.file, next);
  let out = "";
  try { out = execSync("node scripts/check-partner-areas.mjs 2>&1", { encoding: "utf8" }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(c.file, orig);
  const line = out.split("\n").find((l) => /FAIL/.test(l) && l.includes(c.expect)) || "(no failing line names it)";
  const caught = /^\s*FAIL/.test(line);
  console.log((caught ? "CAUGHT  " : "MISSED  ") + c.name + "\n        " + line.trim());
  if (caught) pass++;
}
for (const [f, t] of Object.entries(files)) fs.writeFileSync(f, t);
console.log("\n" + pass + "/" + CASES.length + " injections caught");
process.exit(pass === CASES.length ? 0 : 1);
