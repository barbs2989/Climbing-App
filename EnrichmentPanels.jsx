// Enrichment data display components
// Used on route detail page, Details and Safety tabs

export function PeakMetadataPanel({route, C, MOUNTAINS}) {
  if (!route.peakMetadata) return null;
  const {elevation, prominence, county, range, geology, firstAscent} = route.peakMetadata;
  // Only surface facts that actually have data — county in particular is populated
  // for a handful of hand-curated peaks but has no DB source for most of the catalog,
  // so a permanent "—" placeholder there was misleading rather than informative.
  const facts = [
    elevation ? ["Elevation", elevation.toLocaleString()+" ft", true] : null,
    prominence ? ["Prominence", prominence.toLocaleString()+" ft", true] : null,
    range ? ["Range", range, false] : null,
    county ? ["County", county, false] : null,
  ].filter(Boolean);
  if (!facts.length && !geology && !firstAscent) return null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>📍</span><span>PEAK</span></div>{facts.length?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:(firstAscent||geology)?12:0}}>{facts.map(([label,val,strong])=><div key={label}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{label}</div><div style={{fontSize:strong?14:13,fontWeight:strong?700:400,color:strong?C.text:C.textSub}}>{val}</div></div>)}</div>:null}{firstAscent?<div style={{marginBottom:geology?12:0}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>First Ascent</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{firstAscent.date||""}{ firstAscent.date?" by ":""}{(firstAscent.climbers||[]).join(", ")}{firstAscent.notes?<div style={{marginTop:4,fontSize:12,color:C.textMuted,fontStyle:"italic"}}>{firstAscent.notes}</div>:null}</div></div>:null}{geology?<div><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>About this peak</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{geology}</div></div>:null}</div>;
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

export function SeasonalGuidancePanel({route, C}) {
  if (!route.seasonalGuidance) return null;
  const {optimalWindow, monthBreakdown} = route.seasonalGuidance;
  const sortedMonths = monthBreakdown ? Object.entries(monthBreakdown).sort((a,b)=>monthRank(a[0])-monthRank(b[0])) : [];
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>📅</span><span>SEASONAL GUIDANCE</span></div>{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{fontSize:11.5,fontWeight:700,color:C.green,marginBottom:3}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{sortedMonths.length?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{sortedMonths.map(([month,info])=>{const colors={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{fontSize:12,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{info.status}</div></div>;})}</div>:null}</div>;
}

export function HazardsDetailPanel({route, C}) {
  if (!route.seasonalHazards) return null;
  const {avalanche, weather, crevasses, exposure} = route.seasonalHazards;
  return <div style={{background:C.card,border:"1px solid "+C.redDim,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:3,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>⚠️</span><span>SEASONAL AVALANCHE & WEATHER OUTLOOK</span></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:10}}>Month-by-month planning reference — see Known Hazards above for live, community-reported conditions.</div>{avalanche?<div style={{marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>🏔️</span><span>Avalanche</span></div>{avalanche.zone?<div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>Zone: {avalanche.zone}</div>:null}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{Object.entries(avalanche.byMonth||{}).map(([month,level])=>{const colors={Considerable:[C.red,C.redBg],Moderate:[C.amber,C.amberBg],Low:[C.green,C.greenBg]};const [col,bg]=colors[level]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:10.5,color:C.textSub}}>{level}</div></div>;})}</div></div>:null}{weather?<div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>⛈️</span><span>Weather</span></div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:3}}>{weather.typical}</div>{weather.probability?<div style={{fontSize:12,color:C.amber,fontWeight:700,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"6px 10px"}}>{weather.probability}</div>:null}</div>:null}</div>;
}

export function CrowdsPanel({route, C}) {
  if (!route.crowds) return null;
  const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>👥</span><span>CROWDS & SOLITUDE</span></div>{estimatePerSeason?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Parties per season</div><div style={{fontSize:typeof estimatePerSeason==="number"?14:13,fontWeight:typeof estimatePerSeason==="number"?700:400,color:typeof estimatePerSeason==="number"?C.text:C.textSub,lineHeight:1.5}}>{typeof estimatePerSeason==="number"?estimatePerSeason+"+":estimatePerSeason}</div></div>:null}{peakTraffic?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Peak traffic</div><div style={{fontSize:13,color:C.textSub}}>{peakTraffic}</div></div>:null}{solitudeRating?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Solitude rating</div><div style={{fontSize:16}}>{'★'.repeat(solitudeRating)+'☆'.repeat(5-solitudeRating)}</div></div>:null}</div>;
}


export function PartnerRequirementsPanel({route, C}) {
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>🤝</span><span>PARTNER REQUIREMENTS</span></div>{experienceLevel?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.blue,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{approachTime?<div><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}

export function DataQualityPanel({route, C, liveGaps}) {
  if (!route.dataQuality) return null;
  const {confidence, lastVerified} = route.dataQuality;
  // Gaps are computed live by routeGaps() (same check that drives Overview's
  // "Help fill in the gaps" banner) rather than a separately hand-seeded list,
  // so the two can't drift out of sync.
  const gaps = liveGaps || route.dataQuality.gaps;
  const confColor=confidence==="HIGH"?C.green:confidence==="MEDIUM"?C.amber:C.red;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>📊</span><span>DATA QUALITY</span></div><div style={{marginBottom:10,padding:"8px 11px",background:confColor+"22",border:"1px solid "+confColor+"55",borderRadius:8}}><div style={{fontSize:12,fontWeight:700,color:confColor,marginBottom:2}}>Confidence: {confidence}</div><div style={{fontSize:11.5,color:C.textSub}}>Data verified from {lastVerified?lastVerified:"recent sources"}</div></div>{gaps&&gaps.length?<div><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>Flagged gaps:</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{gaps.map(g=><span key={g} style={{fontSize:11,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",padding:"2px 7px",borderRadius:5}}>{g}</span>)}</div></div>:null}</div>;
}
