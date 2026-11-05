// ONE CSV WRITER for anything the website hands out as a spreadsheet (the Route finder's results —
// competitor review batch B, item 11, owner 2026-11-04; the logbook has its own older copy in
// lib/DesktopShell.jsx with the same quoting). Cells with a comma, quote or line break are quoted
// and quotes doubled (RFC 4180); the file opens with a BOM so Excel reads it as UTF-8.
export const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; };

/** Build and download `name`.csv from a header row and data rows (arrays of cells). */
export function downloadCsv(name, head, rows) {
  const csv = [head].concat(rows).map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = String(name).replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
