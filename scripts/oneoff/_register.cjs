// node scripts/oneoff/_register.cjs Name1 Name2 ... — appends src/components/<Name>.tsx to MOVED["RouteDetail.jsx"].
const fs=require("fs");const p="scripts/lib/guard-sources.mjs";let s=fs.readFileSync(p,"utf8");
const start=s.indexOf('  "RouteDetail.jsx": [');const end=s.indexOf("\n  ],",start);
const add=process.argv.slice(2).filter(n=>!s.includes(`"src/components/${n}.tsx"`)).map(n=>`\n    "src/components/${n}.tsx",`).join("");
s=s.slice(0,end)+add+s.slice(end);fs.writeFileSync(p,s);console.log("registered",process.argv.slice(2).length);
