import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { emptySave } from '../src/state/validation';
import type { SessionOpenResult } from '../src/state/sessionContent';
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));


// Slice F-recover: every recovery or waiting state on the launch path is visible, never blank.
const fixture = vi.hoisted(() => ({ store: {} as Record<string, unknown>, noteLaunch: vi.fn(), replace: vi.fn(), params: { game: 'sudoku' } as Record<string, string> }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', Pressable: 'button', Text: 'span', TextInput: 'input', useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', SafeAreaProvider: 'div', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: 'div' }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-router', () => ({ Stack: Object.assign(() => null, { Screen: () => null }), Redirect: () => null, router: { replace: fixture.replace }, useNavigationContainerRef: () => ({ isReady: () => false, addListener: () => () => {} }), useFocusEffect: () => {}, useLocalSearchParams: () => fixture.params, useIsFocused: () => true }));
vi.mock('../src/components/ui', () => ({ Button: ({ children, onPress, disabled }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) => <button onClick={onPress} disabled={disabled}>{children}</button>, Chip: 'button', Copy: 'p', Heading: 'h2', IconButton: 'button', PressableScale: 'button', Sheet: () => null, ToggleRow: 'switch', C: { cream: '#FCFAF4' }, font: undefined, styles: { content: {} } }));
vi.mock('../src/components/Text', async () => ({ ...await vi.importActual<object>('../src/components/Text'), TextLayoutProvider: 'div' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark: () => null }));
vi.mock('../src/cove/HubCove', () => ({ CoveLists: () => null }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: () => null }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/cove/PeoplePicker', () => ({ PeoplePicker: () => null, solvingPeople: () => [] }));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => ({ ready: false }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn(), placeRoute: vi.fn() }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: () => null }));
vi.mock('../src/challenge/ChallengeFrame', () => ({ ChallengeFrame: () => <article/> }));
vi.mock('../src/challenge/catalog', async () => ({ ...await vi.importActual<object>('../src/challenge/catalog'), challengeFor: (game: string) => game === 'fixture-game' ? { game } : undefined }));
vi.mock('../src/state/backup', () => ({ exportBackup: vi.fn() }));
vi.mock('../src/state/launchLog', () => ({ noteLaunch: fixture.noteLaunch }));
vi.mock('../src/ui/fonts', () => ({ NunitoProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/state/Store', () => ({ StoreProvider: 'div', useStore: () => fixture.store }));
let view: ReactTestRenderer | undefined;
afterEach(async () => { if (view) await act(async () => view!.unmount()); view = undefined; vi.unstubAllGlobals(); });
const render = async (node: React.ReactElement) => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); await act(async () => { view = create(node); }); return view!; };
const text = (node: ReactTestInstance): string => node.children.map(c => typeof c === 'string' ? c : text(c)).join('');
const button = (label: string) => view!.root.findAll(n => n.type === 'button' && text(n) === label)[0];
const store = (patch: Record<string, unknown>) => { fixture.store = { ready: true, recovery: null, error: null, raw: null, epoch: 1, save: emptySave(), setAside: [], dismissSetAside: vi.fn(), retry: vi.fn(async () => {}), startFresh: vi.fn(), covePerson: vi.fn(), ...patch }; return fixture.store; };
/** The G5 blank screen: Recovery is a flex:1 ScrollView, so a wrapper without flex gives it no height. */
const visibleRecovery = (r: ReactTestRenderer) => {
  const wrapper = r.root.findByType('main' as never);
  expect(wrapper.props.style).toMatchObject({ flex: 1 });
  expect(text(wrapper)).toContain('Let’s look after your saved games.');
};

it('the Cove deep link shows Recovery with height instead of a blank cream screen', async () => {
  const { default: CoveScreen } = await import('../src/cove/CoveScreen');
  store({ recovery: 'Some saved profile data is invalid. Your original has been kept.' });
  visibleRecovery(await render(<CoveScreen/>));
});

it('Everything shows Recovery with height', async () => {
  const { default: EverythingScreen } = await import('../src/hub/EverythingScreen');
  store({ recovery: 'Some saved profile data is invalid. Your original has been kept.' });
  visibleRecovery(await render(<EverythingScreen/>));
});

it('the Challenge route says it is getting ready instead of rendering nothing, and shows Recovery with height', async () => {
  const { default: Challenge } = await import('../src/app/challenge');
  fixture.params = { game: 'fixture-game' };
  store({ ready: false });
  const r = await render(<Challenge/>);
  expect(text(r.root)).toContain('Getting your puzzle ready…');
  store({ recovery: 'x' }); await act(async () => r.update(<Challenge/>));
  visibleRecovery(r);
});

it('a paused puzzle that can’t be resumed offers to start fresh; one that may load later also offers a retry', async () => {
  const { SessionGate } = await import('../src/challenge/SessionGate');
  const { resumeMessage, contentMessage } = await import('../src/state/sessionContent');
  const expected = { owner: 'family', game: 'loop', epoch: 1, id: 'a', revision: 0 };
  for (const [result, retry] of [[{ ok: false, kind: 'invalid-session', message: resumeMessage }, false], [{ ok: false, kind: 'content-unavailable', message: contentMessage }, true]] as [SessionOpenResult, boolean][]) {
    const fresh = vi.fn(async () => true);
    await render(<SessionGate open={async () => result} expected={expected} onStartFresh={fresh} render={() => <article/>}/>);
    expect(text(view!.root)).toContain(result.ok ? '' : result.message);
    expect(!!button('Try opening again')).toBe(retry);
    await act(async () => button('Start this puzzle fresh').props.onClick());
    expect(fresh).toHaveBeenCalledOnce();
    await act(async () => view!.unmount()); view = undefined;
  }
  // A refused start fresh says so and keeps the board's saved work.
  await render(<SessionGate open={async () => ({ ok: false, kind: 'invalid-session', message: resumeMessage })} expected={expected} onStartFresh={async () => false} render={() => <article/>}/>);
  await act(async () => button('Start this puzzle fresh').props.onClick());
  expect(text(view!.root)).toContain('couldn’t be set aside');
  // A stale guard is a navigation race, not a broken puzzle: no start fresh.
  await act(async () => view!.unmount()); view = undefined;
  await render(<SessionGate open={async () => ({ ok: false, kind: 'stale', message: 'stale' })} expected={expected} onStartFresh={async () => true} render={() => <article/>}/>);
  expect(button('Start this puzzle fresh')).toBeUndefined();
});

it('the learner whose rounds were set aside sees one plain line, and can put it away', async () => {
  const { SaveStatus, setAsideLine } = await import('../src/components/SaveStatus');
  const dismiss = vi.fn();
  store({ setAside: [{ owner: 'family', games: ['loop'], marks: 1 }, { owner: 'b', games: ['bridges'], marks: 0 }], dismissSetAside: dismiss });
  await render(<SaveStatus/>);
  expect(text(view!.root)).toBe(setAsideLine(['loop'], 1) + 'OK');
  expect(setAsideLine(['loop'])).toMatch(/^Your paused .+ puzzle couldn’t be resumed, so it was set aside\. Your marks and stars are kept\. You can start fresh any time\.$/);
  expect(setAsideLine(['loop', 'bridges'], 6)).toMatch(/ and .+ puzzles couldn’t be resumed, so they were set aside with some puzzle marks from another version\. Everything else is kept\./);
  expect(setAsideLine([], 1)).toBe('Some puzzle marks from another version of the app couldn’t be opened, so they were set aside. Everything else is kept.');
  await act(async () => button('OK').props.onClick());
  expect(dismiss).toHaveBeenCalledWith('family');
  // Another learner sees nothing about it.
  await act(async () => view!.unmount()); view = undefined;
  store({ setAside: [{ owner: 'b', games: ['bridges'], marks: 0 }] });
  await render(<SaveStatus/>);
  expect(view!.toJSON()).toBeNull();
});

it('only a failure of the Store itself reaches the root boundary: a plain restart screen with no Try again', async () => {
  const { ErrorBoundary } = await import('../src/app/_layout'); // re-exported from components/LaunchError
  const retry = vi.fn(async () => {}), error = new Error('The Store failed');
  await render(<ErrorBoundary error={error} retry={retry}/>);
  expect(text(view!.root)).toContain('Little Island needs a restart.');
  expect(text(view!.root)).toContain('Your saved work is kept.');
  // expo-updates isn't in this build, so restarting is an instruction a grown-up can follow.
  expect(text(view!.root)).toContain('Restart Little Island');
  expect(text(view!.root)).toContain('Swipe Little Island up to close it, then tap Little Island to open it again.');
  expect(view!.root.findAll(n => n.type === 'button')).toHaveLength(0);
  expect(fixture.noteLaunch).toHaveBeenCalledWith('store', error);
  expect(retry).not.toHaveBeenCalled();expect(fixture.replace).not.toHaveBeenCalled();
});

it('the Store is mounted above the UI boundary, and a remounted navigator starts on the map', async () => {
  const { default: Layout } = await import('../src/app/_layout');
  const { UIBoundary } = await import('../src/components/LaunchError');
  await render(<Layout/>);
  const ui = view!.root.findByType(UIBoundary as never);
  expect(ui.parent!.type).toBe('div'); // StoreProvider, mocked as a div here
  const stack = ui.find(n => n.props.screenLayout !== undefined);
  expect(stack.props.initialRouteName).toBe('index');
});

it('each screen in the Stack has its own boundary below the Store', async () => {
  const { screenLayout } = await import('../src/app/_layout');
  const { ScreenBoundary } = await import('../src/components/LaunchError');
  const child = <article/>;
  const wrapped = screenLayout({ children: child });
  expect(wrapped.type).toBe(ScreenBoundary);expect(wrapped.props.children).toBe(child);
});
