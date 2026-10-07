// Mapped bedrock for every area that holds a route — the fallback behind `areas.rock`.
//
//   node scripts/derive-area-rock.mjs <areas.csv id,lat,lng> <cache.jsonl>
//
// Resumable: each answered ~110 m cell is appended to the cache, and a rerun skips cells already
// there. Areas share a cell when their coordinates round to the same 3 decimal places, so the
// ~50k areas with routes cost ~31k lookups. Writes nothing to the database; apply-area-rock.mjs
// does that from the cache. See scripts/lib/mapped-rock.mjs for what this can and cannot know
// (measured: 81% family agreement with the 215 areas whose rock a route states).
import fs from "node:fs";
import { mappedRock } from "./lib/mapped-rock.mjs";

const [, , csvPath, cachePath] = process.argv;
if (!csvPath || !cachePath) { console.error("usage: derive-area-rock.mjs <areas.csv> <cache.jsonl>"); process.exit(2); }

const cell = (lat, lng) => `${(+lat).toFixed(3)},${(+lng).toFixed(3)}`;
const done = new Set();
if (fs.existsSync(cachePath)) for (const l of fs.readFileSync(cachePath, "utf8").split("\n")) if (l) done.add(JSON.parse(l).cell);

const cells = new Map();
for (const l of fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1)) {
  const [id, lat, lng] = l.split(",");
  if (!lat || !lng) continue;
  const c = cell(lat, lng);
  if (!done.has(c) && !cells.has(c)) cells.set(c, [+lat, +lng]);
}
console.log(`cells cached ${done.size}, to do ${cells.size}`);

const out = fs.openSync(cachePath, "a");
const queue = [...cells.entries()];
let n = 0, failed = 0;
const t0 = Date.now();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const [c, [lat, lng]] = queue.shift();
    try {
      const m = await mappedRock(lat, lng);
      fs.writeSync(out, JSON.stringify({ cell: c, ...m }) + "\n");
    } catch (e) { failed++; }
    if (++n % 250 === 0) {
      const rate = n / ((Date.now() - t0) / 1000);
      console.log(`${n}/${cells.size} failed=${failed} ${rate.toFixed(1)}/s eta ${((cells.size - n) / rate / 60).toFixed(0)} min`);
    }
  }
}));
console.log(`done ${n}, failed ${failed} (rerun to retry them)`);
