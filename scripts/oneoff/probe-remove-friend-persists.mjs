// "Remove friend" said it worked and wrote nothing.
//
// The handler filtered local state and toasted `"<Name> removed from friends"`, while
// `removeConnection` sat imported and called from nowhere -- so a climber removed somebody, was
// told it worked, and was still connected to them after a refresh.
//
// NO EXISTING GUARD COULD SEE IT, and the reason is the finding rather than a detail:
//   check:writes  forbids a success message in front of a write whose FAILURE is unobservable.
//   check:claims  forbids a success toast for a write that only runs signed-in.
// Both are about a write that EXISTS. A toast in front of NO WRITE AT ALL passes both, because
// there is no write for either rule to attach to.
//
// This asserts the repaired handler as SOURCE. It cannot be rendered: the handler is a prop on an
// overlay inside App, needs a session and a live `connections` row to reach its own DB branch, and
// SSR cannot click. What source CAN prove is every link a stale-base squash would take one of --
// the call, the revert, the refetch, and the honest demo branch.
import fs from "node:fs";

const src = fs.readFileSync("ClimbMatch.jsx", "utf8");
let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };

// Locate the handler, then assert INSIDE it. A file-wide match would pass on the strength of
// acceptReq/declineReq, which already do all of this correctly one screen over -- the neighbouring
// -correct-code trap this repo records for `rappels` and for the camping panel.
const at = src.indexOf("onRemove={c=>{");
if (at < 0) { console.error("ANCHOR LOST: the friends onRemove handler was renamed or removed."); process.exit(1); }
const end = src.indexOf("}}", src.indexOf("else showToast", at));
const body = src.slice(at, end > at ? end + 2 : at + 1400);
if (body.length < 300) { console.error(`FAIL-CLOSED: handler slice is ${body.length} chars — too thin to assert on.`); process.exit(1); }
ok(`located the handler (${body.length} chars)`);

for (const [needle, why] of [
  ["removeConnection(_row._dbId)", "it calls the write, with the CONNECTION ROW id (not the climber id)"],
  ["myConnQ.refetch", "it refetches, so the list reflects the server rather than the optimistic guess"],
  ["_connRow(c.id)", "it resolves the row through the same helper acceptReq/declineReq use"],
  ["uid&&_row&&_row._dbId", "the write is gated on a real row — a seed climber has none"],
]) {
  if (body.includes(needle)) ok(why);
  else bad(`${why} — missing \`${needle}\``);
}

// THE REVERT IS THE HALF A REFACTOR DROPS. Without it a rejected delete leaves the row gone from
// the screen and present in the database, which is the same lie in the other direction.
if (/\.catch\(function\(\)\{setConnections\(p=>p\.find\(x=>x\.id===c\.id\)\?p:\[\.\.\.p,c\]\)/.test(body))
  ok("a rejected delete puts the connection back");
else bad("a rejected delete does not restore the row — the screen would keep lying");
if (/Couldn’t remove that connection/.test(body)) ok("...and says so, with a curly apostrophe like every other string in this app");
else bad("...but says nothing about the failure");

// THE DEMO BRANCH MUST NOT CLAIM A SAVE. Seed climbers never reach a row.
if (/else showToast\(_first\+" removed in this preview — not saved\."\)/.test(body))
  ok("the signed-out/seed path says the change is local only");
else bad("the demo path claims a removal that will not survive a refresh");

// AND THE SUCCESS TOAST MUST BE INSIDE .then, never before the write.
const thenAt = body.indexOf(".then("), successAt = body.indexOf('showToast(_first+" removed from friends")');
if (successAt > thenAt && thenAt > 0) ok("the success toast is inside .then — it follows the write");
else bad("the success toast does not sit inside .then");

console.log(fails ? `\n${fails} FAILURE(S)` : "\nok — Remove friend writes, refetches, reverts on failure, and is honest in the demo");
process.exit(fails ? 1 : 0);
