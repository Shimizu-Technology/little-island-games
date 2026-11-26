import { describe, expect, it, vi } from 'vitest';
import { resolvePuzzleLink } from '../src/challenge/deepLink';
import { challengeEntries } from '../src/challenge/catalog';
import { gameDestination } from '../src/learn/destinations';
import { SHORTCUTS } from '../src/cove/shelf';
import { bankSize } from '../src/state/bankFacts';

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
