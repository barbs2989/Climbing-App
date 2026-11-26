import json,glob,re,os,html
J=os.environ.get('OUT_DIR', os.path.expanduser('~/dev/mp-data/_mp/_pitchtext'))
MP=os.path.expanduser('~/dev/mp-data/_mp')
m={}
for f in glob.glob(MP+'/_map/*.json'):
    try: d=json.load(open(f))
    except Exception: continue
    if isinstance(d,dict):
        for k,v in d.items():
            if isinstance(v,str): m[k]=v
SEC=re.compile(r'<h2 class="mt-2">\s*(Description|Location|Protection)\b.*?</h2>\s*<div class="fr-view">(.*?)</div>',re.S)
def clean(s):
    s=re.sub(r'<br\s*/?>|</p>',"\n",s); s=re.sub(r'<[^>]+>',' ',s); s=html.unescape(s)
    return re.sub(r'[ \t]+',' ',s).strip()
out={}
for f in glob.glob(MP+'/_routes/*.html'):
    mp=os.path.basename(f)[:-5]; ours=m.get(mp)
    if not ours: continue
    t=open(f,errors='ignore').read()
    secs={k:clean(v) for k,v in SEC.findall(t)}
    if secs: out[ours]={'mp':mp,**secs}
for f in glob.glob(MP+'/_details/*/in-*.json'):
    try: d=json.load(open(f))
    except Exception: continue
    for x in d:
        s=x.get('src') or {}
        if x['id'] in out or not s.get('desc'): continue
        out[x['id']]={'mp':None,'Description':s.get('desc',''),'Protection':s.get('prot','')}
json.dump(out,open(J+'/mptext.json','w'))
p2=[k for k,v in out.items() if re.search(r'\bP(?:itch)?\s*\.?\s*2\b|second pitch|2nd pitch',v.get('Description',''),re.I)]
print('texts',len(out),'with per-pitch text',len(p2))
