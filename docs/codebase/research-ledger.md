# The research ledger: verify once, lock, never redo

Owner, 2026-11-14: research batches kept writing wrong values and the next agent "fixed" them
differently. The ledger records, per route field, the value, the sources and how it was confirmed;
a confirmed field is LOCKED and no later batch may change it. The owner's rules (what counts as
independent, tolerances, per-discipline rules) are in `.claude/skills/route-research/` —
`SKILL.md` and `disciplines.md`. This page is the mechanics.

## Pieces

| piece | what it does |
|---|---|
| `route_field_evidence` (migration 0437) | one row per (route, field): `value`, `method`, `level`, `evidence[]`, `expires_at`, `history[]`, `batch`. RLS on, **no policy**: service key only, because evidence URLs must never reach a screen and an anon read would see an empty ledger. |
| trigger `trg_route_field_evidence_mirror` | a locked row makes the field HIGH in `route_field_confidence` (via `contribution_fields.column_name`), so climbers can only flag it. Never touches a level the owner set or an owner-approved edit (`set_by` not null). |
| `scripts/lib/research-ledger.mjs` | the rules as pure functions: `validateEntry`, `lockViolations`, `ledgerValueMatches`, `nextLedgerRow`; `--selftest`. |
| `enrich:apply` (`scripts/enrich-approach-rappel-bivy.mjs`) | reads the ledger (service key) before writing; **refuses** any write that changes a locked field; validates the batch's `ledger` entries; stores evidence only after a verified re-read (or on the ledger-only path). |
| `check:research-locks` (build) | self-test, the writer's order (lock check before `patchRow`), the table's privacy, and an injection suite. |

## Batch format

Beside the usual `set` / `pitch_detail` / … keys, a batch entry may carry:

```json
"wa_mount_rainier_disappointment_cleaver": {
  "area": "wa_mount_rainier",
  "ledger": [
    { "field": "gain_ft", "value": 9000, "method": "measured", "level": "locked",
      "evidence": [
        { "measurement": "NPS 14,410 ft summit − USGS 3DEP 5,410 ft at the Paradise upper lot", "fact": "9000" },
        { "url": "https://www.theoutbound.com/…", "fact": "8993 ft", "retrieved_at": "2026-11-14" } ] },
    { "field": "access", "value": { … the whole stored object … }, "method": "official-1", "level": "locked",
      "expires_at": "2027-11-14T00:00:00Z",
      "evidence": [ { "url": "https://www.nps.gov/mora/planyourvisit/climbing-fee-faqs.htm", "official": true,
                      "fact": "$82 per person per climb, 2026", "retrieved_at": "2026-11-14" } ] }
  ],
  "overturn": { "<locked field>": [ evidence from 3+ independent publishers ] }
}
```

- `field` is a `routes` column, or `waypoints/<pin name>` for one pin (compared by name + lat/lng).
- `value` must equal what the row will hold after the write — the writer checks it.
- Methods: `agree-2` (2 independent publishers, or 1 + a measurement), `official-1` (an item marked
  `official: true` and an `expires_at`), `measured` (an item with a `measurement` description),
  `single-source` (level `locked-1src` only; never coordinates or a first ascent).
- Mountain Project, OpenBeta, Hiking Project and Powder Project are ONE publisher; MP coordinates
  are refused as evidence.
- A field locked at `locked` changes only with an `overturn` of 3+ independent publishers (2+ for
  `locked-1src`); an expired `official-1` lock no longer blocks.
- A ledger-only entry (no column changes) locks the value as it stands.
- `enrich:apply` can still only WRITE its allow-listed prose columns; grades, discipline and other
  identity columns stay hand-written SQL. The ledger can lock them as they stand.

## Before 0437 is applied

`enrich:apply` warns that no locks were checked (there can be none) and refuses any batch that
carries `ledger` entries.
