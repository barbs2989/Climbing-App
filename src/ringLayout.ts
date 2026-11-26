// THE AREA MAP'S RINGS, LAID OUT SO EVERY ONE CARRIES A NAME (owner, 2026-11-26: "some circles don't have
// names on them. It should always show a name"). Pure, so it can be measured outside the browser.
//
// Before this, rings were grouped by distance alone (48px) and only a SINGLE area's ring had a name, and only
// where its label happened to fit: on Mount Erie's map five of every six rings were bare. Now:
//   1. areas closer than `clusterPx` on screen share one ring, as before;
//   2. each ring is NAMED: a single area by its own name; a cluster by the deepest area its members share
//      below the state ("Powerline Area", "Mount Erie", "Leavenworth"), as Mountain Project names its
//      parent-area rings, else by its busiest area and how many more ("Powerline Wall West +4");
//   3. busiest ring first, the name is tried under, over, right and left of its ring, against every ring,
//      every name already placed and the map's own controls;
//   4. a ring whose name fits nowhere is MERGED into the nearest ring that is kept, and the layout runs
//      again, so no ring is ever drawn without its name. Zooming in pulls them apart again.
//   Rings inside the area the map was opened from never share one with rings outside it (`side`), so the
//   area's own rings carry its own names.

// `side` keeps rings apart that must never share one: inside the area the map was opened from, and outside it.
export interface RingPoint<A> { a: A; x: number; y: number; climbs: number; path: string; name: string; side?: number }
export interface Box { x0: number; y0: number; x1: number; y1: number }
export type LabelSide = "below" | "above" | "right" | "left";
export interface RingPlaced<A> { areas: A[]; x: number; y: number; climbs: number; name: string; side: LabelSide; box: Box; label: Box }

export const LABEL_MAX = 132;
export const LABEL_H = 14;
export const labelWidth = (name: string) => Math.min(LABEL_MAX, Math.round(name.length * 6.4) + 8);
// The ring's radius for a count: the hole grows in steps so the number fits (see ringHtml), plus the 8px band.
export const ringRadius = (t: number) => (t >= 10000 ? 15 : t >= 1000 ? 13 : t >= 100 ? 9 : 7) + 8;

const hit = (p: Box, q: Box) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;

// The deepest area every path shares, as an ltree label list. Below the state only: "usa.washington" is
// level 2, so a shared ancestor must be at index 2 or deeper to name anything narrower than the state.
export function sharedAncestor(paths: string[]): string | null {
  if (!paths.length) return null;
  const split = paths.map(p => p.split("."));
  let n = 0;
  for (;;) {
    const lab = split[0][n];
    if (lab == null || split.some(s => s[n] !== lab)) break;
    n++;
  }
  // A path that is wholly shared is one member's own path: then the shared area is that member itself.
  return n >= 3 ? split[0][n - 1] : null;
}

// Every ancestor id below the state that a cluster could be named by: the names to read.
export function ancestorIds(paths: string[]): string[] {
  const out = new Set<string>();
  paths.forEach(p => { const s = p.split("."); for (let i = 2; i < s.length - 1; i++) out.add(s[i]); });
  return Array.from(out);
}

function sides(x: number, y: number, r: number, w: number): [LabelSide, Box][] {
  return [
    ["below", { x0: x - w / 2, y0: y + r + 2, x1: x + w / 2, y1: y + r + 2 + LABEL_H }],
    ["above", { x0: x - w / 2, y0: y - r - 2 - LABEL_H, x1: x + w / 2, y1: y - r - 2 }],
    ["right", { x0: x + r + 3, y0: y - LABEL_H / 2, x1: x + r + 3 + w, y1: y + LABEL_H / 2 }],
    ["left", { x0: x - r - 3 - w, y0: y - LABEL_H / 2, x1: x - r - 3, y1: y + LABEL_H / 2 }],
  ];
}

export function layoutRings<A>(pts: RingPoint<A>[], opts: { clusterPx: number; nameOf: (id: string) => string | undefined; avoid: Box[]; width: number; height: number }): RingPlaced<A>[] {
  // 1. distance clustering, busiest first (the caller orders by climbs; keep it so).
  type G = RingPoint<A>[];
  let groups: G[] = [];
  const used = new Array(pts.length).fill(false);
  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    const g = [pts[i]]; used[i] = true;
    for (let j = i + 1; j < pts.length; j++) {
      if (!used[j] && (pts[i].side || 0) === (pts[j].side || 0) && Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < opts.clusterPx) { g.push(pts[j]); used[j] = true; }
    }
    groups.push(g);
  }
  const climbsOf = (g: G) => g.reduce((s, p) => s + p.climbs, 0);
  // A shared ring sits where its CLIMBS are, each area weighted by its count: a plain average let one
  // single-climb crag filed 2.7 km off drag Castle Rock's ring off Castle Rock.
  const wt = (p: RingPoint<A>) => Math.max(1, p.climbs);
  const centre = (g: G) => { const t = g.reduce((s, p) => s + wt(p), 0); return { x: g.reduce((s, p) => s + p.x * wt(p), 0) / t, y: g.reduce((s, p) => s + p.y * wt(p), 0) / t }; };
  const nameFor = (g: G, taken: Set<string>) => {
    if (g.length === 1) return g[0].name;
    const anc = sharedAncestor(g.map(p => p.path));
    const own = anc && g.find(p => p.path.split(".").pop() === anc);
    const n = anc ? (own ? own.name : opts.nameOf(anc)) : undefined;
    if (n && !taken.has(n)) return n;
    const top = g.reduce((b, p) => (p.climbs > b.climbs ? p : b), g[0]);
    return top.name + " +" + (g.length - 1);
  };
  // A label may run past the map's edge only as far as it would anyway at the edge; one wholly off it is no label.
  const onMap = (b: Box) => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= opts.width && b.y1 <= opts.height;
  for (let pass = 0; pass < 12; pass++) {
    groups.sort((p, q) => climbsOf(q) - climbsOf(p));
    const rings = groups.map(g => { const c = centre(g), r = ringRadius(climbsOf(g)); return { g, c, r, box: { x0: c.x - r, y0: c.y - r, x1: c.x + r, y1: c.y + r } }; });
    const placed: Box[] = opts.avoid.slice();
    const taken = new Set<string>();
    const out: RingPlaced<A>[] = [];
    const failed: number[] = [];
    rings.forEach((ring, i) => {
      const name = nameFor(ring.g, taken);
      const w = labelWidth(name);
      const opt = sides(ring.c.x, ring.c.y, ring.r, w).find(([, b]) => onMap(b) && !placed.some(p => hit(p, b)) && !rings.some((q, k) => k !== i && hit(q.box, b)));
      // Off the map's edge entirely is not a collision: that ring is drawn with its name below, cut by the edge.
      const offMap = !onMap(ring.box);
      if (!opt && !offMap) { failed.push(i); return; }
      const [side, label] = opt || sides(ring.c.x, ring.c.y, ring.r, w)[0];
      placed.push(label); taken.add(name);
      out.push({ areas: ring.g.map(p => p.a), x: ring.c.x, y: ring.c.y, climbs: climbsOf(ring.g), name, side, box: ring.box, label });
    });
    if (!failed.length || pass === 11) {
      // Last pass: any ring still without room keeps its name below; never a bare ring.
      failed.forEach(i => {
        const ring = rings[i], name = nameFor(ring.g, taken), lb = sides(ring.c.x, ring.c.y, ring.r, labelWidth(name))[0];
        out.push({ areas: ring.g.map(p => p.a), x: ring.c.x, y: ring.c.y, climbs: climbsOf(ring.g), name, side: lb[0], box: ring.box, label: lb[1] });
      });
      return out;
    }
    // 4. merge each ring that found no room into the nearest ring that did, then lay out again.
    const kept = rings.map((_r, i) => i).filter(i => !failed.includes(i));
    const next = kept.map(i => rings[i].g.slice());
    failed.forEach(i => {
      const c = rings[i].c;
      const sd = rings[i].g[0].side || 0;
      let best = -1, bd = Infinity;
      kept.forEach((k, ki) => { const d = Math.hypot(rings[k].c.x - c.x, rings[k].c.y - c.y); if ((rings[k].g[0].side || 0) === sd && d < bd) { bd = d; best = ki; } });
      if (best >= 0) next[best].push(...rings[i].g); else { kept.push(i); next.push(rings[i].g.slice()); }
    });
    groups = next;
  }
  return [];
}

// A ring's look: `focus` is the area the map was opened from (a red outline, as its bullseye); `dim` is a ring
// outside that area, drawn faint so the area itself stands out. `label` is placed by layoutRings, in the map's
// own pixels; it is moved here into the marker's box, whose centre is the ring's centre.
export interface RingLook { listed: boolean; focus: boolean; dim: boolean; label: { text: string; box: Box; side: RingPlaced<unknown>["side"]; x: number; y: number } | null }
export function ringHtml(color: string, total: number, look: RingLook): { html: string; box: number } {
  const a = total >= 10000 ? 15 : total >= 1000 ? 13 : total >= 100 ? 9 : 7;
  const R = a + 8, box = Math.max(36, 2 * R + 8), c = box / 2;
  const band = "<circle cx='" + c + "' cy='" + c + "' r='" + (a + 4) + "' fill='none' stroke='" + color + "' stroke-width='8'/>";
  const hole = "<circle cx='" + c + "' cy='" + c + "' r='" + a + "' fill='#f2f2f2'/>";
  const num = "<text x='" + c + "' y='" + c + "' dy='3' text-anchor='middle' font-size='9' font-weight='700' font-family='system-ui,sans-serif' fill='#000'>" + total.toLocaleString("en-US") + "</text>";
  const edge = look.focus
    ? "<circle cx='" + c + "' cy='" + c + "' r='" + (R + 1.5) + "' fill='none' stroke='#fff' stroke-width='4'/><circle cx='" + c + "' cy='" + c + "' r='" + (R + 1.5) + "' fill='none' stroke='#c00' stroke-width='2.5'/>"
    : "<circle cx='" + c + "' cy='" + c + "' r='" + (R - 0.25) + "' fill='none' stroke='#f2f2f2' stroke-width='0.5'/>";
  const sx = c + R * 0.72, sy = c - R * 0.72, s = 6.5;
  const star = look.listed ? "<polygon points='" + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const r = k % 2 ? s * 0.45 : s, t = -Math.PI / 2 + k * Math.PI / 5; return (sx + r * Math.cos(t)).toFixed(1) + "," + (sy + r * Math.sin(t)).toFixed(1); }).join(" ") + "' fill='#e3b341' stroke='#1a1916' stroke-width='1.2' stroke-linejoin='round'/>" : "";
  const svg = "<svg width='" + box + "' height='" + box + "' viewBox='0 0 " + box + " " + box + "' style='display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.55))' aria-hidden='true'>" + band + hole + num + edge + star + "</svg>";
  const op = look.dim ? "opacity:0.5;" : "";
  if (!look.label) return { box, html: "<div style='" + op + "'>" + svg + "</div>" };
  const L = look.label, safe = L.text.replace(/[<>&"']/g, "");
  const left = L.box.x0 - L.x + c, top = L.box.y0 - L.y + c, w = L.box.x1 - L.box.x0;
  const align = L.side === "right" ? "left" : L.side === "left" ? "right" : "center";
  const tag = "<div aria-hidden='true' style='position:absolute;left:" + left.toFixed(1) + "px;top:" + top.toFixed(1) + "px;width:" + w.toFixed(0) + "px;max-width:" + LABEL_MAX + "px;text-align:" + align + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:" + (look.focus ? 800 : 700) + " 11px/" + LABEL_H + "px system-ui,sans-serif;color:" + (look.focus ? "#9a0000" : "#1a1916") + ";text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 3px #fff;pointer-events:none'>" + safe + "</div>";
  return { box, html: "<div style='position:relative;width:" + box + "px;height:" + box + "px;" + op + "'>" + svg + tag + "</div>" };
}
// The area you came from, marked as MP marks it (/img/map/locator.svg): a fixed red bullseye, 120px,
// on the area's own point. It takes no taps; the rings above it do. Drawn heavier than MP's (owner,
// 2026-11-26: "the circle icon should be more noticeable"): each red ring rides on a white one so it reads
// on satellite and on a crowded street map alike, and the middle is washed red.
export const LOCATOR_HTML = "<svg width='120' height='120' viewBox='0 0 120 120' aria-hidden='true' style='overflow:visible'>" +
  "<circle cx='60' cy='60' r='43' fill='#c00' fill-opacity='0.10'/>" +
  "<g fill='none' stroke='#fff' stroke-opacity='0.9' stroke-width='5'><circle cx='60' cy='60' r='57'/><circle cx='60' cy='60' r='43'/><circle cx='60' cy='60' r='25.5'/></g>" +
  "<g fill='none' stroke='#c00'><circle cx='60' cy='60' r='57' stroke-width='3'/><circle cx='60' cy='60' r='43' stroke-width='2'/><circle cx='60' cy='60' r='25.5' stroke-width='3'/>" +
  "<path d='M60 0v12M60 108v12M0 60h12M108 60h12' stroke-width='3' stroke-linecap='round'/></g></svg>";
// The area's outline: the hull of its pins, each widened by `padM` metres so a crag at the edge sits inside it
// rather than on the line. Plain geometry over lat/lng scaled to metres (an area is never wide enough for the
// earth's curve to matter at this scale).
export function areaOutline(pts: { lat: number; lng: number }[], padM: number): [number, number][] {
  if (!pts.length) return [];
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  const xy: [number, number][] = [];
  pts.forEach(p => { for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6; xy.push([p.lng * kx + padM * Math.cos(t), p.lat * ky + padM * Math.sin(t)]); } });
  xy.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], hi: [number, number][] = [];
  xy.forEach(p => { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  xy.slice().reverse().forEach(p => { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
  return lo.slice(0, -1).concat(hi.slice(0, -1)).map(([x, y]) => [y / ky, x / kx]);
}
