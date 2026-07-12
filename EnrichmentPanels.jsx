// Enrichment data display components
// Used on route detail page, Details and Safety tabs

export function PeakMetadataPanel({route, C, MOUNTAINS, uElev, ActionIcon}) {
  if (!route.peakMetadata) return null;
  const {prominence, county, range, geology, firstAscent} = route.peakMetadata;
  const fmtElev = uElev || (ft => ft.toLocaleString()+" ft");
  // Only surface facts that actually have data — county in particular is populated
  // for a handful of hand-curated peaks but has no DB source for most of the catalog,
  // so a permanent "—" placeholder there was misleading rather than informative.
  // Elevation itself is intentionally omitted here — TechStats' "High point" stat
  // right above already shows the same figure for peak routes.
  const stats = [
    prominence ? ["Prominence", fmtElev(prominence)] : null,
  ].filter(Boolean);
  const meta = [
    range ? ["Range", range] : null,
    county ? ["County", county] : null,
  ].filter(Boolean);
  if (!stats.length && !meta.length && !geology && !firstAscent) return null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}>
    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="mountain" size={16} color={C.text}/><span>PEAK</span></div>
    {stats.length?<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:meta.length?10:(firstAscent||geology)?12:0}}>{stats.map(([label,val])=><div key={label} style={{background:C.surface,border:"1px solid "+C.borderLight,borderRadius:9,padding:"8px 11px"}}><div style={{fontSize:10,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>{label}</div><div style={{fontSize:16,fontWeight:700,color:C.text}}>{val}</div></div>)}</div>:null}
    {meta.length?<div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:(firstAscent||geology)?12:0}}>{meta.map(([label,val])=><div key={label} style={{fontSize:12.5,color:C.textSub}}><span style={{color:C.textMuted}}>{label}: </span>{val}</div>)}</div>:null}
    {firstAscent?<div style={{marginBottom:geology?12:0,paddingTop:(stats.length||meta.length)?11:0,borderTop:(stats.length||meta.length)?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>First Ascent</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{firstAscent.date||""}{ firstAscent.date?" by ":""}{(firstAscent.climbers||[]).join(", ")}{firstAscent.notes?<div style={{marginTop:4,fontSize:12,color:C.textMuted,fontStyle:"italic"}}>{firstAscent.notes}</div>:null}</div></div>:null}
    {geology?<div style={{paddingTop:(stats.length||meta.length||firstAscent)?11:0,borderTop:(stats.length||meta.length||firstAscent)?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>About this peak</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{splitParagraphs(geology).map((p,i)=><p key={i} style={{margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div></div>:null}
  </div>;
}

// Long hand-written/generated blurbs (peak geology blurbs, approach/descent narrative, etc.)
// are stored as one dense paragraph. Break them into readable paragraphs on 2-4 sentence
// boundaries rather than rendering a single unbroken wall of text.
export function splitParagraphs(text) {
  if (!text) return [];
  const sentences = String(text).match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [String(text)];
  const perPara = sentences.length > 6 ? 3 : 2;
  const paras = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paras.push(sentences.slice(i, i + perPara).join("").trim());
  }
  return paras.filter(Boolean);
}

function monthRank(name){
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
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="calendar" size={16} color={C.text}/><span>SEASONAL GUIDANCE</span></div>{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{fontSize:11.5,fontWeight:700,color:C.green,marginBottom:3}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{sortedMonths.length?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{sortedMonths.map(([month,info])=>{const colors={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{fontSize:12,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{info.status}</div></div>;})}</div>:null}</div>;
}

export function HazardsDetailPanel({route, C, ActionIcon}) {
  if (!route.seasonalHazards) return null;
  const {avalanche, weather, crevasses, exposure} = route.seasonalHazards;
  return <div style={{background:C.card,border:"1px solid "+C.redDim,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:3,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="alert" size={16} color={C.red}/><span>SEASONAL AVALANCHE & WEATHER OUTLOOK</span></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:10}}>Month-by-month planning reference — see Known Hazards above for live, community-reported conditions.</div>{avalanche?<div style={{marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6}}><ActionIcon name="mountain" size={14} color={C.text}/><span>Avalanche</span></div>{avalanche.zone?<div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>Zone: {avalanche.zone}</div>:null}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{Object.entries(avalanche.byMonth||{}).map(([month,level])=>{const colors={Considerable:[C.red,C.redBg],Moderate:[C.amber,C.amberBg],Low:[C.green,C.greenBg]};const [col,bg]=colors[level]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:10.5,color:C.textSub}}>{level}</div></div>;})}</div></div>:null}{weather?<div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6}}><ActionIcon name="alert" size={14} color={C.text}/><span>Weather</span></div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:3}}>{weather.typical}</div>{weather.probability?<div style={{fontSize:12,color:C.amber,fontWeight:700,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"6px 10px"}}>{weather.probability}</div>:null}</div>:null}</div>;
}

export function CrowdsPanel({route, C, ActionIcon}) {
  if (!route.crowds) return null;
  const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="user" size={16} color={C.text}/><span>CROWDS & SOLITUDE</span></div>{estimatePerSeason?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Parties per season</div><div style={{fontSize:typeof estimatePerSeason==="number"?14:13,fontWeight:typeof estimatePerSeason==="number"?700:400,color:typeof estimatePerSeason==="number"?C.text:C.textSub,lineHeight:1.5}}>{typeof estimatePerSeason==="number"?estimatePerSeason+"+":estimatePerSeason}</div></div>:null}{peakTraffic?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Peak traffic</div><div style={{fontSize:13,color:C.textSub}}>{peakTraffic}</div></div>:null}{solitudeRating?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Solitude rating</div><div style={{fontSize:16}}>{'★'.repeat(solitudeRating)+'☆'.repeat(5-solitudeRating)}</div></div>:null}</div>;
}


export function PartnerRequirementsPanel({route, C, ActionIcon}) {
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={16} color={C.text}/><span>PARTNER REQUIREMENTS</span></div>{experienceLevel?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.blue,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{approachTime?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}

export function DataQualityPanel({route, C, liveGaps, ActionIcon}) {
  if (!route.dataQuality) return null;
  const {confidence, lastVerified} = route.dataQuality;
  // Gaps are computed live by routeGaps() (same check that drives Overview's
  // "Help fill in the gaps" banner) rather than a separately hand-seeded list,
  // so the two can't drift out of sync.
  const gaps = liveGaps || route.dataQuality.gaps;
  const confColor=confidence==="HIGH"?C.green:confidence==="MEDIUM"?C.amber:C.red;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><ActionIcon name="chart" size={16} color={C.text}/><span>DATA QUALITY</span></div><div style={{marginBottom:10,padding:"8px 11px",background:confColor+"22",border:"1px solid "+confColor+"55",borderRadius:8}}><div style={{fontSize:12,fontWeight:700,color:confColor,marginBottom:2}}>Confidence: {confidence}</div><div style={{fontSize:11.5,color:C.textSub}}>Data verified from {lastVerified?lastVerified:"recent sources"}</div></div>{gaps&&gaps.length?<div><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>Flagged gaps:</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{gaps.map(g=><span key={g} style={{fontSize:11,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",padding:"2px 7px",borderRadius:5}}>{g}</span>)}</div></div>:null}</div>;
}
