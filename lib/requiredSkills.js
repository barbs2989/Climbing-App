/* A route's "Required skills" (partner_requirements.requiredSkills, migration 0014) is PROSE: lib/objKeys.js measured it
   100% unique, so it stays prose and is never rewritten. What was missing (owner, 2026-11-14, "do what you recommend"
   after the safety-and-skills audit) is a way to hold that prose up against a climber's profile: "glacier travel and
   crevasse rescue" and the profile skill "Crevasse rescue" never met. requiredSkillKeys() reads each phrase and names
   the SKILLS keys (ClimbMatchCore.jsx) it plainly asks for; the panel then says which of them are on your profile.

   The rules were written against the 1,392 distinct phrases in the repo's research and enrichment data, and they
   lean SHORT: a phrase that names no profile skill ("bushwhack tolerance", "river fording", "self-sufficiency on a
   long approach") maps to nothing and still shows as its own chip. They never guess a rescue skill out of
   "self-rescue readiness given remote terrain" -- that phrase is about remoteness, not a technique. A phrase that
   says the skill is NOT needed ("no snow/ice skills needed in-season") maps to nothing. */

/** @type {ReadonlyArray<[RegExp, string]>} pattern -> SKILLS key, tested against the lower-cased phrase. */
const RULES = [
  [/crevasse/, "crevasse"],
  [/glacier (travel|rope|walk|skills|experience|navigation)|roped glacier|glaciated (travel|terrain)|on the glacier|glacier[- ]travel/, "glacier"],
  [/rope[- ]team/, "ropeteam"],
  [/self[- ]arrest|(steep|basic|early[- ]season) snow|snow[- ]?(travel|slope|climb|field)|step[- ]kick|couloir|snow\/ice climb/, "selfarrest"],
  [/crampon/, "crampons"],
  [/picket|deadman|snow anchor|snow bollard/, "snowanchors"],
  [/ice screw|v-?thread|abalakov|ice anchor/, "iceanchors"],
  [/(?<!snow\/|snow )ice climb|lead(ing)? (steep )?(water )?ice|\bwi ?[1-7]\b|water ice/, "icelead"],
  [/mixed climb|dry[- ]?tool|\bm[1-9]\b/, "mixed"],
  [/aid climb|\b[ac][0-4]\b/, "aid"],
  [/big ?wall|haul(ing)? bag|hauling the bag/, "bigwall"],
  [/simul/, "simul"],
  [/short[- ]?rop|short[- ]?pitch/, "shortrope"],
  [/scrambl|class [34]\b|class 2-3|class 3-4|[34](rd|th)[- /]*(class|4th)|downclimb/, "scrambling"],
  [/navigat|route[- ]?find|\bmap\b|compass|\bgps\b/, "navigation"],
  [/avalanche|avy\b/, "avyterrain"],
  [/beacon|transceiver|avalanche rescue|probe and shovel|shovel and probe/, "beacon"],
  [/weather|storm|lightning|turn[- ]?around/, "weather"],
  [/altitude|acclimati|\bams\b|\bhape\b|\bhace\b/, "altitude"],
  [/bivy|bivouac|winter camp|snow camp/, "bivy"],
  [/rappel|abseil/, "rappelling"],
  [/anchor/, "anchors"],
  [/stuck rope/, "stuckrope"],
  [/retreat|bail(ing)? (off|from)|bail[- ]?out/, "retreat"],
  [/trad(itional)?\b[^,;]*\blead|lead[^,;]*\btrad/, "tradlead"],
  [/sport lead|lead[^,;]*\bbolted/, "sportlead"],
  [/gear placement|placing gear|placing (cams|nuts|protection)|protection placement/, "gear"],
  [/multi[- ]?pitch/, "multipitch"],
  [/transition|swinging leads|changeover/, "transitions"],
  [/rope (management|handling)/, "ropemgmt"],
  [/crack|jamming/, "crack"],
  [/off[- ]?width|chimney (technique|climbing|pitch)|(crack|and) chimney|protecting a [^,;]*chimney/, "offwidth"],
  [/slab (climbing|technique)|friction climbing|smearing/, "slab"],
  [/belay(ing)? (a |the )?second|belay(ing)? from above|guide mode/, "belayabove"],
  [/escap(e|ing) the belay|belay escape/, "belayescape"],
  [/munter[- ]mule|load transfer|tie(-| )off a loaded/, "loadtransfer"],
  [/z[- ]?pulley|c[- ]on[- ]z|\b[3-9]:1\b|mechanical advantage|raising system|haul system/, "haul"],
  [/tandem rap|rescue spider/, "tandemrap"],
  [/counter[- ]?balance/, "counterbalance"],
  [/ascend(ing)? (a |the )?(fixed )?rope|fixed (line|rope)|jumar|texas kick|prusik(ing)? up/, "ascending"],
  [/two[- ]person (rope|team|crevasse|glacier)|team of two|party of two/, "twoperson"],
];

/* "no snow/ice skills needed in-season", "crampons not required after July". */
const NOT_NEEDED = /\bno\b[^,;]*\b(needed|required|necessary)\b|\bnot (needed|required|necessary)\b/;

/** The SKILLS keys one required-skills phrase asks for, in rule order.
 * @param {unknown} phrase
 * @returns {string[]} */
export function skillKeysInPhrase(phrase) {
  if (typeof phrase !== "string") return [];
  const t = phrase.toLowerCase();
  if (NOT_NEEDED.test(t)) return [];
  const out = [];
  for (const [re, key] of RULES) if (re.test(t) && !out.includes(key)) out.push(key);
  /* "two-person" only reads as a glacier skill when the phrase is about the glacier or a crevasse. */
  if (out.includes("twoperson") && !/crevasse|glacier/.test(t)) out.splice(out.indexOf("twoperson"), 1);
  return out;
}

/** Every SKILLS key a route's required-skills phrases ask for, de-duplicated, in first-seen order.
 * @param {ReadonlyArray<unknown> | null | undefined} phrases
 * @returns {string[]} */
export function requiredSkillKeys(phrases) {
  const out = [];
  for (const p of Array.isArray(phrases) ? phrases : []) for (const k of skillKeysInPhrase(p)) if (!out.includes(k)) out.push(k);
  return out;
}
