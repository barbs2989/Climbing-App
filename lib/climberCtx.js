import { createContext } from "react";

// THE CLIMBER, for the panels that personalise this browser. `wishlist`, `profile`,
// `completedIds`, `rankSuggested`, `discSlots`, `slotQuery` and `stated` come from App and are read only by
// DbSuggestedClimbs and ObjectivesPanel — two and three components below the browser — so
// DbAreaBrowser provides them once instead of AreaPage carrying five props it never reads.
// Local to this file on purpose: everything app-wide is either the react-query cache or App's
// own state (ARCHITECTURE.md).
// `profile` is what the LOGBOOK says (suggestionProfile: null with no completed climbs); `stated` is the
// grades the climber typed on their own profile. Two objects on purpose: AreaPage once read the
// stated grades off `profile`, which never carried them, so the Route finder's "Up to your sport
// grade" preset could not fire for anyone.
/**
 * @typedef {{ id: string | number, name?: string, stars?: number | null, pitches: number, discipline?: keyof typeof import("./discLabels.js").DISC_LABELS, sort_order?: number | null }} ClimberCtxRoute
 * @typedef {{ src?: string, disc: string, gradeVal?: number | null }} ClimberCtxSlot
 * @typedef {{ sport?: string | null, trad?: string | null, bouldering?: string | null, alpine?: string | null, ice?: string | null, mixed?: string | null }} ClimberCtxStated
 * @typedef {{ disc: string, sortBy: string, pageSize: number, gradeSys?: string, minGrade?: number, maxGrade?: number }} ClimberCtxSlotQuery
 * @typedef {{ wishlist: Array<string | number>, profile: unknown, completedIds: Set<string | number>, rankSuggested: (rows: ClimberCtxRoute[], slot: ClimberCtxSlot, opts: { limit: number }) => ClimberCtxRoute[], discSlots: ((profile: unknown, recent: ClimberCtxRoute[], max?: number, stated?: ClimberCtxStated | null, here?: string[] | null) => ClimberCtxSlot[]) | null, slotQuery: ((slot: ClimberCtxSlot) => ClimberCtxSlotQuery) | null, stated: ClimberCtxStated | null }} ClimberCtxValue
 * @type {import("react").Context<ClimberCtxValue>}
 */
export const ClimberCtx = createContext(/** @type {ClimberCtxValue} */ ({ wishlist: [], profile: null, completedIds: new Set(), rankSuggested: () => [], discSlots: null, slotQuery: null, stated: null }));
