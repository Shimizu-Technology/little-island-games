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
import type { FamilyManifest, RootIndex } from '../src/puzzles/bank';
import { createBankLoader, type BankLoader } from '../src/puzzles/loader';
import { pictureGridAdapter } from '../src/puzzles/picture-grid/adapter';
import { decodePicture } from '../src/puzzles/picture-grid/checkpoint';
import { FILL, pictureBands } from '../src/puzzles/picture-grid/engine';
import { PlayScreen } from '../src/puzzles/picture-grid/PlayScreen';
import { definePictureGrid, pictureGridBankFacts, type PlayScreenImporter, type ReactNativeImporter } from '../src/puzzles/picture-grid/registration';
import { provePicture } from '../src/puzzles/picture-grid/solver';
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
// Vite cannot intercept the native helper's deferred CommonJS require. Its real
// export-selection behavior is exercised against lazy getters in native-module-loading.
vi.mock('../src/puzzles/picture-grid/nativeControls', () => ({ loadNativeControls: () => import('react-native') }));
vi.mock('expo-router', () => ({ useIsFocused: () => true }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Copy: 'Copy', Heading: 'Heading', C: {}, styles: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
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

    await act(async () => { byID('hud-hint').props.onPress(); });
    draft = decodePicture(session().payload, expectedSize)!;
    expect(draft.helps).toBe(1);
    expect(draft.showingHint).toBe(true);

    // Undo removes the painted mark while keeping edit and help counters intact.
    await act(async () => { byID('hud-undo').props.onPress(); });
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

  it('exposes a single Clean 4.0 More button for Restart and Draw a Puzzle, and returning preserves the paused puzzle', async () => {
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

    // Strictly ONE More button (from Clean 4.0's HUD), never a duplicate in-board More button.
    const moreButtons = screen!.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityLabel === 'More');
    expect(moreButtons).toHaveLength(1);
    expect(moreButtons[0].props.testID).toBe('hud-more');
    expect(hasID('picture-more-button')).toBe(false);

    // Paint a cell and take a hint so we can verify Restart preserves the help audit.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    await act(async () => { byID('hud-hint').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');

    // Open the single Clean 4.0 More sheet and restart this puzzle while preserving help audit.
    await act(async () => { byID('hud-more').props.onPress(); });
    expect(hasID('more-Restart this puzzle')).toBe(true);
    expect(hasID('more-Draw a Puzzle')).toBe(true);
    await act(async () => { byID('more-Restart this puzzle').props.onPress(); });
    await act(async () => { byID('more-restart-confirm').props.onPress(); });

    const session = () => progressFor(store.save, 'a')!.paused.find(s => s.game === 'picture-grid')!;
    expect(decodePicture(session().payload, 5)?.marks[0]).toBe(0);
    expect(decodePicture(session().payload, 5)?.helps).toBe(1);
    expect(decodePicture(session().payload, 5)?.resets).toBe(1);

    // Paint again, open Draw a Puzzle through the Clean 4.0 HUD More sheet, and verify exiting Draw keeps the paused puzzle.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');

    await act(async () => { byID('hud-more').props.onPress(); });
    await act(async () => { byID('more-Draw a Puzzle').props.onPress(); });
    expect(hasID('picture-pass')).toBe(true);

    await act(async () => { byLabel('Back from drawing').props.onPress(); });
    expect(hasID('picture-pass')).toBe(false);
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
    expect(decodePicture(session().payload, 5)?.marks[0]).toBe(FILL);
  });

  it('keeps Draw a Puzzle interactive after saving a Cove finish', async () => {
    const entry = challengeFor('picture-grid')!;
    const ref = await entry.packed!.choose(110, emptyChallenge());
    const card = entry.packed!.card(ref)!;
    const descriptor = await db.loader!.entry(pictureGridAdapter, 'picture-grid', 110 * 1024 + ref.puzzle);
    const solution = provePicture(descriptor.payload).marks;

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

    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === FILL) {
        await act(async () => { byID(`picture-cell-${i}`).props.onPress(); });
      }
    }

    // Confirm solo finish so Cove saves and shows the solved reveal with active=false.
    await act(async () => { byLabel('Save my finish').props.onPress(); });
    expect(progressFor(store.save, 'a')!.paused.filter(s => s.game === 'picture-grid')).toEqual([]);
    expect(hasID('cove-finish')).toBe(true);
    expect(hasID('picture-reveal')).toBe(true);

    // Open Draw a Puzzle from the finished round and verify the drawing grid is enabled and tappable.
    await act(async () => { byLabel('Draw a Puzzle').props.onPress(); });
    expect(hasID('picture-drawing')).toBe(true);
    expect(byID('picture-cell-0').props.disabled).toBeFalsy();
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
    expect(byID('picture-pass').props.disabled).toBe(false);

    // Complete Pass to solver -> Play handoff and verify strictly one More button (hud-more, zero picture-more-button).
    await act(async () => { byID('picture-pass').props.onPress(); });
    expect(hasID('picture-pass-cover')).toBe(true);
    await act(async () => { byID('picture-family-play').props.onPress(); });
    expect(hasID('picture-pass-cover')).toBe(false);
    expect(hasID('picture-clue-row-0')).toBe(true);
    const solverMoreButtons = screen!.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityLabel === 'More');
    expect(solverMoreButtons).toHaveLength(1);
    expect(solverMoreButtons[0].props.testID).toBe('hud-more');
    expect(hasID('picture-more-button')).toBe(false);

    await act(async () => { byLabel('Back to puzzle').props.onPress(); });
    expect(hasID('picture-reveal')).toBe(true);
  });

  it('keeps strictly one More button through saved round -> Draw -> Pass to solver -> Play and preserves the paused puzzle', async () => {
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

    const assertSingleMore = () => {
      const moreButtons = screen!.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityLabel === 'More');
      expect(moreButtons).toHaveLength(1);
      expect(moreButtons[0].props.testID).toBe('hud-more');
      expect(hasID('picture-more-button')).toBe(false);
    };

    // Paint a cell on the saved Cove puzzle first.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    const session = () => progressFor(store.save, 'a')!.paused.find(s => s.game === 'picture-grid')!;
    expect(decodePicture(session().payload, 5)?.marks[0]).toBe(FILL);
    assertSingleMore();

    // Draw -> fill cell -> Pass to solver -> Play.
    await act(async () => { byID('hud-more').props.onPress(); });
    await act(async () => { byID('more-Draw a Puzzle').props.onPress(); });
    assertSingleMore();

    await act(async () => { byID('picture-cell-2').props.onPress(); });
    await act(async () => { byID('picture-pass').props.onPress(); });
    expect(hasID('picture-pass-cover')).toBe(true);
    assertSingleMore();

    await act(async () => { byID('picture-family-play').props.onPress(); });
    expect(hasID('picture-pass-cover')).toBe(false);
    expect(hasID('picture-clue-row-0')).toBe(true);
    assertSingleMore();

    // Return via Cove's single More sheet and verify the paused Cove puzzle stayed intact.
    await act(async () => { byID('hud-more').props.onPress(); });
    expect(hasID('more-Back to puzzle')).toBe(true);
    await act(async () => { byID('more-Back to puzzle').props.onPress(); });
    assertSingleMore();
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
    expect(decodePicture(session().payload, 5)?.marks[0]).toBe(FILL);
  });

  it('shows a visible loading state for a delayed import and retries cleanly after a rejected import', async () => {
    const facts = pictureGridBankFacts(manifest as unknown as FamilyManifest);

    // 1. Delayed import shows accessible loading status until the module settles.
    let resolveDelayed!: (screen: typeof PlayScreen) => void;
    const delayedLoader: PlayScreenImporter = () => new Promise(resolve => { resolveDelayed = resolve; });
    const delayedEntry = definePictureGrid(facts, { loader: () => db.loader!, loadScreen: delayedLoader });
    const ref = await delayedEntry.packed!.choose(110, emptyChallenge());
    const card = delayedEntry.packed!.card(ref)!;

    function DelayedReady() {
      const s = useStore();
      return s.ready
        ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={delayedEntry} card={card} partner={null} width={360} onBrowse={() => {}} onClose={() => {}} />
        : null;
    }

    await act(async () => {
      screen = create(<StoreProvider><Probe /><DelayedReady /></StoreProvider>);
    });
    expect(hasID('picture-grid-loading')).toBe(true);
    expect(byID('picture-grid-loading').props.accessibilityLabel).toBe('Loading Picture Grid…');
    expect(JSON.stringify(screen!.toJSON())).toContain('Loading Picture Grid…');

    await act(async () => {
      resolveDelayed(PlayScreen);
      await Promise.resolve();
    });
    expect(hasID('picture-grid-loading')).toBe(false);
    expect(hasID('picture-cell-0')).toBe(true);

    await act(async () => {
      await store.backup();
      screen!.unmount();
    });
    screen = undefined;

    // 2. Rejected import renders retry UI and genuinely retries when Try again is pressed.
    let attempts = 0;
    const flakyLoader: PlayScreenImporter = () => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('offline chunk')) : Promise.resolve(PlayScreen);
    };
    const flakyEntry = definePictureGrid(facts, { loader: () => db.loader!, loadScreen: flakyLoader });
    const flakyRef = await flakyEntry.packed!.choose(110, emptyChallenge());
    const flakyCard = flakyEntry.packed!.card(flakyRef)!;

    function FlakyReady() {
      const s = useStore();
      return s.ready
        ? <CoveRound key={`${selectedOwner(s.save)}:${s.epoch}`} entry={flakyEntry} card={flakyCard} partner={null} width={360} onBrowse={() => {}} onClose={() => {}} />
        : null;
    }

    await act(async () => {
      screen = create(<StoreProvider><Probe /><FlakyReady /></StoreProvider>);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(attempts).toBe(1);
    expect(hasID('picture-grid-load-error')).toBe(true);
    expect(hasID('picture-grid-retry')).toBe(true);

    await act(async () => {
      byID('picture-grid-retry').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(attempts).toBe(2);
    expect(hasID('picture-grid-load-error')).toBe(false);
    expect(hasID('picture-cell-0')).toBe(true);
  });

  it('clears a rejected react-native fallback import so error and retry UI recover cleanly', async () => {
    const facts = pictureGridBankFacts(manifest as unknown as FamilyManifest);
    let rnAttempts = 0;
    const flakyRN: ReactNativeImporter = () => {
      rnAttempts += 1;
      return rnAttempts === 1 ? Promise.reject(new Error('rn unavailable')) : import('react-native');
    };
    let screenAttempts = 0;
    const flakyScreen: PlayScreenImporter = () => {
      screenAttempts += 1;
      return screenAttempts === 1 ? Promise.reject(new Error('screen unavailable')) : Promise.resolve(PlayScreen);
    };
    const entry = definePictureGrid(facts, { loader: () => db.loader!, loadScreen: flakyScreen, loadRN: flakyRN });
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
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rnAttempts).toBe(2);
    expect(screenAttempts).toBe(1);
    expect(hasID('picture-grid-load-error')).toBe(true);
    expect(hasID('picture-grid-retry')).toBe(true);

    await act(async () => {
      byID('picture-grid-retry').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screenAttempts).toBe(2);
    expect(hasID('picture-grid-load-error')).toBe(false);
    expect(hasID('picture-cell-0')).toBe(true);
  });

  it('keeps family solver Undo, Hint, and Restart usable when launched from a saved Cove finish', async () => {
    const entry = challengeFor('picture-grid')!;
    const ref = await entry.packed!.choose(110, emptyChallenge());
    const card = entry.packed!.card(ref)!;
    const descriptor = await db.loader!.entry(pictureGridAdapter, 'picture-grid', 110 * 1024 + ref.puzzle);
    const solution = provePicture(descriptor.payload).marks;

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

    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === FILL) {
        await act(async () => { byID(`picture-cell-${i}`).props.onPress(); });
      }
    }

    await act(async () => { byLabel('Save my finish').props.onPress(); });
    expect(hasID('cove-finish')).toBe(true);
    expect(hasID('picture-reveal')).toBe(true);
    const finishSnapshot = JSON.stringify(progressFor(store.save, 'a'));

    // Open Draw a Puzzle, draw two cells so a single solver mark doesn't immediately solve it, then Pass to solver -> Play.
    await act(async () => { byLabel('Draw a Puzzle').props.onPress(); });
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    await act(async () => { byID('picture-cell-1').props.onPress(); });
    await act(async () => { byID('picture-pass').props.onPress(); });
    await act(async () => { byID('picture-family-play').props.onPress(); });

    const moreButtons = screen!.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityLabel === 'More');
    expect(moreButtons).toHaveLength(1);
    expect(moreButtons[0].props.testID).toBe('hud-more');
    expect(hasID('picture-more-button')).toBe(false);
    expect(hasID('hud-undo')).toBe(true);
    expect(hasID('hud-hint')).toBe(true);

    // Mark a cell, then verify HUD Undo reverts the mark.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
    expect(byID('hud-undo').props.disabled).toBe(false);
    await act(async () => { byID('hud-undo').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).not.toContain('filled');

    // Verify HUD Hint works on the family solver.
    expect(byID('hud-hint').props.disabled).toBe(false);
    await act(async () => { byID('hud-hint').props.onPress(); });
    expect(byID('hud-hint').props.disabled).toBe(true);

    // Mark a cell again, then use Cove's single More sheet -> Restart this puzzle to clear the solver board.
    await act(async () => { byID('picture-cell-0').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).toContain('filled');
    await act(async () => { byID('hud-more').props.onPress(); });
    expect(hasID('more-Restart this puzzle')).toBe(true);
    expect(byID('more-Restart this puzzle').props.disabled).toBe(false);
    await act(async () => { byID('more-Restart this puzzle').props.onPress(); });
    await act(async () => { byID('more-restart-confirm').props.onPress(); });
    expect(byID('picture-cell-0').props.accessibilityLabel).not.toContain('filled');

    // Return to the finished Cove round and verify the saved finish is intact.
    await act(async () => { byLabel('Back to puzzle').props.onPress(); });
    expect(hasID('cove-finish')).toBe(true);
    expect(hasID('picture-reveal')).toBe(true);
    expect(JSON.stringify(progressFor(store.save, 'a'))).toBe(finishSnapshot);
  });

  it('recovers when react-native import rejects after PlayScreen already rejected', async () => {
    const facts = pictureGridBankFacts(manifest as unknown as FamilyManifest);
    let rejectFirstRN!: (error: Error) => void;
    let rnAttempts = 0;
    const reversedRN: ReactNativeImporter = () => {
      rnAttempts += 1;
      if (rnAttempts === 1) {
        return new Promise((_, reject) => { rejectFirstRN = reject; });
      }
      return import('react-native');
    };
    let screenAttempts = 0;
    const flakyScreen: PlayScreenImporter = () => {
      screenAttempts += 1;
      return screenAttempts === 1 ? Promise.reject(new Error('screen unavailable')) : Promise.resolve(PlayScreen);
    };
    const entry = definePictureGrid(facts, { loader: () => db.loader!, loadScreen: flakyScreen, loadRN: reversedRN });
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
    // Flush so PlayScreen rejects while the first loadRN promise is still pending.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screenAttempts).toBe(1);
    expect(rnAttempts).toBe(1);
    expect(hasID('picture-grid-load-error')).toBe(false);

    // Now reject the pending loadRN promise; PlayScreenLoader should retry loadRN and render Error + Try again.
    await act(async () => {
      rejectFirstRN(new Error('rn unavailable late'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(rnAttempts).toBe(2);
    expect(screenAttempts).toBe(1);
    expect(hasID('picture-grid-load-error')).toBe(true);
    expect(hasID('picture-grid-retry')).toBe(true);

    // Pressing Try again recovers the board.
    await act(async () => {
      byID('picture-grid-retry').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screenAttempts).toBe(2);
    expect(hasID('picture-grid-load-error')).toBe(false);
    expect(hasID('picture-cell-0')).toBe(true);
  });
});
