import json,sys
from collections import Counter
f=sys.argv[1]; ov=json.load(open(sys.argv[2]))
base='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/'
inp=json.load(open(base+'batches/'+f))
out=[]
for g in inp:
    o=ov.get(g['gid'])
    d={"gid":g['gid'],"v":"keep","c":None,"park_at":None,"near":None,"note_conflict":False,"why":"MP text consistent with or too vague to contradict pin"}
    if o: d.update(o)
    out.append(d)
json.dump(out,open(base+'out/'+f,'w'),indent=1)
print(f,len(out),dict(Counter(d['v'] for d in out)))
