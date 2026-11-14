# Propagation round p03: after clearing Joshua Tree NP's system-level window (cleared.json), the
# in-park sub-areas without their own lost it. They are plainly inside the park whose Oct-Apr window
# nine independent rounds confirmed (Lost Horse, Outback, Echo Cove, Jumbo Rock, Real Hidden Valley,
# Rattlesnake Canyon, Roadside Rocks, Indian Cove, Stirrup Tank), so they take it directly. The
# Highway 62 and Interstate 10 crags (outside the park) are researched on their own instead.
import json, sys
by = {a['id']: a for a in json.load(open(sys.argv[1]))}
JT = [1, 2, 3, 4, 10, 11, 12]
ids = ['ca_hidden_valley_area', 'ca_wonderland_of_rocks', 'ca_queen_valley_area', 'ca_joshua_tree_bouldering', 'ca_pinto_basin']
out = {k: {'_expect': {'name': by[k]['name'], 'region': by[k]['region']}, 'season_months': JT} for k in ids}
json.dump(out, open('audits/season/apply-p03.json', 'w'), indent=1)
print(len(out), '-> audits/season/apply-p03.json')
