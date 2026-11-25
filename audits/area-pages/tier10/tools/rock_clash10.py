import json, glob, re, sys
# Blurbs in batches u$2..u$3 that name a rock type other than the area's stored rock (or the batch's own new rock).
ROCKS = ['granite', 'sandstone', 'limestone', 'dolomite', 'basalt', 'rhyolite', 'gneiss', 'quartzite', 'conglomerate',
         'schist', 'greywacke', 'dacite', 'andesite', 'tuff', 'gabbro', 'diorite', 'chert', 'shale', 'arkose', 'traprock', 'marble', 'slate']
stored = {}
for f in glob.glob('/Users/nathanbarber/.claude/jobs/d56fff32/tmp/in*/in-v*.json'):
    for a in json.load(open(f)):
        stored[a['id']] = (a.get('rock') or '').lower()
lo, hi = int(sys.argv[2]), int(sys.argv[3])
for f in sorted(glob.glob(sys.argv[1] + '/batch-v*.json')):
    n = int(re.search(r'batch-v(\d+)-', f).group(1))
    if not lo <= n <= hi: continue
    for k, v in json.load(open(f)).items():
        if k.startswith('_'): continue
        have = (v.get('rock') or stored.get(k) or '').lower()
        if not have: continue
        named = {r for r in ROCKS if re.search(r'\b' + r + r'\b', v.get('blurb', ''), re.I)}
        bad = {r for r in named if r not in have}
        if bad and not any(r in have for r in named):
            print(f'u{n}', k, 'stored:', have, '| blurb names:', ', '.join(sorted(bad)))
