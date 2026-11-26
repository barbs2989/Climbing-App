// Step 4b (US): every amenity=parking / highway=trailhead in one Geofabrik .osm.pbf, read with a minimal hand-written
// PBF decoder (no packages: the box may not install any). Two passes: (1) tagged nodes, and parking WAYS with their
// first 6 node refs; a block whose string table holds neither "parking" nor "trailhead" is skipped untouched;
// (2) the coordinates of those refs, averaged into the way's centre (a lot's first corners lie inside its outline,
// which is all a pin needs). Relations (multipolygon lots) are rare and left out.
// Usage: node pbf-lots.mjs <file.osm.pbf> <out.json>
import fs from 'node:fs';
import zlib from 'node:zlib';
const [IN, OUT] = process.argv.slice(2); if (!OUT) throw new Error('usage: node pbf-lots.mjs <in.pbf> <out.json>');
const KEEP = new Set(['name', 'access', 'fee', 'amenity', 'highway', 'parking', 'operator', 'capacity', 'description', 'note']);

// ---- protobuf primitives over a Buffer ----
function* fields(buf, start = 0, end = buf.length) {
  let p = start;
  while (p < end) {
    let key = 0, s = 0, b;
    do { b = buf[p++]; key += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80);
    const f = Math.floor(key / 8), w = key & 7;
    if (w === 0) { let v = 0; s = 0; do { b = buf[p++]; v += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); yield [f, w, v]; }
    else if (w === 2) { let l = 0; s = 0; do { b = buf[p++]; l += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); yield [f, w, p, p + l]; p += l; }
    else if (w === 1) { p += 8; } else if (w === 5) { p += 4; } else throw new Error('wire ' + w);
  }
}
const packed = (buf, a, b) => { const out = []; let p = a; while (p < b) { let v = 0, s = 0, x; do { x = buf[p++]; v += (x & 0x7f) * 2 ** s; s += 7; } while (x & 0x80); out.push(v); } return out; };
const zz = (v) => (v % 2 === 0 ? v / 2 : -(v + 1) / 2);

// ---- blob iteration ----
function* blocks(fd) {
  const head = Buffer.alloc(4); let pos = 0; const size = fs.fstatSync(fd).size;
  while (pos < size) {
    fs.readSync(fd, head, 0, 4, pos); const hl = head.readUInt32BE(0); pos += 4;
    const hb = Buffer.alloc(hl); fs.readSync(fd, hb, 0, hl, pos); pos += hl;
    let type = '', ds = 0; for (const [f, w, a, b] of fields(hb)) { if (f === 1) type = hb.toString('utf8', a, b); if (f === 3) ds = a; }
    const bb = Buffer.alloc(ds); fs.readSync(fd, bb, 0, ds, pos); pos += ds;
    if (type !== 'OSMData') continue;
    let data = null; for (const [f, w, a, b] of fields(bb)) { if (f === 1) data = bb.subarray(a, b); if (f === 3) data = zlib.inflateSync(bb.subarray(a, b)); }
    if (data) yield data;
  }
}
function parseBlock(d) {
  let st = null, gran = 100, lato = 0, lono = 0; const groups = [];
  for (const [f, w, a, b] of fields(d)) {
    if (f === 1) { st = []; for (const [g, , x, y] of fields(d, a, b)) if (g === 1) st.push(d.toString('utf8', x, y)); }
    else if (f === 2) groups.push([a, b]);
    else if (f === 17) gran = a; else if (f === 19) lato = zz(a); else if (f === 20) lono = zz(a);
  }
  return { st, gran, lato, lono, groups };
}

const nodes = []; const ways = []; const want = new Map(); // ref id -> [lat,lng]
const fd = fs.openSync(IN, 'r');
let nb = 0;
for (const d of blocks(fd)) {
  nb++;
  const B = parseBlock(d);
  const ip = B.st.indexOf('parking'), it = B.st.indexOf('trailhead'), ia = B.st.indexOf('amenity'), ih = B.st.indexOf('highway');
  if ((ip < 0 || ia < 0) && (it < 0 || ih < 0)) continue;
  const hit = (k, v) => (k === ia && v === ip) || (k === ih && v === it);
  const tagsOf = (ks, vs) => { const t = {}; for (let i = 0; i < ks.length; i++) { const k = B.st[ks[i]]; if (KEEP.has(k)) t[k] = B.st[vs[i]]; } return t; };
  for (const [ga, gb] of B.groups) for (const [f, , a, b] of fields(d, ga, gb)) {
    if (f === 2) { // DenseNodes
      let ids = [], lats = [], lons = [], kv = [];
      for (const [g, , x, y] of fields(d, a, b)) { if (g === 1) ids = packed(d, x, y); else if (g === 8) lats = packed(d, x, y); else if (g === 9) lons = packed(d, x, y); else if (g === 10) kv = packed(d, x, y); }
      if (!kv.length) continue;
      let id = 0, la = 0, lo = 0, k = 0;
      for (let i = 0; i < ids.length; i++) {
        id += zz(ids[i]); la += zz(lats[i]); lo += zz(lons[i]);
        const ks = [], vs = []; let h = false;
        while (k < kv.length && kv[k] !== 0) { ks.push(kv[k]); vs.push(kv[k + 1]); if (hit(kv[k], kv[k + 1])) h = true; k += 2; }
        k++;
        if (h) nodes.push({ osm: 'n' + id, lat: (B.lato + B.gran * la) * 1e-9, lng: (B.lono + B.gran * lo) * 1e-9, t: tagsOf(ks, vs) });
      }
    } else if (f === 1) { // plain Node
      let id = 0, ks = [], vs = [], la = 0, lo = 0;
      for (const [g, , x, y] of fields(d, a, b)) { if (g === 1) id = zz(x); else if (g === 2) ks = packed(d, x, y); else if (g === 3) vs = packed(d, x, y); else if (g === 8) la = zz(x); else if (g === 9) lo = zz(x); }
      if (ks.some((kk, i) => hit(kk, vs[i]))) nodes.push({ osm: 'n' + id, lat: (B.lato + B.gran * la) * 1e-9, lng: (B.lono + B.gran * lo) * 1e-9, t: tagsOf(ks, vs) });
    } else if (f === 3) { // Way
      let id = 0, ks = [], vs = [], refs = [];
      for (const [g, , x, y] of fields(d, a, b)) { if (g === 1) id = x; else if (g === 2) ks = packed(d, x, y); else if (g === 3) vs = packed(d, x, y); else if (g === 8) refs = packed(d, x, y); }
      if (!ks.some((kk, i) => hit(kk, vs[i]))) continue;
      const r = []; let acc = 0; for (let i = 0; i < refs.length && r.length < 6; i++) { acc += zz(refs[i]); r.push(acc); }
      for (const x of r) want.set(x, null);
      ways.push({ osm: 'w' + id, refs: r, t: tagsOf(ks, vs) });
    }
  }
}
console.log(IN, 'blocks', nb, 'nodes', nodes.length, 'ways', ways.length, 'refs', want.size);
// pass 2: coordinates of the refs
for (const d of blocks(fd)) {
  const B = parseBlock(d);
  for (const [ga, gb] of B.groups) for (const [f, , a, b] of fields(d, ga, gb)) {
    if (f === 2) {
      let ids = [], lats = [], lons = [];
      for (const [g, , x, y] of fields(d, a, b)) { if (g === 1) ids = packed(d, x, y); else if (g === 8) lats = packed(d, x, y); else if (g === 9) lons = packed(d, x, y); }
      let id = 0, la = 0, lo = 0;
      for (let i = 0; i < ids.length; i++) { id += zz(ids[i]); la += zz(lats[i]); lo += zz(lons[i]); if (want.has(id)) want.set(id, [(B.lato + B.gran * la) * 1e-9, (B.lono + B.gran * lo) * 1e-9]); }
    } else if (f === 1) {
      let id = 0, la = 0, lo = 0;
      for (const [g, , x] of fields(d, a, b)) { if (g === 1) id = zz(x); else if (g === 8) la = zz(x); else if (g === 9) lo = zz(x); }
      if (want.has(id)) want.set(id, [(B.lato + B.gran * la) * 1e-9, (B.lono + B.gran * lo) * 1e-9]);
    } else if (f === 3) break; // ways come after nodes: nothing more to read in this group
  }
}
fs.closeSync(fd);
const out = [...nodes];
for (const w of ways) { const c = w.refs.map((r) => want.get(r)).filter(Boolean); if (!c.length) continue;
  out.push({ osm: w.osm, lat: +(c.reduce((s, x) => s + x[0], 0) / c.length).toFixed(7), lng: +(c.reduce((s, x) => s + x[1], 0) / c.length).toFixed(7), t: w.t }); }
for (const x of out) { x.lat = +(+x.lat).toFixed(7); x.lng = +(+x.lng).toFixed(7); }
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', out.length);
