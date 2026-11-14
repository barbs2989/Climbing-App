import { C, RSL as SL } from "../../ClimbMatchCore.jsx";

export type SeasonKey = "spring" | "summer" | "fall" | "winter";
/** A line of climate per season. */
export type ClimateSeasons = Partial<Record<SeasonKey, string | null>>;
/** The route's `climate` column. The seasons may sit at the top level or under `bySeason`. */
export interface Climate extends ClimateSeasons {
  typical?: string | null;
  forecastZone?: string | null;
  bySeason?: ClimateSeasons | null;
}
export interface ClimateSeasonCardProps {
  route: { climate?: Climate | null };
}

/**
 * CLIMATE & SEASON: the typical climate, a line per season, and the forecast zone. Reads `C` at render time.
 * Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function ClimateSeasonCard({route}: ClimateSeasonCardProps){const cl=route.climate;if(!cl||typeof cl!=="object")return null;const _bs: ClimateSeasons=(cl.bySeason&&typeof cl.bySeason==="object")?cl.bySeason:{};const sv=(k: SeasonKey)=>cl[k]||_bs[k]||null;const _seasons: [SeasonKey,string][]=[["spring","Spring"],["summer","Summer"],["fall","Fall"],["winter","Winter"]];const SEAS=_seasons.filter(s=>sv(s[0]));if(!cl.typical&&!SEAS.length&&!cl.forecastZone)return null;return <><SL>CLIMATE & SEASON</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>{cl.typical?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,marginBottom:SEAS.length?10:0}}>{cl.typical}</div>:null}{SEAS.map(function(s,i){return <div key={s[0]} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"5px 0",borderTop:i===0?"none":`1px solid ${C.borderLight}`}}><span style={{fontSize:11,fontWeight:700,color:C.textMuted,width:52,flexShrink:0,paddingTop:1}}>{s[1]}</span><span style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,flex:1,minWidth:0}}>{sv(s[0])}</span></div>;})}{cl.forecastZone?<div style={{fontSize:11.5,color:C.textMuted,marginTop:9,paddingTop:8,borderTop:`1px solid ${C.borderLight}`,lineHeight:1.45}}>{"Forecast zone — "+cl.forecastZone}</div>:null}</div></>;}
