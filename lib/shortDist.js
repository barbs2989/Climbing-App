import { uImp } from "../ClimbMatchCore.jsx";

/* A STUB IS MEASURED IN METRES, NOT IN TENTHS OF A KILOMETRE. _gapDist above is for the kilometre
   scale a partial track is short by; feeding it seven metres prints "0 km", which undercuts the one
   fact the sentence carries. uImp() is the real boolean here too — uDistMi is a FORMATTER and is
   always truthy, the #641 trap this file records. */
export function _shortDist(m){return uImp()?(Math.round(m*3.28084)+" ft"):(Math.round(m)+" m");}
