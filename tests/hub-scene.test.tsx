import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IslandScene } from '../src/hub/IslandScene';
import {
  guideStartPoint,
  guideWaypoints,
  mapLayout,
  SAND_PATH_RADIUS,
  TERRAIN_VIEWBOX,
  terrainBranches,
  terrainPathData,
  type PathSegment,
  type Point,
} from '../src/hub/model';
import { defaultLook } from '../src/islander/look';
import { wordWidth } from '../src/components/wordFit';
vi.mock('../src/hub/foreground', () => ({ useAppForeground: () => true }));
vi.mock('react-native', () => ({ View:'div', Pressable:'button', Image:'img', Platform:{OS:'web'} }));
const motion = vi.hoisted(() => ({ values: [] as { value: number; get: () => number; set: (value: number) => void }[] }));
vi.mock('react-native-reanimated', async () => {
 const { useRef } = await import('react');
 return { default:{View:'div',createAnimatedComponent:(c:unknown)=>c},cancelAnimation:vi.fn(),Easing:{out:()=>null,cubic:null},
  useSharedValue:(initial:number)=>{
   const ref = useRef<{ value:number; get:()=>number; set:(value:number)=>void } | null>(null);
   if (!ref.current) { const shared = {value:initial,get:()=>shared.value,set:(value:number)=>{shared.value=value;}}; ref.current=shared; motion.values.push(shared); }
   return ref.current;
  },useAnimatedStyle:()=>({}),withTiming:(value:number)=>value,withSequence:(...values:number[])=>values.at(-1),withDelay:(_:number,value:number)=>value };
});
afterEach(()=>{vi.useRealTimers();motion.values=[];});
vi.mock('../src/components/ui', () => ({ C:{},font:undefined }));
vi.mock('../src/components/Text', () => ({ Text:'span' }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/islander', () => ({ Islander:()=>null }));
vi.mock('../src/hub/Terrain', () => ({ Terrain:()=>null }));
vi.mock('../src/hub/IslandLife', () => ({ IslandLife:()=>null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
describe('six-door illustrated island map', () => {
 it('renders exactly six illustrated doors and zero locker/badges SVG doors', async () => {
  let screen!: ReactTestRenderer;
  await act(() => { screen = create(<IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active door={null} onArrive={vi.fn()}/>); });
  const doors = screen.root.findAll(n => n.type === 'button' && typeof n.props.testID === 'string' && n.props.testID.startsWith('place-'));
  expect(doors.map(n => n.props.testID)).toEqual(['place-school', 'place-library', 'place-arcade', 'place-hall', 'place-home', 'place-cove']);
  expect(screen.root.findAll(n => n.props.testID === 'place-locker' || n.props.testID === 'place-badges')).toHaveLength(0);
  const art = screen.root.findAll(n => n.type === 'img' && n.props.testID === 'illustrated-art');
  expect(art).toHaveLength(6);
  expect(art.map(n => n.props.source)).toEqual(['learn', 'library', 'arcade', 'game-hall', 'home', 'puzzles'].map(door => `assets/art/map/${door}.webp`));
  expect(screen.root.findAll(n => n.type === 'svg')).toHaveLength(0);
  await act(() => screen.unmount());
 });
});
describe('visible map input during route/sheet settling',()=>{
 it('opens a place immediately even while idle motion is paused by a closing sheet',async()=>{
  const open=vi.fn();let screen!:ReactTestRenderer;
  await act(()=>{screen=create(<IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active={false} door="school" onArrive={open}/>);});
  const home=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel==='Visit Home')[0];
  await act(()=>home.props.onPress()); expect(open).toHaveBeenCalledExactlyOnceWith('home');
  await act(()=>screen.unmount());
 });
});

describe('departure camera lifetime',()=>{
 it('holds the zoom through door acceptance and blur, then resets on return at that door',async()=>{
  vi.useFakeTimers(); let screen!:ReactTestRenderer;
  const open=vi.fn();
  const props={width:390,height:710,fontScale:1,look:defaultLook,reduced:false,onArrive:open};
  await act(()=>{screen=create(<IslandScene {...props} active door={null}/>);});
  const home=screen.root.findAll(n=>n.type==='button' && n.props.accessibilityLabel==='Visit Home')[0];
  await act(()=>home.props.onPress());
  const [x,y,,zoom,cameraX,cameraY]=motion.values;
  expect(zoom.get()).toBe(1.16);
  const camera=[zoom.get(),cameraX.get(),cameraY.get()];
  await act(()=>{vi.advanceTimersByTime(540);});
  expect(open).toHaveBeenCalledExactlyOnceWith('home');
  const door=[x.get(),y.get()];
  // HubScreen accepts the door in the same callback that pushes the Router route.
  await act(()=>screen.update(<IslandScene {...props} active door="home"/>));
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual(camera);
  // Native blur precedes the end of the outgoing screen's visible transition.
  await act(()=>screen.update(<IslandScene {...props} active={false} door="home"/>));
  await act(()=>{vi.advanceTimersByTime(1000);});
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual(camera);
  await act(()=>screen.update(<IslandScene {...props} active door="home"/>));
  expect([zoom.get(),cameraX.get(),cameraY.get()]).toEqual([1,0,0]);
  expect([x.get(),y.get()]).toEqual(door);
  expect(open).toHaveBeenCalledTimes(1);
  await act(()=>screen.unmount());
 });
});

function distToSegment(p: Point, [a, b]: PathSegment): number {
 const dx = b.x - a.x, dy = b.y - a.y;
 const lenSq = dx * dx + dy * dy;
 if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
 const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
 return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function parseSvgSegments(d: string): PathSegment[] {
 const segments: PathSegment[] = [];
 for (const match of d.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)L(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)) {
  segments.push([
   { x: Number(match[1]), y: Number(match[2]) },
   { x: Number(match[3]), y: Number(match[4]) },
  ]);
 }
 return segments;
}

describe('shared sandy footpaths and guide waypoints', () => {
 const cases: [number, number, number][] = [
  [320, 378, 1], [844, 250, 1],
  [320, 568, 1], [320, 568, 1.5], [320, 568, 2],
  [390, 844, 1], [390, 844, 1.5], [390, 844, 2],
  [844, 390, 1], [844, 390, 1.5], [844, 390, 2],
  [1024, 768, 1], [1024, 768, 1.5], [1024, 768, 2],
 ];

 it.each(cases)('keeps every sampled point of start-to-door and door-to-door walks strictly inside the sand path at %s×%s / fontScale %s', (width, height, fontScale) => {
  const layout = mapLayout(width, height, fontScale);
  const branches = terrainBranches(layout, width, height);
  const svgSegments = parseSvgSegments(terrainPathData(layout, width, height));
  expect(svgSegments).toHaveLength(branches.length);

  const sx = TERRAIN_VIEWBOX.width / width;
  const sy = TERRAIN_VIEWBOX.height / height;
  const minSandRadiusPt = SAND_PATH_RADIUS * Math.min(width / TERRAIN_VIEWBOX.width, height / TERRAIN_VIEWBOX.height);
  const start = guideStartPoint(layout, width, height);
  const origins: { label: string; point: Point }[] = [
   { label: 'start', point: start },
   ...layout.targets.map(target => ({ label: target.id, point: target.door })),
  ];

  const SAMPLES_PER_SEGMENT = 24;
  for (const origin of origins) {
   for (const dest of layout.targets) {
    const waypoints = guideWaypoints(origin.point, dest.door, layout, width, height);
    expect(waypoints[0]).toEqual(origin.point);
    expect(waypoints[waypoints.length - 1]).toEqual(dest.door);

    const sampled: Point[] = waypoints.length === 1 ? [waypoints[0]] : [];
    for (let i = 0; i < waypoints.length - 1; i++) {
     const a = waypoints[i], b = waypoints[i + 1];
     for (let step = 0; step <= SAMPLES_PER_SEGMENT; step++) {
      const t = step / SAMPLES_PER_SEGMENT;
      sampled.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
     }
    }

    for (const pt of sampled) {
     const distPt = Math.min(...branches.map(seg => distToSegment(pt, seg)));
     expect(distPt, `${origin.label} -> ${dest.id} at (${pt.x}, ${pt.y})`).toBeLessThan(minSandRadiusPt);
     expect(distPt, `${origin.label} -> ${dest.id} centerline match`).toBeLessThanOrEqual(0.02);

     const svgPt: Point = { x: pt.x * sx, y: pt.y * sy };
     const distSvg = Math.min(...svgSegments.map(seg => distToSegment(svgPt, seg)));
     expect(distSvg, `${origin.label} -> ${dest.id} SVG radius`).toBeLessThan(SAND_PATH_RADIUS);
     expect(distSvg, `${origin.label} -> ${dest.id} SVG centerline`).toBeLessThanOrEqual(0.05);
    }
   }
  }
 });

 it.each(cases)('wraps door labels cleanly inside labelHeight and target width at %s×%s / fontScale %s', async (width, height, fontScale) => {
  const layout = mapLayout(width, height, fontScale);
  let screen!: ReactTestRenderer;
  await act(() => {
   screen = create(<IslandScene width={width} height={height} fontScale={fontScale} look={defaultLook} reduced={false} active door={null} onArrive={vi.fn()}/>);
  });

  const effectiveScale = Math.min(fontScale, 1.3);
  for (const target of layout.targets) {
   const pill = screen.root.findByProps({ testID: `place-label-${target.id}` });
   const text = pill.findByType('span');
   expect(text.props.numberOfLines, target.id).toBe(2);
   expect(text.props.maxFontSizeMultiplier, target.id).toBe(1.3);

   const pillStyle = pill.props.style as { minHeight: number; paddingHorizontal: number; paddingVertical: number; borderWidth: number };
   const textStyle = (Array.isArray(text.props.style) ? Object.assign({}, ...text.props.style) : text.props.style) as { fontSize: number; lineHeight: number };
   const innerWidth = target.labelWidth - pillStyle.paddingHorizontal * 2 - pillStyle.borderWidth * 2;
   const drawnFontSize = textStyle.fontSize * effectiveScale;
   const drawnLineHeight = textStyle.lineHeight * effectiveScale;

   for (const word of target.name.split(' ')) {
    expect(wordWidth(word) * drawnFontSize, `${target.id} word "${word}" in ${innerWidth}px`).toBeLessThanOrEqual(innerWidth);
   }
   const lines = target.name.includes(' ') && wordWidth(target.name) * drawnFontSize > innerWidth ? 2 : 1;
   const neededHeight = lines * drawnLineHeight + pillStyle.paddingVertical * 2 + pillStyle.borderWidth * 2;
   expect(neededHeight, `${target.id} height (${lines} lines) vs labelHeight ${layout.labelHeight}`).toBeLessThanOrEqual(layout.labelHeight);
  }

  await act(() => screen.unmount());
 });
});

describe('wide horizontal crossroads', () => {
 it.each([[844,250],[1024,628]])('rests between columns on the horizontal sand spine at %s×%s', (width,height) => {
  const layout = mapLayout(width,height), start = guideStartPoint(layout,width,height);
  const school = layout.targets.find(t => t.id === 'school')!;
  const library = layout.targets.find(t => t.id === 'library')!;
  expect(start.x).toBe((school.door.x + library.door.x) / 2);
  const ys = layout.targets.map(t => t.door.y);
  expect(start.y).toBe((Math.min(...ys) + Math.max(...ys)) / 2);
  expect(terrainBranches(layout,width)[0].every(p => p.y === start.y)).toBe(true);
  for (const target of layout.targets) {
   const size = Math.min(96,width*.24,height*.20);
   expect(start.x-size*.303 < target.left+target.width && target.left < start.x+size*.304 && start.y-size < target.top+target.height && target.top < start.y).toBe(false);
  }
 });
 it.each([[1024, 627], [844, 249], [568, 245], [390, 653], [320, 377]])('keeps the resting guide clear of label pills at %s×%s', (width, height) => {
  const layout = mapLayout(width, height);
  const start = guideStartPoint(layout, width, height);
  const gap = layout.wide ? Infinity : Math.min(...layout.targets.filter(t => t.x > .5).map(t => t.x * width - t.labelWidth / 2)) - Math.max(...layout.targets.filter(t => t.x < .5).map(t => t.x * width + t.labelWidth / 2));
  const size = Math.max(28, Math.min(96, width * .24, height * .20, (gap - 8) / .607));
  for (const t of layout.targets) {
   const horizontal = Math.min(start.x + size * .304, t.x * width + t.labelWidth / 2) - Math.max(start.x - size * .303, t.x * width - t.labelWidth / 2);
   const vertical = Math.min(start.y, t.top + t.height) - Math.max(start.y - size, t.baseline);
   expect(Math.max(0, horizontal) * Math.max(0, vertical)).toBe(0);
  }
 });

});
