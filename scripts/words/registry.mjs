import { requireThat } from './core.mjs';

/** Static lazy require paths let Metro bundle only manifest-admitted banks. */
export function registrySource(manifest) {
  const entries=manifest.banks.map(b=>{
    requireThat(/^content\/words\/banks\/[a-z0-9-]+\.json$/.test(b.path),'Invalid bank registry path');
    const id=b.path.split('/').at(-1).slice(0,-5);
    return `  ${JSON.stringify(id)}: () => require(${JSON.stringify('./banks/'+id+'.json')}) as WordBank,`;
  }).sort();
  return `// Generated from banks.manifest.json; checked by word admission.\nimport type { WordBank } from './registry';\nexport const bankLoaders: Record<string, () => WordBank> = {\n${entries.join('\n')}\n};\n`;
}
