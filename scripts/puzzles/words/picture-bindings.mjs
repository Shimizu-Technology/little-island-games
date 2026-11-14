import { readFileSync } from 'node:fs';
import { requireThat } from '../../words/core.mjs';
/** Project the existing dictionary onto pictured answers only; never bundle its vocabulary index. */
export function pictureBindings(puzzles) {
  const wanted = new Set(puzzles.filter(p => p.list === 'pictures').flatMap(p => p.words.map(w => w.spelling.normalize('NFC').toUpperCase())));
  const dictionary = JSON.parse(readFileSync(new URL('../../../content/pictures/manifest.json', import.meta.url))).pictures;
  const entries = dictionary.filter(p => wanted.has(p.word)).map(p => ({ id: p.id, spelling: p.word, bytes: p.bytes, sha256: p.sha256 }));
  requireThat(entries.length === wanted.size, 'An adopted picture answer has no dictionary binding');
  return entries;
}
export function pictureBindingsSource(entries, typePath = './pictures') {
  requireThat(entries.every(p => /^[a-z][a-z0-9-]*$/.test(p.id)), 'Invalid picture asset identity');
  return `// Scoped picture bindings; generated from adopted picture answers.\nimport type { PictureBinding } from ${JSON.stringify(typePath)};\nexport const searchPictureEntries: PictureBinding[] = ${JSON.stringify(entries, null, 2)};\nexport const searchPictureAssets: Record<string, () => number> = {\n${entries.map(p => `  ${JSON.stringify(p.id)}: () => require(${JSON.stringify(`../../../content/pictures/svg/${p.id}.svg`)}),`).join('\n')}\n};\n`;
}
