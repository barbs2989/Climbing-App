import fs from "fs"; import {parse} from "@babel/parser"; import traverseM from "@babel/traverse";
const traverse=traverseM.default||traverseM;
const file=process.argv[2]; const src=fs.readFileSync(file,"utf8");
const ast=parse(src,{sourceType:"module",plugins:["jsx"]});
const top=new Map();
for(const st of ast.program.body){let n=st, exp=false; if(st.type==="ExportNamedDeclaration"&&st.declaration){n=st.declaration;exp=true;} if(st.type==="ExportDefaultDeclaration"){n=st.declaration;exp="default";}
 if(n.type==="FunctionDeclaration"&&n.id) top.set(n.id.name,{st,n,exp});
 else if(n.type==="VariableDeclaration") for(const d of n.declarations) if(d.id.type==="Identifier") top.set(d.id.name,{st,n:d,exp});}
const out=[];
traverse(ast,{Program(p){
 for(const [name,info] of top){ let jsx=false; const path=p.get("body").find(b=>b.node===info.st);
  path.traverse({JSXElement(){jsx=true;},JSXFragment(){jsx=true;}});
  if(!jsx || !/^[A-Z]/.test(name)) continue;
  const free=new Set();
  path.traverse({ReferencedIdentifier(ip){const nm=ip.node.name; const b=ip.scope.getBinding(nm); if(b&&b.scope===p.scope&&nm!==name) free.add(nm);}});
  const local=[...free].filter(x=>p.scope.getBinding(x).kind!=="module");
  const b=p.scope.getBinding(name); const users=new Set(b.referencePaths.map(r=>{const top2=r.findParent(q=>q.parentPath&&q.parentPath.isProgram()); const nd=top2&&top2.node; const nn=nd&&(nd.id?nd.id.name:nd.declaration?.id?.name||nd.declarations?.[0]?.id?.name||nd.declaration?.declarations?.[0]?.id?.name); return nn||"?";}));
  out.push({name,size:info.st.end-info.st.start,exp:info.exp,line:info.st.loc.start.line,local,users:[...users]});
 }}});
out.sort((a,b)=>a.size-b.size);
for(const o of out) console.log(o.size, o.name, "L"+o.line, o.exp?"exp":"", "usedBy=["+o.users.join(",")+"]", "local:["+o.local.join(",")+"]");
