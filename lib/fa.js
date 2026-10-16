// `fa` is an OpenBeta free-text field, and 68,000+ routes (a third of the catalog) carry a
// placeholder in it rather than a credit: "unknown" alone is 65,237 rows, then "??", "N/A",
// "Unkown", "Project", a lone `"`, a row of dashes. TechStats printed the column verbatim as
// "FIRST ASCENT · unknown", and creditFirstAscent() bails on any truthy `fa`, so a climber who
// logs a real first ascent on one of those routes was never credited.
//
// Same boundary, same repair as usableGrade in lib/db.js: a placeholder is null. Only WHOLE-value
// placeholders match -- "Unknown, 1970s" and "FA: Unknown  FFA: James Lombard III, 1998" carry a
// fact and are left alone. Measured over the full catalog on 2026-09-24: 68,547 rows across 101
// distinct spellings, every one a pure placeholder.
//
// Its own module, with no imports, so scripts/audit-misplaced-prose.mjs can use the very test the
// app runs rather than a copy of it.
export const FA_PLACEHOLDER = /^\s*(?:fa\s*[:\-]?\s*)?(?:unknown|unkown|unknwon|unkonwn|unknow|unk|n\/?a|none|not known|tbd|project|\?+|["'\-–—.]+)\s*(?:fa)?\s*(?:\?+|\.+|!+|;)?\s*(?:\((?:will edit if someone knows|add comment|not in guidebook)\)|\/undocumented|to me|yet!?|if you know,? let me know\.?)?\s*$/i;

export function usableFa(fa) {
  if (fa == null) return null;
  return FA_PLACEHOLDER.test(String(fa)) ? null : fa;
}
