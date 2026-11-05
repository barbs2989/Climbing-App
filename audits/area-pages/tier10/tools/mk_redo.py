import json, glob, re
# mk_redo.py: build redo inputs in10/in-vR01.. from skipped areas whose research was cut short by the search budget.
T = '/Users/nathanbarber/.claude/jobs/d56fff32/tmp/'
D = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/area-pages-tier20/audits/area-pages/tier10/'
REAL = re.compile(r'closed|private|trespass|banned|utah|arizona|moab|california|washington|virginia|different place|other place|not colorado|tahoe|sedona|repeats|neighbouring|never names', re.I)
inputs = {}
for f in glob.glob(T + 'in10/in-v*.json'):
    for a in json.load(open(f)): inputs[a['id']] = a
redo = []
for f in glob.glob(D + 'batch-v*.json'):
    n = int(re.search(r'batch-v(\d+)', f).group(1))
    if not (108 <= n <= 123 or n == 71): continue
    for k, why in json.load(open(f)).get('_skipped', {}).items():
        if n == 71 and k != 'bc_amphitheatre': continue
        if REAL.search(json.dumps(why)): continue
        if k in inputs: redo.append(inputs[k])
for i in range(0, len(redo), 6):
    json.dump(redo[i:i+6], open(T + f'in10/in-v{901+i//6}.json', 'w'), indent=1)
print(len(redo), 'areas ->', (len(redo)+5)//6, 'files')
