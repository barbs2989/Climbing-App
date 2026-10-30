# Propagation round p02: a compact system whose sub-areas were researched INDEPENDENTLY (two or more
# rounds) and agreed on one window gets that window on the system area itself. Since #3076 the route
# header walks four ancestors, so the system's own season reaches every sub-area that has none and
# a sub-area's own researched window still wins. Listed by scripts/oneoff/season-agreeing-systems.mjs.
import json, sys
by = {a['id']: a for a in json.load(open(sys.argv[1]))}
plan = {
    'ut_joe_s_valley': [3, 4, 5, 9, 10, 11],                    # Right Fork, Left Fork, New Joe's (rounds 2, 5, 8)
    'ut_maple_canyon': [5, 6, 7, 8, 9, 10],                     # Maple Canyon Road, Right Fork (rounds 3)
    'wi_devil_s_lake': [3, 4, 5, 6, 9, 10, 11],                 # East Bluff 03, East Bluff 07 (rounds 7, 13)
    'co_main_canyon_unaweep_granite': [3, 4, 5, 6, 9, 10, 11],  # Mother's Buttress, Access Fund Trailhead (rounds 4, 11)
    'az_cochise_stronghold': [1, 2, 3, 4, 10, 11, 12],          # East and West Stronghold (rounds 8, 12)
}
out = {k: {'_expect': {'name': by[k]['name'], 'region': by[k]['region']}, 'season_months': sorted(m)} for k, m in plan.items()}
json.dump(out, open('audits/season/apply-p02.json', 'w'), indent=1)
print(len(out), 'systems -> audits/season/apply-p02.json')
