import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CarriedCharacter } from '../src/home/runtime/CarriedCharacter';
import { SceneView } from '../src/home/runtime/SceneView';
import { stagePieces, StageRoom } from '../src/home/art/Stage';
import { pieceAt, pieceMotion, pieceLength, pieceSound } from '../src/home/runtime/SetPieces';
import { labFixtures } from '../src/home/runtime/lab';
import { withPortions } from '../src/home/runtime/portions';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import { emptyDragSlot } from '../src/home/runtime/useInteraction';
import { restingFlagsOf, restingMotionOf } from '../src/home/runtime/restingState';
import { roomDefaultTheme } from '../src/home/art/roomDefaults';
import type { Interaction } from '../src/home/runtime/useInteraction';
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', Text: 'Text', Platform: { OS: 'ios' }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-svg', () => Object.fromEntries(['G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'Pattern', 'LinearGradient', 'Stop'].map((k) => [k, k.toLowerCase()]).concat([['default', 'svg']])));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView', createAnimatedComponent:()=> 'AnimatedGroup' }, useAnimatedProps:(fn:()=>unknown)=>({evaluate:fn}), useSharedValue: (v: any) => React.useRef({ value: v, set(n: any) { this.value = n; }, get() { return this.value; } }).current,
  withTiming: (x: any) => x, ReduceMotion: { System: 'system', Always: 'always', Never: 'never' }, Easing: { linear: (t: number) => t }, useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }),
  useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }), useAnimatedReaction: () => {}, runOnJS: (f: any) => f, runOnUI: (f: any) => f }));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: 'GestureDetector' }));
vi.mock('../src/home/runtime/EntityArt', () => ({ EntityArt: (props: any) => React.createElement('EntityArt', { face: props.faceOverride, carry: !!props.carry, entityId: props.entity.id, preview: !!props.preview, blink: !!props.blink }), artFrame: (e: any) => e.bounds }));
vi.mock('../src/home/runtime/SettleArt', () => ({ SettleArt: () => null }));
vi.mock('../src/home/art/Room', () => ({ RoomArt: () => null, ShoreArt: () => null }));
vi.mock('../src/home/art/More', () => ({ RoomShellArt: () => null, MoreItemArt: () => null }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
vi.mock('../src/home/BuildingArt', () => ({ BuildingArt: () => null, BuildingTrim: () => null, TerraceArt: () => null }));
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('HD-01 the carried friend has glance and smile frames, and exactly one frame shows', () => {
  for (const reduced of [false, true]) it(reduced ? 'under Reduce Motion' : 'normally', async () => {
    const scene = buildScene(labFixtures.delight());
    const friend = Object.values(scene.entities).find((e) => e.character)!;
    const slot = { ...emptyDragSlot(), id: friend.id, ready: true, phase: 'dragging' as const, liftedAt: 1000, lastMoveAt: 1000, lag: 0 };
    const interaction = { slots: { value: [slot, emptyDragSlot()] }, clock: { value: 1000 } } as unknown as Interaction;
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<CarriedCharacter entity={friend} index={0} interaction={interaction} reduced={reduced} />); });
    const frames = tree.root.findAll((n) => String(n.type) === 'AnimatedView');
    const faces = tree.root.findAll((n) => String(n.type) === 'EntityArt').map((n) => n.props.face);
    expect(faces.filter((f) => f === 'surprised')).toHaveLength(1);
    expect(faces.filter((f) => f === 'happy')).toHaveLength(reduced ? 1 : 5);
    expect(frames).toHaveLength(reduced ? 3 : 15);
    const shown = () => frames.filter((f) => f.props.style[1].evaluate().opacity === 1);
    for (const [t, face] of [[1000, 'surprised'], [1240, 'happy'], [2400, 'happy'], [5200, 'happy']] as const) {
      (interaction.clock as any).value = t;
      expect(shown()).toHaveLength(1);
      expect(shown()[0].findByType('EntityArt' as never).props.face).toBe(face);
    }
    slot.lag = 9; (interaction.clock as any).value = 1240;
    expect(shown()).toHaveLength(1);
    await act(async () => tree.unmount());
  });
});

describe('H4 resting friends: moods, the food notice and lamp shadows', () => {
  const render = async (fixture: string, moods: Record<string, any>, notice = false) => {
    const state = labFixtures[fixture](), scene = withPortions(buildScene(state));
    const interaction: any = { slots: { value: [{}, {}] }, camera: { value: { a: 1 } }, acknowledgeLayout: () => {}, acknowledgePose: () => {}, ready: () => {} };
    interaction.restingFlags = { value: restingFlagsOf([], []) };
    interaction.restingMotion = { value: restingMotionOf([], scene.revision, 1, 0, false, {}, null) };
    if (notice) interaction.restingFlags.value.notice = Object.values(scene.entities).filter((e) => e.character).map((e) => ({ id: e.id, dir: 1, food: true }));
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<SceneView state={{ ...state }} scene={scene} building={buildingLayout(4)} viewport={{ width: 402, height: 650 }}
      interaction={interaction as Interaction} pickups={[]} reduced={false} reactions={{}} sleeping={{}} onNode={() => {}} onSelect={() => {}} onMove={() => {}}
      liveRoom={state.current} moods={moods} effects={[{ key: 'crumbs-1', kind: 'crumbs', room: state.current, x: 300, y: 300 }]} />); });
    return { tree, scene };
  };
  it('a mood is drawn on the friend at rest, and is gone with it', async () => {
    const { tree, scene } = await render('delight', {});
    const pip = Object.values(scene.entities).find((e) => e.character?.slot === 1)!;
    const node = () => tree.root.findAll((n) => n.props.testID === 'character-1' && typeof n.type === 'string')[0];
    expect(node().findAll((n) => String(n.type) === 'EntityArt').some((n) => n.props.face === 'happy')).toBe(false);
    await act(async () => tree.update(<SceneView {...(tree.root.findByType(SceneView).props as any)} moods={{ [pip.id]: 'happy' }} />));
    expect(node().findAll((n) => String(n.type) === 'EntityArt').filter((n) => n.props.face === 'happy').length).toBeGreaterThanOrEqual(1);
    await act(async () => tree.unmount());
  });
  it('food carried close opens a waiting friend\'s mouth (the anticipating copy shows)', async () => {
    for (const notice of [false, true]) {
      const { tree } = await render('delight', {}, notice);
      const node = tree.root.findAll((n) => n.props.testID === 'character-1' && typeof n.type === 'string')[0];
      const copies = node.findAll((n) => String(n.type) === 'AnimatedView' && n.props.style?.[1]?.evaluate);
      const anticipate = copies.at(-1)!;
      expect(anticipate.props.style[1].evaluate().opacity).toBe(notice ? 1 : 0);
      await act(async () => tree.unmount());
    }
  });
  it('a lamp shadow is drawn under a friend standing by a lit lamp; effects draw in their room', async () => {
    const { tree, scene } = await render('delight-rest', {});
    const crab = tree.root.findAll((n) => n.props.testID === 'character-2' && typeof n.type === 'string')[0];
    expect(crab.findAll((n) => String(n.type) === 'AnimatedView' && n.props.style?.[0]?.backgroundColor === '#284F4B')).toHaveLength(1);
    void scene;
    expect(tree.root.findAll((n) => n.props.p && n.props.progress).length).toBeGreaterThan(0);
    await act(async () => tree.unmount());
  });
});

describe('a friend who falls asleep never vanishes (found natively during H4)', () => {
  it('the open-eyed art keeps its animated style, and it reads fully visible once the life clock is gone', async () => {
    const state = labFixtures['delight-rest'](), scene = withPortions(buildScene(state));
    const sleeper = Object.values(scene.entities).find((e) => e.character?.slot === 0)!;
    const interaction: any = { slots: { value: [{}, {}] }, camera: { value: { a: 1 } }, acknowledgeLayout: () => {}, acknowledgePose: () => {}, ready: () => {} };
    interaction.restingFlags = { value: restingFlagsOf([], []) };
    interaction.restingMotion = { value: restingMotionOf([], scene.revision, 1, 0, false, {}, null) };
    const props = { state, scene, building: buildingLayout(4), viewport: { width: 402, height: 650 }, interaction: interaction as Interaction, pickups: [],
      reduced: false, reactions: {}, onNode: () => {}, onSelect: () => {}, onMove: () => {}, liveRoom: 'home' };
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(<SceneView {...props} sleeping={{}} />); });
    // The parent of the open-eyed copy (not the closed-eye blink copy, not the anticipating copy).
    const openWrap = () => tree.root.findAll((n) => n.props.testID === 'character-0' && typeof n.type === 'string')[0]
      .findAll((n) => String(n.type) === 'EntityArt' && !n.props.preview && !n.props.blink)
      .map((n) => { let p = n.parent; while (p && String(p.type) !== 'AnimatedView') p = p.parent; return p!; })[0];
    // Awake, mid-blink: the open-eyed copy is hidden by the life clock.
    const life = tree.root.findAll((n) => n.props.life && n.props.entity?.id === sleeper.id)[0].props.life;
    life.value = 7950;
    expect(openWrap().props.style.evaluate().opacity).toBe(0);
    // Asleep: no clock any more. The style must still be there and must show the friend.
    await act(async () => tree.update(<SceneView {...props} sleeping={{ [sleeper.id]: true }} />));
    expect(openWrap().props.style?.evaluate?.().opacity).toBe(1);
    await act(async () => tree.unmount());
  });
});

describe('HC-01 touchable set pieces', () => {
  it('the live room leaves out exactly the pieces it lifts into their own layer', () => {
    for (const room of ['home', 'kitchen', 'treehouse', 'beach'] as const) {
      const still = renderToStaticMarkup(<StageRoom room={room} theme={roomDefaultTheme[room]} />);
      const live = renderToStaticMarkup(<StageRoom room={room} theme={roomDefaultTheme[room]} live />);
      const pieces = stagePieces[room].filter((p) => p.kind !== 'sink').map((p) => renderToStaticMarkup(<svg>{p.draw()}</svg>).replace(/^<svg>|<\/svg>$/g, '')).join('');
      const count = (html: string) => (html.match(/<(rect|path|ellipse|circle)/g) ?? []).length;
      expect(count(live) + count(pieces)).toBe(count(still));
      expect(live.length).toBeLessThan(still.length);
    }
  });
  it('every piece is found where it is drawn, moves, sounds, and comes back to rest', () => {
    for (const room of ['home', 'kitchen', 'treehouse', 'beach'] as const) for (const piece of stagePieces[room]) {
      expect(pieceAt(room, piece.hit.left + piece.hit.width / 2, piece.hit.top + piece.hit.height / 2)?.id).toBe(piece.id);
      expect(pieceSound[piece.kind]).toBeDefined();
      expect(pieceLength[piece.kind]).toBeLessThanOrEqual(1300);
      expect(pieceMotion(piece.kind, 1, false)).toEqual({ deg: 0, dy: 0, opacity: piece.kind === 'sink' ? 0 : 1 });
      if (piece.kind !== 'sink') expect(pieceMotion(piece.kind, 0.3, true).deg).toBe(0);
    }
    // The badge board stays a button of its own. Only the plant's top leaf meets its bottom-right
    // corner, and the screen checks the board before any piece, so the board still wins there.
    for (let x = 524; x <= 680; x += 8) for (let y = 26; y <= 198; y += 8) expect(pieceAt('home', x, y)).toBeUndefined();
  });
});
