// Click a control by its ACCESSIBLE NAME, not by its text.
//
// Extracted from check:ui, where it was written for the Crew sub-tab bar and where the reasoning
// is recorded in full. The short version, because it is the kind of rule that gets re-derived
// wrongly: those buttons render their badge count INSIDE the control, so `textContent` is
// "Friends2" and every exact-text strategy misses -- Playwright's `text="Friends"` included.
// Six attempts failed that way before the cause was clear, and worse, a text tap returns false
// SILENTLY, so a caller that ignores the return value carries on clicking whatever is on screen.
//
// #740/#755 gave those buttons an authored aria-label ("Friends, 2"), which is both the a11y fix
// and a durable handle: it does not move when the count does.
//
// THE ANCHORING IS THE SUBTLE PART. Match the label exactly, or up to the ", " the count is
// appended after -- never a bare substring, or "Crews" also selects "Crews, 2" on a different
// bar. And note the count is in the LABEL as well as the text, so the same control is "Friends"
// when its badge is 0 and "Friends, 2" when it is not: a selector that demands the count cannot
// find the control on an empty account, which is exactly the state an outage produces.
//
// This lives in lib/ rather than in either caller because that anchoring rule is precisely the
// sort of thing this repo has already paid for existing in several places and drifting -- see
// SPINNER_RE, and the four grade parsers.
export async function tapByName(page, label, settleMs = 1600) {
  const ok = await page.evaluate((label) => {
    const re = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(,|$)");
    const el = [...document.querySelectorAll("[aria-label]")].find((e) => {
      if (!re.test((e.getAttribute("aria-label") || "").trim())) return false;
      const r = e.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    });
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, label);
  if (ok) await page.waitForTimeout(settleMs);
  return ok;
}
