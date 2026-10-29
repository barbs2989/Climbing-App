/* `routes.season` is not a month range. Enrichment writes prose into it — up to 232 characters on
   wa_hourglass_gully_winter — and the hero header rendered it raw, so a paragraph about snow bridges
   wrapped over the cover photo and pushed the box open. The full text still shows in the season chip
   and CLIMATE & SEASON on the Conditions tab; the header only needs the window. */
export const _MON="Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
/* A window can end on a SEASON as well as a month. "August to autumn", "Spring to autumn",
   "Late summer into early September" are all real windows a climber can act on, and the
   month-only pattern saw none of them — 50 of the 132 approach seasons that fell through to
   the blunt truncation had a perfectly good window sitting in the text. Kept separate from
   _MON so the two can be reasoned about apart. */
export const _SEAS="spring|summer|autumn|fall|winter";
export const _WHEN="(?:"+_MON+"|"+_SEAS+")";
export const _QUAL="(?:mid\\/late|early\\/mid|early|mid|late)[- ]?";
export const _SEP="\\s*(?:[-\u2013\u2014]|to|through|thru|into)\\s*";
export const SEASON_WINDOW_RE=new RegExp("(?:"+_QUAL+")?(?:"+_MON+")"+_SEP+"(?:"+_QUAL+")?(?:"+_MON+")","i");
/* The same shape, but allowing a SEASON at either end. It is deliberately a SECOND pattern
   tried AFTER the clause cut, not a widening of the first, and that ordering is the whole
   point: widening the primary pattern regressed the header strap, because it started firing
   on values whose first clause was already the better answer.
   "Summer (rock) or late winter-spring (ice/mixed)" showed "Summer" and became
   "late winter-spring" — the strap telling a climber a summer rock route is a winter route.
   Measured, not spotted by eye; 13 header values moved and that one was plainly wrong. */
export const SEASON_WINDOW_WIDE_RE=new RegExp("(?:"+_QUAL+")?"+_WHEN+_SEP+"(?:"+_QUAL+")?"+_WHEN,"i");
/* ONE spelling of a window. The header strap printed the same thing six ways ("Jul-Sep", "Jul–Sep",
   "July-September", "Late June - September", "July through October", "Mid-July to September"), so
   two routes side by side read as if they disagreed. Months are cut to three letters, the joint
   between two months is a plain hyphen, a qualifier is its own word ("Mid Jul-Sep"). Only the
   SPELLING changes: no window is widened, narrowed or invented. Only a month PAIR is respelled, so a
   month in running prose ("Best in June while…") stays a word, and months are matched
   case-sensitively so the verb "may" is never read as one. */
export const _MON_ABBR={january:"Jan",february:"Feb",march:"Mar",april:"Apr",june:"Jun",july:"Jul",august:"Aug",sept:"Sep",september:"Sep",october:"Oct",november:"Nov",december:"Dec"};
export const _MONF="Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
export const _QUALF="(?:[Ee]arly|[Mm]id|[Ll]ate)[- ]?";
export const SEASON_PAIR_RE=new RegExp("\\b("+_QUALF+")?("+_MONF+")\\b\\s*(?:[-\u2013\u2014]|to|through|thru)\\s*("+_QUALF+")?("+_MONF+")\\b","g");
export function _monAbbr(m){const k=m.toLowerCase();return _MON_ABBR[k]||m;}
export function _qualTidy(q){return q?q.replace(/[- ]$/,"")+" ":"";}
export function _cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
export function seasonTidy(s){s=String(s||"").trim().replace(/\s+/g," ");if(!s)return "";s=s.replace(SEASON_PAIR_RE,function(_,q1,m1,q2,m2){return _qualTidy(q1)+_monAbbr(m1)+"-"+_qualTidy(q2)+_monAbbr(m2);});return _cap(s.replace(/\.$/,""));}
/* A window the sentence tells you to AVOID is not the season. "good in cold weather; avoid May-Sep"
   showed "May-Sep" in the header: the strap saying the opposite of the row (va_strawberry_fields,
   2026-10-24). A window whose own clause negates it is skipped, and the next rung decides. */
export function seasonWin(s,re){const m=s.match(re);if(!m)return null;const pre=s.slice(0,m.index).split(/[;.]/).pop();return /\b(avoid|not|except|outside)\b/i.test(pre)?null:m[0];}
export function seasonShort(s,max){const lim=typeof max==="number"?max:30;if(!s)return "";s=seasonTidy(s);if(s.length<=lim)return s;const m=seasonWin(s,SEASON_WINDOW_RE);if(m)return _cap(m);const cut=s.split(/[;.(]/)[0].trim();if(cut.length<=lim)return cut;const w2=seasonWin(s,SEASON_WINDOW_WIDE_RE);if(w2)return _cap(w2);const w=cut.lastIndexOf(" ",lim-1);const keep=w>Math.floor(lim/2)?cut.slice(0,w):cut.slice(0,lim-1);return keep.replace(/[\s,;-]+$/,"")+"…";}
