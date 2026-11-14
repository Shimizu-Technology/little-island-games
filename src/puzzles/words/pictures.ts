import { createSha256 } from '../sha256';

export type PictureBinding = { id: string; spelling: string; bytes: number; sha256: string };
export type PictureResolver = { idFor(spelling: string): string | undefined; load(id: string): Promise<string> };
type Transport = { read(asset: () => number): Promise<string> };
/** Only picture bindings for the admitted bank belong in this resolver. */
export function createSearchPictures(entries: readonly PictureBinding[], assets: Record<string, () => number>, transport: Transport, keep = 48): PictureResolver {
  const byId = new Map(entries.map(p => [p.id, p])), byWord = new Map(entries.map(p => [p.spelling.normalize('NFC').toUpperCase(), p.id]));
  if (!Number.isInteger(keep) || keep < 1 || byId.size !== entries.length || byWord.size !== entries.length || entries.some(p => !/^[a-z][a-z0-9-]*$/.test(p.id) || !p.spelling || !Number.isInteger(p.bytes) || p.bytes < 1 || !/^[a-f0-9]{64}$/.test(p.sha256) || !assets[p.id])) throw new Error('Invalid Word Search picture bindings.');
  const cache = new Map<string, Promise<string>>();
  return {
    idFor: spelling => byWord.get(spelling.normalize('NFC').trim().toUpperCase()),
    load(id) {
      const p = byId.get(id), asset = assets[id];
      if (!p || !asset) return Promise.reject(new Error('Unknown Word Search picture.'));
      const hit = cache.get(id);
      if (hit) { cache.delete(id); cache.set(id, hit); return hit; }
      const pending = transport.read(asset).then(xml => {
        const hash = createSha256(); hash.update(xml);
        if (hash.bytes() !== p.bytes || hash.hex() !== p.sha256 || !xml.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">')) throw new Error('Word Search picture does not match its admitted binding.');
        return xml;
      });
      pending.catch(() => { if (cache.get(id) === pending) cache.delete(id); });
      cache.set(id, pending);
      while (cache.size > keep) cache.delete(cache.keys().next().value!);
      return pending;
    },
  };
}
