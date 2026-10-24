import { createPortal } from "react-dom";
import { C } from "../../ClimbMatchCore.jsx";

/** One row of the sheet: its label, what it does, and whether it is the destructive one (drawn red). */
export type CommentMenuItem = [label: string, action: () => void, danger?: boolean];

export interface CommentMenuProps {
  /** The dialog's accessible name, e.g. "Comment options". */
  label: string;
  items: CommentMenuItem[];
  onClose: () => void;
}

/* The ⋯ sheet of a comment, its own component as ReactionPicker is: overlay discovery reads a component that renders a dialog as a dialog, and Comments itself is not one. */
export default function CommentMenu({label,items,onClose}: CommentMenuProps){const closeMenu=onClose;const menuList=items;return createPortal(<div onClick={closeMenu} tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape")closeMenu();}} role="dialog" aria-modal="true" aria-label={label} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9700,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",padding:8,border:"1px solid "+C.border,borderBottom:"none",boxSizing:"border-box"}}>{menuList.map(x=><button key={x[0]} onClick={()=>{closeMenu();x[1]();}} style={{width:"100%",textAlign:"left",padding:"13px 14px",background:"none",border:"none",color:x[2]?C.red:C.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>{x[0]}</button>)}<button onClick={closeMenu} style={{width:"100%",padding:"13px 14px",background:"none",border:"none",borderTop:"1px solid "+C.borderLight,color:C.textSub,fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancel</button></div></div>,document.body);}
