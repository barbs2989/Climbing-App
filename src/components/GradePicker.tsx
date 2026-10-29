import { gradeGroups, C } from "../../ClimbMatchCore.jsx";
import { useState } from "react";
import { CHIP } from "../../lib/buttonStyles.js";

/** A rung of a grade scale split in two: [suffix, whole grade], e.g. ["+", "5.9+"]. */
type Variant = [string, string];
export interface GradePickerProps {
  /** The discipline's grade scale, easiest first (ADDR_GRADES). */
  scale: string[];
  /** The grade stored now; "" when none. */
  value: string;
  /** Receives the picked grade, or "" when the picked chip is tapped again. */
  onChange: (grade: string) => void;
  /** Prefixes every chip's accessible name. */
  label: string;
}

/* Each variant chip reads as the whole grade ("5.9−", "5.9", "5.9+") rather than the bare
   suffix: the plain grade used to be a lone "·", which read as a stray dot, not as "5.9". */
const gradeChipLabel=function(g: string){return String(g).replace(/-$/,"−");};
/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function GradePicker({scale,value,onChange,label}: GradePickerProps){
  const groups=gradeGroups(scale);
  const active=groups.find(function(g){return g.variants.some(function(x: Variant){return x[1]===value;});});
  const [openStem,setOpenStem]=useState(active?active.stem:null);
  const shown=groups.find(function(g){return g.stem===openStem;});
  const chip=function(on: boolean){return {...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub};};
  const pickStem=function(g: {stem: string; variants: Variant[]}){
    setOpenStem(g.stem);
    // One variant means the stem IS the grade — selecting it needs no second question.
    if(g.variants.length===1)onChange(value===g.variants[0][1]?"":g.variants[0][1]);
  };
  return <div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"2px 0"}}>{groups.map(function(g){
      const isSel=g.variants.some(function(x: Variant){return x[1]===value;});
      return <button key={g.stem} aria-label={label+" "+g.stem} aria-pressed={isSel} onClick={function(){pickStem(g);}} style={chip(isSel||g.stem===openStem)}>{g.stem}</button>;
    })}</div>
    {(shown&&shown.variants.length>1)?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginTop:7,padding:"7px 9px",background:C.surface,borderRadius:9,border:"1px solid "+C.border}}>
            {/* From 5.10 up, YDS grades carry a letter (5.10a-d) or a +/-; a bare "5.10" is rarely
        written, so it is not offered once letter options exist. It still shows if the route is
        ALREADY stored as exactly that grade, so the value can be seen and cleared. The bare
        grade stays in ADDR_YDS itself, which also orders grades for sorting. */}
      {shown.variants.filter(function(x: Variant){return x[0]!==""||value===x[1]||!shown.variants.some(function(y: Variant){return /^[a-d]$/.test(y[0]);});}).map(function(x: Variant){
        const on=value===x[1];
        return <button key={x[1]} aria-label={label+" "+x[1]} aria-pressed={on} onClick={function(){onChange(on?"":x[1]);}} style={Object.assign({},chip(on),{minWidth:38,textAlign:"center",padding:"7px 10px"})}>{gradeChipLabel(x[1])}</button>;
      })}
      <span style={{fontSize:11.5,color:C.textMuted,marginLeft:"auto"}}>{value?value:"none set"}</span>
    </div>:null}
  </div>;
}
