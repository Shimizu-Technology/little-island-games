/** F-frame: "Hear a quick guide" never plays silence. The School frame offers it only when the engine's helpAudio has a
 * shipped recording in the chosen voice, the same lookup the player uses. Checked across every learning engine. */
import React, { createContext } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { engines } from '../src/learn/engines';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId } from '../src/learn/types';

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
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', useWindowDimensions: () => viewport, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Heading: 'Heading', Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => true, stop: () => {} }), hasSpeech: (key: string, voice?: 'warm' | 'calm') => speech.has(key, voice) }));
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
function Ready({ id }: { id: LearnId }) { const s = useStore(); return s.ready ? <LearnFrame id={id} /> : null; }
async function openHelp(id: LearnId, voice?: 'warm' | 'calm') {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  if (voice) save.settings = { ...save.settings, voice };
  save.learn = { [id]: { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' } };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Ready id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: () => {} }) }); });
  await vi.waitFor(() => expect(root!.root.findAll(n => String(n.type) === 'GameHeader')).not.toHaveLength(0), { timeout: 5000, interval: 20 });
  await act(async () => { root!.root.findAll(n => String(n.type) === 'GameHeader')[0].props.onHelp(); });
  return root!.root.findAll(n => String(n.type) === 'SheetBody').at(-1)!;
}
const hearIn = (sheet: ReactTestInstance) => sheet.findAll(n => String(n.type) === 'Button' && textOf(n).trim() === 'Hear a quick guide');
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
