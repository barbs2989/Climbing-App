// Click a control by its VISIBLE TEXT, skipping fixed/sticky chrome.
//
// The sibling of tapByName, and the two are not interchangeable -- picking the wrong one is a
// silent miss, so the rule is: match by ACCESSIBLE NAME when the control's textContent is
// polluted (the Crew sub-tabs render their badge count inside the button, so textContent is
// "Friends2" and every text strategy misses); match by TEXT when it is not, because a control
// whose name comes from its own text has no aria-label for tapByName to query. tapByName's
// selector is `[aria-label]` ONLY, so pointing it at a bare-text control returns false and the
// caller fails closed on a control that is sitting right there.
//
// That is exactly what happened when the route page's Photos sub-tab was first walked: those six
// buttons carry `aria-current` and their text, and no label. Verified before shipping rather than
// discovered by a red run.
//
// THE FIXED/STICKY FILTER IS THE LOAD-BEARING PART, and it is why this cannot be a plain
// Playwright text= selector. A route sub-tab name collides with the bottom nav -- CLAUDE.md
// records this for exactly these six names -- so a global text match silently leaves the route
// page and measures a tab instead. That does not throw and does not return false: it returns
// TRUE, having navigated somewhere else, and the caller then compares whatever is on screen.
//
// Extracted from check:overflow, which has driven the route sub-tabs correctly since #818, rather
// than copied into a second guard. Same reasoning as tapByName, SPINNER_RE and the four grade
// parsers: a rule this subtle does not survive being written twice.
//
// Settling is deliberately the CALLER's job -- check:overflow settles on text, check:outage has
// to wait out an outage's retry clock, and a fixed sleep here would be wrong for both.
export async function tapByText(page, name) {
  return await page.evaluate((n) => {
    const hit = [...document.querySelectorAll("button,div,span,a")]
      .filter((e) => (e.innerText || "").trim() === n)
      .filter((e) => {
        for (let p = e; p; p = p.parentElement) {
          const q = getComputedStyle(p).position;
          if (q === "fixed" || q === "sticky") return false;
        }
        return true;
      });
    if (!hit.length) return false;
    // PREFER A REAL CONTROL WHEN SEVERAL ELEMENTS SHARE THE TEXT, and this is a measured defect
    // rather than caution. On the route page TWO elements have the exact text "Reports": the
    // rating summary's label (a DIV, "4.2 ★ 5 Reports") and the sub-tab BUTTON — and the DIV comes
    // first in DOM order. Taking hit[0] clicked the label, which does nothing, and returned TRUE.
    // The caller then measured OVERVIEW believing it was on the Reports tab: check:overflow has
    // reported a `route:Reports` row that way since #818, and it is what defeated two attempts to
    // add that sub-tab to check:outage (#1405, #1411). A click that returns true is not evidence
    // it navigated; picking the control rather than the first match is what makes it evidence.
    const btn = hit.find((e) => e.tagName === "BUTTON" || e.tagName === "A"
      || (e.getAttribute && e.getAttribute("role") === "button"));
    (btn || hit[0]).click();
    return true;
  }, name);
}
