import { createContext } from "react";

// THE CLIMBER, for the panels that personalise this browser. `wishlist`, `profile`,
// `completedIds`, `rankSuggested` and `discSlots` come from App and are read only by
// DbSuggestedClimbs and ObjectivesPanel — two and three components below the browser — so
// DbAreaBrowser provides them once instead of AreaPage carrying five props it never reads.
// Local to this file on purpose: everything app-wide is either the react-query cache or App's
// own state (ARCHITECTURE.md).
export const ClimberCtx = createContext({ wishlist: [], profile: null, completedIds: new Set(), rankSuggested: () => [], discSlots: null });
