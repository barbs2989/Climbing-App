import json,glob,os,re,collections,unicodedata
# Guidebook walk-in pass: pair approach-like paragraphs in the harvested guidebook text with
# crags/peaks that have no areas.approach in the nightly static snapshot.
W=os.path.dirname(os.path.abspath(__file__))
BK=os.path.expanduser('~/dev/guidebook-harvest-data/books')
def asc(s): return unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
def norm(s):
    s=re.sub(r'\bmt\.?\s','mount ',asc(s))
    return re.sub(r'[^a-z0-9]+',' ',s).strip()
def segs(t):
    # name matching never crosses punctuation ("steep slabs. The wall" is not "Slabs, The")
    t=re.sub(r'\bmt\.\s','mount ',asc(t)).replace("'",'').replace('’','')
    t=re.sub(r'-\s+',  '', t)  # OCR hyphenation "bould- er"
    return [x.split() for x in (re.sub(r'[^a-z0-9]+',' ',p).strip() for p in re.split(r'[.,;:()!?\[\]"/]+',t)) if x]
def area_name(n):
    n=re.sub(r'\(.*?\)','',n)
    m=re.match(r'^(.*),\s*(the|a)$',n.strip(),re.I)
    if m: n=m.group(2)+' '+m.group(1)
    return norm(n.replace("'",''))
areas=json.load(open(W+'/areas-all.json'))
byid={a['id']:a for a in areas}
books={}
for f in sorted(glob.glob(BK+'/gb-*.json')):
    for b,arr in json.load(open(f)).items():
        if b not in books or len(arr)>len(books[b]): books[b]=arr
name_ids=collections.defaultdict(list)
for a in areas:
    if not a.get('name'): continue
    n=area_name(a['name'])
    if len(n)<5: continue
    toks=n.split()
    if len(toks)==1 and len(n)<7: continue
    if toks[0] in ('the','a') and len(toks)==2 and len(toks[1])<8: continue
    name_ids[n].append(a['id'])
state_of={a['id']:a['_state'] for a in areas}
NAMESET=set(name_ids); MAXL=8
def grams(sg):
    out=set()
    for toks in sg:
        for i in range(len(toks)):
            for L in range(1,min(MAXL,len(toks)-i)+1):
                g=' '.join(toks[i:i+L])
                if g in NAMESET: out.add(g)
    return out
# pass 1: per book paragraphs + name hits; global frequency of each name across all paragraphs
B={}; freq=collections.Counter()
for b,arr in books.items():
    paras=[]; seenp=set()
    for x in arr:
        if not isinstance(x,list) or len(x)<2: continue
        pg,t=x[0],x[1]
        if not isinstance(t,str) or len(t)<40 or t in seenp: continue
        seenp.add(t); paras.append((pg if isinstance(pg,int) else 0,t))
    paras.sort(key=lambda x:x[0])
    hits=[grams(segs(t)) for _,t in paras]
    for h in hits: freq.update(h)
    B[b]=(paras,hits)
GENERIC={n for n,c in freq.items() if c>120}
uniq={n:state_of[ids[0]] for n,ids in name_ids.items() if len(set(state_of[i] for i in ids))==1 and n not in GENERIC}
def ancestors(aid):
    a=byid[aid]; out=[]
    for p in a['path'].split('.')[2:-1]:
        if p in byid and byid[p].get('name'):
            n=area_name(byid[p]['name'])
            if len(n)>=5 and n not in GENERIC: out.append(n)
    return out
CUE=re.compile(r'\b(park(?:ing|ed)?|pullout|turnout|trail(?:head)?|approach(?:es|ed)?|walk(?:ing)?|hike|minutes?|mins?|cairn(?:s|ed)?|follow(?:ing)?|path|gully|drive|road)\b')
res=collections.defaultdict(list); bookstate={}
for b,(paras,hits) in B.items():
    sc=collections.Counter()
    for h in hits:
        for n in h:
            if n in uniq and len(n.split())>=2: sc[uniq[n]]+=1
    tot=sum(sc.values())
    sts={s for s,c in sc.items() if tot and c>=max(5,0.12*tot)}
    bookstate[b]={'states':sorted(sts),'top':sc.most_common(4),'paras':len(paras)}
    if not sts: continue
    win_cache={}
    for i,(pg,t) in enumerate(paras):
        cues=set(m.group(1) for m in CUE.finditer(t.lower()))
        if len(cues)<2: continue
        for n in hits[i]:
            if n in GENERIC: continue
            ids=[x for x in name_ids[n] if state_of[x] in sts and byid[x]['area_type'] in ('crag','peak') and not byid[x].get('approach')]
            if not ids or len(ids)>3: continue
            lo,hi=max(0,i-25),min(len(paras),i+26)
            near=set().union(*hits[lo:hi])
            for x in ids:
                anc=[a for a in ancestors(x) if a in near]
                ambiguous=len(name_ids[n])>1 or len(n.split())==1
                if ambiguous and not anc: continue
                ctx=[paras[j][1] for j in range(max(0,i-1),min(len(paras),i+2))]
                res[x].append({'book':b,'page':pg,'name':n,'anc':anc,'cues':sorted(cues),'ctx':ctx})
json.dump(bookstate,open(W+'/bookstate.json','w'),indent=0)
json.dump(res,open(W+'/cands-raw.json','w'))
print('generic names dropped',len(GENERIC))
print('books',len(books),'with state',sum(1 for v in bookstate.values() if v['states']),'areas with candidates',len(res),'passages',sum(len(v) for v in res.values()))
c=collections.Counter(state_of[x] for x in res); print(c.most_common(45))
