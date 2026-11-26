const fs=require("fs"),zlib=require("zlib"),path=require("path");
const D=__dirname;const i=require(D+"/index.json");const rs=[];
for(const [st,s] of Object.entries(i.states))for(const p of s.parts){let b=fs.readFileSync(path.join(D,p.file));if(b[0]===0x1f)b=zlib.gunzipSync(b);const j=JSON.parse(b);for(const r of j.routes||[]){r._st=st;rs.push(r);}}
const b=rs.filter(r=>r.beta&&String(r.beta).trim());
console.log("routes",rs.length,"with beta",b.length);
const by={};for(const r of b){by[r.discipline]=(by[r.discipline]||0)+1}console.log(by);
const L=b.map(r=>String(r.beta).length).sort((a,b)=>a-b);console.log("median len",L[L.length>>1],"p90",L[Math.floor(L.length*.9)]);
const st={};for(const r of b){st[r._st]=(st[r._st]||0)+1}console.log(Object.entries(st).sort((a,b)=>b[1]-a[1]).slice(0,20));
fs.writeFileSync(D+"/beta.json",JSON.stringify(b));
