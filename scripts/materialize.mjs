import fs from 'node:fs/promises';
import path from 'node:path';
const entries=JSON.parse(await fs.readFile('recovered/assets.json','utf8'));
for(const entry of entries){
 const response=await fetch('https://lead-gestao.gabrielysilva27.workers.dev'+entry.route+'?recovery=stable');
 if(!response.ok)throw Error(entry.route);
 const target=entry.route==='/'||entry.route==='/index.html'?'index.html':entry.route.slice(1);
 await fs.mkdir(path.dirname(target),{recursive:true});
 const bytes=Buffer.from(await response.arrayBuffer());
 await fs.writeFile(target,bytes);
 entry.body=entry.kind==='base64'?bytes.toString('base64'):bytes.toString('utf8');
}
await fs.writeFile('recovered/live-assets.json',JSON.stringify(entries));
console.log('Public assets recovered');
