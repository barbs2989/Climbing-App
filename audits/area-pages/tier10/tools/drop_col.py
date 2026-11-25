import json, sys
# drop_col.py <batch file> <area id> <column>: remove one column from a batch entry.
p, k, c = sys.argv[1:4]
d = json.load(open(p))
print('dropped', d[k].pop(c, None))
json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False)
