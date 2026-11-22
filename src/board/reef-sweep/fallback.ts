import type { ReefFallback } from "../types";
import { reefSweepAdapter, type ReefPayload } from "../../puzzles/adapters/reef-sweep";
import { bankLoader } from "../../puzzles/catalog";
import { decodeRow } from "../../puzzles/descriptor";
import { fnv1a32 } from "../../puzzles/today";
import sets from "./sets.generated.json";

type PackedTuple = readonly [slot: number, first: number, count: number, packHash: string, rules: number, band: string];

export type FallbackCandidate = ReefFallback & {
  size: 5 | 6 | 7;
  bank: number;
  puzzle: number;
  band: string;
};

const packedRows = sets.packed as unknown as readonly PackedTuple[];

const bandsForSize = (size: number): readonly string[] =>
  size === 5 ? ["single-5"] : size === 6 ? ["single-6"] : ["subset-7", "coupled-7"];

/** Synchronous certified fallback from the embedded certified Deep Water rows (same 128-entry bank). */
export function certifiedFallbackSync(size: number, seed: number): FallbackCandidate {
  const n = size === 5 || size === 6 || size === 7 ? size : 5;
  const bands = bandsForSize(n);
  const matching = sets.deep.filter((g) => bands.includes(g.band));
  const pool = matching.flatMap((g) =>
    g.rows.map((row, idx) => ({ band: g.band, row, idx }))
  );
  const pick = pool[fnv1a32(`reef-fallback-sync|${n}|${seed}`) % pool.length];
  const decoded = decodeRow<ReefPayload>(pick.row, pick.band, reefSweepAdapter);
  if (!decoded) throw new Error(`Certified fallback row for ${pick.band} failed to decode.`);
  return {
    size: decoded.payload.size as 5 | 6 | 7,
    start: decoded.payload.start,
    mines: [...decoded.payload.mines],
    bank: 468,
    puzzle: pick.idx,
    band: pick.band,
  };
}

/**
 * Loads a certified no-guess fallback board for `size` from the 128-entry packed bank (slots 464-467).
 * Falls back cleanly to `certifiedFallbackSync` if the packed asset transport is unavailable.
 */
export async function loadCertifiedFallback(size: number, seed: number): Promise<FallbackCandidate> {
  const n = size === 5 || size === 6 || size === 7 ? size : 5;
  const bands = bandsForSize(n);
  const matchingPacks = packedRows.filter((row) => bands.includes(row[5]));
  if (matchingPacks.length) {
    const pack = matchingPacks[fnv1a32(`reef-fallback-pack|${n}|${seed}`) % matchingPacks.length];
    const [slot, first, count, , , band] = pack;
    const index = fnv1a32(`reef-fallback-idx|${slot}|${seed}`) % count;
    try {
      const entry = await bankLoader().entry(reefSweepAdapter, "reef-sweep", first + index);
      return {
        size: entry.payload.size as 5 | 6 | 7,
        start: entry.payload.start,
        mines: [...entry.payload.mines],
        bank: slot,
        puzzle: index,
        band,
      };
    } catch {
      /* Fall through to embedded certified subset from the same bank. */
    }
  }
  return certifiedFallbackSync(n, seed);
}
