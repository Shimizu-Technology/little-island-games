import { createHash } from 'node:crypto';
import { emptySave, parseSave } from '../../src/state/validation';
import { migrateProfiles, encodeSave } from '../../src/state/profiles';
import { addLearner } from '../../src/learn/learners';
import { emptyChallenge, registerSaveContent, validChallengeSession, type SaveCatalog, type ChallengeSession } from '../../src/state/challenge';
import { catalogManifest } from '../../src/state/catalogManifest';
import { prepareSessionContent } from '../../src/state/sessionContent';
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
    id: model.family, adapter: {...padAdapter,engine:model.family}, bands, maxRowBytes: model.rowBytes, requiresUnique: false, requiresTrace: false, hiddenInformation: false, sources: [],
    provenance: { source: 'original', note: 'Sizing fixture only.' }, review: { ids: [], complete: false },
    generate(seed: number, band: BandQuota): DescriptorCore<Pad> {
      const overhead = `[${seed},"l${seed % 5}","t${seed % 8}","",["steps",1,1]]`.length;
      return { format: 1, seed, rng: 1, band: band.id, layout: `l${seed % 5}`, template: `t${seed % 8}`, payload: { text: padText(seed, model.rowBytes - overhead) }, objectives: [], limits: [], par: parFrom('steps', 1, 1), teaches: [], speech: null };
    },
  };
}
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];

/** Same structural parser used at startup, plus the single-session work deferred to Continue. */
async function measurePausedLaunch(dirs:CatalogDirs,root:import('../../src/puzzles/bank').RootIndex,banks:ReturnType<typeof saveCatalogBanks>,metadata:string) {
  const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
  const catalog:SaveCatalog={banks:new Map(banks.map(b=>[b.slot,b])),codecs:new Map(banks.map(b=>[`${b.engine}-v1`,{game:b.engine,cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},validate:(s:ChallengeSession)=>s.payload===0,evaluate:()=>null,canStart:()=>true,extends:()=>true}])),contexts:new Set(),dares:new Map()};
  const registrationStart=performance.now();registerSaveContent(catalog,catalogManifest(catalog));const registrationMs=performance.now()-registrationStart;
  const sizes=new Map(banks.map(b=>[b.slot,readFileSync(join(dirs.content,'assets',`p${b.slot}.lipuzzle`)).byteLength]));
  const bySize=(a:typeof banks[number],b:typeof banks[number])=>sizes.get(b.slot)!-sizes.get(a.slot)!;
  const chosen=[...banks].sort(bySize).filter((b,i,all)=>all.findIndex(x=>x.engine===b.engine)===i).slice(0,8).sort((a,b)=>a.engine.localeCompare(b.engine));
  if(chosen.length<8)throw new Error('Launch fixture needs eight families.');
  const rootText=JSON.stringify(root), gc=(globalThis as {gc?:()=>void}).gc;
  let assetReads=0;
  const transport={read:async(asset:string)=>{assetReads++;return readFileSync(join(dirs.content,'assets',`${asset}.lipuzzle`),'utf8');}};
  const session=(owner:string,i:number,index:number):ChallengeSession=>{
    const b=chosen[i],row=readFileSync(join(dirs.content,'assets',`p${b.slot}.lipuzzle`),'utf8').split('\n')[index+1];
    return {version:1,owner,game:b.engine,id:`${owner}-${i}`,ordinal:i+1,revision:0,puzzle:{bank:b.slot,puzzle:index,engine:b.engine,rules:b.rules,hash:sha(row)},codec:`${b.engine}-v1`,payload:0,selectedDares:[],partner:null,result:null,credited:false};
  };
  const paused=[];
  for(const count of [1,8,56]){
    let learning=addLearner(undefined,'A','a');for(const id of ['b','c','d'])learning=addLearner(learning,id,id);
    const save=migrateProfiles({...emptySave(),learning});
    save.cove={version:1,active:null,people:Object.fromEntries(Array.from({length:4},(_,i)=>[`cove-${i}`,{name:`Adult ${i}`,challenge:emptyChallenge(true)}]))};
    let remaining=count,index=0;
    for(const [owner,p] of [...Object.entries(save.profiles!.people),...Object.entries(save.cove.people)]){
      const slots=Math.min(remaining,owner.startsWith('cove-')?4:8);
      p.challenge={...emptyChallenge(),nextOrdinal:slots+1,paused:Array.from({length:slots},(_,i)=>session(owner,i,index++))};remaining-=slots;
    }
    const raw=encodeSave(save),timings:number[]=[];let peak=0,retained=0;
    const reads=assetReads;
    for(let i=0;i<12;i++){
      gc?.();const baseline=process.memoryUsage().heapUsed,start=performance.now();
      JSON.parse(metadata);JSON.parse(rootText);parseSave(raw);
      timings.push(performance.now()-start);peak=Math.max(peak,process.memoryUsage().heapUsed-baseline);
      gc?.();retained=Math.max(retained,process.memoryUsage().heapUsed-baseline);
    }
    paused.push({sessions:count,envelopeBytes:Buffer.byteLength(raw),structureP50Ms:percentile(timings,0.5),structureP95Ms:percentile(timings,0.95),assetReads:assetReads-reads,peakBeforeCollection:gc?peak:null,retainedHeapBytes:gc?retained:null,samples:12});
  }
  // Use the largest pack's exact row, including manifest load, row hashing and codec validation.
  const largest=[...banks].sort(bySize)[0],i=chosen.findIndex(b=>b.slot===largest.slot);
  const ref=session('family',i>=0?i:0,0),cold:number[]=[],warm:number[]=[];let peak=0,retained=0;
  for(let n=0;n<12;n++){
    const local={...catalog},loader=createBankLoader({root,transport});
    gc?.();const baseline=process.memoryUsage().heapUsed,start=performance.now();
    await prepareSessionContent(ref,local,{loader});
    if(!validChallengeSession(ref,'family',local))throw new Error('Scale Continue failed.');
    cold.push(performance.now()-start);peak=Math.max(peak,process.memoryUsage().heapUsed-baseline);
    gc?.();retained=Math.max(retained,process.memoryUsage().heapUsed-baseline);
    const warmStart=performance.now();await prepareSessionContent(ref,local,{loader});
    if(!validChallengeSession(ref,'family',local))throw new Error('Scale warm Continue failed.');
    warm.push(performance.now()-warmStart);loader.release();
  }
  return {paused,registrationMs,continue:{refsPerOpen:1,coldP50Ms:percentile(cold,0.5),coldP95Ms:percentile(cold,0.95),warmP95Ms:percentile(warm,0.95),peakBeforeCollection:gc?peak:null,retainedHeapBytes:gc?retained:null,samples:12},budgets:{structureP95Ms:150,continueColdP95Ms:250,continueWarmP95Ms:100,decodedBytes:BANK_CAPS.decodedBytes}};
}

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
    const saveFragment = saveCatalogBanks(dirs, () => ({awards:0,cove:true}));
    const launchText=JSON.stringify({version:2,banks:saveFragment,dares:[],contexts:[]});
    const saveFragmentBytes=Buffer.byteLength(launchText);
    const launchParse:number[]=[];
    let launchParsed:unknown;
    const launchGc=(globalThis as {gc?:()=>void}).gc;
    launchGc?.();const launchBaseline=process.memoryUsage().heapUsed;
    const launchStart=performance.now();launchParsed=JSON.parse(launchText);const firstParseMs=performance.now()-launchStart;
    const launchTransient=process.memoryUsage().heapUsed-launchBaseline;
    launchGc?.();const launchLive=process.memoryUsage().heapUsed-launchBaseline;
    for(let i=0;i<100;i++){const started=performance.now();JSON.parse(launchText);launchParse.push(performance.now()-started);}
    if(!launchParsed)throw new Error('Missing parsed metadata.');
    const pausedLaunch=await measurePausedLaunch(dirs,root,saveFragment,launchText);
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
      launch: {...pausedLaunch,saveMetadataBytes:saveFragmentBytes,aggregateEagerBytes:rootBytes+saveFragmentBytes,firstParseMs,parseP95Ms:percentile(launchParse,0.95),liveHeapBytes:launchGc?launchLive:null,transientHeapBytes:launchGc?launchTransient:null},
      memory: { largestPackBytes: largest.map(l => l[1][3]), peakAddedHeap, peakBeforeCollection, gcAvailable: !!gc },
      timingMs: { manifestP95: percentile(manifestOpen, 0.95), coldP50: percentile(cold, 0.5), coldP95: percentile(cold, 0.95), warmP95: percentile(warm, 0.95), samples },
      verify: verified ? { errors: verified.errors.length, firstErrors: verified.errors.slice(0, 5), replayed: verified.stats.replayed, botRuns: verified.stats.botRuns } : null,
      caps: { rootBytes: BANK_CAPS.rootBytes, familyBytes: BANK_CAPS.familyBytes, catalogBytes: BANK_CAPS.catalogBytes, decodedBytes: BANK_CAPS.decodedBytes, slots: BANK_CAPS.slots },
    } as const satisfies Record<string, unknown>;
  } finally {
    if (!options.keep) rmSync(base, { recursive: true, force: true });
  }
}
