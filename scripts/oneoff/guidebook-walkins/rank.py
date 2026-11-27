import json,re,collections,os
W=os.path.dirname(os.path.abspath(__file__))
areas={a['id']:a for a in json.load(open(W+'/areas-all.json'))}
raw=json.load(open(W+'/cands-raw.json'))
STRONG=[r'\bpark(ing|ed)?\b.{0,250}\b(walk|hike|follow|trail|path|minutes?)\b',
        r'\b\d+\s*(-|to)?\s*\d*\s*(minute|min)s?\b.{0,40}\b(walk|hike|approach)',
        r'\b(walk|hike|approach)\b.{0,60}\b\d+\s*(minute|min|hour)s?',
        r'\bto reach\b', r'\bis reached\b', r'\bapproach\b', r'\btrailhead\b', r'\bcairn',
        r'\b(ten|fifteen|twenty|thirty|forty|five|half an?) (minute|hour)']
def score(p, name):
    t=' '.join(p['ctx']).lower()
    s=sum(2 for r in STRONG if re.search(r,t))
    # the area name near an approach cue in the centre paragraph
    mid=p['ctx'][len(p['ctx'])//2].lower() if len(p['ctx'])>1 else p['ctx'][0].lower()
    if re.search(re.escape(name.split()[0]), mid): s+=1
    return s
out={}
for aid,ps in raw.items():
    a=areas[aid]
    # dedupe same text
    seen=set(); keep=[]
    for p in ps:
        k=p['ctx'][len(p['ctx'])//2][:200] if len(p['ctx'])>1 else p['ctx'][0][:200]
        if k in seen: continue
        seen.add(k); p['score']=score(p,p['name']); keep.append(p)
    keep.sort(key=lambda p:-p['score'])
    best=keep[0]['score'] if keep else 0
    if best<4: continue
    out[aid]={'id':aid,'name':a['name'],'state':a['_state'],'path':a['path'],'type':a['area_type'],'routes':a.get('route_count') or 0,
              'lat':a.get('lat'),'lng':a.get('lng'),'parking_note':a.get('parking_note'),'parking_name':a.get('parking_name'),
              'blurb':(a.get('blurb') or '')[:400],'best':best,'passages':[{'book':p['book'],'page':p['page'],'text':'\n---\n'.join(c[:1500] for c in p['ctx'])} for p in keep[:3]]}
print(len(out))
print(collections.Counter(v['best'] for v in out.values()))
print(collections.Counter(v['state'] for v in out.values()).most_common(30))
rc=[v['routes'] for v in out.values()]; print('routes>=5',sum(r>=5 for r in rc),'>=10',sum(r>=10 for r in rc), 'total routes', sum(rc))
json.dump(sorted(out.values(),key=lambda v:(v['state'],-v['routes'])),open(W+'/cands.json','w'))
