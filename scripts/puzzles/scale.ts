import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BANK_CAPS } from '../../src/puzzles/bank';
import { createBankLoader } from '../../src/puzzles/loader';
import { createRng } from '../../src/puzzles/rng';
import { parFrom } from '../../src/puzzles/solver';
import type { BandQuota, DescriptorCore, FamilySpec, PuzzleAdapter } from '../../src/puzzles/types';
import { BYTE_MODEL, modelEntries, verifyByteModel, type ByteModelRow } from './byte-model';
import { bakeFamily, familyActual, readCatalog, saveCatalogBanks, verifyCatalog, type CatalogDirs } from './pipeline';

/**
 * Full-scale stand-in for the 62,647-entry catalog: real packing, real manifests and the real
 * loader, with padded rows at each family's modelled size. It measures the format, not real content.
 */
type Pad = { text: string };
const padAdapter: PuzzleAdapter<Pad, { done: boolean }, 'done'> = {
  engine: 'scale-fixture', rules: 1, needsCheck: false,
  isPayload: (x): x is Pad => typeof (x as Pad)?.text === 'string',
  isAction: (x): x is 'done' => x === 'done',
  encodePayload: p => p.text,
  decodePayload: x => (typeof x === 'string' ? { text: x } : null),
  create: () => ({ done: false }),
  validState: (x): x is { done: boolean } => typeof (x as { done: boolean })?.done === 'boolean',
  reduce: (s, a) => (a === 'done' && !s.done ? { done: true } : s),
  actions: s => (s.done ? [] : ['done']),
  solved: s => s.done,
  metrics: (_, actions) => ({ steps: actions.length }),
  solve: () => ({ status: 'solved', witness: ['done'], metric: 'steps', lower: 1, upper: 1, exact: true }),
  semanticKey: d => d.payload.text,
};
function padText(seed: number, bytes: number) {
  const rng = createRng(seed);
  let text = '';
  while (text.length < bytes) text += rng.uint32().toString(36).padStart(7, '0');
  return text.slice(0, bytes);
}
const bandNames = ['paddling', 'shallows', 'lagoon', 'reef', 'deep', 'trench', 'band-7', 'band-8'];
export function fixtureSpec(model: ByteModelRow): FamilySpec<Pad> {
  const share = Math.floor(model.target / model.bands);
  const bands = Array.from({ length: model.bands }, (_, i) => {
    const target = i === model.bands - 1 ? model.target - share * (model.bands - 1) : share;
    return { id: bandNames[i], target, floor: 0, advanced: false };
  });
  return {
    id: model.family, adapter: padAdapter, bands, maxRowBytes: model.rowBytes, requiresUnique: false, requiresTrace: false, sources: [],
    provenance: { source: 'original', note: 'Sizing fixture only.' }, review: { ids: [], complete: false },
    generate(seed: number, band: BandQuota): DescriptorCore<Pad> {
      const overhead = `[${seed},"l${seed % 5}","t${seed % 8}","",["steps",1,1]]`.length;
      return { format: 1, seed, rng: 1, band: band.id, layout: `l${seed % 5}`, template: `t${seed % 8}`, payload: { text: padText(seed, model.rowBytes - overhead) }, objectives: [], limits: [], par: parFrom('steps', 1, 1), teaches: [], speech: null };
    },
  };
}
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];

export async function measureScale(options: { dirs?: CatalogDirs; keep?: boolean; samples?: number; models?: readonly ByteModelRow[]; verify?: boolean } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'puzzle-scale-'));
  const dirs = options.dirs ?? { content: join(base, 'content'), receipts: join(base, 'receipts') };
  const models = options.models ?? BYTE_MODEL, specs = models.map(fixtureSpec);
  try {
    const started = Date.now();
    const reports = specs.map(spec => bakeFamily(spec, { dirs, seedBase: 1 }));
    const buildMs = Date.now() - started;
    const failed = reports.filter(r => !r.published);
    if (failed.length) throw new Error(`Scale fixture did not publish: ${failed.map(r => `${r.family}: ${r.reason}`).join('; ')}`);
    const { root, families } = readCatalog(dirs);
    const rootBytes = Buffer.byteLength(readFileSync(join(dirs.content, 'root.json')));
    const familyBytes = [...families.values()].map(m => Buffer.byteLength(JSON.stringify(m)));
    const packCount = [...families.values()].reduce((n, m) => n + m.packs.length, 0);
    const entries = [...families.values()].reduce((n, m) => n + m.packs.reduce((c, p) => c + p[2], 0), 0);
    const packBytes = [...families.values()].reduce((n, m) => n + m.packs.reduce((c, p) => c + p[3], 0), 0);
    const actual = [...families.values()].map(m => familyActual(dirs, m));
    const modelIssues = verifyByteModel(actual);
    const saveFragment = saveCatalogBanks(dirs, new Map(models.map(m => [m.family, padAdapter])));
    const saveFragmentBytes = Buffer.byteLength(JSON.stringify(saveFragment));
    const transport = { read: async (asset: string) => readFileSync(join(dirs.content, 'assets', `${asset}.lipuzzle`), 'utf8') };
    const families2 = [...families.values()], samples = options.samples ?? 200;
    const gc = (globalThis as { gc?: () => void }).gc;
    const rng = createRng(7), all = families2.flatMap(m => m.packs.map(p => [m, p] as const));
    // Largest packs first in the memory run, so the peak measures the worst legal pair.
    const largest = [...all].sort((a, b) => b[1][3] - a[1][3]).slice(0, 3);
    const heap = () => process.memoryUsage().heapUsed;
    let baseline = 0, settled = 0, transient = 0;
    gc?.();
    baseline = heap();
    const memoryLoader = createBankLoader({ root, transport, packCapacity: BANK_CAPS.decodedPacks });
    await memoryLoader.family(families2[0].family);
    for (const [m, p] of [...largest, ...largest]) {
      await memoryLoader.pack(m, p);
      // Sampled before collection too, so garbage from the raw text and split is counted.
      transient = Math.max(transient, heap());
      gc?.();
      settled = Math.max(settled, heap());
    }
    const peakAddedHeap = gc ? settled - baseline : null, peakBeforeCollection = gc ? transient - baseline : null;
    const cold: number[] = [], warm: number[] = [], manifestOpen: number[] = [];
    for (let i = 0; i < samples; i++) {
      const [m, p] = all[rng.below(all.length)];
      const loader = createBankLoader({ root, transport });
      const a = performance.now();
      await loader.family(m.family);
      manifestOpen.push(performance.now() - a);
      const b = performance.now();
      await loader.pack(m, p);
      cold.push(performance.now() - b);
      const c = performance.now();
      await loader.pack(m, p);
      warm.push(performance.now() - c);
    }
    const verified = options.verify === false ? null : verifyCatalog(dirs, specs as unknown as FamilySpec<unknown>[]);
    return {
      fixture: 'synthetic rows at modelled sizes, not the real catalog',
      entries, modelEntries: modelEntries(), packs: packCount, slotsFree: BANK_CAPS.slots - packCount, packBytes, catalogBytes: root.families.reduce((n, f) => n + f[5], 0), buildMs,
      rootBytes, largestFamilyBytes: Math.max(...familyBytes), familyCount: root.families.length, modelIssues,
      saveFragmentBytes,
      memory: { largestPackBytes: largest.map(l => l[1][3]), peakAddedHeap, peakBeforeCollection, gcAvailable: !!gc },
      timingMs: { manifestP95: percentile(manifestOpen, 0.95), coldP50: percentile(cold, 0.5), coldP95: percentile(cold, 0.95), warmP95: percentile(warm, 0.95), samples },
      verify: verified ? { errors: verified.errors.length, firstErrors: verified.errors.slice(0, 5), replayed: verified.stats.replayed, botRuns: verified.stats.botRuns } : null,
      caps: { rootBytes: BANK_CAPS.rootBytes, familyBytes: BANK_CAPS.familyBytes, catalogBytes: BANK_CAPS.catalogBytes, decodedBytes: BANK_CAPS.decodedBytes, slots: BANK_CAPS.slots },
    } as const satisfies Record<string, unknown>;
  } finally {
    if (!options.keep) rmSync(base, { recursive: true, force: true });
  }
}
