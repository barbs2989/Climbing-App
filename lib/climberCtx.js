import { createContext } from "react";

// THE CLIMBER, for the panels that personalise this browser. `wishlist`, `profile`,
// `completedIds`, `rankSuggested` and `discSlots` come from App and are read only by
// DbSuggestedClimbs and ObjectivesPanel — two and three components below the browser — so
// DbAreaBrowser provides them once instead of AreaPage carrying five props it never reads.
// Local to this file on purpose: everything app-wide is either the react-query cache or App's
// own state (ARCHITECTURE.md).
/**
 * @typedef {{ id: string | number, name?: string, stars?: number | null, pitches: number, discipline?: keyof typeof import("./discLabels.js").DISC_LABELS, sort_order?: number | null }} ClimberCtxRoute
 * @typedef {{ src?: string, disc: string }} ClimberCtxSlot
 * @typedef {{ wishlist: Array<string | number>, profile: unknown, completedIds: Set<string | number>, rankSuggested: (rows: ClimberCtxRoute[], slot: ClimberCtxSlot, opts: { limit: number }) => ClimberCtxRoute[], discSlots: ((profile: unknown, recent: ClimberCtxRoute[]) => ClimberCtxSlot[]) | null }} ClimberCtxValue
 * @type {import("react").Context<ClimberCtxValue>}
 */
export const ClimberCtx = createContext(/** @type {ClimberCtxValue} */ ({ wishlist: [], profile: null, completedIds: new Set(), rankSuggested: () => [], discSlots: null }));
