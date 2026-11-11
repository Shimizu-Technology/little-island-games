// Child process uses the exporting source tree's exact TypeScript hooks/codecs.
// No policy, terms or decoded content is written to disk or printed on failure.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = path => pathToFileURL(resolve(path)).href;
try {
  const { families } = await import(source('scripts/puzzles/families/index.ts'));
  const { decodeRow } = await import(source('src/puzzles/descriptor.ts'));
  const result = [];
  for (const text of JSON.parse(readFileSync(0, 'utf8'))) {
    const [first, ...rows] = text.split('\n'), header = JSON.parse(first);
    const family = families.find(f => f.id === header.family);
    if (header.format !== 1 || !family || header.rules !== family.adapter.rules || header.rng !== 1 || rows.length !== header.count) throw new Error();
    const decoded = rows.map(row => {
      const value = decodeRow(row, header.band, family.adapter);
      if (!value) throw new Error();
      return value;
    });
    result.push({ header, decoded });
  }
  process.stdout.write(JSON.stringify(result));
} catch {
  process.stderr.write('Cannot decode exported puzzle pack with registered source codec\n');
  process.exitCode = 1;
}
