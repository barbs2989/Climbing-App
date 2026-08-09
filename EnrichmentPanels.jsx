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
  if (!meta.length && !geology && !firstAscent) return null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}>
    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="mountain" size={16} color={C.text}/><span>PEAK</span></div>
    {meta.length?<div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:(firstAscent||geology)?12:0}}>{meta.map(([label,val])=><div key={label} style={{fontSize:12.5,color:C.textSub}}><span style={{color:C.textMuted}}>{label}: </span>{val}</div>)}</div>:null}
    {firstAscent?<div style={{marginBottom:geology?12:0,paddingTop:meta.length?11:0,borderTop:meta.length?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>First Ascent</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{firstAscent.date||""}{ firstAscent.date?" by ":""}{(firstAscent.climbers||[]).join(", ")}{firstAscent.notes?<div style={{marginTop:4,fontSize:12,color:C.textMuted,fontStyle:"italic"}}>{firstAscent.notes}</div>:null}</div></div>:null}
    {geology?<div style={{paddingTop:(meta.length||firstAscent)?11:0,borderTop:(meta.length||firstAscent)?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>About this peak</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{splitParagraphs(geology).map((p,i)=><p key={i} style={{margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div></div>:null}
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

export function SeasonalGuidancePanel({route, C, ActionIcon}) {
  if (!route.seasonalGuidance) return null;
  const {optimalWindow, monthBreakdown} = route.seasonalGuidance;
  const sortedMonths = monthBreakdown ? Object.entries(monthBreakdown).sort((a,b)=>monthRank(a[0])-monthRank(b[0])) : [];
  // Each month carries {status, reason} and only `status` was ever printed, so a tile read
  // "July / good" — a verdict with its justification sitting unused in the same object, on 501
  // routes. Two columns is right for a bare status word and wrong for a sentence, so the grid
  // collapses to one column when there are reasons to show.
  const anyReason = sortedMonths.some(([,info])=>info&&info.reason);
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="calendar" size={16} color={C.text}/><span>SEASONAL GUIDANCE</span></div>{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{fontSize:11.5,fontWeight:700,color:C.green,marginBottom:3}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{sortedMonths.length?<div style={{display:"grid",gridTemplateColumns:anyReason?"1fr":"1fr 1fr",gap:8}}>{sortedMonths.map(([month,info])=>{const colors={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{display:"flex",alignItems:"baseline",gap:7}}><div style={{fontSize:12,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:11,color:C.textSub}}>{info.status}</div></div>{info.reason?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:4}}>{info.reason}</div>:null}</div>;})}</div>:null}</div>;
}

export function CrowdsPanel({route, C, ActionIcon}) {
  if (!route.crowds) return null;
  const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="user" size={16} color={C.text}/><span>CROWDS & SOLITUDE</span></div>{estimatePerSeason?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Parties per season</div><div style={{fontSize:typeof estimatePerSeason==="number"?14:13,fontWeight:typeof estimatePerSeason==="number"?700:400,color:typeof estimatePerSeason==="number"?C.text:C.textSub,lineHeight:1.5}}>{typeof estimatePerSeason==="number"?estimatePerSeason+"+":estimatePerSeason}</div></div>:null}{peakTraffic?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Peak traffic</div><div style={{fontSize:13,color:C.textSub}}>{peakTraffic}</div></div>:null}{solitudeRating?(()=>{const _sr=Math.max(0,Math.min(5,Math.round(Number(solitudeRating))||0));return _sr?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Solitude rating</div><div style={{fontSize:16}}>{'★'.repeat(_sr)+'☆'.repeat(5-_sr)}</div></div>:null;})():null}</div>;
}


export function PartnerRequirementsPanel({route, C, ActionIcon}) {
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={16} color={C.text}/><span>PARTNER REQUIREMENTS</span></div>{experienceLevel?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.blue,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{approachTime?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}

export function DataQualityPanel({route, C, ActionIcon}) {
  if (!route.dataQuality) return null;
  const {confidence, lastVerified} = route.dataQuality;
  // The gap list itself lives in Overview's own "Help fill in the gaps" banner
  // (routeGaps()), which is actionable and shown for every route — this panel
  // only adds the confidence/freshness read, so the two don't repeat each other.
  const confColor=confidence==="HIGH"?C.green:confidence==="MEDIUM"?C.amber:C.red;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="chart" size={16} color={C.text}/><span>DATA QUALITY</span></div><div style={{padding:"8px 11px",background:confColor+"22",border:"1px solid "+confColor+"55",borderRadius:8}}><div style={{fontSize:12,fontWeight:700,color:confColor,marginBottom:2}}>Confidence: {confidence}</div><div style={{fontSize:11.5,color:C.textSub}}>Data verified from {lastVerified?lastVerified:"recent sources"}</div></div></div>;
}
