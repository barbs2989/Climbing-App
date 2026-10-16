// The KNOWN HAZARDS box merges three fields — hazards, objHaz and watchOut — and repeated
// itself.
//
// It de-duplicated hazards against objHaz by exact string equality and compared watchOut
// against neither. On Southwest Rib, South Early Winters Spire that produced:
//
//   hazards   "Some slab sections are runout (notably the delicate 5.6+ slab and the arete
//              pitch with little pro)."
//   objHaz    "runout slab"
//   watchOut  "runout slab"
//
// — the same hazard three times, twice character-for-character. Exact matching could not see
// the pair because they were never compared, and could never see the third because it is the
// same fact in more words.
//
// The rule is subsumption, not similarity: an entry is dropped only when every significant
// word in it also appears in another entry that is being kept. Nothing is ever lost that way
// — the surviving line says everything the dropped one did and more. Fuzzy scoring was
// deliberately not used, because two hazards can be 80% alike and still be different hazards
// ("rockfall in the couloir" vs "rockfall on the descent").

const STOP = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "is", "are", "be", "can", "will", "this", "that", "it", "its", "as", "by", "from",
  "you", "your", "so", "expect", "especially", "notably", "some", "there", "here", "up", "down",
  "out", "into", "over", "under", "than", "then", "when", "while", "very", "more", "most"]);

function tokens(s) {
  return new Set(String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && w.length > 2 && !STOP.has(w))
    // crude stem so "crowds"/"crowded" and "rappels"/"rappel" line up
    .map(w => w.replace(/(?:ing|ed|es|s)$/, "")));
}

const subset = (a, b) => { for (const w of a) if (!b.has(w)) return false; return true; };

// Merge the hazard lists into what should actually be printed, longest-first so the entry that
// carries the most detail is the one that survives.
export function mergeHazards(...lists) {
  const raw = [];
  for (const l of lists) {
    if (l == null) continue;
    (Array.isArray(l) ? l : [l]).forEach(x => { if (x != null && String(x).trim()) raw.push(String(x).trim()); });
  }
  const items = raw.map(text => ({ text, tok: tokens(text) }))
    .sort((a, b) => b.tok.size - a.tok.size || b.text.length - a.text.length);
  const kept = [];
  const dropped = [];
  for (const it of items) {
    if (!it.tok.size) { // no significant words at all — keep unless character-identical
      if (kept.some(k => k.text.toLowerCase() === it.text.toLowerCase())) { dropped.push(it.text); continue; }
      kept.push(it); continue;
    }
    const covered = kept.find(k => subset(it.tok, k.tok));
    if (covered) { dropped.push(it.text); continue; }
    kept.push(it);
  }
  // Restore the order the fields were passed in, so the primary `hazards` list still reads first.
  const order = new Map(raw.map((t, i) => [t, i]));
  kept.sort((a, b) => (order.get(a.text) ?? 0) - (order.get(b.text) ?? 0));
  return { items: kept.map(k => k.text), dropped };
}

// What the KNOWN HAZARDS box actually prints: ONE merge over all three fields, its survivors split
// by where they came from — `hazards` (the bullets, and the source of the wildlife/seasonal split)
// from hazards + objHaz, `watchOut` (the ⚠ lines) from watchOut.
//
// The box used to run TWO merges: mergeHazards(hazards, objHaz) for the bullets, then the three-way
// merge minus those bullets for the ⚠ lines. When watchOut restated a hazard in MORE words, the
// three-way merge kept the longer watchOut line and dropped the hazards one — but the bullets came
// from the two-way merge, which never saw watchOut, so they kept it too. Both printed:
//
//   • Exposure on summit ridge
//   ⚠ Exposure on the summit ridge.
//
// 250 routes, 322 lines, measured 2026-09-30 with watch_out parsed as db.js parses it. And
// audit:hazard-redundancy counted every one of them as REMOVED, because it ran the three-way merge
// rather than what rendered. Both call this now, so the box and the audit cannot disagree.
export function knownHazards(hazards, objHaz, watchOut) {
  const primary = new Set([].concat(hazards ?? [], objHaz ?? [])
    .filter(x => x != null).map(x => String(x).trim()));
  const { items } = mergeHazards(hazards, objHaz, watchOut);
  return { hazards: items.filter(t => primary.has(t)), watchOut: items.filter(t => !primary.has(t)) };
}

// watch_out arrives as an array on most rows and as a ;/newline-separated STRING on the rest. It
// lives here rather than in db.js so a node script can parse the column exactly as the app does
// without importing the Supabase client. Why only the string form is split: see the note above
// its import in lib/db.js.
export function toWarnArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string") return [];
  return v.split(/\s*[;\n]+\s*/).map((s) => s.trim()).filter((s) => s.replace(/[;,.\s—–-]/g, "").length);
}
