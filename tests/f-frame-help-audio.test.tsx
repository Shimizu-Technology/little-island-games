vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
/** F-frame: "Hear a quick guide" never plays silence. The School frame offers it only when the engine's helpAudio has a
 * shipped recording in the chosen voice, the same lookup the player uses. Also verifies F3 spoken Help exit and
 * background/visibility cancellation across LearnFrame. */
import React, { createContext } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, type Settings } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { engines } from '../src/learn/engines';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId } from '../src/learn/types';

vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));

/** Shipped sources, read from the generated require tables without loading native audio into Node. */
const keysIn = (text: string) => new Set([...text.matchAll(/["']([^"']+)["']:\s*require\(/g)].map(m => m[1]));
const neural = readFileSync('src/content/neuralAudio.ts', 'utf8'), calmAt = neural.search(/\n\s*calm:\s*\{/);
const voices = { warm: keysIn(neural.slice(0, calmAt)), calm: keysIn(neural.slice(calmAt)) };
const shared = new Set([...keysIn(readFileSync('src/content/audioSources.ts', 'utf8')), ...readdirSync('src/content/learnAudio').flatMap(f => [...keysIn(readFileSync(`src/content/learnAudio/${f}`, 'utf8'))])]);
const shipped = (key: string, voice: 'warm' | 'calm' = 'warm') => voices[voice].has(key) || shared.has(key);
// Owner: lead's audio batch. A help line staged for the next batch goes here; remove it as soon as it ships (W5a voiced the last six; canoe-help, gate-help and scale-help await W5b).
const knownMissing: string[] = ['canoe-help', 'gate-help', 'scale-help'];

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 1 }));
const db = vi.hoisted(() => ({ raw: null as string | null }));
const speech = vi.hoisted(() => ({ has: ((_key: string, _voice?: 'warm' | 'calm') => true) as (key: string, voice?: 'warm' | 'calm') => boolean }));
const expoSpeech = vi.hoisted(() => ({
  speak: vi.fn(),
  stop: vi.fn(() => Promise.resolve()),
}));
const soundCtrl = vi.hoisted(() => ({
  play: vi.fn(() => true),
  stop: vi.fn(),
}));
const appState = vi.hoisted(() => ({
  currentState: 'active' as string,
  listeners: new Set<(state: string) => void>(),
  emit(next: string) {
    this.currentState = next;
    for (const fn of [...this.listeners]) fn(next);
  },
}));
const platform = vi.hoisted(() => ({ OS: 'ios' as 'ios' | 'android' | 'web' }));

vi.mock('expo-speech', () => ({
  speak: (...args: unknown[]) => expoSpeech.speak(...args),
  stop: () => expoSpeech.stop(),
}));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({
  Platform: { get OS() { return platform.OS; } },
  ScrollView: 'ScrollView',
  View: 'View',
  useWindowDimensions: () => viewport,
  AppState: {
    get currentState() { return appState.currentState; },
    addEventListener: (_event: string, fn: (state: string) => void) => {
      appState.listeners.add(fn);
      return { remove: () => { appState.listeners.delete(fn); } };
    },
  },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
  Sheet: ({ visible, onClose, title, children, footer }: { visible: boolean; onClose?: () => void; title?: string; children: React.ReactNode; footer: React.ReactNode }) =>
    visible ? React.createElement('SheetBody', { onClose, title }, children, footer) : null }));
vi.mock('../src/components/Audio', () => ({
  AudioPreferences: createContext<Partial<Settings> & { epoch?: number }>({}),
  useSoundControls: () => ({ play: soundCtrl.play, stop: soundCtrl.stop }),
  hasSpeech: (key: string, voice?: 'warm' | 'calm') => speech.has(key, voice),
}));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: 'PhoneLearningCompanion', useCompanionReaction: () => ({ event: 'entry', react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: () => null, subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/growth/Board', () => ({ GrowthBoard: 'Board' }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/learn/views', () => ({ views: new Proxy({}, { get: () => ({ Board: 'Board', Art: 'Art' }) }) }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));

const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
let root: ReactTestRenderer | undefined;
let latestStore: ReturnType<typeof useStore> | undefined;
function Ready({ id }: { id: LearnId }) {
  const s = useStore();
  React.useEffect(() => {
    latestStore = s;
  }, [s]);
  return s.ready ? <LearnFrame id={id} /> : null;
}
async function openHelp(id: LearnId, voice?: 'warm' | 'calm', extraSettings?: Partial<Settings>) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  if (voice) save.settings = { ...save.settings, voice };
  if (extraSettings) save.settings = { ...save.settings, ...extraSettings };
  save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Ready id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: () => {} }) }); });
  await vi.waitFor(() => expect(root!.root.findAll(n => String(n.type) === 'GameHeader')).not.toHaveLength(0), { timeout: 5000, interval: 20 });
  await act(async () => { root!.root.findAll(n => String(n.type) === 'GameHeader')[0].props.onHelp(); });
  return root!.root.findAll(n => String(n.type) === 'SheetBody').at(-1)!;
}
const hearIn = (sheet: ReactTestInstance) => sheet.findAll(n => String(n.type) === 'Button' && textOf(n).trim() === 'Hear a quick guide');
const buttonIn = (sheet: ReactTestInstance, label: string) =>
  sheet.findAll(n => String(n.type) === 'Button' && textOf(n).trim() === label)[0];

beforeEach(() => {
  platform.OS = 'ios';
  appState.currentState = 'active';
  appState.listeners.clear();
  expoSpeech.speak.mockReset();
  expoSpeech.stop.mockReset().mockImplementation(() => Promise.resolve());
  soundCtrl.play.mockReset().mockImplementation(() => true);
  soundCtrl.stop.mockReset();
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); speech.has = () => true; });

const withHelp = (Object.keys(engines) as LearnId[]).filter(id => engines[id].helpAudio);

it('every learning engine helpAudio is a shipped recording in both voices, or listed as known missing', () => {
  expect(withHelp.length).toBeGreaterThan(10);
  for (const key of knownMissing) expect(shipped(key, 'warm') || shipped(key, 'calm'), `${key} now ships; remove it from knownMissing`).toBe(false);
  for (const id of withHelp) {
    const key = engines[id].helpAudio!;
    if (knownMissing.includes(key)) continue;
    expect(shipped(key, 'warm') && shipped(key, 'calm'), `${id}: ${key}`).toBe(true);
  }
});

it.each(withHelp)('%s: Help offers "Hear a quick guide" only when its recording ships', async id => {
  speech.has = (key, voice) => shipped(key, voice ?? 'warm');
  const sheet = await openHelp(id);
  expect(hearIn(sheet), engines[id].helpAudio).toHaveLength(shipped(engines[id].helpAudio!) ? 1 : 0);
  // The written instructions are always there.
  expect(sheet.findAll(n => String(n.type) === 'Copy' && textOf(n) === engines[id].help)).toHaveLength(1);
});

it('Slip Tide: its slip-help recording ships in both voices, so the Help sheet offers the Hear button', async () => {
  speech.has = (key, voice) => shipped(key, voice ?? 'warm');
  expect(shipped('slip-help', 'warm') && shipped('slip-help', 'calm')).toBe(true);
  expect(hearIn(await openHelp('slip-tide'))).toHaveLength(1);
});

it('the check uses the chosen voice', async () => {
  const asked: unknown[] = [];
  speech.has = (key, voice) => { asked.push([key, voice]); return voice === 'calm'; };
  expect(hearIn(await openHelp('crab-commands', 'calm'))).toHaveLength(1);
  expect(asked).toContainEqual(['crab-commands-help', 'calm']);
  await act(async () => root!.unmount()); root = undefined;
  expect(hearIn(await openHelp('crab-commands', 'warm'))).toHaveLength(0);
});

it('F3: Help spoken guide respects narrationVolume and stops speech on onClose, Show me how, Choose a fresh round, AppState background, and web visibilitychange', async () => {
  // 1. Help spoken guide uses narrationVolume and stops on Sheet onClose
  let sheet = await openHelp('island-colors', undefined, { narrationVolume: 0.25 });
  const hearBtn = hearIn(sheet)[0];
  expect(hearBtn).toBeDefined();
  await act(async () => { hearBtn.props.onPress(); });
  expect(expoSpeech.speak).toHaveBeenCalledWith(engines['island-colors'].spokenHelp, {
    language: 'en-US',
    rate: 0.94,
    pitch: 1.06,
    volume: 0.25,
  });
  expoSpeech.stop.mockClear();
  await act(async () => { sheet.props.onClose(); });
  expect(expoSpeech.stop).toHaveBeenCalled();
  await act(async () => root!.unmount()); root = undefined;

  // 2. Help exit via "Show me how" stops speech
  sheet = await openHelp('island-colors');
  await act(async () => { hearIn(sheet)[0].props.onPress(); });
  expoSpeech.stop.mockClear();
  await act(async () => { buttonIn(sheet, 'Show me how').props.onPress(); });
  expect(expoSpeech.stop).toHaveBeenCalled();
  await act(async () => root!.unmount()); root = undefined;

  // 3. Help exit via "Choose a fresh round" stops speech (even though boardActive stays false)
  sheet = await openHelp('island-colors');
  await act(async () => { hearIn(sheet)[0].props.onPress(); });
  expoSpeech.stop.mockClear();
  await act(async () => { buttonIn(sheet, 'Choose a fresh round').props.onPress(); });
  expect(expoSpeech.stop).toHaveBeenCalled();
  await act(async () => root!.unmount()); root = undefined;

  // 4. AppState backgrounding while Help is open (boardActive already false) stops speech immediately
  sheet = await openHelp('island-colors');
  await act(async () => { hearIn(sheet)[0].props.onPress(); });
  expoSpeech.stop.mockClear();
  await act(async () => { appState.emit('background'); });
  expect(expoSpeech.stop).toHaveBeenCalled();
  await act(async () => root!.unmount()); root = undefined;
  expect(appState.listeners.size).toBe(0);

  // 5. Web document.visibilitychange (hidden) while Help is open stops speech and cleans up listener on unmount
  platform.OS = 'web';
  appState.currentState = 'active';
  const visListeners = new Set<() => void>();
  const fakeDoc = {
    hidden: false,
    addEventListener: vi.fn((event: string, fn: () => void) => {
      if (event === 'visibilitychange') visListeners.add(fn);
    }),
    removeEventListener: vi.fn((event: string, fn: () => void) => {
      if (event === 'visibilitychange') visListeners.delete(fn);
    }),
  };
  vi.stubGlobal('document', fakeDoc);
  sheet = await openHelp('island-colors');
  await act(async () => { hearIn(sheet)[0].props.onPress(); });
  expoSpeech.stop.mockClear();
  fakeDoc.hidden = true;
  await act(async () => { for (const fn of visListeners) fn(); });
  expect(expoSpeech.stop).toHaveBeenCalled();
  await act(async () => root!.unmount()); root = undefined;
  expect(visListeners.size).toBe(0);
});

it('F2: changing only narration voice with unchanged epoch cancels active spoken Help immediately', async () => {
  const sheet = await openHelp('island-colors', 'warm', { narrationVolume: 0.5, automaticSpeech: false });
  const epochBefore = latestStore!.epoch;
  await act(async () => { hearIn(sheet)[0].props.onPress(); });
  expect(expoSpeech.speak).toHaveBeenCalledTimes(1);
  expoSpeech.stop.mockClear();
  expoSpeech.speak.mockClear();

  await act(async () => { latestStore!.settings({ voice: 'calm' }); });
  expect(latestStore!.epoch).toBe(epochBefore);
  expect(expoSpeech.stop).toHaveBeenCalledTimes(1);
  expect(expoSpeech.speak).not.toHaveBeenCalled();
});
