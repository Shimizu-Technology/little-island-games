import { describe, expect, it, vi } from 'vitest';
import { resolvePuzzleLink } from '../src/challenge/deepLink';
import { challengeEntries } from '../src/challenge/catalog';
import { gameDestination } from '../src/learn/destinations';
import { SHORTCUTS } from '../src/cove/shelf';
import { bankSize } from '../src/state/bankFacts';
import type { IslandState } from '../src/learn/games/hafa-adai/engine';

describe('exact Challenge links', () => {
  for (const game of ['sudoku', 'picture-grid', 'bridges', 'loop', 'reef-sweep']) {
    const entry = challengeEntries.find(e => e.game === game)!;
    for (const bank of entry.catalog.banks.values()) {
      for (const row of [0, bankSize(bank) - 1]) it(`${game} ${bank.slot}:${row} resolves exactly`, async () => {
        const target = await resolvePuzzleLink(`${bank.slot}:${row}`);
        expect(target?.entry.game).toBe(game);
        expect(target?.card.ref).toMatchObject({bank: bank.slot, puzzle: row});
      });
      it(`${bank.slot} rejects the first out-of-range row`, async () => {
        expect(await resolvePuzzleLink(`${bank.slot}:${bankSize(bank)}`)).toBeNull();
      });
    }
  }
  it.each(['', '110', '110:', ':0', '-1:0', '110:-1', '110:1.5', '110:1:2', '0110:0', '110:01', '110:1e2', '999:0', '110:9999', ' 110:0', undefined, ['110:0']])('rejects malformed/unknown input %s', async value => {
    expect(await resolvePuzzleLink(value)).toBeNull();
  });
  it('aligns Hall and Cove entry without migrating or deleting the legacy board slot', () => {
    expect(gameDestination('reef-sweep')).toEqual(SHORTCUTS['reef-sweep'].route);
  });
});

vi.mock('../src/puzzles/bankAssets', async () => { const { readFileSync } = await import('node:fs'); return { bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }; });

it('keeps legacy Reef Sweep rounds alongside deduction progress through save/restore', async () => {
  const { createSession, engines } = await import('../src/board');
  const { emptySave, parseSave } = await import('../src/state/validation');
  const { emptyChallenge } = await import('../src/state/challenge');
  const legacy = createSession('reef-sweep', { seed: 91 });
  legacy.position = engines['reef-sweep'].move(legacy.position, engines['reef-sweep'].legal(legacy.position)[0]);
  const entry = challengeEntries.find(e => e.game === 'reef-sweep')!;
  const session = entry.start(entry.puzzles[0].ref, 'family', 'reef-link-test', emptyChallenge(), {supportOff:false, ownRead:false}, []);
  const draft = entry.move(session, entry.controls.help())!;
  const { migrateProfiles, encodeSave, projectProfile } = await import('../src/state/profiles');
  const save = { ...migrateProfiles({ ...emptySave(), board: {'reef-sweep': legacy} }), challenge: {...emptyChallenge(), nextOrdinal:2, paused:[draft]} };
  const restored = projectProfile(parseSave(encodeSave(save)));
  expect(restored.profiles?.unassigned.rounds.board?.['reef-sweep']).toEqual(legacy);
  expect(restored.challenge?.paused[0]).toEqual(draft);
  expect(gameDestination('reef-sweep')).toEqual(SHORTCUTS['reef-sweep'].route);
  expect(entry.move(restored.challenge!.paused[0], entry.controls.help())).not.toBeNull();
});

it('continues Challenge Reef Sweep first and preserves the legacy-only board destination', async()=>{
 const {createSession}=await import('../src/board');
 const {emptySave}=await import('../src/state/validation');
 const {emptyChallenge}=await import('../src/state/challenge');
 const {ongoing,homeContinue}=await import('../src/learn/home');
 const {legacyReefResume}=await import('../src/learn/destinations');
 const board=createSession('reef-sweep',{seed:91});
 const legacy={...emptySave(),board:{'reef-sweep':board},recentBoard:'reef-sweep' as const};
 expect(ongoing(legacy,'reef-sweep')).toBe(true);expect(homeContinue(legacy)).toBe('reef-sweep');expect(legacyReefResume(legacy)).toBe(true);
 const entry=challengeEntries.find(e=>e.game==='reef-sweep')!;
 const session=entry.start(entry.puzzles[0].ref,'family','reef-continue',emptyChallenge(),{supportOff:false,ownRead:false},[]);
 for(const save of [{...emptySave(),challenge:{...emptyChallenge(),paused:[session]}},{...legacy,challenge:{...emptyChallenge(),paused:[session]}}]){
  expect(ongoing(save,'reef-sweep')).toBe(true);expect(homeContinue(save)).toBe('reef-sweep');expect(legacyReefResume(save)).toBe(false);
 }
 expect(legacy.board['reef-sweep']).toEqual(board);
});

it('honors newer recent markers over a paused Reef Sweep draft, including completed rounds', async () => {
  const { createSession } = await import('../src/board');
  const { createGame } = await import('../src/games');
  const { defaultOptions } = await import('../src/games/types');
  const { startSession } = await import('../src/learn/session');
  const { engine, tapItem } = await import('../src/learn/games/hafa-adai/engine');
  const { emptySave } = await import('../src/state/validation');
  const { emptyChallenge } = await import('../src/state/challenge');
  const { emptyArcade, arcadeIds } = await import('../src/arcade');
  const { ongoing, homeContinue } = await import('../src/learn/home');
  const entry = challengeEntries.find(e => e.game === 'reef-sweep')!;
  const draft = entry.start(entry.puzzles[0].ref, 'family', 'reef-marker-priority', emptyChallenge(), {supportOff:false, ownRead:false}, []);
  const save = {...emptySave(), challenge: {...emptyChallenge(), paused: [draft]}};
  expect(homeContinue(save)).toBe('reef-sweep');
  const learn = startSession('hafa-adai', {options: {mode: 'solo', pace: 'easy'}}, {}, 42);
  const board = createSession('coconut-drop', {seed: 91});
  const classic = createGame('memory', defaultOptions);
  for (const newer of [
    {...save, recentLearn: 'hafa-adai' as const, learn: {'hafa-adai': learn}},
    {...save, recentBoard: 'coconut-drop' as const, board: {'coconut-drop': board}},
    {...save, recent: 'memory' as const, sessions: {memory: classic}},
    {...save, arcade: {...emptyArcade(), recent: arcadeIds[0]}},
  ]) {
    expect(homeContinue(newer)).toBe(newer.recentBoard ?? newer.recentLearn ?? newer.recent ?? newer.arcade?.recent);
    // Game Hall uses this independently to show “Continue →” on Reef Sweep.
    expect(ongoing(newer, 'reef-sweep')).toBe(true);
  }
  let completed = engine.create(learn.options, {skills: {}, rng: () => 0.5, starter: 0, today: 20_000}) as IslandState;
  for (const id of completed.items) completed = tapItem(completed, id);
  expect(engine.outcome(completed, learn.options)).toBe('done');
  expect(homeContinue({...save, recentLearn: 'hafa-adai', learn: {'hafa-adai': {...learn, state: completed}}})).toBeNull();
  expect(homeContinue({...save, recentBoard: 'coconut-drop', board: {'coconut-drop': {...board, position: {...board.position, outcome: 'draw'}}}})).toBeNull();
  expect(ongoing(save, 'reef-sweep')).toBe(true);
});
