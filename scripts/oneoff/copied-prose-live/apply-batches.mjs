// Applies audits/copied-prose-live/apply/bNN.json batches in order through rewrite-copied-prose.mjs, but only
// while the database answers: before each batch, a one-row read must come back in under 10 s, or it waits
// (2 min, then 5, 10, 10 …) and never retries fast. A batch already applied is skipped (applied.txt).
//   node scripts/oneoff/copied-prose-live/apply-batches.mjs b01 b02 …
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";

const D = "audits/copied-prose-live", DONE = `${D}/applied.txt`;
fs.mkdirSync(`${D}/rollback`, { recursive: true });
const done = new Set(fs.existsSync(DONE) ? fs.readFileSync(DONE, "utf8").split(/\s+/).filter(Boolean) : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function healthy() {
  const t = Date.now();
  try { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&id=eq.wa_liberty_crack_free`, { headers: headers(anonKey()), signal: AbortSignal.timeout(10000) }); return r.ok && Date.now() - t < 10000; }
  catch { return false; }
}
const WAITS = [120, 300, 600];
for (const b of process.argv.slice(2)) {
  if (done.has(b)) { console.log(`${b}: already applied`); continue; }
  // a stop mid-batch (the database stopped answering) is resumed, not retried fast: wait 10 min, re-probe,
  // and re-run the batch — rows already written read back as ALREADY. Give up after 6 stops in a row.
  for (let attempt = 1; ; attempt++) {
    for (let i = 0; !(await healthy()); i++) { const s = WAITS[Math.min(i, WAITS.length - 1)]; console.log(`${b}: database slow — waiting ${s} s`); await sleep(s * 1000); }
    const r = spawnSync("node", ["scripts/oneoff/rewrite-copied-prose.mjs", `${D}/apply/${b}.json`, "--apply"], { encoding: "utf8", env: { ...process.env, ROLLBACK_DIR: `${D}/rollback` } });
    const out = (r.stdout || "") + (r.stderr || "");
    fs.writeFileSync(`${D}/rollback/${b}-${attempt}.log`, out);
    const summary = out.split("\n").filter(l => /^(REFUSED|WRITTEN|rollback:)|^Error/.test(l));
    console.log(`${b} attempt ${attempt}: exit ${r.status}\n  ${summary.join("\n  ")}`);
    if (r.status === 0 || /WRITTEN and re-read/.test(out)) break;
    if (attempt >= 6) { console.log(`${b}: STOPPED after ${attempt} attempts — read ${D}/rollback/${b}-${attempt}.log`); process.exit(1); }
    console.log(`${b}: stopped mid-batch — waiting 600 s before resuming`); await sleep(600000);
  }
  fs.appendFileSync(DONE, b + "\n");
}
