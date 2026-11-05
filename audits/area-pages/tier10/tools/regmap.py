import json, glob, re, sys
# regmap.py lo hi: print "NN slug" for each tier-10 input in range (slug from its first area's region).
lo, hi = int(sys.argv[1]), int(sys.argv[2])
T = '/Users/nathanbarber/.claude/jobs/d56fff32/tmp/in10/'
for f in sorted(glob.glob(T + 'in-v*.json'), key=lambda x: int(re.search(r'in-v(\d+)', x).group(1))):
    n = int(re.search(r'in-v(\d+)', f).group(1))
    if lo <= n <= hi:
        r = json.load(open(f))[0]['region']
        print(f'{n:02d}', re.sub(r'[^a-z0-9]+', '_', r.lower()).strip('_'))
