import json, glob, re, sys
# Print access / fee / closure / source-talk sentences in batches u$1..u$2.
lo, hi = int(sys.argv[2]), int(sys.argv[3])
PAT = r"[^.]*\b(fee|fees|permit\w*|closure\w*|closed|falcon|raptor|nesting|banned|prohibit\w*|not allowed|landowner|private|register\w*|waiver|sources?)\b[^.]*\."
for f in sorted(glob.glob(sys.argv[1] + '/batch-v*.json')):
    n = int(re.search(r'batch-v(\d+)-', f).group(1))
    if not lo <= n <= hi: continue
    for k, v in json.load(open(f)).items():
        if k.startswith('_'): continue
        for c in ('blurb', 'parking_note', 'approach'):
            for m in re.finditer(PAT, v.get(c) or '', re.I):
                print(f'u{n}', k, c, '|', m.group(0).strip())
