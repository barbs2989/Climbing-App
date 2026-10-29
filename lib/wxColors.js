import { C } from "../ClimbMatchCore.jsx";

export function wxTempColor(f){return f>=85?C.red:f>=70?C.amber:f>=50?C.green:f>=32?C.teal:C.blue;}
export function wxWindColor(mph){return mph>=30?C.red:mph>=15?C.amber:C.green;}
// Sky cover in the National Weather Service's words for eighths of sky (0-1, 2, 3-5, 6-7, 8 oktas).
export const skyWord=function(pct){return pct<=12?"Clear":pct<=37?"Mostly clear":pct<=62?"Partly cloudy":pct<=87?"Mostly cloudy":"Overcast";};
