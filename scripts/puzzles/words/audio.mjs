import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../../src/content/neuralAudio.ts', import.meta.url),'utf8');
/** Derives only an existing recording key; it never changes the reviewed W2 record. */
export function audioFor(word) {
  const key=word.audio ?? (word.language==='en' ? word.spelling.toLowerCase() : null);
  if(key===null)return null;
  return source.includes(JSON.stringify(key)+':') ? key : null;
}
