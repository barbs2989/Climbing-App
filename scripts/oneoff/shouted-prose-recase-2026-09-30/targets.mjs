// Strings whose ALL-CAPS tokens are ordinary English words (shouting), not acronyms.
import fs from "fs";
const hits = JSON.parse(fs.readFileSync(new URL("./hits.json", import.meta.url)));
const dict = new Set(fs.readFileSync("/usr/share/dict/words", "utf8").split("\n").filter(w => w && w === w.toLowerCase()));
// Tokens that are real abbreviations here even though they spell a word, or are state codes.
const ACR = new Set("US AM PM OR ID ME IN HI OH OK MA PA LA MD DE CO GA AL MT NE SE SW NW NA TH FR SR NF FS FT PH BC ED WA WI II III IV VI VII UI AKA FKA NB TBD BD TD RT TM EZ GU SA CB CJ JJ JK AJ LP MK JS JB KC DC EC OW OG TB BK ACB DLFA MP NP FA FFA TR SAR PLB GPS PCT NPS NWAC USFS USGS WSDOT NWS NOAA USDA NRA FSR NSR BBQ WIC SEWS FTR SDS RAMM MJM RJG FRA FL ER EFR BJ BLM ATV UTM USA SUV AWD FWD HWY CR RD MM EMS CPR AMGA NOLS REI WDFW DNR IRA TNF SOB OB CM NY NJ NH NM NC SC ND SD TX UT VT VA WV WY AZ AR CA CT FL GA IA IL KS KY MI MN MO MS NV RI TN AK".split(" "));
const SKIP_COL = /^(name|fa|data_quality)/;
const isShout = w => { const l = w.toLowerCase().replace(/['’]s$/, "").replace(/['’]/g, ""); return !ACR.has(w) && l.length >= 2 && dict.has(l); };
const TOK = /\b[A-Z][A-Z'’]*[A-Z]\b/g;
const targets = [];
for (const h of hits) {
  if (SKIP_COL.test(h.where)) continue;
  const toks = [...h.s.matchAll(TOK)];
  // A shouted string: 2+ adjacent caps tokens with at least one English word, or a single English word of 4+ letters.
  let shout = false;
  for (let i = 0; i < toks.length && !shout; i++) {
    const t = toks[i][0];
    if (!isShout(t)) continue;
    const next = toks[i + 1], prev = toks[i - 1];
    const adj = (a, b) => a && b && /^[\s,;:\-–—/&0-9.]*$/.test(h.s.slice(a.index + a[0].length, b.index));
    if (adj(toks[i], next) || adj(prev, toks[i]) || t.length >= 4) shout = true;
  }
  if (shout) targets.push(h);
}
const rows = new Set(targets.map(t => t.table + ":" + t.id));
const byCol = {}; for (const t of targets) { const k = t.table + "." + t.where.replace(/\[\d+\]/g, "[]"); byCol[k] = (byCol[k] || 0) + 1; }
console.log("strings", targets.length, "rows", rows.size, "chars", targets.reduce((a, t) => a + t.s.length, 0));
console.log(Object.entries(byCol).sort((a, b) => b[1] - a[1]));
fs.writeFileSync(new URL("./targets.json", import.meta.url), JSON.stringify(targets));
