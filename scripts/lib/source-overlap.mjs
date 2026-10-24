// SOURCE OVERLAP — does researched text repeat a run of words from the page it was researched from?
//
// The rule (owner, 2026-10-01): facts from another site or a guidebook may correct the app, but
// every word written into it must be our own. Research briefs said so ("do not copy any run of 4+
// words"), and the 2026-10-01 audit (#2142) rewrote 292 copied strings — but nothing CHECKED a new
// batch against its sources, and the next wave (#2655, 2026-10-23) shipped pitch notes that still
// carried source sentences: Dark Shadows' P2 kept "take the right-facing desert-varnished
// dihedral for about 60 ft" word for word. A brief is a request; this is the check.
//
// Why EIGHT words: a shorter run is mostly climbing's shared vocabulary ("to a two-bolt anchor",
// "on the west side of the"), which every description of a route has to use. Measured on #2655's
// 25 routes, 6-word runs hit almost every route including the honest rewrites; an 8-word run is
// the length plagiarism checkers commonly treat as a copied phrase, and on that wave it singled out
// only the sentences that read as lifted.
//
// What it cannot see: a source that would not load (SummitPost and theCrag refuse scripted fetches),
// a close paraphrase that changes one word in every seven, and a copy from a page the batch did not
// list. Unreadable sources are REPORTED, never counted as clean.

export const MIN_RUN = 8;

const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: "-", mdash: "-" };
export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITY[n.toLowerCase()] ?? " ");
}

// Words as a reader sees them: case, punctuation and hyphenation do not make a sentence original.
export const words = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9.+'/]+/g, " ")
  .split(/\s+/).map(w => w.replace(/^[.'/]+|[.'/]+$/g, "")).filter(Boolean);

export function sourceIndex(texts, n = MIN_RUN) {
  const grams = new Set();
  for (const t of texts) { const w = words(t); for (let i = 0; i + n <= w.length; i++) grams.add(w.slice(i, i + n).join(" ")); }
  return grams;
}

// The maximal runs (n words or longer) of `text` that also appear in the indexed sources.
export function copiedRuns(text, grams, n = MIN_RUN) {
  const w = words(text), runs = [];
  let start = -1, end = -1;
  for (let i = 0; i + n <= w.length; i++) {
    if (grams.has(w.slice(i, i + n).join(" "))) { if (start < 0 || i >= end) { if (start >= 0) runs.push(w.slice(start, end).join(" ")); start = i; } end = i + n; }
  }
  if (start >= 0) runs.push(w.slice(start, end).join(" "));
  return runs;
}

// Every string in a batch entry a climber would read, with its path. `review` is the batch's
// working notes and never renders; `area` and the short labels are identifiers, not prose.
const SKIP_KEYS = new Set(["review", "area", "skip_reason", "pitch", "grade", "expect"]);
export function proseStrings(value, path = "") {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === "string") { if (words(v).length >= MIN_RUN) out.push({ path: p, text: v }); return; }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}[${i}]`));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!SKIP_KEYS.has(k)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return out;
}

// Mountain Project answers a browser user agent (measured 200 on 2026-10-24); a default one is
// refused. One fetch per URL per run.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const cache = new Map();
export async function fetchSourceText(url) {
  if (cache.has(url)) return cache.get(url);
  let text = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (res.ok) { const t = htmlToText(await res.text()); if (words(t).length > 150) text = t; }
  } catch { /* unreadable — reported by the caller */ }
  cache.set(url, text);
  return text;
}

// Checks one batch entry against the sources it lists. Returns { unread: [url], hits: [{path, runs}] }.
export async function checkEntry(spec) {
  const urls = Array.isArray(spec?.review?.sources) ? spec.review.sources.filter(u => /^https?:\/\//.test(u)) : [];
  const texts = [], unread = [];
  for (const u of urls) { const t = await fetchSourceText(u); if (t) texts.push(t); else unread.push(u); }
  const grams = sourceIndex(texts);
  const hits = [];
  for (const s of proseStrings(spec)) { const runs = copiedRuns(s.text, grams); if (runs.length) hits.push({ path: s.path, runs }); }
  return { listed: urls.length, read: texts.length, unread, hits };
}
