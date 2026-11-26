import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { emptySave } from '../src/state/validation';
import { shelfGames } from '../src/learn/home';
import School from '../src/hub/SchoolScreen';
import Everything from '../src/hub/EverythingScreen';
const fixture = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), params: {} as {section?:string}, store: { ready:true, recovery:false, save: {} as ReturnType<typeof emptySave>, toggleGameFavorite: vi.fn() } }));
vi.mock('expo-router', () => ({ router: { push: fixture.push, back: fixture.back, setParams: vi.fn() }, useLocalSearchParams: () => fixture.params }));
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'section', Image: 'img', useWindowDimensions: () => ({ width:390, fontScale:1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView:'main' }));
vi.mock('react-native-svg', () => ({ default:'svg', G:'g', Circle:'circle', Path:'path', Rect:'rect', Ellipse:'ellipse' }));
vi.mock('../src/components/ui', () => ({ C:{}, Heading:'h2', Copy:'p', PressableScale:'button', IconButton:'button', Button:'button' }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: () => null, IslandIcon: () => null }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/components/GameShelf', () => ({ openShelfGame: (game:string) => fixture.push({game}) }));
vi.mock('../src/state/Store', () => ({ useStore: () => fixture.store }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe('visible hub destinations and preserved list behavior', () => {
 it('opens the six real subject shelves, including the existing CHamoru activity', async () => {
  let screen!: ReactTestRenderer; await act(() => { screen=create(<School/>); });
  const subjects=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityRole==='button'); expect(subjects).toHaveLength(6);
  for (const button of subjects) await act(() => button.props.onPress());
  expect(fixture.push.mock.calls.slice(-6).map(call=>call[0])).toEqual([
   ...['reading','numbers','science','thinking','coding'].map(island=>({pathname:'/shelf',params:{island}})), {pathname:'/learn',params:{game:'hafa-adai'}}]);
  await act(()=>screen.unmount());
 });
 it('renders every catalog item in All games, all six illustrated places, Inside Home shortcuts for Closet and Badge Wall, and editable favorites', async () => {
  fixture.store.save=emptySave(); fixture.params={}; let screen!:ReactTestRenderer;
  await act(()=>{ screen=create(<Everything/>); });
  const all=screen.root.findByProps({testID:'all-games'});
  expect(all.findAll(n=>n.type==='button' && n.props.accessibilityRole==='button').map(n=>n.props.accessibilityLabel)).toEqual(shelfGames.map(game=>`Play ${game.name}`));
  expect(screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel?.startsWith('Visit '))).toHaveLength(6);
  // All six map places render their approved storybook WebPs with zero vector fallback doors.
  expect(screen.root.findAll(n=>n.type==='img').map(n=>n.props.source)).toEqual(['learn','library','arcade','game-hall','home','puzzles'].map(door=>`assets/art/map/${door}.webp`));
  // Closet and Badge Wall stay discoverable under Inside Home and route directly to their Home sheets.
  const closet = screen.root.findByProps({ testID: 'home-shortcut-locker' });
  const badges = screen.root.findByProps({ testID: 'home-shortcut-badges' });
  await act(() => closet.props.onPress());
  expect(fixture.push).toHaveBeenLastCalledWith('/locker');
  await act(() => badges.props.onPress());
  expect(fixture.push).toHaveBeenLastCalledWith('/badges');
  const star=all.findAll(n=>n.type==='button' && n.props.label?.startsWith('Favorite '))[0];
  await act(()=>star.props.onPress()); expect(fixture.store.toggleGameFavorite).toHaveBeenLastCalledWith(shelfGames[0].id);
  await act(()=>screen.unmount());
 });
 it('opens Favorites directly and provides an honest empty state', async()=>{
  fixture.params={section:'favorites'}; fixture.store.save=emptySave(); let screen!:ReactTestRenderer;
  await act(()=>{screen=create(<Everything/>);});
  expect(JSON.stringify(screen.toJSON())).toContain('Tap a star beside a game');
  expect(screen.root.findAll(n=>n.props.testID==='all-games')).toHaveLength(0);
  await act(()=>screen.unmount());
 });
});
