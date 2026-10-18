// Section 4 gate: read existing /go destinations without visiting partners.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseDocument} from 'htmlparser2';
const source=JSON.parse(await readFile('outputs/launch-source.json','utf8'));
const paths=new Set();
function visit(node){
  if(node.name==='a' && node.attribs?.href){try{const u=new URL(node.attribs.href,'https://www.everytip.co.uk');if(u.pathname.startsWith('/go/') && ['www.everytip.co.uk','everytip.co.uk',new URL(source.endpoint).hostname].includes(u.hostname)) paths.add(u.pathname+u.search);}catch{}}
  for(const child of node.children??[])visit(child);
}
for(const record of source.records)visit(parseDocument(record.content||''));
await mkdir('outputs/affiliate-checks',{recursive:true});
// Keep redirects no longer linked from content: old newsletters and emails still use them.
const redirects={...JSON.parse(await readFile('data/affiliate-redirects.json','utf8')).redirects};const failures=[];
for(const path of [...paths].sort()){
  const file=`outputs/affiliate-checks/${Buffer.from(path).toString('hex')}.json`;
  let result;
  if(!process.argv.includes('--fresh')){try{result=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(!result){
    try{
      const response=await fetch(`https://www.everytip.co.uk${path}`,{redirect:'manual',signal:AbortSignal.timeout(30000)});
      result={path,status:response.status,location:response.headers.get('location'),checkedAt:new Date().toISOString()};
      await response.body?.cancel();await writeFile(file,JSON.stringify(result));
    }catch(error){failures.push({path,error:error.message});continue;}
  }
  if([301,302,303,307,308].includes(result.status)&&result.location){
    const location=new URL(result.location,'https://www.everytip.co.uk').href;
    if(!/^https?:/.test(location))throw new Error('Invalid affiliate protocol');
    redirects[path]={status:result.status,location};
  }else failures.push(result);
  console.log(`${path}: ${result.status}`);
}
await writeFile('data/affiliate-redirects.json',JSON.stringify({checkedAt:new Date().toISOString(),redirects:Object.fromEntries(Object.keys(redirects).sort().map(key=>[key,redirects[key]]))},null,2)+'\n');
await writeFile('outputs/affiliate-check.json',JSON.stringify({total:paths.size,resolved:Object.keys(redirects).length,failures},null,2));
console.log(JSON.stringify({total:paths.size,resolved:Object.keys(redirects).length,failures:failures.length}));
if(failures.length)process.exitCode=1;
