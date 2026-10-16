// SHOUTED PROSE — ALL-CAPS words used for emphasis inside text a climber reads.
//
// Research batches used to open each paragraph with a shouted lead sentence ("THE SINGLE STRONGEST
// TEST IS THAT YOU NEVER CROSS THE GLACIER."). 2,165 strings on 864 routes carried it before the
// 2026-09-30 recase; it renders verbatim on the route page, where it reads as the app yelling.
// Emphasis belongs in the words, not the case.
//
// What is NOT shouting, and why each rule exists:
//   * acronyms and codes — PCT, USFS, NWAC, SR-20, FR 5100, US-2, AM/PM, roman numerals, state
//     codes. Two letters are never flagged alone; longer tokens are allowed by name below.
//   * climber initials in `fa` ("JB, DN, RG") — callers skip that column.
//   * climb NAMES — some real names are capitalised ("LIVE FREE OR DIE"); callers skip `name`.
// A token is shouting when it is 4+ capital letters and not on the allowlist, or when two or more
// capitalised tokens sit side by side and one of them is an ordinary short word (THE, IS, YOU…).

// 4+ letter tokens that are real acronyms / proper abbreviations in this catalog. Add to it when
// a genuine acronym is refused; never add an English word.
export const ACRONYMS = new Set(`
NWAC USFS WSDOT NOAA USGS USDA NCNP NOCA MORA OLYM NPS PCT GPS SEWS NEWS NEXUS SPOT BASE RAMM DLFA
AMGA NOLS WDFW USFWS FEMA CCSP OSAT FSR NRA SNOTEL CalTopo CALTOPO GAIA PUD SPART MSR AASI NASA
PDF HTML URL GPX KML UTM WGS NAD FAQ ASAP SUV AWD FWD HWY
SCVSAR JSAR WCSAR OCSAR CCVSAR MCSAR KCSR NWSRU BNSF KITTCOM KCSO WCSO SNOPAC SNOCOM MACECOM LIDAR DGPS
NRCA ASCA ROTC WWII NCCS IGBC MRNP JBLM UIAA USBGN RRGCC BCEP CBSA MBVRC USSR COVID DEET VIII
`.split(/\s+/).filter(Boolean));

const SHORT_WORDS = new Set("THE IS AND YOU NOT OF TO IN ON AT IT THIS THAT ARE FROM WITH FOR IF NO BY AS AN BE DO GO UP SO ITS WAS HAS ONE TWO YOUR ALL BUT CAN".split(" "));

const TOKEN = /\b[A-Z][A-Z'’]*[A-Z]\b/g;

// Returns the shouted fragments in `s` (empty array = clean).
export function shoutedFragments(s) {
  if (typeof s !== "string") return [];
  const toks = [...s.matchAll(TOKEN)].map(m => ({ w: m[0], i: m.index, end: m.index + m[0].length }));
  const bare = w => w.replace(/['’]S$/, "").replace(/['’]/g, "");
  const out = [];
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j], w = bare(t.w);
    if (w.length >= 4 && !ACRONYMS.has(w)) { out.push(t.w); continue; }
    if (SHORT_WORDS.has(w)) {
      const adj = (a, b) => a && b && /^[\s,;:\-–—]+$/.test(s.slice(a.end, b.i));
      if (adj(toks[j - 1], t) || adj(t, toks[j + 1])) out.push(t.w);
    }
  }
  return out;
}

// Walk any JSON value; returns [{path, fragments}] for every string that shouts.
export function shoutedStrings(value, path = "") {
  const found = [];
  const walk = (v, p) => {
    if (typeof v === "string") { const f = shoutedFragments(v); if (f.length) found.push({ path: p, fragments: f }); return; }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}[${i}]`));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return found;
}
