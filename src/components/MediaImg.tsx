import type { ImgHTMLAttributes } from "react";
import { useMediaSrc } from "../../lib/db.js";
import { photoThumb } from "../../lib/photoThumb";

export interface MediaImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** The stored photo's URL; a copy saved on this device is drawn instead when there is one. */
  src?: string;
  /** Draw a stored photo at this CSS width (lib/photoThumb.js); a saved offline copy is drawn as it is. */
  thumb?: number;
}

/**
 * An <img> that draws the copy of a photo saved on this device when there is one (`useMediaSrc`), so a saved
 * topo opens with no signal; every other attribute is passed straight through. Moved verbatim from
 * RouteDetail.jsx; only the props type was added.
 */
export default function MediaImg(props: MediaImgProps){const {thumb,...rest}=props;const src=useMediaSrc(props.src);return <img {...rest} src={thumb&&src===props.src?photoThumb(src,thumb):src}/>;}/* thumb: draw a stored photo at that CSS width (lib/photoThumb.js); a saved offline copy is drawn as it is */
