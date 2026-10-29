import { C } from "../../ClimbMatchCore.jsx";
import { EditIconButton as AreaEditIconButton } from "../../lib/areaChrome";

export interface EditIconButtonProps {
  /** Opens the editor for the field this pencil sits beside. */
  onClick?: (() => void) | null;
  /** Says what it edits ("Edit approach"): its tooltip and its accessible name. */
  title?: string;
}

/**
 * The route page's edit pencil. The button itself is shared with the area page (lib/areaChrome.jsx) and takes the
 * palette as a prop; this binds `C` at render time. It was a one-line arrow in RouteDetail.jsx and is now a function
 * declaration with the same body, the shape the guards' stitch requires.
 */
export default function EditIconButton({onClick,title}: EditIconButtonProps){return <AreaEditIconButton onClick={onClick} title={title} C={C}/>;}
