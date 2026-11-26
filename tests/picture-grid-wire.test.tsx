import React, { createContext, useLayoutEffect } from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import root from '../src/content/puzzles/root.json';
import manifest from '../src/puzzles/picture-grid/manifest.generated.json';
import saveCatalog from '../src/state/save-catalog.json';
import { challengeFor } from '../src/challenge/catalog';
import { coveEntries, infoFor } from '../src/cove/catalog';
import { CoveRound } from '../src/cove/CoveRound';
import { addLearner } from '../src/learn/learners';
import type { RootIndex } from '../src/puzzles/bank';
import { createBankLoader, type BankLoader } from '../src/puzzles/loader';
import { decodePicture } from '../src/puzzles/picture-grid/checkpoint';
import { FILL, pictureBands } from '../src/puzzles/picture-grid/engine';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { progressFor, selectedOwner } from '../src/state/challengeDrafts';
import { emptySave } from '../src/state/validation';

const db = vi.hoisted(() => ({
  raw: null as string | null,
  rows: [] as string[],
  loader: null as BankLoader | null,
}));

vi.mock('../src/puzzles/catalog', () => ({ bankLoader: () => db.loader! }));
vi.mock('../src/state/storage', () => ({
  storage: {
    get: async () => db.raw,
    set: async (raw: string) => { db.raw = raw; },
    preserve: async () => {},
    writeDraft: async (raw: string) => { db.rows.push(raw); },
    readDrafts: async () => db.rows,
    discardSession: async () => {},
  },
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Platform: { OS: 'ios' },
  AppState: { addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  StyleSheet: { create: (styles: object) => styles, absoluteFill: {} },
}));
vi.mock('expo-router', () => ({ useIsFocused: () => true }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Copy: 'Copy', Heading: 'Heading', C: {}, styles: {} }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));

let store: ReturnType<typeof useStore>;
let screen: ReactTestRenderer | undefined;

function Probe() {
  const s = useStore();
  useLayoutEffect(() => { store = s; }, [s]);
  return null;
}

function byID(id: string) {
  return screen!.root.find(node => typeof node.type === 'string' && node.props.testID === id);
}

function hasID(id: string) {
  return screen!.root.findAll(node => typeof node.type === 'string' && node.props.testID === id).length > 0;
}

function byLabel(label: string) {
  return screen!.root.find(node => typeof node.type === 'string' && node.props.accessibilityLabel === label);
}

function freshLoader() {
  return createBankLoader({
    root: root as RootIndex,
    transport: {
      read: async name => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8'),
    },
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  db.raw = JSON.stringify({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
  db.rows = [];
  db.loader = freshLoader();
});

afterEach(async () => {
  if (screen) {
    await act(async () => {
      await store.backup();
      screen!.unmount();
    });
  }
  screen = undefined;
  vi.unstubAllGlobals();
});

describe('Picture Grid Cove wiring (G4a, banks 110–113)', () => {
  it('registers in coveEntries(), challengeFor(), manifest, and save-catalog.json', () => {
    const entry = challengeFor('picture-grid');
    expect(entry).toBeDefined();
    expect(coveEntries().some(e => e.game === 'picture-grid')).toBe(true);
    expect(infoFor('picture-grid')).toMatchObject({ name: 'Picture Grid', row: 'Logic' });
    expect(entry!.packed?.bands.map(b => [b.bank, b.tier, b.title, b.count])).toEqual([
      [110, 1, 'Easy', 30],
      [111, 2, 'Medium', 28],
      [112, 3, 'Hard', 9],
      [113, 4, 'Expert', 11],
    ]);
    expect(manifest.packs.map(p => p[0])).toEqual([110, 111, 112, 113]);
    for (const [slot, bank] of entry!.catalog.banks) {
      expect(JSON.stringify(saveCatalog.banks.find(b => b.slot === slot))).toBe(JSON.stringify(bank));
    }
    for (const band of pictureBands) {
      expect(saveCatalog.contexts).toContain(`picture-grid-${band.tier}`);
    }
  });

  it.each([
    [110, 'Easy', 5],
    [111, 'Medium', 8],
    [112, 'Hard', 12],
    [113, 'Expert', 15],
  ] as const)('loads bank %i (%s), accepts stroke/help/undo, and round-trips through Store', async (slot, title, expectedSize) => {
    const entry = challengeFor('picture-grid')!;
    const ref = await entry.packed!.choose(slot, emptyChallenge());
    expect(ref).toMatchObject({ bank: slot, puzzle: 0, engine: 'picture-grid', rules: 1 });
    const card = entry.packed!.card(ref)!;
    expect(card.title).toBe(`Picture Grid · ${title} 1`);

    function Ready() {
      const s = useStore();
      return s.ready
        ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={entry} card={card} partner={null} width={360} onBrowse={() => {}} onClose={() => {}} />
        : null;
    }

    const mount = async () => {
      await act(async () => {
        screen = create(<StoreProvider><Probe /><Ready /></StoreProvider>);
      });
      await act(async () => {
        await vi.dynamicImportSettled();
      });
    };

    await mount();
    const session = () => progressFor(store.save, 'a')!.paused.find(s => s.game === 'picture-grid')!;
    expect(session().puzzle).toEqual(ref);

    // Paint a cell, request a hint, and verify draft counters.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    let draft = decodePicture(session().payload, expectedSize)!;
    expect(draft.marks[0]).toBe(FILL);
    expect(draft.edits).toBe(1);

    await act(async () => { byID('picture-hint').props.onPress(); });
    draft = decodePicture(session().payload, expectedSize)!;
    expect(draft.helps).toBe(1);
    expect(draft.showingHint).toBe(true);

    // Undo removes the painted mark while keeping edit and help counters intact.
    await act(async () => { byID('picture-undo').props.onPress(); });
    draft = decodePicture(session().payload, expectedSize)!;
    expect(draft.marks[0]).toBe(0);
    expect(draft.helps).toBe(1);

    // Paint again so we persist a non-empty mark, then round-trip across unmount + fresh loader + remount.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    const accepted = JSON.parse(JSON.stringify(session())) as ChallengeSession;
    await act(async () => {
      await store.backup();
      screen!.unmount();
    });
    screen = undefined;
    db.loader = freshLoader();

    await mount();
    expect(session()).toEqual(accepted);
    expect(decodePicture(session().payload, expectedSize)?.marks[0]).toBe(FILL);
    expect(decodePicture(session().payload, expectedSize)?.helps).toBe(1);
  });

  it('opens Draw a Puzzle cleanly from the board More menu and returns without losing marks', async () => {
    const entry = challengeFor('picture-grid')!;
    const ref = await entry.packed!.choose(110, emptyChallenge());
    const card = entry.packed!.card(ref)!;

    function Ready() {
      const s = useStore();
      return s.ready
        ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={entry} card={card} partner={null} width={360} onBrowse={() => {}} onClose={() => {}} />
        : null;
    }

    await act(async () => {
      screen = create(<StoreProvider><Probe /><Ready /></StoreProvider>);
    });
    await act(async () => {
      await vi.dynamicImportSettled();
    });

    await act(async () => { byID('picture-cell-0').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');

    await act(async () => { byID('picture-more-button').props.onPress(); });
    expect(hasID('picture-more')).toBe(true);

    await act(async () => { byLabel('Draw a Puzzle').props.onPress(); });
    expect(hasID('picture-pass')).toBe(true);

    await act(async () => { byLabel('Back from drawing').props.onPress(); });
    expect(hasID('picture-pass')).toBe(false);
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
  });
});
