import json, sys
# skip_one.py <batch file> <area id> <reason>: move a written entry to _skipped.
p, k, why = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(p))
assert k in d, k
d.pop(k)
d.setdefault('_skipped', {})[k] = why
json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False)
print('skipped', k)
