import { useMemo, useState, type ReactNode } from "react";
import { HelpFillApi, HelpFillRows } from "../../lib/helpFill.js";

type Row = React.ContextType<typeof HelpFillRows>[number];

export interface HelpFillProviderProps { children: ReactNode }

/** Holds the route page's list of empty sections (lib/helpFill.js): every EmptySection below it registers a row here instead of drawing its own card, and HelpFillList draws them. */
export default function HelpFillProvider({ children }: HelpFillProviderProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const api = useMemo(() => ({
    set(row: Row) { setRows((p) => { const i = p.findIndex((r) => r.id === row.id); if (i < 0) return p.concat([row]); const c = p.slice(); c[i] = row; return c; }); },
    remove(id: string) { setRows((p) => p.filter((r) => r.id !== id)); },
  }), []);
  return <HelpFillApi.Provider value={api}><HelpFillRows.Provider value={rows}>{children}</HelpFillRows.Provider></HelpFillApi.Provider>;
}
