// Removes the embedded location from every photo ALREADY in the public `topo-photos` bucket --
// the uploads made before lib/photoPrivacy.js ran on every upload. Same scrub the app now applies:
// EXIF GPS blanked, XMP and IPTC dropped, pixels untouched. Overwrites each file IN PLACE (same
// path, so every stored URL keeps working), and re-downloads it to prove the location is gone.
//   node scripts/oneoff/scrub-stored-photo-locations.mjs          # report only
//   node scripts/oneoff/scrub-stored-photo-locations.mjs --apply  # overwrite the ones that carry one
// Needs the service key. A non-JPEG is reported, never rewritten here.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { scrubJpeg } from "../../lib/photoPrivacy.js";
import { readPhotoFacts } from "../../lib/photoEvidence.js";

const APPLY = process.argv.includes("--apply");
const KEY = requireServiceKey();
const BUCKET = "topo-photos";

async function list(prefix) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: headers(KEY, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!r.ok) throw new Error(`list ${prefix}: ${r.status} ${await r.text()}`);
  const out = [];
  for (const o of await r.json()) {
    const p = prefix ? `${prefix}/${o.name}` : o.name;
    if (o.id == null) out.push(...(await list(p))); // a folder
    else out.push({ path: p, type: (o.metadata && o.metadata.mimetype) || "" });
  }
  return out;
}
const get = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`, { headers: headers(KEY) });
  if (!r.ok) throw new Error(`get ${p}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};

const objects = await list("");
console.log(`${objects.length} object(s) in ${BUCKET}`);
let carrying = 0, fixed = 0, failed = 0;
for (const o of objects) {
  const bytes = await get(o.path);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!isJpeg) { console.log(`  skip    ${o.path} (${o.type || "not a JPEG"}) — nothing here rewrites a non-JPEG`); continue; }
  const facts = await readPhotoFacts(new Blob([bytes]));
  const scrubbed = scrubJpeg(bytes);
  if (!scrubbed) { console.log(`  FAIL    ${o.path}: could not walk this JPEG`); failed++; continue; }
  const changes = Buffer.compare(Buffer.from(scrubbed), Buffer.from(bytes)) !== 0;
  if (!changes) { console.log(`  clean   ${o.path}`); continue; }
  carrying++;
  console.log(`  CARRIES ${o.path}: ${facts && facts.lat != null ? "an EXIF location" : "XMP or IPTC metadata"}`);
  if (!APPLY) continue;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${o.path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT", headers: headers(KEY, { "Content-Type": "image/jpeg", "x-upsert": "true" }), body: scrubbed,
  });
  if (!r.ok) { console.log(`    FAIL overwrite: ${r.status} ${await r.text()}`); failed++; continue; }
  const back = await get(o.path);
  const after = await readPhotoFacts(new Blob([back]));
  const ok = Buffer.from(back).equals(Buffer.from(scrubbed)) && !(after && after.lat != null);
  console.log(ok ? "    fixed — re-read: no location" : "    FAIL — the re-read still differs or still carries a location");
  ok ? fixed++ : failed++;
}
console.log(`\n${carrying} carried metadata; ${APPLY ? `${fixed} fixed, ${failed} failed` : "report only (pass --apply to overwrite)"}`);
process.exit(failed ? 1 : 0);
