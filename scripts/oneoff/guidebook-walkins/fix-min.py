import json,sys
# fix-min.py out-NNN.json area_id : clears approach_min (a time the book does not state for the whole walk)
f,aid=sys.argv[1],sys.argv[2]
d=json.load(open(f))
for o in d:
    if o['id']==aid: o['approach_min']=None; print('cleared',aid)
json.dump(d,open(f,'w'),indent=1)
