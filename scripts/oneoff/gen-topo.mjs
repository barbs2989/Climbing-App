// Generates the contour-line texture as one small SVG: two "summits" of perturbed concentric rings,
// every fifth ring an index line in the brand orange, as on a real topo map. Deterministic (no random).
// Usage: node gen-topo.mjs > topo.svg
const W = 520, H = 220;
const peaks = [{ cx: 420, cy: 40, n: 13, step: 15, sx: 1.4 }, { cx: 540, cy: 235, n: 8, step: 13, sx: 1.3 }];
const f = (v) => Math.round(v * 10) / 10;
let thin = "", index = "";
peaks.forEach((p, pi) => {
  for (let i = 1; i <= p.n; i++) {
    const R = i * p.step; let d = "";
    for (let k = 0; k <= 30; k++) {
      const a = (k / 30) * Math.PI * 2;
      const w = 1 + 0.13 * Math.sin(a * 3 + i * 0.4 + pi) + 0.07 * Math.sin(a * 5 - i * 0.3);
      d += (k ? "L" : "M") + f(p.cx + Math.cos(a) * R * w * p.sx) + " " + f(p.cy + Math.sin(a) * R * w);
    }
    d += "Z";
    if (i % 5 === 0) index += d; else thin += d;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${thin}" stroke="#f1ede6" stroke-opacity=".075"/><path d="${index}" stroke="#ff8a3d" stroke-opacity=".27"/></svg>`;
process.stdout.write(svg);
