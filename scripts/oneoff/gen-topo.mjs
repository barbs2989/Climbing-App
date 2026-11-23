// Generates the contour-line texture as one small SVG: one "summit" of perturbed concentric rings,
// every fifth ring an index line in the brand orange, as on a real topo map. Deterministic (no random).
// Usage: node gen-topo.mjs > topo.svg
const W = 520, H = 220;
// ONE summit. A second set of rings crossed the first, which contour lines never do.
const peaks = [{ cx: 420, cy: 40, n: 17, step: 15, sx: 1.4 }];
const f = (v) => Math.round(v * 10) / 10;
let thin = "", index = "";
peaks.forEach((p, pi) => {
  for (let i = 1; i <= p.n; i++) {
    // SMOOTH, not polygonal: N control points, drawn as quadratic curves whose ends are the midpoints
    // between neighbours. As 30 straight segments the rings showed facets once the splash drew them large.
    const R = i * p.step, N = 22, pts = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const w = 1 + 0.13 * Math.sin(a * 3 + i * 0.4 + pi) + 0.07 * Math.sin(a * 5 - i * 0.3);
      pts.push([p.cx + Math.cos(a) * R * w * p.sx, p.cy + Math.sin(a) * R * w]);
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[N - 1], pts[0]);
    let d = "M" + f(m0[0]) + " " + f(m0[1]);
    for (let k = 0; k < N; k++) { const m = mid(pts[k], pts[(k + 1) % N]); d += "Q" + f(pts[k][0]) + " " + f(pts[k][1]) + " " + f(m[0]) + " " + f(m[1]); }
    d += "Z";
    if (i % 5 === 0) index += d; else thin += d;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${thin}" stroke="#f1ede6" stroke-opacity=".075"/><path d="${index}" stroke="#ff8a3d" stroke-opacity=".27"/></svg>`;
process.stdout.write(svg);
