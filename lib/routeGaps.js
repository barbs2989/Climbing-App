import { uImp, catOf } from "../ClimbMatchCore.jsx";
import { routeRackFor, rackRows } from "./rack";

/* A track-coverage gap, in the reader's own units. Rounded to a tenth deliberately: the gap
   is a measurement between a hand-placed pin and a recorded line, and two decimals would
   claim a precision neither record has. uImp() is the real boolean — uDistMi is a FORMATTER
   and is always truthy, the #641 trap. */
export function _gapDist(m){return uImp()?((Math.round(m/1609.344*10)/10)+" mi"):((Math.round(m/100)/10)+" km");}
/* gapGear asks the RACK box's own question -- routeRackFor, the chain the box renders (an agreed
   correction, detailedRack, proNeeds, rack) -- so "No gear or rack listed" can never sit under a
   rack the box is showing. It used to read `rack` and `gearTiers.required` instead. It missed
   detailedRack: measured 2026-10-14, 2,610 routes hold their rack ONLY there (no rack, no gear), and
   1,174 of them are stored alpine/ice/mixed, where this note renders -- each told "Nothing says what to
   bring" above its own rack. And it counted gearTiers.required, which nothing renders since GearTiers
   went (#2375): an agreed rack correction is written to `rack` as well, while a legacy `gear`
   contribution lands in gearTiers.required ONLY, so counting it hid the gap on a route showing
   nothing. The seed routes that carry gearTiers all carry `rack` too, so none of them changes. */
export function gapGear(r){if(!r)return false;const roped=["trad","sport","alpine","ice","mixed","aid"].indexOf(catOf(r))>=0;return roped&&!((r.cams&&r.cams.length)||routeRackFor(r)||rackRows(r).length||(r.gearBeta&&r.gearBeta.length));}
export function gapPitches(r){return !!r&&r.discipline!=="bouldering"&&(r.pitches>1)&&!(r.pitchDetail&&r.pitchDetail.length);}
export function gapTrack(r){return !!r&&!(r.gpxPts&&r.gpxPts.length>=3);}
