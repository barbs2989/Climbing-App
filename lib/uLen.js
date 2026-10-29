import { uLenN, NOVAL, uLenUnit } from "../ClimbMatchCore.jsx";

/* FORMATS what uLenN converts, so the metre<->foot arithmetic exists once. */
export const uLen=m=>{const n=uLenN(m);return n===null?NOVAL:n+" "+uLenUnit();};
