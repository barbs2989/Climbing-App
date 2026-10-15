import { CAT, DiscIcon, Pill } from "../../ClimbMatchCore.jsx";

/** What a discipline or category entry carries that this badge reads. */
interface DiscMeta {
  label: string;
  color: string;
  bg: string;
}

export interface DiscBadgeProps {
  /** A discipline key (`DISC`) or a category key (`CAT`); an unknown key renders nothing. */
  id: string;
  /** Compact variant for rows and chips. */
  sm?: boolean;
  /** A grade to print after the label, e.g. "5.10a" on a partner's "Sport 5.10a". */
  grade?: string;
}

// `CAT` spreads `DISC` and adds the categories, so the original `CAT[id] || DISC[id]` is one lookup.
// Read at RENDER time, never at module scope: core imports this file back (its own `DiscBadges`
// renders it), so this module evaluates before core has finished and `CAT` is not yet initialised.
function meta(id: string): DiscMeta | undefined {
  const table: Record<string, DiscMeta | undefined> = CAT;
  return table[id];
}

/** A pill naming a discipline in its own colour, with its icon and an optional grade. */
export default function DiscBadge({ id, sm, grade }: DiscBadgeProps) {
  const d = meta(id);
  if (!d) return null;
  return <Pill icon={<DiscIcon d={id} size={sm ? 11 : 13} />} label={grade ? d.label + " " + grade : d.label} color={d.color} bg={d.bg} sm={sm} />;
}
