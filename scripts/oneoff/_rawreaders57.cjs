// Which scripts read RouteDetail.jsx RAW (not through readAppFile/readParentSource) and name something moved this PR?
const fs=require("fs");
const moved=process.argv.slice(2);
const files=fs.readdirSync("scripts").filter(f=>/\.mjs$/.test(f)).map(f=>"scripts/"+f);
for(const f of files){const s=fs.readFileSync(f,"utf8");
 if(!/readFileSync\([^)]*RouteDetail\.jsx/.test(s)&&!/["'`]RouteDetail\.jsx["'`]/.test(s))continue;
 const raw=/readFileSync\([^)]*RouteDetail\.jsx/.test(s);
 const names=moved.filter(n=>new RegExp("\\b"+n+"\\b").test(s));
 if(names.length)console.log(`${f}  raw=${raw}  stitched=${/readAppFile|readParentSource/.test(s)}  names: ${names.join(",")}`);}
