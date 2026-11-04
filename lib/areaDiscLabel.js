import { DISCIPLINES } from "./areaBrowserShared.js";

export const discLabel = d => (DISCIPLINES.find(x => x[0] === d) || [, d])[1];
