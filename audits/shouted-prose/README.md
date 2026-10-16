# Shouted prose recase — 2026-09-30

Route prose written in ALL CAPS for emphasis was recased to normal sentence case (case only — the
applier refused any change beyond letter case). See `docs/guards/route-prose.md` → `audit:shouted-prose`.

- `rollback-pass1-*.json` — 858 routes: `{ routeId: { column: <value before the recase> } }`
- `rollback-pass2-*.json` — 131 routes, same shape (taken AFTER pass 1, so restore pass 2 first).

To restore a route, PATCH each column back with `patchRow("routes", id, rollback[id])`.
