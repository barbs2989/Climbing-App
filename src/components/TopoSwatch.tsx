
export interface TopoSwatchProps {
  /** The line's colour. */
  color: string;
  /** Draw it dashed, as a variation is drawn on the photo. */
  dashed?: boolean;
}

/**
 * A short sample of a topo line (solid, or dashed for a variation) for the topo's key. Decorative (aria-hidden):
 * the key's text names the line. Moved verbatim from RouteDetail.jsx; only the props type was added.
 */
export default function TopoSwatch({color,dashed}: TopoSwatchProps){return <span aria-hidden="true" style={{display:"inline-block",width:16,height:4,borderRadius:2,background:dashed?"repeating-linear-gradient(90deg,"+color+" 0 5px,transparent 5px 8px)":color,boxShadow:"0 0 0 1px rgba(0,0,0,0.6)",flexShrink:0}}/>;}
