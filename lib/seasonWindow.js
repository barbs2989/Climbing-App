export function monthRank(name){
  const n=String(name).trim().toLowerCase();
  const full=["january","february","march","april","may","june","july","august","september","october","november","december"];
  let i=full.indexOf(n);
  if(i>=0)return i;
  const abbr=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  i=abbr.indexOf(n.slice(0,3));
  return i>=0?i:99;
}
// A route's `season` column is a WINDOW ("Jun-Sep", "Mid-July to September"), and on 535 of the
// 584 routes whose SEASONAL GUIDANCE had no researched monthBreakdown it is the only month-level
// fact there is. Those panels printed one sentence while 502 others printed a month grid, so the
// same section read differently from route to route. This reads the window STRICTLY: a leading
// month range (or "year-round") and nothing else, or null. Season words ("Summer-Fall") and prose
// ("Dec-Apr on ski; Jul-Oct on foot") are refused rather than guessed into months, and so is a
// lone month followed by commentary — "Jul (best); serviceable Jun-Aug" and "Aug (first ascent
// conditions)" are notes about ONE month, not the season. An end named early/mid/late is only
// partly in season and is returned in `partial`.
export const SEASON_MON="(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
export const SEASON_Q="(?:(early|mid|late)[- ])?";
export const SEASON_RANGE_RE=new RegExp("^"+SEASON_Q+SEASON_MON+"(?:\\s*(?:[-–—]|to|through|thru)\\s*"+SEASON_Q+SEASON_MON+")?\\s*($|[(;,.])");
export const MONTH_ABBR=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function seasonWindowMonths(season){
  if(!season)return null;
  const s=String(season).trim().toLowerCase().replace(/^~\s*/,"");
  if(/^(year[- ]round|all year)\b/.test(s))return {months:[0,1,2,3,4,5,6,7,8,9,10,11],partial:[]};
  const m=s.match(SEASON_RANGE_RE);
  if(!m)return null;
  const [,q1,m1,q2,m2,tail]=m;
  if(!m2&&tail)return null;
  const a=monthRank(m1),b=m2?monthRank(m2):a;
  if(a>11||b>11)return null;
  const months=[];
  for(let i=a,g=0;g<12;g++,i=(i+1)%12){months.push(i);if(i===b)break;}
  const partial=[];if(q1)partial.push(a);if(q2&&m2)partial.push(b);
  return {months,partial};
}
