// Does any "Copied" message sit in front of a clipboard write that may have failed?
//
// `navigator.clipboard.writeText` returns a PROMISE. Six call sites wrapped it in a try/catch
// and then announced success unconditionally — so the try caught nothing on the path that
// actually fails (a rejected promise), and the user saw "Link copied" / "Report copied" /
// "Copied" with an empty clipboard. Clipboard writes fail routinely: an insecure context, a
// permissions policy, Safari outside a user-gesture chain.
//
// This is check:writes' rule — no success message in front of a failure nobody can observe —
// applied to a write that never goes near the database, which is why that guard could not see
// it.
//
// The correct shape already existed one function away, on the plan-text copy, and these were
// brought into line with it rather than with a new invention:
//     var _p = navigator.clipboard.writeText(planText);
//     if (_p && _p.then) _p.then(…ok…).catch(…err…); else …err…
//
//   node scripts/oneoff/probe-clipboard-claims-success-honestly.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// Wording that asserts the copy happened. A failure message is allowed to contain "copy".
const CLAIM = /(Link copied|Report copied|Caption copied|setCopied\(true\)|setLinkCopied\(true\)|setCopyState\("ok"\)|setCopied\(what\))/;

let fail = 0, sites = 0, guarded = 0;
const ok = (c, m) => { console.log(`  ${c ? "ok  " : "FAIL"}  ${m}`); if (!c) fail++; };

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let from = 0;
  for (;;) {
    const i = src.indexOf("clipboard.writeText(", from);
    if (i < 0) break;
    from = i + 1;
    sites++;
    // The handler this call sits in: from here to the end of the statement group. 420 chars
    // comfortably covers every one of these dense one-liners without spilling into the next
    // control, which was checked by eye against all seven.
    const scope = src.slice(i, i + 420);
    const claims = CLAIM.test(scope);
    const promised = /_p\s*&&\s*_p\.then|\.then\(/.test(scope);
    const awaited = /await\s+navigator\.clipboard\.writeText/.test(src.slice(Math.max(0, i - 30), i + 40));
    if (!claims) { guarded++; continue; }          // no success asserted — nothing to lie about
    if (promised || awaited) { guarded++; continue; }
    console.log(`  FAIL  ${f}: a success message follows an unawaited clipboard write`);
    console.log(`        ${scope.slice(0, 150).replace(/\s+/g, " ")}`);
    fail++;
  }
}

console.log(`\n${sites} clipboard write site(s); ${guarded} either claim nothing or wait for the promise`);
ok(sites >= 6, `found the expected call sites (${sites})`);
// An await inside a try is only honest if the success call is INSIDE that try too — the profile
// copy had the await and still announced success from outside it.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
ok(/await navigator\.clipboard\.writeText\(text\);setCopied\(what\);/.test(core),
  "the awaited copy sets its label INSIDE the try, not after it");
ok(/catch\(e\)\{setCopied\("Couldn't copy"\)/.test(core),
  "and says so when it fails");

console.log(fail ? `\n${fail} problem(s)` : "\nok — no clipboard success message runs ahead of the write it describes");
process.exit(fail ? 1 : 0);
