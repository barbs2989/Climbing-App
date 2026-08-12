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
