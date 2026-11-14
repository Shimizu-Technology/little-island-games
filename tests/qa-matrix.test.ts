import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMatrix, discoverInventory, nativeCases, readEvidenceIndex, readMatrix, readOverrides, readScope, renderMatrix, serializeMatrix, validateMatrix } from '../scripts/qa/matrix';

const matrix = readMatrix(), scope = readScope(), inventory = discoverInventory(), index = readEvidenceIndex();
const validate = (m = matrix, inv = inventory) => validateMatrix(m, scope, inv, index);
const without = (id: string) => ({ ...matrix, rows: matrix.rows.filter(row => row.id !== id) });
const edited = (edit: (m: typeof matrix) => void) => { const m = structuredClone(matrix); edit(m); return m; };

/** Small private registry fixture: actual parser inputs, no engines/binaries/lock. */
function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'qa25-registry-'));
  try {
    const copy = (path: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); cpSync(path, join(root, path)); };
    for (const path of ['docs/qa-scope.json','docs/qa-cases.json','docs/qa-overrides.json','src/games/index.ts','src/board/index.ts','src/arcade/types.ts','src/state/activities.ts','src/cove/catalog.ts','src/content/puzzles/root.json']) copy(path);
    for (const id of inventory.school) copy(`src/learn/games/${id}/registration.json`);
    for (const id of inventory.challenge) copy(`src/challenge/registrations/${id}.ts`);
    const families = JSON.parse(readFileSync('src/content/puzzles/root.json','utf8')).families as [string,string][];
    for (const [,manifest] of families) copy(`src/content/puzzles/assets/${manifest}.lipuzzle`);
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

describe('QA-25 reproducible scope and execution ledger', () => {
  it('covers the real registries, planned roster, mechanics and Challenge surfaces', () => {
    expect(() => validate()).not.toThrow();
    expect(inventory.games).toHaveLength(63);
    expect(inventory.challenge).toHaveLength(19);
    expect(matrix.rows.filter(r => r.group === 'games')).toHaveLength(92);
    expect(matrix.rows.filter(r => r.group === 'challenge')).toHaveLength(19);
    expect(inventory.mechanics).toHaveLength(36);
  });
  it.each(['G-beep-bot','G-bridges','G-crossword','C-drop-puzzles','M01','J34','P11','RD11','H-A10','BP-slip-tide-0','B-reef-race-01','PH-001'])('rejects removed required row %s', id => {
    expect(() => validate(without(id))).toThrow(/QA matrix:/);
  });
  it.each(['games','challenge','cove','mechanics'] as const)('detects new uncovered %s inventory', field => {
    expect(() => validate(matrix, { ...inventory, [field]: [...inventory[field], 'new-registration'] })).toThrow(/missing/);
  });
  it('regenerates a newly registered planned game and its banks without any override or large JSON edit', () => fixture(root => {
    const file = join(root,'src/challenge/registrations/picture-grid.ts');
    writeFileSync(file,"export const qaMechanics = ['M03', 'M04'] as const;\n");
    const next = discoverInventory(root), generated = buildMatrix(root, scope, next);
    expect(() => validateMatrix(matrix,scope,next,index)).toThrow(/missing Challenge/);
    expect(() => validateMatrix(generated,scope,next,index)).not.toThrow();
    expect(generated.rows.find(r => r.id === 'G-picture-grid')?.availability).toBe('registered');
    expect(generated.rows.find(r => r.id === 'G-picture-grid')?.surfaces).toContain('Challenge:picture-grid');
    expect(generated.rows.filter(r => r.id.startsWith('B-picture-grid-')).every(r => r.availability === 'registered')).toBe(true);
    expect(generated.rows.find(r => r.id === 'M04')?.availability).toBe('registered');
  }));
  it('reads declared mechanics from real registration files, independently of the scope', () => fixture(root => {
    const path = join(root,'src/learn/games/reef-race/registration.json');
    const registration = JSON.parse(readFileSync(path,'utf8'));
    registration.qaMechanics = ['M37']; writeFileSync(path,JSON.stringify(registration));
    const next = discoverInventory(root);
    expect(next.mechanics).toContain('M37');
    expect(() => validateMatrix(matrix,scope,next,index)).toThrow(/missing registered mechanic: M37/);
    writeFileSync(join(root,'src/challenge/registrations/beep-bot.ts'), 'export const qaMechanics = unknown;');
    expect(() => discoverInventory(root)).toThrow(/Nonliteral mechanics/);
  }));
  it('fails closed on a new actual School registration outside the frozen PLAN scope', () => fixture(root => {
    const path = join(root,'src/learn/games/new-game/registration.json');
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path,JSON.stringify({ id:'new-game' }));
    expect(() => validateMatrix(buildMatrix(root),scope,discoverInventory(root),index)).toThrow(/missing game/);
  }));
  it('derives partial mechanic availability and rejects drift for every row group', () => {
    expect(matrix.rows.find(r => r.id === 'M01')?.availability).toBe('partial');
    expect(matrix.rows.find(r => r.id === 'M01')?.registeredGames).toBe(6);
    for (const id of ['G-sudoku','M01','B-sudoku-01','J01','PH-001']) expect(() => validate(edited(m => { m.rows.find(r => r.id === id)!.availability = 'bogus'; }))).toThrow(/availability drift/);
  });
  it('requires every target stratum, so bulk deletion or one-game removal fails', () => {
    expect(matrix.rows.filter(r => r.sampling?.kind === 'target level/band')).toHaveLength(489);
    for (const remove of [(r: typeof matrix.rows[number]) => r.sampling?.kind === 'target level/band', (r: typeof matrix.rows[number]) => r.id.startsWith('B-reef-race-')]) expect(() => validate({ ...matrix, rows:matrix.rows.filter(r => !remove(r)) })).toThrow(/target bank strata/);
    expect(() => validate(matrix,{ ...inventory, banks:[...inventory.banks,{game:'sudoku',slot:999}] })).toThrow(/published stratum/);
  });
  it('freezes 256 distinct physical slots covering all games and 35 game-linked mechanics, with named executors and both devices', () => {
    const rows = matrix.rows.filter(r => r.group === 'physical-sampling');
    expect(rows).toHaveLength(256);
    expect(new Set(rows.map(r => `${r.sampling?.target}/${r.sampling?.sample}`)).size).toBe(256);
    expect(new Set(rows.flatMap(r => r.games)).size).toBe(92);
    expect(new Set(rows.flatMap(r => r.mechanics ?? [])).size).toBe(35);
    expect(rows.every(r => r.dimensions.length === 2 && r.executor.includes('adult'))).toBe(true);
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'PH-001')!.sampling!.sample = 'unallocated'; }))).toThrow(/physical allocation/);
  });
  it('requires exact tested heads from the report index, never base/report-only SHAs or invented paths', () => {
    for (const row of matrix.rows) for (const e of row.evidence) {
      expect(e.sha).toMatch(/^[a-f0-9]{40}$/);
      expect(index.reports.find(r => r.path === e.path)?.testedHeads?.map(h => h.sha)).toContain(e.sha);
    }
    const heads = readOverrides().evidence;
    expect(Object.values(heads).find(e => e.path === 'v4/r0-learn-ax/REPORT.md')?.sha).toMatch(/^50988fa9/);
    expect(Object.values(heads).find(e => e.path === 'v4/c1-crab/REPORT.md')?.sha).toMatch(/^c967b580/);
    expect(Object.values(heads).find(e => e.path === 'v4/c2a-beep/REPORT.md')?.sha).toMatch(/^6922e4cc/);
    for (const sha of ['510b7324', 'a'.repeat(40)]) expect(() => validate(edited(m => { m.rows.find(r => r.id === 'G-reef-race')!.evidence[0].sha = sha; }))).toThrow(/evidence citation|recorded tested head/);
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'G-reef-race')!.evidence[0].path = 'made/up.md'; }))).toThrow(/recorded tested head/);
    const corrupt = structuredClone(index); corrupt.reports.find(r => r.path === 'v4/r0-learn-ax/REPORT.md')!.testedHeads = [];
    expect(() => validateMatrix(matrix,scope,inventory,corrupt)).toThrow(/recorded tested head/);
  });
  it('rejects unknown games and broken mechanic mappings', () => {
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'P01')!.games = ['typo']; }))).toThrow(/unknown game/);
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'G-sudoku')!.mechanics = []; }))).toThrow(/game-to-mechanic/);
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'M01')!.games = []; }))).toThrow(/mapping drift/);
  });
  it('keeps case acceptance separate from two-pass dimension execution and historical evidence', () => {
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'G-slip-tide')!.status = 'passed'; }))).toThrow(/complete current evidence/);
    expect(() => validate(edited(m => { m.rows.find(r => r.id === 'M01')!.dimensionResults!.pop(); }))).toThrow(/dimension\/pass/);
    const host = Object.values(readOverrides().evidence).find(e => e.evidenceKind === 'host')!;
    expect(() => validate(edited(m => {
      const run = m.rows.find(r => r.id === 'RD08')!.dimensionResults![0];
      run.status = 'passed'; run.actual = 'fixture passed'; run.fixture = 'test'; run.evidence = [{...host,coverage:'complete'}];
    }))).toThrow(/matching evidence/);
  });
  it('counts atomic native dimensions and renders mapping, maximums and per-pass results', () => {
    expect(nativeCases(matrix)).toBe(600);
    expect(['games','challenge','mechanics','journeys','play'].map(g => nativeCases(matrix,g))).toEqual([184,38,216,128,34]);
    expect(matrix.passesRequired).toBe(2);
    const markdown = renderMatrix(matrix);
    expect(markdown).toContain('600 device-dimension executions');
    expect(markdown).toContain('[M01](#mechanics)');
    expect(markdown).toContain('25×25');
    expect(markdown).toContain('pass 2 not run');
    expect(markdown).toContain('host: passed (partial)');
  });
  it('holds private QA scripts and matrix tests out of the public export', async () => {
    const { isPrivateWordFile } = await import('../scripts/export-public.mjs');
    for (const path of ['scripts/qa','scripts/qa/matrix.ts','scripts/qa/mechanics.mjs','tests/qa-matrix.test.ts']) expect(isPrivateWordFile(path)).toBe(true);
    expect(isPrivateWordFile('tests/export-public.test.ts')).toBe(false);
  });
  it('requires byte-for-byte generated JSON and Markdown reproducibility', () => {
    const generated = buildMatrix();
    expect(readFileSync('docs/qa-matrix.json','utf8') === serializeMatrix(generated)).toBe(true);
    expect(readFileSync('docs/QA_MATRIX.md','utf8') === renderMatrix(generated)).toBe(true);
  });
});
