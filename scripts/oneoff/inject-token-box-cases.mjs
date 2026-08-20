// Injection tests for check:token-boxes.
//
// This guard reports "ok" on a healthy tree, which is what a broken one prints — and TWO earlier
// designs of it were provably vacuous, so it does not get believed without this:
//   - a property-NAME join scored 0 of 7 real candidates (`q.status` is a guide inquiry's, not
//     `road.status`)
//   - restricting to `route.<col>`-rooted expressions reported "ok" against the very commit
//     containing the camping defect, because the panel maps over `campSites(route)`
// The current design renders real rows and asks the MARKUP, which is why it found the approach
// season pill on its first run. Each case proves its edit landed by checksum before judging.
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";

const FILES = ["RouteDetail.jsx", "ClimbMatchCore.jsx"];
const ORIGINAL = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(f, "utf8")]));
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

const CASES = [
  {
    file: "RouteDetail.jsx",
    // The REAL defect, reproduced: put the raw season back in the pill.
    name: "1. approach variant season goes back into the nowrap pill (the real #4)",
    edit: (s) => s.replace(">{seasonPill}</span>:null}", ">{seasonFull}</span>:null}"),
    want: /box\(es\) hold text too long for their shape/,
  },
  {
    file: "RouteDetail.jsx",
    // The camping defect's shape, reproduced on a live panel: render prose in a chip.
    name: "2. a camping site's water prose rendered as a chip again",
    edit: (s) => s.replace(
      '{b.onTrack?<span style={{fontSize:11,fontWeight:700,color:C.textMuted,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"2px 9px"}}>{"Marked on the track"}</span>:null}',
      '{b.water?<span style={{fontSize:11,fontWeight:700,color:C.textMuted,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"2px 9px"}}>{b.water}</span>:null}'),
    want: /box\(es\) hold text too long for their shape/,
  },
  {
    file: "RouteDetail.jsx",
    // THE HISTORICAL DEFECT, verbatim. Not a synthetic edit: RouteDetail.jsx exactly as it stood
    // at 6f82fc0, the commit before the camping collapse, when capacity/water/permit rendered as
    // chips holding up to 1,386 characters. This is the case both earlier designs of this guard
    // FAILED — the route-rooted static version reported "ok" against this very tree — so it is
    // the one that decides whether the guard is worth having.
    name: "0. RouteDetail as it stood at 6f82fc0, before the camping collapse (the real #3)",
    edit: () => execSync("git show 6f82fc0:RouteDetail.jsx", { encoding: "utf8", maxBuffer: 1 << 28 }),
    want: /box\(es\) hold text too long for their shape/,
  },
  {
    file: "RouteDetail.jsx",
    // MUST PASS. A box that explicitly accommodates long text has been thought about. The STAGES
    // table is the measured case — a stage's `grade` really is terrain prose, and its JSX already
    // carries word-break plus a wrapping parent, put there by someone who found this exact
    // problem. Reporting it would be telling an author to undo a correct fix.
    name: "4. long text in a box that explicitly wraps (must PASS)",
    edit: (s) => s.replace(
      '{seasonPill?<span style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{seasonPill}</span>:null}',
      '{seasonFull?<span style={{flexShrink:1,fontSize:11,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:20,padding:"2px 9px",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{seasonFull}</span>:null}'),
    want: null,
  },
  {
    file: "RouteDetail.jsx",
    // MUST PASS. A long line in a box that clips with an ellipsis is correct handling, not a
    // defect — excluding these is what took an earlier scan from 104 candidates to 54.
    name: "3. long text in an ellipsis-clipping nowrap box (must PASS)",
    edit: (s) => s.replace(
      '{seasonPill?<span style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{seasonPill}</span>:null}',
      '{seasonFull?<span style={{flexShrink:0,fontSize:11,color:C.blue,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:120}}>{seasonFull}</span>:null}'),
    want: null, // expect a clean run
  },
  {
    file: "ClimbMatchCore.jsx",
    // Proves the SEVENTH screen is really inspected. ListsManager renders route columns into
    // pills and lives in core, so mounting RouteDetail cannot reach it — which is how the last
    // raw `r.grade` in the app survived every other guard. Grades run to 77 characters in the
    // live catalog ("Grade III, 5.10a (5 pitches, 900 ft: P1 5.9+, ...)"). Without this case the
    // extra screen could render nothing and the guard would still print ok.
    name: "5. tick-list row goes back to raw r.grade (the seventh screen)",
    edit: (s) => s.replace('borderRadius:20,padding:"2px 9px"}}>{gradeLabel(r)}</span>', 'borderRadius:20,padding:"2px 9px"}}>{r.grade}</span>'),
    want: /box\(es\) hold text too long for their shape/,
  },
];

let pass = 0;
for (const c of CASES) {
  const FILE = c.file;
  const original = ORIGINAL[FILE];
  const edited = c.edit(original);
  if (sum(edited) === sum(original)) {
    console.log(`MISS  ${c.name}\n      edit never landed (file unchanged) — fix the CASE, not the guard`);
    continue;
  }
  fs.writeFileSync(FILE, edited);
  let out = "";
  try { out = execSync("npm run check:token-boxes 2>&1", { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(FILE, original);

  const fired = /box\(es\) hold text too long/.test(out);
  if (c.want === null) {
    if (!fired) { console.log(`CORRECTLY QUIET  ${c.name}`); pass++; }
    else { console.log(`FALSE POSITIVE   ${c.name}`); console.log("      " + (out.split("\n").find((l) => l.includes("[")) || "").trim()); }
  } else if (c.want.test(out)) { console.log(`CAUGHT ${c.name}`); pass++; }
  else { console.log(`MISS   ${c.name}`); console.log("      guard said: " + out.trim().split("\n").slice(-1)[0]); }
}

for (const f of FILES) fs.writeFileSync(f, ORIGINAL[f]);
for (const f of FILES) {
  if (sum(fs.readFileSync(f, "utf8")) !== sum(ORIGINAL[f])) { console.log(`\nFAIL: ${f} was NOT restored`); process.exit(1); }
}
console.log(`\n${pass}/${CASES.length} behaved correctly; ${FILES.join(" + ")} restored`);
process.exit(pass === CASES.length ? 0 : 1);
