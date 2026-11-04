import { C } from "../ClimbMatchCore.jsx";

export const condRow=function(k,v,tone,key){return <div key={key||k} style={{display:"grid",gridTemplateColumns:"104px minmax(0,1fr)",gap:10,padding:"7px 0",borderTop:"1px solid "+C.borderLight,fontSize:13,lineHeight:1.45}}><span style={{color:C.textMuted,fontSize:12}}>{k}</span><span style={{color:tone||C.text,minWidth:0}}>{v}</span></div>;};
export const condNote={fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginTop:8};
