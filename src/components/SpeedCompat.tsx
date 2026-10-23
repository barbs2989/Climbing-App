import { C, uRateN, uRateUnit } from "../../ClimbMatchCore.jsx";
import Bar from "./Bar.tsx";

/** A climber as the pace comparison reads one: the recorded trail gain rate, the name, and whether `a`'s rate was typed rather than measured. */
export interface SpeedClimber {
  name?: string | null;
  hikingSpeedFtHr?: number | string | null;
  speedSelfReported?: boolean;
}

export interface SpeedCompatProps {
  /** The viewer. */
  a: SpeedClimber;
  /** The climber whose profile is open. */
  b: SpeedClimber;
}

/**
 * SPEED COMPATIBILITY on a profile: both trail gain rates side by side with a verdict, or, when either is unrecorded,
 * a sentence saying there is nothing to compare yet. Rates render in the climber's units (`uRateN`/`uRateUnit`).
 */
export default function SpeedCompat({a,b}: SpeedCompatProps){
  /* TWO FALLBACKS FOR ONE MISSING VALUE, FOUR LINES APART. `diff` substituted 950 for a pace
     nobody had recorded while the number on screen substituted 0, so a climber who has never set
     a pace saw "0 · You" beside "1,400 · Alex" and the verdict "450 ft/hr difference — discuss
     pace". 1,400 - 0 is not 450: the panel was comparing them against an invented 950, colouring
     itself from it, and telling them to discuss a pace they never gave. The #654 shape (a seed
     climber's 950 shown as a new user's own) in a place the sweep did not reach.
     `compat()` had the same defect and its comment records the fix -- `hikingSpeedFtHr||1000` on
     both sides made every difference 0 -- so it now scores pace only when BOTH are known and
     counts the gap as unknown otherwise. That is the rule here too: with a pace missing there is
     no comparison to make, and saying so is the only honest thing on offer. */
  const _pa=Number(a.hikingSpeedFtHr)||0,_pb=Number(b.hikingSpeedFtHr)||0,_them=String(b.name||"They").split(" ")[0];
  if(!_pa||!_pb)return <div style={{background:C.surface,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:5}}>SPEED COMPATIBILITY</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.45}}>{(!_pa&&!_pb)?("Neither of you has recorded a trail pace, so there is nothing to compare yet."):(!_pa?("Add your typical trail gain rate and this will compare it with "+_them+"’s."):(_them+" hasn’t recorded a trail pace, so there is nothing to compare yet."))}</div></div>;
  const diff=Math.abs(_pa-_pb),ok=diff<300,pct=Math.max(0,Math.min(100,100-Math.round(diff/5)));
  return <div style={{background:ok?C.greenBg:C.amberBg,borderRadius:10,padding:"10px 12px",border:`1px solid ${ok?C.greenDim:C.amber+"44"}`}}><div style={{fontSize:12,fontWeight:700,color:ok?C.green:C.amber,marginBottom:5}}>SPEED COMPATIBILITY</div><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><div style={{flex:1,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700}}>{uRateN(_pa).toLocaleString()}</div><div style={{fontSize:12,color:C.textMuted}}>{"You"+(a.speedSelfReported?" (self-reported)":"")}</div></div><div style={{fontSize:17}}>{ok?"✓":"✕"}</div><div style={{flex:1,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700}}>{uRateN(_pb).toLocaleString()}</div><div style={{fontSize:12,color:C.textMuted}}>{_them}</div></div></div><Bar val={pct} color={ok?C.green:C.amber}/><div style={{fontSize:12,color:C.textSub,marginTop:5}}>{ok?`Within ${uRateN(diff)}${uRateUnit()} — well matched`:`${uRateN(diff)}${uRateUnit()} difference — discuss pace`}</div></div>;
}
