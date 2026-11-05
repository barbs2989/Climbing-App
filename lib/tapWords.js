// "TAP" ON A PHONE, "CLICK" ON THE WEBSITE (owner 2026-11-04, desktop audit). ~120 of the app's own
// sentences say "tap a name…", "tap to withdraw", "Swipe left to delete…": right under a thumb, wrong
// under a mouse — and a mouse cannot swipe at all (SwipeRow shows hover buttons on the website
// instead). tx() is wrapped around those sentences where they are written; it returns them
// unchanged on a phone.
//
// Only the app's OWN copy goes through tx(). Text a climber wrote (a message, a route description)
// never does, so "tap the flake" in somebody's beta is left alone. That is why this is not a
// page-wide text rewrite.
//
// App sets the flag at the top of its render (__setTapWide(wide)), before any child renders, the way
// it sets UNITS and DLOCALE; a resize re-renders App, so the copy follows the window. A string built
// at MODULE scope is read before App ever renders and stays phone wording — write such a string
// inside the component that shows it.
let WIDE = false;
/** @param {boolean} v */
export function __setTapWide(v) { WIDE = !!v; }

// Sentences about a swipe say what the mouse does instead (the hover buttons SwipeRow draws).
/** @type {Record<string, string>} */
const SWIPE = {
  "Swipe left to delete a conversation": "Point at a conversation to delete it",
  "Swipe left to clear a crew from this list.": "Each crew’s Archive and Clear buttons are on its card.",
  "Swipe right to archive · swipe left to clear · or tap ⋯": "Click ⋯ on a notification to archive or clear it",
  "Swipe right to archive · swipe left to delete": "Point at an alert to archive or delete it",
};

/** @type {Array<[RegExp, string]>} */
const WORDS = [
  [/\bTapping\b/g, "Clicking"], [/\btapping\b/g, "clicking"],
  [/\bTapped\b/g, "Clicked"], [/\btapped\b/g, "clicked"],
  [/\bTaps\b/g, "Clicks"], [/\btaps\b/g, "clicks"],
  [/\bTap\b/g, "Click"], [/\btap\b/g, "click"],
];

/** The phone's sentence, or the website's when the app is wide. @param {string} s @returns {string} */
export function tx(s) {
  if (!WIDE || typeof s !== "string") return s;
  if (Object.prototype.hasOwnProperty.call(SWIPE, s)) return SWIPE[s];
  let out = s;
  for (const [re, to] of WORDS) out = out.replace(re, to);
  return out;
}
