import { C } from "../../ClimbMatchCore.jsx";
import { headerValue } from "../../lib/headerValue.js";

export type SeasonKey = "spring" | "summer" | "fall" | "winter";
/** A line of climate per season. */
export type ClimateSeasons = Partial<Record<SeasonKey, string | null>>;
/** The route's `climate` column. The seasons may sit at the top level or under `bySeason`. */
export interface Climate extends ClimateSeasons {
  typical?: string | null;
  forecastZone?: string | null;
  bySeason?: ClimateSeasons | null;
}
export interface ClimateRowsProps {
  climate: Climate;
}

/**
 * The CLIMATE part of the route page's one SEASON section (SeasonalGuidancePanel): the typical climate, a line per
 * season, and the forecast zone. It was its own CLIMATE & SEASON card until 2026-11-25, when the owner asked for the
 * Conditions tab's repeated season sections to be combined. Renders nothing when the route states none of it.
 */
export default function ClimateRows({climate:cl}: ClimateRowsProps){if(!cl||typeof cl!=="object")return null;const _bs: ClimateSeasons=(cl.bySeason&&typeof cl.bySeason==="object")?cl.bySeason:{};const sv=(k: SeasonKey)=>cl[k]||_bs[k]||null;const _seasons: [SeasonKey,string][]=[["spring","Spring"],["summer","Summer"],["fall","Fall"],["winter","Winter"]];const SEAS=_seasons.filter(s=>sv(s[0]));/* "Forecast zone — " labels a zone NAME; a paragraph stored there is not printed after the label (lib/headerValue.js). */const _fz=headerValue(cl.forecastZone);if(!cl.typical&&!SEAS.length&&!_fz)return null;return <div>{cl.typical?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,marginBottom:SEAS.length?10:0}}>{cl.typical}</div>:null}{SEAS.map(function(s,i){return <div key={s[0]} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"5px 0",borderTop:i===0?"none":`1px solid ${C.borderLight}`}}><span style={{fontSize:11,fontWeight:700,color:C.label,width:52,flexShrink:0,paddingTop:1}}>{s[1]}</span><span style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,flex:1,minWidth:0}}>{sv(s[0])}</span></div>;})}{_fz?<div style={{fontSize:11.5,color:C.textMuted,marginTop:9,paddingTop:8,borderTop:`1px solid ${C.borderLight}`,lineHeight:1.45}}>{"Forecast zone — "+_fz}</div>:null}</div>;}
/** True when the climate column holds anything ClimateRows would print. */
export function hasClimate(cl: Climate | null | undefined){if(!cl||typeof cl!=="object")return false;const _bs: ClimateSeasons=(cl.bySeason&&typeof cl.bySeason==="object")?cl.bySeason:{};return !!(cl.typical||headerValue(cl.forecastZone)||(["spring","summer","fall","winter"] as SeasonKey[]).some(k=>cl[k]||_bs[k]));}
