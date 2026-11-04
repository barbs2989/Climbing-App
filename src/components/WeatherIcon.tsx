import type { SVGProps } from "react";
import { weatherIconKind } from "../../lib/weatherIconKind.js";

export interface WeatherIconProps {
  /** A WMO weather code; null or undefined draws nothing. */
  code?: number | null;
  /** Stroke colour (default the surrounding text colour). */
  color?: string;
  /** Size in px (default 16). */
  size?: number;
}

/** A weather glyph drawn as inline SVG for a WMO weather code. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function WeatherIcon({code,color,size}: WeatherIconProps){const kind=weatherIconKind(code);if(!kind)return null;const s=size||16;const p: SVGProps<SVGSVGElement>={width:s,height:s,viewBox:"0 0 24 24",fill:"none",stroke:color||"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",style:{flexShrink:0}};if(kind==="sun")return <svg {...p}><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></svg>;if(kind==="cloudSun")return <svg {...p}><circle cx="8" cy="8" r="3.2"/><line x1="8" y1="2.5" x2="8" y2="4"/><line x1="2.5" y1="8" x2="4" y2="8"/><line x1="3.8" y1="3.8" x2="4.8" y2="4.8"/><path d="M8.5 20h8a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-2A4.5 4.5 0 0 0 6.5 20z"/></svg>;if(kind==="cloud")return <svg {...p}><path d="M6.5 20h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 20z"/></svg>;if(kind==="fog")return <svg {...p}><path d="M6.5 15h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 15z"/><line x1="4" y1="19" x2="20" y2="19"/><line x1="6" y1="22" x2="18" y2="22"/></svg>;if(kind==="rain")return <svg {...p}><path d="M6.5 14h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 14z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/></svg>;if(kind==="snow")return <svg {...p}><path d="M6.5 14h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 14z"/><line x1="8" y1="18" x2="8" y2="22"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="16" y1="18" x2="16" y2="22"/><line x1="6.5" y1="20" x2="9.5" y2="20"/><line x1="10.5" y1="20" x2="13.5" y2="20"/><line x1="14.5" y1="20" x2="17.5" y2="20"/></svg>;if(kind==="storm")return <svg {...p}><path d="M6.5 13h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 13z"/><polyline points="13 13 10 18 13 18 11 23"/></svg>;return null;}
