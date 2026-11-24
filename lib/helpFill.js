// "HELP FILL THIS IN": the route page's one list of sections nobody has written yet.
//
// A typical route has most of its sections empty, and each used to draw its own heading and card: a
// sparse boulder problem was a 6,000px page of "No ... yet" boxes (visual guide, 2026-11-23, owner
// approved the collapse on the condition that EVERY add entry point stays). An empty section
// (EmptySection) under a HelpFillProvider draws nothing in place; it hands its title, its reason
// and its own "add" action to the list (HelpFillList), which draws them as rows of one card.
//
// Two contexts, so a section that only REGISTERS does not re-render each time the list changes.
import { createContext } from "react";

/**
 * @typedef {object} HelpFillRow
 * @property {string} id
 * @property {string} title   The section's heading ("BETA").
 * @property {string} what    What is missing ("No beta yet").
 * @property {string | null} why
 * @property {string | null} cta   The add button's words.
 * @property {(() => void) | null} fix   Opens the editor for the missing field.
 * @property {HTMLElement | null} mark   The section's place in the page, so the list keeps the page's order.
 */

/** @type {import("react").Context<{ set: (row: HelpFillRow) => void, remove: (id: string) => void } | null>} */
export const HelpFillApi = createContext(/** @type {{ set: (row: HelpFillRow) => void, remove: (id: string) => void } | null} */ (null));

/** @type {import("react").Context<HelpFillRow[]>} */
export const HelpFillRows = createContext(/** @type {HelpFillRow[]} */ ([]));
