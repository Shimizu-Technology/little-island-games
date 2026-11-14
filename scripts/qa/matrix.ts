import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export type Evidence = { path: string; sha: string; device: string; build: string; result: 'passed' | 'failed'; scope: string; coverage: 'partial' | 'complete'; superseded?: boolean };
export type Row = {
  id: string; group: string; title: string; games: string[]; availability: string; dimensions: string[];
  executor: string; steps: string; savedOutcome: string; evidenceRequired: string; evidence: Evidence[];
  gate: string; status: string; source: string; mechanics?: string[]; executionCases?: number;
  sampling?: { kind: string; bank?: number; stratum: string; randomSeed: number; samples: string[]; physicalSelection?: string };
};
export type Matrix = { schemaVersion: number; baseline: string; scope: string; passesRequired: number; rows: Row[] };
export type Scope = {
  schemaVersion: number; source: string; games: { id: string; name: string; family: string }[];
  mechanics: { id: string; name: string; games: string[] }[]; registrationAliases: Record<string, string>;
};
export type Inventory = { games: string[]; challenge: string[]; cove: string[]; mechanics: string[]; banks: { game: string; slot: number }[] };
const json = (root: string, path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
export const readMatrix = (root = process.cwd()): Matrix => json(root, 'docs/qa-matrix.json');
export const readScope = (root = process.cwd()): Scope => json(root, 'docs/qa-scope.json');

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
  const challenge = readdirSync(resolve(root, 'src/challenge/registrations')).filter(p => p.endsWith('.ts')).map(p => p.slice(0, -3));
  const packed = json(root, 'src/content/puzzles/root.json').families as [string, string][];
  const banks = packed.flatMap(([game, manifest]) => {
    const family = json(root, `src/content/puzzles/assets/${manifest}.lipuzzle`) as { packs: number[][] };
    return family.packs.map(pack => ({ game, slot: pack[0] }));
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
  const games = [...new Set([...school,
    ...literalIds(root, 'src/games/index.ts', 'gameIds'), ...literalIds(root, 'src/board/index.ts', 'boardIds'),
    ...literalIds(root, 'src/arcade/types.ts', 'arcadeIds'), ...literalIds(root, 'src/state/activities.ts', 'activityIds'),
    ...challenge.map(id => scope.registrationAliases[id] ?? id), ...packed.map(([game]) => game),
  ])];
  return { games, challenge, cove, banks, mechanics: scope.mechanics.map(m => m.id) };
}
export function validateMatrix(matrix: Matrix, scope: Scope, inventory: Inventory): void {
  function fail(message: string): never { throw new Error(`QA matrix: ${message}`); }
  if (matrix.schemaVersion !== 1 || scope.schemaVersion !== 1 || matrix.passesRequired !== 2 || !/^[a-f0-9]{40}$/.test(matrix.baseline)) fail('invalid schema, baseline or pass contract');
  const groups: Record<string, number | undefined> = { games: 92, mechanics: 36, journeys: 34, play: 11, 'real-device': 11, home: 10, 'bank-sampling': undefined };
  const ids = matrix.rows.map(r => r.id), games = new Set(scope.games.map(g => g.id)), registered = new Set(inventory.games);
  if (new Set(ids).size !== ids.length) fail('duplicate row ID');
  if (scope.games.length !== 92 || games.size !== 92 || new Set(scope.mechanics.map(m => m.id)).size !== 36) fail('scope roster must contain 92 games and 36 unique mechanics');
  for (const [group, count] of Object.entries(groups)) if (count !== undefined && matrix.rows.filter(r => r.group === group).length !== count) fail(`${group} row count must be ${count}`);
  const gameRow = (id: string) => matrix.rows.find(r => r.group === 'games' && r.games.length === 1 && r.games[0] === id);
  for (const id of new Set([...games, ...inventory.games, ...inventory.challenge.map(id => scope.registrationAliases[id] ?? id), ...inventory.cove])) if (!gameRow(id)) fail(`missing game/Challenge/Cove row: ${id}`);
  for (const mechanic of scope.mechanics) {
    const row = matrix.rows.find(r => r.group === 'mechanics' && r.id === mechanic.id);
    if (!row || row.title !== mechanic.name || row.executionCases !== 3 || row.dimensions.length !== 3) fail(`missing or incomplete mechanic: ${mechanic.id}`);
    if (JSON.stringify([...row.games].sort()) !== JSON.stringify([...mechanic.games].sort())) fail(`mechanic game mapping drift: ${mechanic.id}`);
    if (mechanic.games.some(game => !gameRow(game)?.mechanics?.includes(mechanic.id))) fail(`missing game-to-mechanic coverage: ${mechanic.id}`);
  }
  for (const id of inventory.mechanics) if (!matrix.rows.some(r => r.group === 'mechanics' && r.id === id)) fail(`missing registered mechanic: ${id}`);
  for (const [prefix, count, group] of [['J', 34, 'journeys'], ['P', 11, 'play'], ['RD', 11, 'real-device'], ['H-A', 10, 'home']] as const) {
    for (let i = 1; i <= count; i++) if (!matrix.rows.some(r => r.id === `${prefix}${prefix === 'H-A' ? i : String(i).padStart(2, '0')}` && r.group === group)) fail(`missing ${prefix}${i}`);
  }
  for (const { game, slot } of inventory.banks) if (!matrix.rows.some(r => r.group === 'bank-sampling' && r.games.includes(game) && r.sampling?.kind === 'published bank' && r.sampling.bank === slot)) fail(`missing published stratum: ${game}/${slot}`);
  for (const row of matrix.rows) {
    if (!(row.group in groups) || !['registered', 'planned'].includes(row.availability) || !['not run', 'passed', 'failed', 'blocked'].includes(row.status)) fail(`invalid group/availability/status: ${row.id}`);
    for (const key of ['title', 'executor', 'steps', 'savedOutcome', 'evidenceRequired', 'gate', 'source'] as const) if (!row[key]?.trim()) fail(`missing ${key}: ${row.id}`);
    if (!row.dimensions.length || row.dimensions.some(d => !d.trim())) fail(`missing dimensions: ${row.id}`);
    for (const game of row.games) if (!games.has(game)) fail(`unknown game ${game}: ${row.id}`);
    if (row.group === 'games') {
      const game = row.games[0];
      if (!row.mechanics?.length) fail(`missing game-to-mechanic coverage: ${row.id}`);
      if (row.games.length !== 1 || row.availability !== (registered.has(game) ? 'registered' : 'planned')) fail(`registration availability drift: ${row.id}`);
      if (!registered.has(game) && row.status !== 'not run') fail(`unbuilt game cannot be executed: ${row.id}`);
      for (const id of row.mechanics ?? []) if (!scope.mechanics.some(m => m.id === id && m.games.includes(game))) fail(`unknown mechanic mapping: ${row.id}/${id}`);
    }
    for (const evidence of row.evidence) if (!evidence.path || !/^[a-f0-9]{7,40}$/.test(evidence.sha) || !evidence.device || !evidence.build || !evidence.scope || !['passed', 'failed'].includes(evidence.result) || !['partial', 'complete'].includes(evidence.coverage)) fail(`incomplete evidence citation: ${row.id}`);
    if (['passed', 'failed'].includes(row.status) && !row.evidence.some(e => e.result === row.status && e.coverage === 'complete' && !e.superseded)) fail(`whole-row status lacks complete current evidence: ${row.id}`);
    if (row.group === 'bank-sampling' && (!row.sampling?.stratum || row.sampling.samples.length !== 5 || !Number.isInteger(row.sampling.randomSeed))) fail(`missing bank sample protocol: ${row.id}`);
  }
}
const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
const countBy = (rows: Row[], key: 'group' | 'status' | 'availability') => Object.fromEntries([...new Set(rows.map(r => r[key]))].map(value => [value, rows.filter(r => r[key] === value).length]));
export function renderMatrix(matrix: Matrix): string {
  const counts = countBy(matrix.rows, 'group'), status = countBy(matrix.rows, 'status'), availability = countBy(matrix.rows.filter(r => r.group === 'games'), 'availability');
  const groups = ['games', 'mechanics', 'journeys', 'play', 'real-device', 'bank-sampling', 'home'];
  const lines = ['# Little Island 4.0 required QA matrix', '', '## One-page handoff', '',
    `Baseline: \`${matrix.baseline}\`. ${matrix.scope} This ledger defines required acceptance, not release approval.`, '',
    '| Group | Rows | Execution cases per full native pass |', '| --- | ---: | ---: |',
    ...groups.map(g => `| ${g} | ${counts[g]} | ${g === 'mechanics' ? '108 (36 × 3 dimensions)' : ['games','journeys','play'].includes(g) ? counts[g] : 'Separate sampling / physical / Home gate'} |`), '',
    `**${matrix.rows.length} rows. Status:** ${Object.entries(status).map(([s,n]) => `${n} ${s}`).join(', ')}; ${['passed','failed','blocked'].filter(s => !status[s]).map(s => `0 ${s}`).join(', ')}. **Game availability:** ${Object.entries(availability).map(([s,n]) => `${n} ${s}`).join(', ')}. Planned is availability, never an execution pass.`, '',
    '**Native allocation:** 92 games + 108 mechanic/device cases + 34 journeys + 11 Play cases = 245 per pass; two full passes plus retests. Play physical/family dimensions remain separate prerequisites. Bank, physical and Home rows do not inflate the 245.', '',
    '**Lead’s next native pass:** preflight a private offline Release build on the integration head; record source/tree, bundle/build and manifest hashes. On iPhone iOS 18.5, then iOS 26.5 and iPad mini iOS 26.5, open all eight doors; run every registered G row (first move → quit → exact resume → finish → reopen); expand M01–M36 at maximum board on phone, iPad landscape and AX5; run J01–J34 and the native parts of P01–P11. Prioritize filled 9×9 notes/cages and AX5 landscape, 15×15/25×25 Picture Grid, 16×16 Word Search, Bridges drag, Jigsaw 200, Solitaire tall stacks, Home two fingers and Lagoon rain. Unbuilt rows wait for registration; they are not skips that close RC. Repeat the entire allocation, then affected retests.', '',
    '**Separate operator pass:** RD01–RD11 on the real iPhone 15/iOS 18 and iPad mini 6/iOS 26, dev app first then RC. Allocate the physical bank sample before running it. Home A1–A9 need the stated measurements; A10, P06 and P11’s family component are voluntary observations, not scores. Native simulation cannot settle these.', '',
    '## How to execute and maintain', '',
    '- Sources: PLAN §§6,9,10,15,16 and WORK-LEDGER QA-25/QA-02/QA-08/QA-21/QA-22; Play SPEC P01–P11; Home audit and v3-research/toca/SPEC A1–A10. PLAN §15 replaces the old 120 Hz/phone assumptions with 60 Hz family hardware and both native OS versions.',
    '- Fixture preflight: own/reset synthetic child A, child B, Family and Cove adult; frozen v1/v2/real build-28 saves; near-limit five-learner/four-adult data; every maximum-size board and bank/ref. Preserve original bytes. UI actions establish the journey; independent save reads establish persistence.',
    '- Each run records pass number, fixture/ref, SHA/tree/build/bundle/manifest, device/OS/text/orientation, steps, visible and saved result, evidence and remaining dimensions. Keep initial failures and later retests. Do not combine different builds into one complete pass.',
    '- Every unbuilt game is explicitly planned. Old Toys is one planned shelf entry with four modes, as WORK-LEDGER SP-05; six originals and all 33 Cove entries are distinct. drop-puzzles is the registered Coconut Drop Challenge adapter, not a 93rd game. Existing metadata-only Cove families remain planned until registration.',
    '- Status stays `not run` until the whole row is evidenced. Historical observations below retain their own passed/failed result, scope and SHA; partial or superseded evidence cannot pass a row on the current integration build. No physical/family acceptance is inferred from screenshots, source tests or simulator timing.',
    '- Bank rows enumerate target game/level/band strata plus concrete published bank strata (which can subdivide a target band). These overlap: record immutable refs once and cross-reference applicable rows, never count a puzzle twice. PLAN’s about 510 strata / 2,565 interactive puzzles / about 256 physical puzzles are estimates. Target rows for free/family modes are exploratory sampling, not a fabricated scored bank. Missing receipts or unavailable target bands remain not run/planned.',
    '- Per stratum: teaching + hardest + three seeded random entries, exact refs and seed recorded. Cover input, hint, interruption/resume and finish. Tiny pools disclose fewer distinct entries. Lead samples roughly 90% on Release simulators; Leon/named adult covers roughly 10% on both physical devices, stratified by game/band/mechanic/size/input. A material defect doubles the affected stratum sample and triggers re-review. Pilot 20 entries in each of six different games, time it, and re-plan before trusting throughput.',
    '- QA-08 also requires the separate size/save/IPA/installed-size and real frame-meter receipts against PLAN caps, including FND-16/FND-17. Host tests do not close it. No public store or family candidate release is authorized by this document.',
    '- Machine source: `qa-matrix.json`; planned roster and the explicit 36-input-mechanic registry: `qa-scope.json`. Runtime adapters do not expose one shared input-mechanic field. Add new mechanic mappings there when registering a game; the validator checks every declared mapping and all current game/Challenge/Cove registries. `npm test` runs the coverage and mutation tests. Regenerate this document with `npm run qa:matrix`; the test rejects stale Markdown.', '',
    '## Evidence audit', '',
    'The QA-25 artifact inventory walks v4/STATUS.md, every slice REPORT.md, FIX-REPORT*.md, MERGE-REPORT*.md and native frame folders. `qa-evidence-index.json` records the reviewed report paths and hashes; the full local inventory is in `v4/qa25/artifact-inventory.json`. Frames were inventoried, not newly executed or treated as proof of hidden save state. Paths below are relative to the external little-island-games-artifacts root. Full-row coverage on the baseline is still open; the cited historical observations preserve useful work and known limits.', '',
  ];
  for (const group of groups) {
    lines.push(`## ${group}`, '', '| ID · game or mechanic | Availability / status | Dimensions | Executor | Actions and saved outcome | Evidence | Gate |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const row of matrix.rows.filter(r => r.group === group)) {
      const evidence = row.evidence.length ? row.evidence.map(e => `${e.result} (${e.coverage}${e.superseded ? ', superseded' : ''}): [${e.path}](${e.path.startsWith('/') ? e.path : `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/${e.path}`}); SHA ${e.sha}; ${e.device}; ${e.build}. ${e.scope}`).join('<br>') : `Not run. Required: ${row.evidenceRequired}`;
      lines.push(`| ${cell(row.id+' · '+row.title)} | ${row.availability} / ${row.status} | ${cell(row.dimensions.join('; '))} | ${cell(row.executor)} | ${cell(row.steps)} **Saved:** ${cell(row.savedOutcome)} | ${cell(evidence)} | ${cell(row.gate)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
