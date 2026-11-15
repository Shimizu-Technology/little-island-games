import { requireThat } from './core.mjs';

/** Static lazy require paths let Metro bundle only manifest-admitted banks. */
export function registrySource(manifest) {
  // Lead contract change: W1 reading records. A manifest entry may carry kind 'reading-parts'; those load through
  // their own table so the word-bank type stays what Word Search expects.
  const table=kind=>manifest.banks.filter(b=>(b.kind ?? 'words')===kind).map(b=>{
    requireThat(/^content\/words\/banks\/[a-z0-9-]+\.json$/.test(b.path),'Invalid bank registry path');
    const id=b.path.split('/').at(-1).slice(0,-5);
    return `  ${JSON.stringify(id)}: () => require(${JSON.stringify('./banks/'+id+'.json')}) as ${kind==='words'?'WordBank':'ReadingBank'},`;
  }).sort();
  requireThat(manifest.banks.every(b=>['words','reading-parts'].includes(b.kind ?? 'words')),'Unknown word bank kind');
  return `// Generated from banks.manifest.json; checked by word admission.\nimport type { WordBank, ReadingBank } from './registry';\nexport const bankLoaders: Record<string, () => WordBank> = {\n${table('words').join('\n')}\n};\nexport const readingBankLoaders: Record<string, () => ReadingBank> = {\n${table('reading-parts').join('\n')}\n};\n`;
}
