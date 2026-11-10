import manifest from "../../../content/pictures/manifest.json";
import { pictureAssets } from "./assets.generated";

/**
 * The island picture dictionary: about 400 original vector pictures shared by
 * Picture Crossword, word lists and Word Search picture mode. Nothing imports
 * this yet. A game that does must take its answers from an admitted W1 word
 * bank and look the picture up by word; the labels here are not admitted answers.
 */
export type PictureCategory = (typeof manifest.categories)[number];
export type PictureEntry = { id: string; word: string; category: string; alt: string; bytes: number; sha256: string };
/** Reads the text of one bundled SVG asset; native and web differ (see transport.*.ts). */
export type PictureTransport = { read(asset: () => number): Promise<string> };

const ID = /^[a-z][a-z0-9-]*$/;
function validEntry(x: unknown): x is PictureEntry {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return typeof p.id === "string" && ID.test(p.id) && typeof p.word === "string" && /^[A-Z]+$/.test(p.word)
    && typeof p.category === "string" && manifest.categories.includes(p.category) && typeof p.alt === "string" && p.alt.length > 0
    && Number.isInteger(p.bytes) && (p.bytes as number) > 0 && typeof p.sha256 === "string" && /^[a-f0-9]{64}$/.test(p.sha256);
}

/** The checked index. A malformed manifest fails loudly at import rather than drawing nothing. */
export const pictureIndex: readonly PictureEntry[] = (() => {
  if (manifest.schemaVersion !== 1 || manifest.viewBox !== "0 0 120 120" || !Array.isArray(manifest.pictures)) throw new Error("Unsupported picture manifest.");
  const ids = new Set<string>();
  for (const p of manifest.pictures) {
    if (!validEntry(p) || ids.has(p.id)) throw new Error(`Invalid picture entry ${JSON.stringify((p as { id?: unknown })?.id)}.`);
    ids.add(p.id);
  }
  return Object.freeze(manifest.pictures.map((p) => Object.freeze({ ...p })));
})();
const byId = new Map(pictureIndex.map((p) => [p.id, p]));
const byWord = new Map(pictureIndex.map((p) => [p.word, p]));

export const pictureById = (id: string): PictureEntry | undefined => byId.get(id);
/** Look a picture up by an admitted answer's spelling, e.g. "CRAB". */
export const pictureForWord = (word: string): PictureEntry | undefined => byWord.get(word.trim().toUpperCase());
export const picturesInCategory = (category: string): PictureEntry[] => pictureIndex.filter((p) => p.category === category);

/**
 * Loads picture SVG text on demand and keeps the most recent few in memory.
 * A picture whose bytes differ from the manifest is refused, not drawn.
 */
export function createPictureLoader(transport: PictureTransport, assets: Record<string, () => number> = pictureAssets, keep = 48) {
  const cache = new Map<string, Promise<string>>();
  return {
    load(id: string): Promise<string> {
      const entry = byId.get(id), asset = assets[id];
      if (!entry || !asset) return Promise.reject(new Error(`Unknown picture ${id}.`));
      const hit = cache.get(id);
      if (hit) {
        cache.delete(id);
        cache.set(id, hit);
        return hit;
      }
      const pending = transport.read(asset).then((xml) => {
        const bytes = new TextEncoder().encode(xml).length;
        if (bytes !== entry.bytes || !xml.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">')) throw new Error(`Picture ${id} does not match its manifest entry.`);
        return xml;
      });
      pending.catch(() => cache.delete(id));
      cache.set(id, pending);
      while (cache.size > keep) cache.delete(cache.keys().next().value as string);
      return pending;
    },
    cached: () => cache.size,
  };
}
