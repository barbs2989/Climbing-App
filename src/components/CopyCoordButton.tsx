import { C } from "../../ClimbMatchCore.jsx";
import { CopyCoordButton as AreaCopyCoordButton } from "../../lib/areaChrome";

export interface CopyCoordButtonProps {
  lat: number | string;
  lng: number | string;
  /** What the coordinate is ("trailhead", "the crag"): read into its name and its toast. */
  what?: string;
}

/**
 * Copy a coordinate to the clipboard. The button is shared with the area page (lib/areaChrome.jsx) and takes the
 * palette as a prop; this binds `C` at render time. It was a one-line arrow in RouteDetail.jsx and is now a function
 * declaration with the same body, the shape the guards' stitch requires.
 */
export default function CopyCoordButton({lat,lng,what}: CopyCoordButtonProps){return <AreaCopyCoordButton lat={lat} lng={lng} what={what} C={C}/>;}
