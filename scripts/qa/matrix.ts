import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { guardedMechanics } from './mechanics.mjs';

export type Evidence = { path: string; sha: string; device: string; build: string; result: 'passed' | 'failed'; scope: string; coverage: 'partial' | 'complete'; evidenceKind: 'host' | 'simulator' | 'physical'; superseded?: boolean };
export type DimensionResult = { dimension: string; pass: number; status: string; evidence: Evidence[]; actual?: string; fixture?: string };
export type Row = {
  id: string; group: string; title: string; games: string[]; availability: string; dimensions: string[];
  executor: string; steps: string; savedOutcome: string; evidenceRequired: string; evidence: Evidence[];
  gate: string; status: string; source: string; mechanics?: string[]; executionCases?: number;
  family?: string; door?: string; maxBoard?: string; surfaces?: string[]; order?: number; registeredGames?: number;
  dimensionResults?: DimensionResult[];
  sampling?: { kind: string; bank?: number; stratum: string; randomSeed: number; samples: string[]; target?: string; sample?: string };
};
export type Matrix = { schemaVersion: number; baseline: string; scope: string; passesRequired: number; rows: Row[] };
export type Scope = {
  schemaVersion: number; source: string;
  games: { id: string; name: string; family: string; strata: string[]; door: string; maxBoard: string; firstAction: string; challengeSteps?: string }[];
  mechanics: { id: string; name: string; games: string[]; maxBoard: string; steps?: string }[]; registrationAliases: Record<string, string>;
};
export type Inventory = { games: string[]; challenge: string[]; cove: string[]; mechanics: string[]; banks: { game: string; slot: number }[]; school: string[]; hall: string[]; boards: string[]; arcade: string[]; activities: string[] };
export type EvidenceIndex = { reports: { path: string; sha256: string; testedHeads?: { sha: string; recordedHead: string; record: string }[] }[] };
export type Overrides = { evidence: Record<string, Evidence>; rows: Record<string, { evidence?: string[]; status?: string; dimensionResults?: DimensionResult[] }> };
const json = (root: string, path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
export const readMatrix = (root = process.cwd()): Matrix => json(root, 'docs/qa-matrix.json');
export const readScope = (root = process.cwd()): Scope => json(root, 'docs/qa-scope.json');
export const readEvidenceIndex = (root = process.cwd()): EvidenceIndex => json(root, 'docs/qa-evidence-index.json');
export const readOverrides = (root = process.cwd()): Overrides => json(root, 'docs/qa-overrides.json');

/** Optional code annotations take precedence over the guarded PLAN list for new inputs.
 * No shared runtime mechanic metadata exists yet. Absence is NOT proof that a new gesture is covered.
 */
function declaredMechanics(root: string): string[] {
  const paths = readdirSync(resolve(root, 'src/challenge/registrations')).filter(p => p.endsWith('.ts')).map(p => `src/challenge/registrations/${p}`);
  const found: string[] = [];
  for (const entry of readdirSync(resolve(root, 'src/learn/games'), { withFileTypes: true }).filter(e => e.isDirectory())) {
    const file = `src/learn/games/${entry.name}/registration.json`;
    if (readdirSync(resolve(root, 'src/learn/games', entry.name)).includes('registration.json')) {
      const value = json(root, file).qaMechanics;
      if (value !== undefined) {
        if (!Array.isArray(value) || !value.every(x => typeof x === 'string')) throw new Error(`Nonliteral mechanics: ${file}`);
        found.push(...value);
      }
    }
  }
  paths.push('src/cove/catalog.ts');
  for (const file of paths) {
    const ast = ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if ((ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) && node.name.getText(ast).replaceAll(/["']/g, '') === 'qaMechanics') {
        let value = node.initializer;
        while (value && (ts.isAsExpression(value) || ts.isSatisfiesExpression(value))) value = value.expression;
        if (!value || !ts.isArrayLiteralExpression(value) || !value.elements.every(ts.isStringLiteral)) throw new Error(`Nonliteral mechanics: ${file}`);
        found.push(...value.elements.map(x => (x as ts.StringLiteral).text));
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return found;
}
/** Read actual exported arrays, not a second hand-maintained list or a UI mock. */
function literalIds(root: string, file: string, variable: string): string[] {
  const ast = ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  let values: string[] | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === variable) {
      let expr = node.initializer;
      while (expr && (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr))) expr = expr.expression;
      if (!expr || !ts.isArrayLiteralExpression(expr) || !expr.elements.every(ts.isStringLiteral)) throw new Error(`Nonliteral registry ${file}:${variable}; update QA discovery explicitly.`);
      values = expr.elements.map(element => (element as ts.StringLiteral).text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!values?.length) throw new Error(`Missing registry ${file}:${variable}`);
  return values;
}
export function discoverInventory(root = process.cwd(), scope = readScope(root)): Inventory {
  const school = readdirSync(resolve(root, 'src/learn/games'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).flatMap(id => {
    // Registration files are the admission boundary; engine directories alone are not registered.
    const files = readdirSync(resolve(root, 'src/learn/games', id));
    return files.includes('registration.json') ? [json(root, `src/learn/games/${id}/registration.json`).id as string] : [];
  });
  const challenge = readdirSync(resolve(root, 'src/challenge/registrations')).filter(p => p.endsWith('.ts')).sort().map(p => p.slice(0, -3));
  const packed = json(root, 'src/content/puzzles/root.json').families as [string, string][];
  const banks = packed.flatMap(([game, manifest]) => {
    const family = json(root, `src/content/puzzles/assets/${manifest}.lipuzzle`) as { packs: number[][] };
    return family.packs.map(pack => ({ game: scope.registrationAliases[game] ?? game, slot: pack[0] }));
  });
  const coveAst = ts.createSourceFile('catalog.ts', readFileSync(resolve(root, 'src/cove/catalog.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  let cove: string[] | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(coveAst) === 'gameInfo' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      cove = node.initializer.properties.map(p => {
        if (!ts.isPropertyAssignment(p) || !p.name || !(ts.isStringLiteral(p.name) || ts.isIdentifier(p.name))) throw new Error('Update QA Cove metadata discovery.');
        return p.name.text;
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(coveAst);
  if (!cove?.length) throw new Error('Missing Cove family metadata.');
  const hall = literalIds(root, 'src/games/index.ts', 'gameIds'), boards = literalIds(root, 'src/board/index.ts', 'boardIds');
  const arcade = literalIds(root, 'src/arcade/types.ts', 'arcadeIds'), activities = literalIds(root, 'src/state/activities.ts', 'activityIds');
  const games = [...new Set([...school,
    ...literalIds(root, 'src/games/index.ts', 'gameIds'), ...literalIds(root, 'src/board/index.ts', 'boardIds'),
    ...literalIds(root, 'src/arcade/types.ts', 'arcadeIds'), ...literalIds(root, 'src/state/activities.ts', 'activityIds'),
    ...challenge.map(id => scope.registrationAliases[id] ?? id), ...packed.map(([game]) => scope.registrationAliases[game] ?? game),
  ])];
  return { games, challenge, cove, banks, mechanics: [...new Set([...guardedMechanics, ...declaredMechanics(root)])], school, hall, boards, arcade, activities };
}

const phone = ['iPhone / iOS 18.5 / portrait / default text', 'iPhone / iOS 26.5 / portrait / default text'];
const tablet = ['iPad mini / iOS 26.5 / portrait / default text', 'iPad mini / iOS 26.5 / landscape / default text'];
const maxDimensions = [phone[0], phone[1], tablet[1], 'iPhone / iOS 18.5 / portrait / AX5', 'iPhone / iOS 26.5 / portrait / AX5', 'iPad mini / iOS 26.5 / landscape / AX5'];
const samples = ['teaching', 'hardest', 'random-1', 'random-2', 'random-3'];
const baseline = 'ef94a25b4d742307ced28394c193a327e0b8dc9f';
const evidenceRequired = 'Frame/recording and saved diff; tested source SHA, build/bundle/manifest, immutable fixture/ref and actual result per pass and device.';
export const availabilityFor = (games: string[], inventory: Inventory) => {
  const count = games.filter(id => inventory.games.includes(id)).length;
  return !games.length || count === games.length ? 'registered' : count ? 'partial' : 'planned';
};
export function physicalAllocation(scope: Scope): { target: string; sample: string }[] {
  // Round-robin by game, rotating bands and sample roles with seed 2501. Each
  // game receives 2–3 slots; all 35 game-linked inputs are covered (Home M35 has its own gate). No published-pack
  // duplicates: the operator resolves target slots to immutable refs before play.
  const slots: { target: string; sample: string }[] = [];
  for (let round = 0; slots.length < 256; round++) for (let i = 0; i < scope.games.length && slots.length < 256; i++) {
    const game = scope.games[i];
    const band = (2501 + i + round) % game.strata.length;
    slots.push({ target: `B-${game.id}-${String(band + 1).padStart(2, '0')}`, sample: samples[(2501 + i + round) % samples.length] });
  }
  return slots;
}
export function buildMatrix(root = process.cwd(), scope = readScope(root), inventory = discoverInventory(root, scope), overrides = readOverrides(root)): Matrix {
  const rows: Row[] = [];
  const add = (input: Omit<Row, 'availability' | 'evidence' | 'status'>) => {
    rows.push({ ...input, availability: availabilityFor(input.games, inventory), registeredGames: input.games.filter(g => inventory.games.includes(g)).length, evidence: [], status: 'not run' });
  };
  for (const game of scope.games) {
    const mechanics = scope.mechanics.filter(m => m.games.includes(game.id)).map(m => m.id);
    const adapters = inventory.challenge.filter(id => (scope.registrationAliases[id] ?? id) === game.id);
    const surfaces = [inventory.school.includes(game.id) ? 'School' : '', inventory.arcade.includes(game.id) ? 'Arcade' : '', [...inventory.hall, ...inventory.boards, ...inventory.activities].includes(game.id) ? 'Hall' : '', inventory.cove.includes(game.id) && adapters.length ? 'Cove' : '', ...adapters.map(id => `Challenge:${id}`)].filter(Boolean);
    if (!surfaces.length) surfaces.push(`Planned ${game.door}`);
    const door = inventory.school.includes(game.id) ? 'School' : game.door;
    add({ id: `G-${game.id}`, group: 'games', title: game.name, games: [game.id], family: game.family, mechanics, door, surfaces, maxBoard: game.maxBoard,
      dimensions: phone, executor: 'Lead, private offline Release simulator',
      steps: `Map → ${door} → ${game.name}. ${game.firstAction}. Quit → exact resume → finish → reopen result. Check legal move, terminal truth, shared-engine hint, undo/help and dare eligibility where supported. Maximum fixture: ${game.maxBoard}. Challenge surfaces: ${adapters.join(', ') || 'none registered'}.`,
      savedOutcome: 'Same owner, immutable ref, board, choices and help/attempt counters after resume; one accepted result/award. Real-time Arcade restarts with accepted stars/best retained; family-only play saves only supported outcomes.', evidenceRequired, gate: 'RC', source: scope.source });
  }
  for (const adapter of inventory.challenge) {
    const game = scope.registrationAliases[adapter] ?? adapter;
    const spec = scope.games.find(g => g.id === game);
    if (!spec) throw new Error(`QA matrix: missing Challenge scope ${adapter}`);
    add({ id: `C-${adapter}`, group: 'challenge', title: `${spec.name} / ${adapter}`, games: [game], surfaces: [`Challenge:${adapter}`], door: spec.door, maxBoard: spec.maxBoard,
      mechanics: scope.mechanics.filter(m => m.games.includes(game)).map(m => m.id), dimensions: phone, executor: 'Lead, private offline Release simulator',
      steps: spec.challengeSteps ?? `Map → ${spec.door} → ${spec.name} → Challenge (${adapter}); choose teaching and hardest tier without stars. Start explicitly, make a legal action, wrong Check, edit, Help, Undo, quit/resume, finish, reopen, replay dare. Fill paused spaces and attempt another Start; cancel and retain every draft.`,
      savedOutcome: 'Challenge ref, draft, help/miss/edit/run counters and owner resume exactly. One award; marks never decrease; helped replay cannot claim clean. Full paused spaces preserves drafts and School state.', evidenceRequired, gate: 'RC', source: 'Real src/challenge/registrations; PLAN §10 and Play P01–P04' });
  }
  for (const mechanic of scope.mechanics) add({ id: mechanic.id, group: 'mechanics', title: mechanic.name, games: mechanic.games, maxBoard: mechanic.maxBoard,
    dimensions: maxDimensions, executionCases: maxDimensions.length, executor: 'Lead, private offline Release simulator',
    steps: mechanic.steps ?? `Fixture: ${mechanic.maxBoard}. Exercise ${mechanic.name} in every linked game; legal input, rejection, undo/cancel, rotate and force-close mid-draft. Check reachability and clipping with real gestures. Each dimension is a separate run; repeat for both passes.`,
    savedOutcome: 'Exact owner/draft/pending choices after force-close; no duplicate move, leaked secret or unsolicited help. Free creation remains ungraded.', evidenceRequired, gate: 'RC', source: 'PLAN §10 guarded mechanic contract; PLAN §9 maximum fixtures' });
  const cases = json(root, 'docs/qa-cases.json').cases as Row[];
  for (const original of cases) {
    const row = structuredClone(original);
    if (row.group === 'journeys') row.dimensions = Number(row.id.slice(1)) <= 8 ? [...phone, tablet[0]] : [...phone, ...tablet];
    if (row.group === 'play') {
      const physicalOnly = ['P05', 'P06'].includes(row.id);
      row.dimensions = physicalOnly ? [] : ['P01', 'P02', 'P07', 'P08', 'P09'].includes(row.id) ? [...phone, ...tablet] : [...phone];
      if (['P01', 'P09'].includes(row.id)) row.dimensions.push(...maxDimensions.slice(3));
      row.dimensions.push(`physical prerequisite: ${original.dimensions.join('; ')}`);
    }
    if (row.group === 'real-device' || row.group === 'home') row.dimensions = ['physical iPhone 15 / iOS 18 / ' + (row.id === 'H-A10' ? 'voluntary observation' : 'complete named protocol'), 'physical iPad mini 6 / iOS 26 / complete named protocol'];
    if (row.id === 'J09') row.steps += ` Execute each adapter's C row: ${inventory.challenge.join(', ')}.`;
    add(row);
  }
  for (const game of scope.games) for (const [i, stratum] of game.strata.entries()) add({
    id: `B-${game.id}-${String(i + 1).padStart(2, '0')}`, group: 'bank-sampling', title: `${game.name} / ${stratum}`, games: [game.id], dimensions: ['Release phone or tablet / five distinct refs'], executor: 'Lead, Release simulator; physical subset named by PH rows',
    steps: `Preflight ${stratum} manifest and eligible refs. Record teaching + hardest + three seeded random refs; input, each hint step, cancel, quit/resume and finish. Tiny pools sample all distinct entries and disclose shortfall. Free/family-only modes are exploratory, never scored banks.`, savedOutcome: 'Exact draft/hint/help and owner resume per immutable ref; completion agrees with proof. Content quality separately observed.', evidenceRequired, gate: 'RC bank sampling', source: 'PLAN §§6,10; WORK-LEDGER BK allocation', sampling: { kind: 'target level/band', stratum, randomSeed: 2501 + i, samples } });
  for (const { game, slot } of inventory.banks) add({ id: `BP-${game}-${slot}`, group: 'bank-sampling', title: `${game} / published bank ${slot}`, games: [game], dimensions: ['Release phone or tablet / five distinct refs'], executor: 'Lead, Release simulator; cross-reference target and PH receipts', steps: `Open published bank ${slot}; teaching + hardest + three seeded random refs. Verify input, hints, resume and finish. Cross-reference overlapping target strata; never count a ref twice.`, savedOutcome: 'Immutable ref and accepted draft/help/result agree with the published manifest and proof.', evidenceRequired, gate: 'RC bank sampling', source: 'Real packed family manifests', sampling: { kind: 'published bank', bank: slot, stratum: `published bank ${slot}`, randomSeed: 2501 + slot, samples } });
  for (const [i, selection] of physicalAllocation(scope).entries()) {
    const target = rows.find(r => r.id === selection.target)!;
    add({ id: `PH-${String(i + 1).padStart(3, '0')}`, group: 'physical-sampling', title: `${target.title} / ${selection.sample}`, games: target.games, mechanics: scope.mechanics.filter(m => m.games.some(g => target.games.includes(g))).map(m => m.id),
      dimensions: ['physical iPhone 15 / iOS 18', 'physical iPad mini 6 / iOS 26'], executor: 'Leon / named second adult, both real devices',
      steps: `Resolve ${selection.target} / ${selection.sample} to an immutable ref using seed ${target.sampling!.randomSeed}; record it before interaction. Reuse the same ref on both devices; hint → input → quit/resume → finish. If unavailable remain not run/planned; never substitute an easier stratum silently.`,
      savedOutcome: 'Same owner/ref/draft/help after resume and truthful completion on each device; one unique sampled ref across overlapping bank rows.', evidenceRequired: 'Physical ledger line per sample: ref/hash, source/build, both device results and saved diffs; video for touch defects.', gate: 'RC physical bank sample', source: 'PLAN §§6,10; deterministic allocation seed 2501', sampling: { kind: 'physical slot', stratum: target.sampling!.stratum, randomSeed: target.sampling!.randomSeed, samples: [selection.sample], ...selection } });
  }
  for (const [i, row] of rows.entries()) {
    row.order = i + 1;
    const override = overrides.rows[row.id];
    row.evidence = (override?.evidence ?? []).map(id => { if (!overrides.evidence[id]) throw new Error(`Unknown evidence override ${id}`); return structuredClone(overrides.evidence[id]); });
    row.status = override?.status ?? 'not run';
    row.dimensionResults = override?.dimensionResults ?? row.dimensions.flatMap(dimension => Array.from({ length: ['games', 'challenge', 'mechanics', 'journeys', 'play'].includes(row.group) && !dimension.startsWith('physical') ? 2 : 1 }, (_, pass) => ({ dimension, pass: pass + 1, status: 'not run', evidence: [] })));
  }
  for (const id of Object.keys(overrides.rows)) if (!rows.some(r => r.id === id)) throw new Error(`Stale row override ${id}`);
  return { schemaVersion: 2, baseline, scope: 'Private offline family app. Required QA definition; no native execution in QA-25.', passesRequired: 2, rows };
}
export const serializeMatrix = (matrix: Matrix) => JSON.stringify(matrix, null, 2) + '\n';
export const nativeCases = (matrix: Matrix, group?: string) => matrix.rows.filter(r => ['games', 'challenge', 'mechanics', 'journeys', 'play'].includes(r.group) && (!group || r.group === group)).reduce((n, r) => n + r.dimensions.filter(d => !d.startsWith('physical')).length, 0);

export function validateMatrix(matrix: Matrix, scope: Scope, inventory: Inventory, index = readEvidenceIndex()): void {
  function fail(message: string): never { throw new Error(`QA matrix: ${message}`); }
  // Frozen PLAN §10 contract + Phase 4B toddler expansion (92 + 3 = 95 games).
  // A legitimate scope expansion updates the roster, guarded mechanic list and these bounds together, with explicit review.
  const groups: Record<string, number | undefined> = { games: 95, challenge: inventory.challenge.length, mechanics: 36, journeys: 34, play: 11, 'real-device': 11, home: 10, 'bank-sampling': undefined, 'physical-sampling': 256 };
  if (matrix.schemaVersion !== 2 || scope.schemaVersion !== 1 || matrix.passesRequired !== 2 || !/^[a-f0-9]{40}$/.test(matrix.baseline)) fail('invalid schema, baseline or pass contract');
  const games = new Set(scope.games.map(g => g.id));
  if (games.size !== 95 || scope.games.length !== 95 || scope.mechanics.length !== 36) fail('scope must preserve PLAN roster');
  if (new Set(matrix.rows.map(r => r.id)).size !== matrix.rows.length) fail('duplicate row ID');
  const gameRow = (game: string) => matrix.rows.find(r => r.id === `G-${game}` && r.group === 'games');
  for (const game of new Set([...games, ...inventory.games, ...inventory.cove])) if (!gameRow(game)) fail(`missing game/Cove row: ${game}`);
  for (const adapter of inventory.challenge) if (!matrix.rows.some(r => r.id === `C-${adapter}` && r.group === 'challenge' && r.games[0] === (scope.registrationAliases[adapter] ?? adapter) && r.surfaces?.includes(`Challenge:${adapter}`))) fail(`missing Challenge surface: ${adapter}`);
  for (const id of inventory.mechanics) if (!scope.mechanics.some(m => m.id === id) || !matrix.rows.some(r => r.group === 'mechanics' && r.id === id)) fail(`missing registered mechanic: ${id}`);
  for (const [group, count] of Object.entries(groups)) if (count !== undefined && matrix.rows.filter(r => r.group === group).length !== count) fail(`${group} row count must be ${count}`);
  for (const mechanic of scope.mechanics) {
    const row = matrix.rows.find(r => r.id === mechanic.id && r.group === 'mechanics');
    if (!row || row.title !== mechanic.name || row.maxBoard !== mechanic.maxBoard || JSON.stringify(row.dimensions) !== JSON.stringify(maxDimensions)) fail(`missing or incomplete mechanic: ${mechanic.id}`);
    if (JSON.stringify(row.games) !== JSON.stringify(mechanic.games)) fail(`mechanic game mapping drift: ${mechanic.id}`);
    if (mechanic.games.some(g => !gameRow(g)?.mechanics?.includes(mechanic.id))) fail(`missing game-to-mechanic coverage: ${mechanic.id}`);
  }
  for (const [prefix, count, group] of [['J', 34, 'journeys'], ['P', 11, 'play'], ['RD', 11, 'real-device'], ['H-A', 10, 'home']] as const) for (let i = 1; i <= count; i++) if (!matrix.rows.some(r => r.id === `${prefix}${prefix === 'H-A' ? i : String(i).padStart(2, '0')}` && r.group === group)) fail(`missing ${prefix}${i}`);
  const targetRows = matrix.rows.filter(r => r.sampling?.kind === 'target level/band');
  if (targetRows.length !== scope.games.reduce((n, g) => n + g.strata.length, 0)) fail('missing target bank strata');
  for (const game of scope.games) {
    if (!game.strata.length) fail(`missing target allocation: ${game.id}`);
    for (const [i, stratum] of game.strata.entries()) if (!targetRows.some(r => r.id === `B-${game.id}-${String(i + 1).padStart(2, '0')}` && r.games[0] === game.id && r.sampling?.stratum === stratum)) fail(`missing target stratum: ${game.id}/${stratum}`);
  }
  for (const { game, slot } of inventory.banks) if (!matrix.rows.some(r => r.group === 'bank-sampling' && r.games.includes(game) && r.sampling?.kind === 'published bank' && r.sampling.bank === slot)) fail(`missing published stratum: ${game}/${slot}`);
  for (const [i, slot] of physicalAllocation(scope).entries()) {
    const row = matrix.rows.find(r => r.id === `PH-${String(i + 1).padStart(3, '0')}`);
    if (row?.sampling?.target !== slot.target || row.sampling.sample !== slot.sample || row.dimensions.length !== 2) fail(`physical allocation drift: ${i + 1}`);
  }
  const validateEvidence = (e: Evidence, id: string) => {
    if (!e.path || !/^[a-f0-9]{40}$/.test(e.sha) || !e.device || !e.build || !e.scope || !['host','simulator','physical'].includes(e.evidenceKind) || !['passed','failed'].includes(e.result) || !['partial','complete'].includes(e.coverage)) fail(`incomplete evidence citation: ${id}`);
    const report = index.reports.find(r => r.path === e.path);
    const head = report?.testedHeads?.find(h => h.sha === e.sha);
    if (!head || !head.recordedHead || !e.sha.startsWith(head.recordedHead) || !head.record.includes(head.recordedHead)) fail(`citation differs from report recorded tested head: ${id}/${e.path}`);
  };
  for (const row of matrix.rows) {
    if (!(row.group in groups) || !['not run','passed','failed','blocked'].includes(row.status)) fail(`invalid group/status: ${row.id}`);
    for (const key of ['title','executor','steps','savedOutcome','evidenceRequired','gate','source'] as const) if (!row[key]?.trim()) fail(`missing ${key}: ${row.id}`);
    for (const game of row.games) if (!games.has(game)) fail(`unknown game ${game}: ${row.id}`);
    if (row.availability !== availabilityFor(row.games, inventory) || row.registeredGames !== row.games.filter(g => inventory.games.includes(g)).length) fail(`registration availability drift: ${row.id}`);
    if (row.availability === 'planned' && row.status !== 'not run') fail(`unbuilt row cannot be executed: ${row.id}`);
    if (row.group === 'games') {
      if (row.games.length !== 1 || !row.door || !row.maxBoard || !row.surfaces?.length || !row.mechanics?.length) fail(`missing game-to-mechanic/surface coverage: ${row.id}`);
      for (const id of row.mechanics) if (!scope.mechanics.some(m => m.id === id && m.games.includes(row.games[0]))) fail(`unknown mechanic mapping: ${row.id}/${id}`);
    }
    if (!row.dimensions.length || new Set(row.dimensions).size !== row.dimensions.length) fail(`missing/duplicate dimensions: ${row.id}`);
    for (const evidence of row.evidence) validateEvidence(evidence, row.id);
    const expected = row.dimensions.flatMap(d => Array.from({ length: ['games','challenge','mechanics','journeys','play'].includes(row.group) && !d.startsWith('physical') ? 2 : 1 }, (_, p) => `${d}:${p + 1}`));
    const actual = row.dimensionResults?.map(d => `${d.dimension}:${d.pass}`) ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`missing dimension/pass result slot: ${row.id}`);
    for (const result of row.dimensionResults ?? []) {
      if (!['not run','passed','failed','blocked'].includes(result.status)) fail(`invalid dimension status: ${row.id}`);
      for (const e of result.evidence) validateEvidence(e, row.id);
      const kind = result.dimension.startsWith('physical') ? 'physical' : 'simulator';
      if (['passed','failed'].includes(result.status) && (!result.actual || !result.fixture || !result.evidence.some(e => e.result === result.status && e.coverage === 'complete' && !e.superseded && e.evidenceKind === kind))) fail(`dimension lacks complete matching evidence: ${row.id}`);
    }
    if (row.status === 'passed' && !row.dimensionResults?.every(d => d.status === 'passed')) fail(`whole-row status lacks complete current evidence: ${row.id}`);
    if (row.status === 'failed' && !row.dimensionResults?.some(d => d.status === 'failed')) fail(`whole-row status lacks complete current evidence: ${row.id}`);
    if (row.group === 'bank-sampling' && (!row.sampling?.stratum || row.sampling.samples.length !== 5 || !Number.isInteger(row.sampling.randomSeed))) fail(`missing bank sample protocol: ${row.id}`);
  }
}
const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
export function renderMatrix(matrix: Matrix): string {
  const groups = ['games', 'challenge', 'mechanics', 'journeys', 'play', 'real-device', 'bank-sampling', 'physical-sampling', 'home'];
  const evidence = matrix.rows.flatMap(r => r.evidence);
  const gameRows = matrix.rows.filter(r => r.group === 'games');
  const lines = ['# Little Island 4.0 required QA matrix', '', '## One-page handoff', '',
    `Baseline: \`${matrix.baseline}\`. ${matrix.scope} This ledger defines acceptance, not release approval.`, '',
    '| Group | Acceptance rows | Required native device runs per pass |', '| --- | ---: | ---: |',
    ...groups.map(g => `| ${g} | ${matrix.rows.filter(r => r.group === g).length} | ${['games','challenge','mechanics','journeys','play'].includes(g) ? nativeCases(matrix, g) : 'Separate operator/sampling gate'} |`), '',
    `**${matrix.rows.length} acceptance rows:** ${['not run','passed','failed','blocked'].map(s => `${matrix.rows.filter(r => r.status === s).length} ${s}`).join(', ')}. Games: ${gameRows.filter(r => r.availability === 'registered').length} registered / ${gameRows.filter(r => r.availability === 'planned').length} planned. Partial mechanics show their registered/total game count; run the registered members now and keep the rest open.`, '',
    `**True native allocation: ${nativeCases(matrix)} device-dimension executions per pass; ${nativeCases(matrix) * matrix.passesRequired} across two passes, plus retests.** PLAN’s 245 is a nominal case estimate. The review’s 405 counted old dimension cells, some bundling two OS versions, two orientations or AX5 devices. This matrix splits those into separate runs and adds ${matrix.rows.filter(r => r.group === 'challenge').length} explicit Challenge surfaces (two phone OS runs each). No native dimension may be dropped silently; a scoped smoke subset must remain labelled incomplete. Physical Play prerequisites, RD/Home and bank sampling are separate. QA-02 must re-plan its budget against these runs.`, '',
    '**Next pass:** preflight an offline private Release integration build, five-learner/four-adult synthetic fixtures, immutable maximum-board refs and frozen old saves. Run G → C → M → J → P in order, each named dimension, then repeat. Record pass/source/build/fixture and visible plus saved outcomes in dimensionResults via the overrides file. Partial historical observations do not pass any current dimension.', '',
    '**Physical sample:** PH-001–PH-256 freeze 256 unique target/sample-role slots with seed 2501, stratified round-robin across all 95 games and all 35 game-linked mechanics (Home M35 is separate). Each slot names its executor and both family devices (512 device runs, one unique sampled ref per slot). Resolve immutable refs before play, cross-reference B/BP receipts, disclose tiny-pool shortfalls; planned/unpublished slots remain open. These are 256 puzzles, not 256 five-puzzle strata. RD01–RD11 and Home A1–A10 are separate; voluntary child observations never become scores.', '',
    '## Generate, execute and maintain', '',
    '- Run `npm run qa:matrix:generate` (also `npm run qa:matrix`) after a registration or published pack changes. It writes both qa-matrix.json and this Markdown from real registries, qa-scope.json, qa-cases.json and qa-overrides.json. Tests reject either stale output. Never hand-edit generated files.',
    '- qa-scope.json is the compact PLAN §10 roster, game/mechanic links, maximum fixtures and target strata; qa-cases.json holds the static journey, Play, RD and Home acceptance. A planned game becoming registered needs no override: G/C surfaces, availability and B/BP rows update automatically. New games outside the frozen 95 require a reviewed scope expansion. Changes to a game’s target bands or maximum need the small scope entry updated.',
    '- qa-overrides.json is the hand-maintained row evidence/status file. Evidence objects are deduplicated by ID. Add at most one row entry for a new result. dimensionResults records each dimension and pass separately; passed/failed runs require actual result, fixture and complete matching simulator/physical evidence. Keep failures and retests in the cited report; changing builds never combines partial receipts into acceptance.',
    '- qa-evidence-index.json records source report hashes and exact tested heads, with the report excerpt that records each. Run `npm run qa:evidence:verify -- <external-artifacts-root>` to verify the cited report hashes/excerpts against the originals. Every citation must match its report’s testedHeads entry and use 40 hex characters. Host/simulator/physical kinds are printed before historical results. Host tests and simulator frames cannot pass physical acceptance. Report-only heads and bases are not tested heads.',
    '- Mechanic discovery reads literal qaMechanics annotations from School registration JSON, Challenge registration TypeScript and Cove metadata where present. Current runtime registrations have no shared mechanic metadata: scripts/qa/mechanics.mjs is the independent guarded PLAN list. New input work must annotate registration, update the guarded list/scope and obtain mapping review. This is a registry by convention; unannotated novel gestures cannot be detected automatically. The gate never claims otherwise.',
    '- Frozen PLAN row counts are deliberate: legitimate expansion updates scope, guarded mechanics and validator bounds together. Fixture preflight preserves original saves; UI gestures establish behavior and independent save reads establish persistence. Record tested SHA/tree/build/bundle/manifest, exact immutable ref, device/OS/text/orientation and actual result. No screenshot/test count substitutes for saved outcomes.',
    '- Each B/BP stratum uses teaching + hardest + three random refs, seed recorded. Target/published rows overlap; count a ref once. Free/family-only modes remain exploratory; unsupported bands stay planned/not run. Pilot six games and time the sample; material defects double the affected sample and trigger review. PLAN’s 510 strata/2,565 puzzles remain estimates; this source defines the concrete target allocation.',
    '- RD evidence is video or a written physical result; Home requires video. Lead Home simulator rehearsal is context only; A rows name family hardware. P06, Home A10 and P11 family observations remain voluntary. QA-08 size/save/IPA/installed-size and real performance receipts remain separate release gates. No public release or store action is authorized.', '',
    '## Historical evidence', '',
    `${evidence.length} row citations (not unique executed cases): ${['host','simulator','physical'].map(k => `${evidence.filter(e => e.evidenceKind === k).length} ${k}`).join(', ')}. All are scoped historical observations; superseded failures stay visible. No physical row is passed by host or simulator evidence. Paths are relative to the external artifacts root. Report snapshots and tested-head excerpts are indexed in qa-evidence-index.json.`, '',
  ];
  for (const group of groups) {
    lines.push(`## ${group}`, '', '| Order · ID · case | Availability / acceptance | Door · family · surfaces · linked games/mechanics · maximum | Dimensions / pass results | Executor | Actions / saved outcome | Evidence | Gate |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const row of matrix.rows.filter(r => r.group === group)) {
      const citations = row.evidence.length ? row.evidence.map(e => `${e.evidenceKind}: ${e.result} (${e.coverage}${e.superseded ? ', superseded' : ''}) [${e.path}](/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/${e.path}); tested SHA ${e.sha}; ${e.device}; ${e.build}. ${e.scope}`).join('<br>') : `Not run. ${row.evidenceRequired}`;
      const links = [row.door, row.family, row.surfaces?.join(', '), row.games.map(g => `[${g}](#games)`).join(', '), row.mechanics?.map(m => `[${m}](#mechanics)`).join(', '), row.maxBoard].filter(Boolean).join('; ');
      const dimensions = row.dimensions.map(d => `${d}: ${(row.dimensionResults ?? []).filter(r => r.dimension === d).map(r => `pass ${r.pass} ${r.status}`).join(', ')}`).join('<br>');
      lines.push(`| ${cell(`${row.order} · ${row.id} · ${row.title}`)} | ${row.availability} (${row.registeredGames}/${row.games.length} games) / ${row.status} | ${cell(links)} | ${cell(dimensions)} | ${cell(row.executor)} | ${cell(row.steps)} **Saved:** ${cell(row.savedOutcome)} | ${cell(citations)} | ${cell(row.gate)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
