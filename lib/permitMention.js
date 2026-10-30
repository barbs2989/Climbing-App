/* Does this text ASSERT the agency, or disclaim it? Scans every occurrence and accepts
   the keyword only if at least one is not sitting behind a negation in the ~60 chars
   before it. Per-occurrence, not per-string, for the same reason rackMentions is:
   "Okanogan-Wenatchee NF, not North Cascades NP, but Enchantment permits apply" has a
   real Enchantment mention sharing a sentence with a disclaimed one. */
export const PERMIT_NEG=/\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except|nor)\b[^.;]{0,40}$/i;
/* Second way an agency name lies about who governs a route: not disclaimed, but PERIPHERAL —
   named as somewhere the line brushes past. 108 Mt. Baker Ranger District routes read
   "Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park",
   and a bare /north cascades/ sent every one of those National Forest climbs to the Park
   Service's backcountry-permit page. Same wrong-agency outcome PERMIT_NEG was written for,
   which is why it lives beside it rather than in a second mechanism. Each alternative below is
   a phrase observed in the live column, not a guess at English. Measured: 103 NOCA and 2
   Olympic links drop to none, 1 moves to Recreation.gov. The Icy Peak case is a real (small)
   loss — overnight there does cross into NOCA — accepted against 105 wrong links removed.
   On that Mt. Baker boilerplate specifically, "peripheral" turned out to be generous: #468's
   data audit found it is frequently just FALSE. Twin Sisters sits entirely within Mount Baker
   Wilderness, ~40mi from the NCNP boundary; wa_the_pleiades_scramble's own access.permit reads
   "...not North Cascades National Park" while its land_manager asserted the crossing. #468
   repairs such rows in the DB. This guard stays regardless — it is app-side, it covers the
   ~106 rows that audit does not reach, and enrichment can re-emit the phrase. So expect the
   108 to shrink over time; suppression is right whether the mention is peripheral or wrong. */
export const PERMIT_PERIPHERAL=/\b(?:crossing into|crosses into|cross into|partly (?:in|within|inside)|partially (?:in|within)|some (?:upper )?routes?|upper routes?|adjacent to|borders?(?: on)?|boundary (?:of|with)|near(?:by)?|approach (?:partly )?crosses|just outside|edge of)\b[^.;]{0,60}$/i;
export function _pmSays(hay,re){if(!hay)return false;re.lastIndex=0;var m;while((m=re.exec(hay))!==null){var before=hay.slice(Math.max(0,m.index-70),m.index);if(!PERMIT_NEG.test(before)&&!PERMIT_PERIPHERAL.test(before))return true;if(m.index===re.lastIndex)re.lastIndex++;}return false;}
