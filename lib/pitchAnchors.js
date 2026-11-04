import { breakdownRows } from "./breakdownRows.js";

// exists. `check:pitch-split` pins both directions of the surviving rule.
export function pitchShortfall(route,shown){const described=(route&&Array.isArray(route.pitchDetail))?route.pitchDetail.length:0;return !!(route&&route.pitches>described&&route.pitches>shown);}
/* ANCHORS CHANGE BY PITCH (owner's note, 2026-10-24: "some use trees or gear and some are bolted").
   anchorKind() files a stored anchor string under the editor's own PITCH_ANCHORS vocabulary, so a
   "2-bolt anchor (alcove)" lights the Bolted chip and the page can say which pitches end where.
   Walk-off first (a "walk off, no anchor" must not read as bolted), then fixed anchors, then the
   natural ones; gear last because "gear" also appears as a qualifier. Null when nothing matches. */
export function anchorKind(s){const t=String(s||"").toLowerCase();if(!t.trim())return null;
  if(/walk[\s-]?off|no belay|unroped/.test(t))return "Walk-off (no belay)";
  if(/bolt|chain|ring|glue[\s-]?in|fixed anchor|rap station/.test(t))return "Bolted";
  if(/tree|bush|shrub/.test(t))return "Tree";
  if(/horn|block|chockstone|boulder/.test(t))return "Slung horn / block";
  if(/piton|fixed pin|\bpins?\b/.test(t))return "Fixed pin";
  if(/picket|deadman|snow anchor|bollard/.test(t))return "Picket";
  if(/screw|v[\s-]?thread|abalakov/.test(t))return "Ice screws";
  if(/gear|cam|nut|natural|trad/.test(t))return "Gear";
  return null;}
/* "P1–3, P5" from a list of pitch numbers. */
export function pitchSpanText(ns){const s=ns.slice().sort(function(a,b){return a-b;});const out=[];for(let i=0;i<s.length;i++){let j=i;while(j+1<s.length&&s[j+1]===s[j]+1)j++;out.push(j>i?"P"+s[i]+"–"+s[j]:"P"+s[i]);i=j;}return out.join(", ");}
/* The route's anchors, pitch by pitch, grouped by kind in climbing order: [[kind, "P1–3, P5"], …].
   Null unless at least two roped pitches carry a classifiable anchor AND they are not all one kind —
   a route whose every belay is bolted says nothing a single Anchor value does not. */
export function pitchAnchorSummary(route){const rows=breakdownRows(route).rows.filter(function(r){return r._kind==="pitch"&&anchorKind(r.anchor);});if(rows.length<2)return null;const by={};const order=[];rows.forEach(function(r){const k=anchorKind(r.anchor);const n=parseInt(r._badge,10);if(!isFinite(n))return;if(!by[k]){by[k]=[];order.push(k);}by[k].push(n);});if(order.length<2)return null;return order.map(function(k){return [k,pitchSpanText(by[k])];});}
