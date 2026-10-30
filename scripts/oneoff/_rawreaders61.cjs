// Which scripts mention ClimbMatch.jsx, and how do they read it? (PR61: App's render moves to src/components/.)
//   node scripts/oneoff/_rawreaders61.cjs [--build]   (--build: only the guards `npm run build` runs)
const fs=require("fs");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const build=new Set([...(pkg.scripts["build:guards"]||"").matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map(m=>m[1]));
const all=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+"/"+e.name;if(e.isDirectory()){if(!/oneoff|node_modules/.test(p))walk(p);}else if(/\.(mjs|cjs|js)$/.test(e.name))all.push(p);}};walk("scripts");
for(const f of all){if(process.argv.includes("--build")&&!build.has(f))continue;const s=fs.readFileSync(f,"utf8");
 if(!/ClimbMatch\.jsx/.test(s))continue;
 const stitched=/readAppFile|readParentSource|appSources|MOVED_ALL/.test(s);
 const raw=/readFileSync\([^)\n]*ClimbMatch\.jsx/.test(s)||/["'`]ClimbMatch\.jsx["'`]/.test(s);
 console.log(`${build.has(f)?"BUILD":"     "} stitched=${stitched?1:0} ${f}`);}
