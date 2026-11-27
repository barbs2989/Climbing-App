const z=require("zlib"),fs=require("fs"),idx=JSON.parse(fs.readFileSync("index.json"));
const all=[];let mism=0;
for(const [n,s] of Object.entries(idx.states)){let b=fs.readFileSync(s.parts[0].file);try{b=z.gunzipSync(b)}catch{};const j=JSON.parse(b);if(j.areas.length!==s.areaCount)mism++;for(const a of j.areas)all.push({...a,state:n});}
console.log("areas",all.length,"states with areas outside part0:",mism);
const tiers=[[100,1e9],[50,99],[30,49],[20,29],[10,19],[5,9],[2,4],[1,1],[0,0]];
const F=["blurb","rock","aspect","elevation_ft","approach","parking_lat","season_months"];
console.log("tier\tn\t"+F.join("\t"));
for(const [lo,hi] of tiers){const g=all.filter(a=>(a.route_count||0)>=lo&&(a.route_count||0)<=hi);console.log(`${lo}-${hi}\t${g.length}\t`+F.map(f=>g.filter(a=>a[f]==null||(Array.isArray(a[f])&&!a[f].length)).length).join("\t"));}
const types={};for(const a of all)types[a.area_type]=(types[a.area_type]||0)+1;console.log(types);
fs.writeFileSync("../all-areas.json",JSON.stringify(all));
