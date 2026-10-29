// Injection cases for check:area-edit-fields and check:area-page-honest: prove each goes RED on
// the defect it names and GREEN untouched. Each edit is proven landed by checksum, and every
// file is restored byte-identically even if a case throws.
//   node scripts/oneoff/inject-area-edit-fields-cases.mjs
import fs from "fs"; import { spawnSync } from "child_process"; import crypto from "crypto";
const W = new URL("../../", import.meta.url).pathname;
const sha = s => crypto.createHash("sha1").update(s).digest("hex");
const mig = re => W + fs.readdirSync(W + "supabase/migrations").filter(f => re.test(f)).map(f => "supabase/migrations/" + f)[0];
const FILES = { js: W + "lib/areaFields.js", sql: mig(/area_pages_season_edits_and_stats\.sql$/), sql18: mig(/area_edits_are_held_for_review\.sql$/), sql78: mig(/area_parking_pin_is_editable\.sql$/), sections: W + "lib/AreaPageSections.jsx", browser: W + "lib/DbAreaBrowser.jsx" };
const orig = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
const cases = [
  // [name, guard script, file key, find, replace, want exit (1 = must FAIL)]
  ["a field dropped from the SQL constraint must FAIL", "check-area-edit-fields.mjs", "sql78", "'parking_note','parking_pin','rock','aspect','season_months')\n);", "'parking_note','parking_pin','aspect','season_months')\n);", 1],
  ["a field added to the JS table alone must FAIL", "check-area-edit-fields.mjs", "js", '  { k: "season_months", label: "Season"', '  { k: "permits", label: "Permits", type: "text", min: 1, max: 40, hint: "", cur: a => "" },\n  { k: "season_months", label: "Season"', 1],
  ["a summary that prints an object must FAIL", "check-area-edit-fields.mjs", "js", 'cur: a => text(a.rock) }', 'cur: a => a.rock == null ? "" : "" + a.rock }', 1],
  ["a field dropped from the approval applier must FAIL", "check-area-edit-fields.mjs", "sql78", "if p_field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months') then return; end if;", "if p_field not in ('blurb','approach','approach_min','parking_note','rock','aspect','season_months') then return; end if;", 1],
  ["a pin UPDATE that drops a column must FAIL", "check-area-edit-fields.mjs", "sql78", "update areas set parking_lat = plat, parking_lng = plng, parking_name = pname", "update areas set parking_lat = plat, parking_lng = plng", 1],
  ["a pin field with no fmt must FAIL", "check-area-edit-fields.mjs", "js", ", fmt: pinValueLabel }", " }", 1],
  ["the insert-time applier coming back must FAIL", "check-area-edit-fields.mjs", "sql18", "-- No backfill:", "create trigger x after insert on public.contributions for each row execute function trg_apply_agreed_area_field();\n-- No backfill:", 1],
  ["a fact pushed without its column gate must FAIL", "check-area-page-honest.mjs", "sections", '  if (area.rock) facts.push(["Rock"', '  facts.push(["Rock"', 1],
  ["a headline that prints the RPC total must FAIL", "check-area-page-honest.mjs", "sections", 'sum.toLocaleString() + " climb" + (sum !== 1 ? "s" : "")', 'total.toLocaleString() + " climb" + (total !== 1 ? "s" : "")', 1],
  ["a second drive link must FAIL", "check-area-page-honest.mjs", "browser", '<button onClick={onAllAreas}', '<a href={"https://www.google.com/maps/dir/?api=1&destination=" + area.lat}>Directions</a><button onClick={onAllAreas}', 1],
  ["untouched, both must PASS", "check-area-edit-fields.mjs", null, null, null, 0],
  ["untouched, both must PASS (page)", "check-area-page-honest.mjs", null, null, null, 0],
];
let bad = 0;
try {
  for (const [name, guard, key, find, repl, want] of cases) {
    for (const [k, f] of Object.entries(FILES)) fs.writeFileSync(f, orig[k]);
    if (key) {
      const src = orig[key];
      if (!src.includes(find)) throw new Error("HARNESS BUG: anchor missing for " + name);
      const txt = src.replace(find, repl); fs.writeFileSync(FILES[key], txt);
      if (sha(fs.readFileSync(FILES[key], "utf8")) !== sha(txt)) throw new Error("edit did not land: " + name);
    }
    const r = spawnSync("node", ["scripts/" + guard], { cwd: W });
    const got = r.status === 0 ? 0 : 1;
    console.log(got === want ? "CAUGHT " : "MISSED ", name, "(exit " + r.status + ")");
    if (got !== want) { bad++; console.log(String(r.stdout).split("\n").filter(l => /FAIL/.test(l)).join("\n")); }
  }
} finally { for (const [k, f] of Object.entries(FILES)) fs.writeFileSync(f, orig[k]); }
console.log("restored:", Object.entries(FILES).every(([k, f]) => sha(fs.readFileSync(f, "utf8")) === sha(orig[k])));
process.exit(bad ? 1 : 0);
