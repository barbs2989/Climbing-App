import json,glob,os,re,sys
# Collects agent outputs out-NNN.json -> fills-NNN.json for apply-crag-approach.mjs, refusing
# copies (8+ word run shared with the passage), access/source/pipeline words, caps and over-length.
W=os.path.dirname(os.path.abspath(__file__))
def words(s): return re.findall(r"[a-z0-9]+",s.lower().replace("'",''))
BAN=re.compile(r"\b(fee|fees|permit|permits|closure|closures|closed|gate[ds]?|private property|landowner|trespass|highway|hwy|interstate|i-\d+|us \d+|sr \d+|fr ?\d+|fs ?\d+|forest road|county road|cr \d+|milepost|mile marker|guidebook|guide book|the book|author|according|passage|ocr|catalog|our app|mountain project|summitpost|raptor|nesting|season(al)?ly)\b",re.I)
nums=sys.argv[1:]
files=[f"{W}/out/out-{n}.json" for n in nums] if nums else sorted(glob.glob(W+'/out/out-*.json'))
ok=[];bad=[]
DROP=set(open(W+"/drop.txt").read().split()) if os.path.exists(W+"/drop.txt") else set()
for f in files:
    n=re.search(r'out-(\d+)',f).group(1)
    inp={a['id']:a for a in json.load(open(f"{W}/in/in-{n}.json"))}
    for o in json.load(open(f)):
        if not o.get('match') or not o.get('approach') or o['id'] in DROP: continue
        a=inp.get(o['id'])
        if not a: bad.append((o['id'],'id not in input')); continue
        t=o['approach'].strip(); why=[]
        if len(t)>500: why.append('too long')
        if len(t)<40: why.append('too short')
        m=BAN.search(t)
        if m: why.append('banned word: '+m.group(0))
        if re.search(r'\b[A-Z]{4,}\b',t): why.append('caps')
        w=words(t); src=words(' '.join(p['text'] for p in a['passages']))
        grams=set(' '.join(src[i:i+8]) for i in range(len(src)-7))
        cp=[' '.join(w[i:i+8]) for i in range(len(w)-7) if ' '.join(w[i:i+8]) in grams]
        if cp: why.append('copy: '+cp[0])
        mn=o.get('approach_min')
        if mn is not None and (not isinstance(mn,int) or mn<1 or mn>600): why.append('bad minutes')
        if why: bad.append((o['id'],'; '.join(why),t)); continue
        ok.append({'area_id':o['id'],'approach':t,'approach_min':mn})
tag='-'.join(nums) if nums else 'all'
json.dump(ok,open(f"{W}/fills/fills-{tag}.json",'w'),indent=1)
json.dump(bad,open(f"{W}/fills/refused-{tag}.json",'w'),indent=1)
print(f"{len(ok)} ok, {len(bad)} refused -> fills/fills-{tag}.json")
for b in bad: print('REFUSED',b[0],b[1])
