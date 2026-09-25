// Enrichment data display components
// Used on route detail page, Details and Safety tabs

export function PeakMetadataPanel({route, C, ActionIcon}) {
  if (!route.peakMetadata) return null;
  const {county, range, geology, firstAscent} = route.peakMetadata;
  // Only surface facts that actually have data — county in particular is populated
  // for a handful of hand-curated peaks but has no DB source for most of the catalog,
  // so a permanent "—" placeholder there was misleading rather than informative.
  // Elevation and prominence are intentionally omitted here — TechStats' "High point"
  // and "Prominence" stats right above already show the same figures for peak routes.
  const meta = [
    range ? ["Range", range] : null,
    county ? ["County", county] : null,
  ].filter(Boolean);
  // `geology` is deliberately NOT rendered here any more — it is the "About this peak"
  // prose, and it now sits in the route's top description card so all the narrative on the
  // page is in one place. It stays destructured only so this comment has something to point
  // at; the panel is range/county/first-ascent. If you re-add it here it will render twice.
  if (!meta.length && !firstAscent) return null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}>
    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="mountain" size={16} color={C.text}/><span>PEAK</span></div>
    {meta.length?<div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:firstAscent?12:0}}>{meta.map(([label,val])=><div key={label} style={{fontSize:12.5,color:C.textSub}}><span style={{color:C.textMuted}}>{label}: </span>{val}</div>)}</div>:null}
    {firstAscent?<div style={{paddingTop:meta.length?11:0,borderTop:meta.length?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>First Ascent</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{firstAscent.date||""}{ firstAscent.date?" by ":""}{(firstAscent.climbers||[]).join(", ")}{firstAscent.notes?<div style={{marginTop:4,fontSize:12,color:C.textMuted,fontStyle:"italic"}}>{firstAscent.notes}</div>:null}</div></div>:null}
  </div>;
}

// Long hand-written/generated blurbs (peak geology blurbs, approach/descent narrative, etc.)
// are stored as one dense paragraph. Break them into readable paragraphs on 2-4 sentence
// boundaries rather than rendering a single unbroken wall of text.
// Groups prose into paragraphs of 2-3 sentences. Splitting must never lose text.
//
// The previous implementation collected sentences with
// /[^.!?]+[.!?]+(?:\s+|$)/g and built the result only from what matched, so any
// span the scanner skipped was silently discarded. That trailing (?:\s+|$)
// requires whitespace after the period, and a decimal point is a period followed
// by a digit — "5.9", "1.2 miles", "#0.5". Climbing copy is full of them, so the
// scanner re-anchored past the decimal and every character before it vanished:
// a 139-char description rendered as "9s in Washington.", and one route's
// approach directions lost the sentence naming the parking spots it then told
// you to walk between.
//
// So: split AFTER a terminator only when whitespace and a new sentence follow,
// which a decimal never satisfies. An abbreviation ("Mt. Rainier") can still
// split in the wrong place, but that only regroups paragraphs — it cannot drop
// text, which is the failure that matters.
export function splitParagraphs(text) {
  if (!text) return [];
  const src = String(text);
  const MARK = "\u0001";
  const sentences = src
    .replace(/([.!?]+["'”’)\]]*)(\s+)(?=[A-Z0-9"'“‘(\[])/g, "$1$2" + MARK)
    .split(MARK);
  // Belt and braces against this whole bug class: if the pieces no longer
  // reconstruct the input, keep the text whole rather than ship a truncation.
  if (sentences.join("") !== src) return [src.trim()].filter(Boolean);
  const perPara = sentences.length > 6 ? 3 : 2;
  const paras = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paras.push(sentences.slice(i, i + perPara).join("").trim());
  }
  return paras.filter(Boolean);
}

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
const SEASON_MON="(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const SEASON_Q="(?:(early|mid|late)[- ])?";
const SEASON_RANGE_RE=new RegExp("^"+SEASON_Q+SEASON_MON+"(?:\\s*(?:[-–—]|to|through|thru)\\s*"+SEASON_Q+SEASON_MON+")?\\s*($|[(;,.])");
const MONTH_ABBR=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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

export function SeasonalGuidancePanel({route, C, ActionIcon}) {
  const sg = route.seasonalGuidance || {};
  const {optimalWindow, monthBreakdown} = sg;
  const sortedMonths = monthBreakdown ? Object.entries(monthBreakdown).sort((a,b)=>monthRank(a[0])-monthRank(b[0])) : [];
  // With no researched breakdown the calendar comes from the route's own season window, and says so.
  const win = sortedMonths.length ? null : seasonWindowMonths(route.season);
  if (!optimalWindow && !sortedMonths.length && !win) return null;
  const colors={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};
  const byIdx={};sortedMonths.forEach(([month,info])=>{const i=monthRank(month);if(i<12&&info)byIdx[i]=info;});
  // One 12-month calendar on every panel that has month-level data, so the section has the same
  // shape on every route. Each cell carries its status as a WORD, not only a colour.
  const cells = sortedMonths.length ? MONTH_ABBR.map((mn,i)=>{const info=byIdx[i];if(!info)return [mn,"—",C.textMuted,C.surface];const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return [mn,info.status||"—",col,bg];})
    : win ? MONTH_ABBR.map((mn,i)=>win.months.includes(i)?(win.partial.includes(i)?[mn,"part",C.green,C.surface]:[mn,"in season",C.green,C.greenBg]):[mn,"off",C.textMuted,C.surface]) : null;
  // Each month carries {status, reason} and only `status` was ever printed, so a tile read
  // "July / good" — a verdict with its justification sitting unused in the same object, on 501
  // routes. The calendar now carries the status; the reasons are listed under it.
  const reasons = sortedMonths.filter(([,info])=>info&&info.reason);
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="calendar" size={16} color={C.text}/><span>SEASONAL GUIDANCE</span></div>{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{fontSize:11.5,fontWeight:700,color:C.green,marginBottom:3}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{cells?<div role="list" aria-label="Month by month" style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5,marginBottom:reasons.length||win?10:0}}>{cells.map(([mn,word,col,bg])=><div key={mn} role="listitem" style={{background:bg,border:"1px solid "+col+"55",borderRadius:7,padding:"5px 2px",textAlign:"center",minWidth:0}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{mn}</div><div style={{fontSize:9.5,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{word}</div></div>)}</div>:null}{win?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>{"From this route's season ("+String(route.season).split(/[(;]/)[0].trim().replace(/[,.]$/,"")+"). No month-by-month notes for this route yet."}</div>:null}{reasons.length?<div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>{reasons.map(([month,info])=>{const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{display:"flex",alignItems:"baseline",gap:7}}><div style={{fontSize:12,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:11,color:C.textSub}}>{info.status}</div></div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:4}}>{info.reason}</div></div>;})}</div>:null}</div>;
}

// `reported` is what climbers who logged it said about the crowds ({value, n, of, when, stale}),
// computed in App from every trip report. It renders even where the catalog has no crowd
// estimate at all -- that is most routes, and a real party's word is the better answer anyway.
export function CrowdsPanel({route, reported, C, ActionIcon}) {
  if (!route.crowds && !reported) return null;
  const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds || {};
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="user" size={16} color={C.text}/><span>CROWDS & SOLITUDE</span></div>{reported?<div style={{background:reported.stale?C.amberBg:C.blueBg,border:"1px solid "+(reported.stale?C.amber+"55":C.blueDim),borderRadius:9,padding:"9px 11px",marginBottom:10}}><div style={{fontSize:11.5,fontWeight:700,color:reported.stale?C.amber:C.blue,marginBottom:2}}>{reported.stale?"Last reported by climbers":"Climbers report"}</div><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{reported.value}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{reported.n+" of "+reported.of+(reported.of===1?" report":" reports")+(reported.when?" · newest "+reported.when:"")}</div></div>:null}{estimatePerSeason?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Parties per season</div><div style={{fontSize:typeof estimatePerSeason==="number"?14:13,fontWeight:typeof estimatePerSeason==="number"?700:400,color:typeof estimatePerSeason==="number"?C.text:C.textSub,lineHeight:1.5}}>{typeof estimatePerSeason==="number"?estimatePerSeason+"+":estimatePerSeason}</div></div>:null}{peakTraffic?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Peak traffic</div><div style={{fontSize:13,color:C.textSub}}>{peakTraffic}</div></div>:null}{solitudeRating?(()=>{const _sr=Math.max(0,Math.min(5,Math.round(Number(solitudeRating))||0));return _sr?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Solitude rating</div><div style={{fontSize:16}}>{'★'.repeat(_sr)+'☆'.repeat(5-_sr)}</div></div>:null;})():null}</div>;
}


export function PartnerRequirementsPanel({route, C, ActionIcon}) {
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={16} color={C.text}/><span>PARTNER REQUIREMENTS</span></div>{experienceLevel?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.blue,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{approachTime?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}

// DataQualityPanel (the DATA QUALITY box) was removed along with DATA CONFIDENCE: both
// reported how complete a route's data was, at the top of Overview, and per-section
// GapNotes now say it where it is actionable. That leaves the `data_quality` column with
// no reader on purpose — recorded in check:field-renders' KNOWN map, not left to be
// rediscovered as a bug.
