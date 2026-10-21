import { C } from "../../ClimbMatchCore.jsx";

/** A one-pixel rule in the palette's border colour, with the section spacing above and below. Reads `C` at render time. */
export default function Hr() {
  return <div style={{ height: 1, background: C.border, margin: "12px 0" }} />;
}
