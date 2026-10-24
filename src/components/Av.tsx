import { C, FALLBACK_AV, onImgErr } from "../../ClimbMatchCore.jsx";
import { photoThumb } from "../../lib/photoThumb";

export interface AvProps {
  /** The climber's photo URL. Empty or missing draws the fallback silhouette. */
  src?: string | null;
  /** Diameter in px (default 36). The online dot scales with it. */
  size?: number;
  /** Show the pulsing "Online now" dot. */
  online?: boolean;
}

/**
 * A climber's round avatar, with an optional online dot. The image is requested at thumbnail size
 * through `photoThumb`; `onImgErr` falls back to the original, then to the silhouette.
 *
 * Fetched EAGERLY, never `loading="lazy"`: every screen scrolls inside #appscroll, and a lazy image
 * in a scrolling pane is requested only once it is actually on screen (the page's ~1,000px
 * look-ahead does not apply), so each avatar began loading as it scrolled in, after the name
 * beside it had drawn. A thumbnail is 3-9 KB; the head start is worth more than the bytes.
 * The silhouette sits BEHIND the photo as its background, so the circle is a placeholder while
 * the photo is on its way, not an empty ring that pops in later.
 * Reads core at RENDER time only: core imports this file back (it renders avatars itself).
 */
export default function Av({ src, size, online }: AvProps) {
  const sz = size || 36;
  const d = Math.max(9, Math.round(sz * 0.28));
  return (
    <span style={{ position: "relative", display: "inline-block", flexShrink: 0, width: sz, height: sz, lineHeight: 0 }}>
      <img
        decoding="async"
        // No photo at all is an EMPTY src, which never fires onError — a real climber without a photo drew a blank circle.
        src={photoThumb(src, sz) || FALLBACK_AV}
        alt=""
        style={{ width: sz, height: sz, borderRadius: "50%", objectFit: "cover", border: "2px solid " + C.border, display: "block", background: 'url("' + FALLBACK_AV + '") center / cover no-repeat' }}
        onError={onImgErr(FALLBACK_AV)}
      />
      {online ? (
        <span
          title="Online now"
          className="cm-pulse"
          style={{ position: "absolute", bottom: 0, right: 0, width: d, height: d, background: C.green, borderRadius: "50%", border: "2px solid " + C.card, boxSizing: "border-box" }}
        ></span>
      ) : null}
    </span>
  );
}
