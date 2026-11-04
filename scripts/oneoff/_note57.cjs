// node scripts/oneoff/_note57.cjs Name... — marks each moved component as moved verbatim, once.
const fs=require("fs");
for(const n of process.argv.slice(2)){const p=`src/components/${n}.tsx`;let s=fs.readFileSync(p,"utf8");
 if(/Moved verbatim from RouteDetail\.jsx/.test(s)){console.log("has note",n);continue;}
 const i=s.search(/^export default function /m);if(i<0)throw new Error(n);
 s=s.slice(0,i)+"/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */\n"+s.slice(i);fs.writeFileSync(p,s);console.log("noted",n);}
