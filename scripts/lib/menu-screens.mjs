// Screens and controls that live in the MENU (the avatar button at the top left), not on the
// bottom bar. Profile left the bar when the Menu arrived: it is a screen in NAV marked
// `bar:false`, opened from the Menu's "You" card. The footer link strip (Settings, Feedback,
// Privacy, Rate app, About us, How ClimbMatch works) moved into the Menu at the same time.
//
// A walk that taps a bar label by its text finds nothing named "Profile" any more, so every
// walk routes those labels through here instead -- one implementation, so the walks cannot
// drift on how the Menu is opened.

// label a walk asks for -> accessible-name prefix of the control inside the Menu
export const MENU_SCREENS = { Profile: "Your profile" };

async function openMenu(page) {
  const ok = await page.evaluate(() => {
    const b = document.querySelector('[role="banner"] button[aria-label^="Menu"]');
    if (!b) return false;
    b.click();
    return true;
  });
  if (ok) await page.waitForTimeout(400);
  return ok;
}

// Open a SCREEN that is reached from the Menu (e.g. "Profile"). false when the label is not a
// menu screen, or the Menu / its card is not on the page.
export async function openFromMenu(page, label, settleMs = 1600) {
  const card = MENU_SCREENS[label];
  if (!card) return false;
  if (!(await openMenu(page))) return false;
  const ok = await page.evaluate((c) => {
    const b = [...document.querySelectorAll('[role="dialog"][aria-label="Menu"] button')]
      .find((e) => (e.getAttribute("aria-label") || "").startsWith(c));
    if (!b) return false;
    b.click();
    return true;
  }, card);
  if (ok) await page.waitForTimeout(settleMs);
  return ok;
}

// Tap a Menu ROW or TILE by its visible text (e.g. "Settings"). Closes nothing on failure:
// a walk that gets false should report the control as missing.
export async function tapMenuItem(page, text, settleMs = 1200) {
  if (!(await openMenu(page))) return false;
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('[role="dialog"][aria-label="Menu"] button')]
      .find((e) => (e.innerText || "").trim().split("\n")[0].trim() === t); // a row ends in a "›" line
    if (!b) return false;
    b.click();
    return true;
  }, text);
  if (ok) await page.waitForTimeout(settleMs);
  return ok;
}
