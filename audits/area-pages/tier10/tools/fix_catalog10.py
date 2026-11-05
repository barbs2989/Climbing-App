import json, glob, sys, re
REPL = [
    ("Our catalog lists ", "This area has "),
    ("Most of our catalog's problems are easy", "Most of the problems here are easy"),
    ("Every route in our catalog is trad", "Every route here is trad"),
    ("Gear routes dominate our listings", "Gear routes dominate"),
    ("Nearly all of our listings are gear routes", "Nearly all the routes here take gear"),
]
left = 0
for f in sorted(glob.glob(sys.argv[1] + '/batch-v*.json')):
    d = json.load(open(f)); ch = 0
    for k, v in d.items():
        if k.startswith('_'): continue
        for col in ('blurb', 'approach', 'parking_note'):
            s = v.get(col)
            if not s: continue
            for a, b in REPL:
                if a in s: s = s.replace(a, b); ch += 1
            v[col] = s
            if re.search(r"our catalog|our listing|in our ", s, re.I): left += 1; print('LEFT', f, k, col)
    if ch:
        json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False); print(f.split('/')[-1], ch, 'fixed')
print('left', left)
