// IPC only: use the exporting Library's actual generator tokenizer. No policy
// or authored text is printed to build logs, including on failure.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {libraryNormalize} from './artifact-views.mjs';
try {
  const {normalize,phonetic}=await import(pathToFileURL(resolve('src/library/search.ts')));
  const read=path=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):undefined;
  const authored=read('content/library/items.json')??[],catalog=read('src/library/catalog.generated.json')??{};
  if(!Array.isArray(authored) || !Array.isArray(catalog.items??[]) || !Array.isArray(catalog.index??[]))throw new Error();
  function strings(value) {
    if(typeof value==='string')return [value];
    if(Array.isArray(value))return value.flatMap(strings);
    if(value && typeof value==='object')return Object.entries(value).filter(([key])=>!['terms','sounds'].includes(key)).flatMap(([,v])=>strings(v));
    return [];
  }
  // Authored records take priority over generated records. Legacy entries use
  // their generated item's own source fields, never another item's tokens.
  const records=new Map([...(catalog.index??[]),...(catalog.items??[]),...authored].filter(item=>typeof item?.id==='string').map(item=>[item.id,item]));
  const rows=[...records].map(([id,item])=>{const source=strings(item);if(source.some(s=>libraryNormalize(s)!==normalize(s)))throw new Error();const tokens=[...new Set(source.flatMap(s=>normalize(s).split(' ')).filter(Boolean))];return {id,tokens,sounds:tokens.map(phonetic),source};});
  process.stdout.write(JSON.stringify(rows));
} catch {process.stderr.write('Cannot derive Library tokens with exporting source tokenizer\n');process.exitCode=1;}
