import { useContext } from "react";
import { C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import { HelpFillRows } from "../../lib/helpFill.js";

/* "ROUTE BREAKDOWN" -> "Route breakdown": the rows are a list to read, not a column of section headings. */
const rowTitle = (t: string) => { const s = String(t || "").trim(); return s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; };

/**
 * "HELP FILL THIS IN": one card listing every section of the open tab that nobody has written yet, each row
 * with that section's own add button (lib/helpFill.js). Rows follow the order the sections have on the page.
 * Draws nothing when every section has content.
 */
export default function HelpFillList() {
  const rows = useContext(HelpFillRows);
  if (!rows.length) return null;
  const sorted = rows.slice().sort((a, b) => {
    if (!a.mark || !b.mark || !a.mark.isConnected || !b.mark.isConnected) return 0;
    const p = a.mark.compareDocumentPosition(b.mark);
    return p & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : p & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  });
  return <div data-help-fill-list="" style={{marginBottom:ROUTE_GAP}}>
    <SL>HELP FILL THIS IN</SL>
    <div style={{background:C.card,borderRadius:12,padding:"4px 14px",border:"1px solid "+C.border}}>
      <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"8px 0 9px"}}>{sorted.length===1?"One section here has nothing in it yet.":sorted.length+" sections here have nothing in them yet."}{" Add what you know."}</div>
      {sorted.map((r) => <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",borderTop:"1px solid "+C.borderLight}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:700,color:C.text,lineHeight:1.3,overflowWrap:"anywhere"}}>{rowTitle(r.title)}</div>
          <div style={{fontSize:12,color:C.textMuted,lineHeight:1.45,marginTop:1}}>{r.why||r.what}</div>
        </div>
        {r.fix?<button onClick={r.fix} style={{flexShrink:0,maxWidth:"46%",minHeight:44,padding:"0 2px",border:"none",background:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",textAlign:"right"}}>{(r.cta||"Add what you know")+" →"}</button>:null}
      </div>)}
    </div>
  </div>;
}
