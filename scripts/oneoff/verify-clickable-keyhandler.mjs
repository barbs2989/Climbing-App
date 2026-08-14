// Test lib/clickable.js's key handler directly.
//
// Why this exists ALONGSIDE the browser probe. Space-must-not-scroll cannot be isolated in
// the browser on a control that switches tabs: activating it fires the app's own
// scrollAppTop(), so scrollY moves whether preventDefault fired or not. Measuring it there
// produced a confident, WRONG "preventDefault is not firing" on a 2164->860 move — a number
// that was scrolling UP, which Space never does.
//
// preventDefault is a property of the shared helper, not of any one call site, so it is
// proven here where the event is synthetic and nothing else can move the page.
import { clickable } from "../../lib/clickable.js";

const fakeEvent = (key, { sameTarget = true } = {}) => {
  const node = { id: "row" };
  const e = {
    key,
    target: sameTarget ? node : { id: "nested-button" },
    currentTarget: node,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
  return e;
};

let fails = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

// --- the triad the helper must produce -------------------------------------------------
const noop = () => {};
const props = clickable(noop);
check("role defaults to button", props.role, "button");
check("tabIndex is 0", props.tabIndex, 0);
check("an onKeyDown exists", typeof props.onKeyDown, "function");
check("role is overridable for a checkbox", clickable(noop, { role: "checkbox" }).role, "checkbox");
check("a disabled control leaves the tab order", clickable(noop, { disabled: true }).tabIndex, -1);

// --- Enter and Space fire the handler --------------------------------------------------
for (const key of ["Enter", " "]) {
  let fired = 0;
  const p = clickable(() => fired++);
  const e = fakeEvent(key);
  p.onKeyDown(e);
  check(`${key === " " ? "Space" : key} fires the handler`, fired, 1);
  check(`${key === " " ? "Space" : key} calls preventDefault`, e.defaultPrevented, true);
}

// --- everything else is ignored --------------------------------------------------------
for (const key of ["Tab", "a", "ArrowDown", "Escape"]) {
  let fired = 0;
  const e = fakeEvent(key);
  clickable(() => fired++).onKeyDown(e);
  check(`${key} does NOT fire the handler`, fired, 0);
  check(`${key} does NOT preventDefault (it must still do its normal job)`, e.defaultPrevented, false);
}

// --- a nested control keeps its own key press ------------------------------------------
// The row must not swallow Enter meant for a delete button inside it.
{
  let fired = 0;
  const e = fakeEvent("Enter", { sameTarget: false });
  clickable(() => fired++).onKeyDown(e);
  check("a key press on a NESTED target does not fire the row", fired, 0);
  check("a key press on a nested target is not preventDefault-ed", e.defaultPrevented, false);
}

console.log(fails ? `\nFAIL — ${fails} assertion(s)\n` : "\nclickable(): ok — every assertion passed.");
process.exit(fails ? 1 : 0);
