// Re-read every route this audit patched and confirm each patched column still differs from its pre-patch value.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const base = new URL("../../../audits/oos-contradictions/", import.meta.url).pathname;
let hold = 0, changed = [];
for (const sub of ["", "p2/"]) {
  const d = `${base}${sub}applied`; if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(f => !f.includes("-dry"))) {
    for (const { id, before } of JSON.parse(fs.readFileSync(`${d}/${f}`)).rollback) {
      const [row] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${Object.keys(before).join(",")}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json();
      for (const c of Object.keys(before)) { if (JSON.stringify(row?.[c]) !== JSON.stringify(before[c])) hold++; else changed.push(`${id}.${c}`); }
      await new Promise(r => setTimeout(r, 300));
    }
  }
}
console.log(`patched columns holding: ${hold}; reverted to the old value: ${changed.length}`, changed);
