import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, View, useWindowDimensions, type GestureResponderEvent, type NativeTouchEvent } from 'react-native';
import Svg, { Circle, Line, SvgXml } from 'react-native-svg';
import { Button, C, Copy, Heading } from '../../components/ui';
import { Text } from '../../components/Text';
import { useSoundControls } from '../../components/Audio';
import { SearchPicturesContext } from './picture-context';
import { GridFeedback, GridInteraction } from '../grid/preferences';
import { nearestCell } from '../grid/model';
import { foundIndex, snapRay, type Direction } from './core';
import type { Action, State } from './game';
import { themes } from './themes.json';
const colors = ['#28796B', '#8A4D81'];
function WordPicture({ spelling }: { spelling: string }) {
  const pictures = useContext(SearchPicturesContext), id = pictures.idFor(spelling), [loaded, setLoaded] = useState<{id:string;xml:string}>();
  useEffect(() => { let live = true; if (id) void pictures.load(id).then(xml => { if (live) setLoaded({id,xml}); }).catch(() => {}); return () => { live = false; }; }, [id, pictures]);
  return loaded && loaded.id===id ? <SvgXml xml={loaded.xml} width={64} height={64} accessible={false}/> : null;
}
const LetterCell = memo(function LetterCell({ letter, index, size, selected, tap, described }: { letter: string; index: number; size: number; selected: boolean; tap: (i: number) => void; described: string }) {
  return <View accessible accessibilityRole="button" accessibilityLabel={described} accessibilityState={{ selected }} onAccessibilityTap={() => tap(index)} accessibilityActions={[{ name: 'activate', label: 'Choose this letter' }]} onAccessibilityAction={() => tap(index)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderWidth: selected ? 2 : 0, borderColor: C.gold }}><Text maxFontSizeMultiplier={1.15} style={{ color: C.ink, fontSize: size * (letter.length > 1 ? .42 : .5), fontWeight: '700' }}>{letter}</Text></View>;
});
type Pointer = { start: number; last: number; direction: Direction | null; cells: number[]; hunter: 0 | 1; moved: boolean };
export type WordSearchBoardProps = { state: State; dispatch: (a: Action) => void; active: boolean; width: number; together?: boolean; resetKey?: string };
/** Each native pointer has its own ray and hunter. No score or race is computed. */
export function WordSearchBoard({ state, dispatch, active, width, together = false, resetKey }: WordSearchBoardProps) {
  const p = state.puzzle, { width: screenWidth } = useWindowDimensions(), tablet = screenWidth >= 700;
  const feedback = useContext(GridFeedback), interaction = useContext(GridInteraction), sound = useSoundControls(active);
  const [first, setFirst] = useState<number | null>(null), [previews, setPreviews] = useState<Pointer[]>([]), [zoom, setZoom] = useState(false), [notice, setNotice] = useState(''), [screenReader, setScreenReader] = useState(false);
  const pointers = useRef(new Map<string, Pointer>()), frame = useRef<View>(null), accepted = useRef(state.edits), firstRef = useRef(first);
  const rows = p.cells.length, columns = p.cells[0].length, size = Math.floor(zoom ? Math.max(44, Math.min(width, 660) / columns) : Math.min(width, 660) / columns);
  const interactionRef = useRef(interaction);
  useLayoutEffect(() => {interactionRef.current=interaction;},[interaction]);
  useEffect(() => { if (state.edits > accepted.current) feedback(); accepted.current = state.edits; }, [state.edits, feedback]);
  useEffect(() => { void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader); const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader); return () => sub.remove(); }, []);
  const cancel = () => { pointers.current.clear(); setPreviews([]); interaction(false); };
  // Geometry/identity changes cancel native touches before another endpoint can be accepted.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the external touch session at this boundary.
  useEffect(() => { pointers.current.clear(); firstRef.current=null; setPreviews([]); setFirst(null); setNotice(''); interaction(false); }, [resetKey, width, active, interaction, p]);
  useEffect(() => () => { interactionRef.current(false); }, []);
  const tap = useCallback((i: number, hunter = state.turn) => {
    if (!active) return;
    if (firstRef.current === null) { firstRef.current = i; setFirst(i); setNotice('Now choose the last letter.'); }
    else { const start = firstRef.current; firstRef.current = null; setFirst(null); const word=foundIndex(p,start,i);if(word<0)setNotice('Try another straight line.');else if(state.found.some(([j])=>j===word))setNotice('That word is already found.');else {dispatch(['find', start, i, together ? hunter : 0]);setNotice('');} }
  },[active,state,p,together,dispatch]);
  const cellAt = (t: NativeTouchEvent) => nearestCell(t.locationX, t.locationY, size, { rows, columns });
  function begin(e: GestureResponderEvent) {
    if (!active || screenReader) return;
    for (const t of e.nativeEvent.changedTouches) {
      if (pointers.current.has(String(t.identifier)) || pointers.current.size >= (tablet && together ? 2 : 1)) continue;
      const start = cellAt(t), occupied = new Set([...pointers.current.values()].map(x => x.hunter));
      const hunter = together ? tablet ? occupied.has(0) ? 1 : 0 : state.turn : 0;
      pointers.current.set(String(t.identifier), { start, last: start, direction: null, cells: [start], hunter, moved: false });
    }
    interaction(pointers.current.size > 0); setPreviews([...pointers.current.values()]);
  }
  function move(e: GestureResponderEvent) {
    for (const t of e.nativeEvent.changedTouches) {
      const pointer = pointers.current.get(String(t.identifier)); if (!pointer) continue;
      const end = cellAt(t), ray = snapRay(pointer.start, end, columns, rows, pointer.direction);
      if (end !== pointer.start) pointer.moved = true;
      pointer.direction = ray.direction; pointer.cells = ray.cells; pointer.last = ray.cells.at(-1)!;
    }
    setPreviews([...pointers.current.values()]);
  }
  function end(e: GestureResponderEvent) {
    const finds: [number, number, 0 | 1][] = [];
    for (const t of e.nativeEvent.changedTouches) {
      const pointer = pointers.current.get(String(t.identifier)); if (!pointer) continue;
      const ray = snapRay(pointer.start, cellAt(t), columns, rows, pointer.direction);
      pointers.current.delete(String(t.identifier));
      if (pointer.moved || ray.cells.length > 1) { finds.push([pointer.start, ray.cells.at(-1)!, pointer.hunter]); firstRef.current = null; setFirst(null); }
      else tap(pointer.start, pointer.hunter);
    }
    if (finds.length) {const fresh=finds.filter(([start,end])=>{const i=foundIndex(p,start,end);return i>=0 && !state.found.some(([j])=>j===i);});if(fresh.length){dispatch(['find-many',fresh]);setNotice('');}else setNotice('Try another straight line.');}
    setPreviews([...pointers.current.values()]); interaction(pointers.current.size > 0);
  }
  const path = (cells: number[], hunter: 0 | 1, key: string, preview = false) => {
    const a = cells[0], b = cells.at(-1)!, x1 = (a % columns + .5) * size, y1 = (Math.floor(a / columns) + .5) * size, x2 = (b % columns + .5) * size, y2 = (Math.floor(b / columns) + .5) * size;
    return <React.Fragment key={key}><Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors[hunter]} strokeWidth={size * .77} strokeLinecap="round" opacity={preview ? .2 : .16}/><Line x1={x1} y1={y1 + size * .3} x2={x2} y2={y2 + size * .3} stroke={colors[hunter]} strokeWidth={2.5} strokeDasharray={hunter ? '2 5' : undefined}/>{hunter === 1 && <Circle cx={x1} cy={y1} r={size * .35} fill="none" stroke={colors[1]} strokeWidth={1.5} strokeDasharray="2 4"/>}</React.Fragment>;
  };
  const list = p.list, allFound = state.found.length === p.words.length;
  return <View style={{ gap: 12 }}>
    <Heading style={{ fontSize: 24 }}>{themes.find(t=>t.id===p.theme)?.title ?? p.theme}</Heading>
    <Copy>Find the words in a straight line. Drag, or choose the first and last letters.</Copy>
    {together && <Copy>{tablet ? 'Hunt together. One trail is green and solid; the other is purple and dotted.' : `Take turns. ${state.turn === 0 ? 'Green solid' : 'Purple dotted'} trail goes next.`}</Copy>}
    <ScrollView horizontal scrollEnabled={zoom} style={{ maxWidth: width }}><View ref={frame} onStartShouldSetResponder={() => active && !screenReader} onMoveShouldSetResponder={() => active && !screenReader} onResponderGrant={begin} onResponderStart={begin} onResponderMove={move} onResponderEnd={end} onResponderRelease={end} onResponderTerminate={cancel} onResponderTerminationRequest={() => false} style={{ width: size * columns + 2, height: size * rows + 2, backgroundColor: '#FFFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#D7DBCC', overflow: 'hidden' }}>
      <View pointerEvents={screenReader ? 'auto' : 'none'} style={{ width: size * columns, flexDirection: 'row', flexWrap: 'wrap' }}>{p.cells.flat().map((letter, i) => <LetterCell key={i} letter={letter} index={i} size={size} selected={first === i} tap={tap} described={`Row ${Math.floor(i / columns) + 1}, column ${i % columns + 1}, ${letter}${state.found.some(([w]) => p.words[w].cells.includes(i)) ? ', found trail' : ''}`}/>)}</View>
      <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 1, top: 1 }}><Svg width={size * columns} height={size * rows}>{state.found.map(([w, h]) => path(p.words[w].cells, h, `found-${w}`))}{previews.map((v, i) => path(v.cells, v.hunter, `pointer-${i}`, true))}</Svg></View>
    </View></ScrollView>
    {columns > 8 && <Button quiet compact selected={zoom} onPress={() => { cancel(); setZoom(!zoom); }}>{zoom ? 'Fit whole grid' : 'Enlarge letters'}</Button>}
    {p.language === 'ch' && <View style={{ gap: 6 }}><Copy>Teaching spelling · CH and NG each share one cell.</Copy>{p.words.map(w => <Copy key={w.id}>{w.spelling}</Copy>)}</View>}
    <Copy accessibilityLiveRegion="polite">{allFound ? 'Every word found.' : `${state.found.length} of ${p.words.length} words found.`}{notice ? ` ${notice}` : ''}</Copy>
    {list !== 'hidden' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{p.words.map((w, i) => { const found = state.found.find(([j]) => j === i); return <View key={w.id} style={{ padding: 10, borderRadius: 14, backgroundColor: '#F1EDDF', borderWidth: found ? 2 : 0, borderStyle: found?.[1] === 1 ? 'dotted' : 'solid', borderColor: colors[found?.[1] ?? 0], gap: 4, maxWidth: width }}>
      {list === 'pictures' && <WordPicture spelling={w.spelling}/>}
      <Copy>{found ? '✓ ' : ''}{w.spelling}</Copy>
      {w.audio && <Button quiet compact disabled={!active} label={`Hear ${w.spelling}`} onPress={() => { if (sound.play(w.audio!)) dispatch(['hear', i]); else setNotice('The recording could not play. Your puzzle is kept.'); }}>Hear word</Button>}
    </View>; })}</View>}
    {list === 'hidden' && <Copy>The list is hidden. Use the theme to hunt. Help is always here.</Copy>}
    {allFound && p.message && <View style={{ gap: 6 }}><Heading style={{ fontSize: 22 }}>The letters left behind</Heading><Copy>{p.message}</Copy></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button quiet compact disabled={!active || !state.found.length} onPress={() => dispatch(['undo'])}>Undo</Button><Button quiet compact disabled={!active || !state.redo.length} onPress={() => dispatch(['redo'])}>Redo</Button><Button quiet compact disabled={!active} onPress={() => dispatch(['help'])}>Help · find one word</Button>{first !== null && <Button quiet compact onPress={() => { firstRef.current = null; setFirst(null); setNotice(''); }}>Cancel first letter</Button>}</View>
  </View>;
}
