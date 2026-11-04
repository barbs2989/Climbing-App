import { catOf, climbsAPeak } from "../ClimbMatchCore.jsx";

export function campingGate(route){
  return ["alpine","mountaineering","scrambling","ice","mixed"].includes(catOf(route))||climbsAPeak(route);
}
