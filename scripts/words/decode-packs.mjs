// Child process uses the exporting source tree's exact TypeScript hooks/codecs.
// No policy, terms or decoded content is written to disk or printed on failure.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = path => pathToFileURL(resolve(path)).href;
try {
  const { families } = await import(source('scripts/puzzles/families/index.ts'));
  const { decodeRow } = await import(source('src/puzzles/descriptor.ts'));
  const { parsePack, validFamily } = await import(source('src/puzzles/bank.ts'));
  const result = [];
  for (const text of JSON.parse(readFileSync(0, 'utf8'))) {
    let manifest;try {manifest=JSON.parse(text);} catch { /* Multi-line row pack. */ }
    if(manifest) {
      if(!validFamily(manifest))throw new Error();
      result.push({payloads:[],metadata:manifest,rows:[manifest]});continue;
    }
    const [first] = text.split('\n'), header = JSON.parse(first);
    const family = families.find(f => f.id === header.family);
    if (header.format !== 1 || !family || !family.bands.some(b=>b.id===header.band) || header.rules !== family.adapter.rules || header.rng !== 1) throw new Error();
    const parsed=parsePack(text,[header.slot,header.first,header.count,0,'',0,header.rules,header.rng],{family:header.family,bands:[header.band]});
    if(!parsed || !Number.isSafeInteger(header.count) || header.count<1)throw new Error();
    const decoded = parsed.rows.map(row => {
      const value = decodeRow(row, header.band, family.adapter);
      if (!value) throw new Error();
      return value;
    });
    result.push({rows:decoded,payloads:decoded.map(row=>row.payload),speech:decoded.map(row=>row.speech),metadata:{header,engine:family.adapter.engine,rows:decoded.map(({payload,speech,...identifiers})=>identifiers)}});
  }
  process.stdout.write(JSON.stringify(result));
} catch {
  process.stderr.write('Cannot decode exported puzzle pack with registered source codec\n');
  process.exitCode = 1;
}
