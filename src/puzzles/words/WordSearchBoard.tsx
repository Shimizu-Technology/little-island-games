import { BoardTouchView } from '../../gestures/BoardPan';
import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, TextInput, View, useWindowDimensions, type GestureResponderEvent, type NativeTouchEvent } from 'react-native';
import Svg, { Circle, Line, SvgXml } from 'react-native-svg';
import { Button, C, Copy, Heading } from '../../components/ui';
import { Text } from '../../components/Text';
import { useSoundControls } from '../../components/Audio';
import { SearchPicturesContext } from './picture-context';
import { GridFeedback, GridInteraction } from '../grid/preferences';
import { nearestCell } from '../grid/model';
import { foundIndex, dragRay, hintFor, hintWord, snapWord, type Direction } from './core';
import type { Action, State } from './game';
import { atLarge, wordFitMultiplier, wordWidth } from '../../components/wordFit';
import { SearchChrome, searchLayout } from './layout';
import { themes } from './themes.json';
const colors = ['#28796B', '#8A4D81'], hunterNames = ['Green', 'Purple'] as const, hintColor = '#B7791F', easyColumns = 6;
function WordPicture({ spelling, size = 64, optional = false, hasAudio = true }: { spelling: string; size?: number; optional?: boolean; hasAudio?: boolean }) {
  const pictures = useContext(SearchPicturesContext), id = pictures.idFor(spelling), [loaded, setLoaded] = useState<{id:string;xml:string}>();
  useEffect(() => { let live = true; if (id) void pictures.load(id).then(xml => { if (live) setLoaded({id,xml}); }).catch(() => {}); return () => { live = false; }; }, [id, pictures]);
  if (optional && !id) return null;
  return loaded && loaded.id===id ? <SvgXml xml={loaded.xml} width={size} height={size} accessible={false}/> : <View accessible accessibilityLabel={hasAudio ? 'Picture unavailable. Use Hear word.' : 'Picture unavailable.'} style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.sand, alignItems: 'center', justifyContent: 'center' }}><Text maxFontSizeMultiplier={1}>◇</Text></View>;
}
const LetterCell = memo(function LetterCell({ letter, index, size, selected, focused, tap, described }: { letter: string; index: number; size: number; selected: boolean; focused: boolean; tap: (i: number) => void; described: string }) {
  return <View accessible accessibilityRole="button" accessibilityLabel={described} accessibilityState={{ selected }} onAccessibilityTap={() => tap(index)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderWidth: selected || focused ? 2 : 0, borderColor: selected ? C.gold : C.blue, borderStyle: selected ? 'solid' : 'dashed' }}><Text maxFontSizeMultiplier={1.15} style={{ color: C.ink, fontSize: size * (letter.length > 1 ? .42 : .5), fontWeight: '700' }}>{letter}</Text></View>;
});
type Pointer = { start: number; last: number; direction: Direction | null; cells: number[]; hunter: 0 | 1; moved: boolean; origin: { x: number; y: number } };
export type WordSearchBoardProps = { state: State; dispatch: (a: Action) => void; active: boolean; width: number; together?: boolean; resetKey?: string };
/** Each native pointer has its own ray and hunter. No score or race is computed. */
export function WordSearchBoard({ state, dispatch, active, width, together = false, resetKey }: WordSearchBoardProps) {
  const p = state.puzzle, { width: screenWidth, height, fontScale = 1 } = useWindowDimensions(), tablet = Math.min(screenWidth, height) >= 600;
  const chrome = useContext(SearchChrome), [hunter, setHunter] = useState<0 | 1>(0), [panning, setPanning] = useState(false), [cursor, setCursor] = useState(0), [keyboardMode, setKeyboardMode] = useState(false), [windowTop, setWindowTop] = useState<number>();
  const keyboard = useRef<TextInput>(null), container = useRef<View>(null), previousLayout = useRef('');
  const measureHost = useCallback(() => {
    container.current?.measureInWindow((_x, y) => { if (Number.isFinite(y)) setWindowTop(Math.max(0, y)); });
  }, []);
  useLayoutEffect(() => { measureHost(); }, [measureHost, width, height, fontScale, resetKey]);
  useEffect(() => { if (!active) keyboard.current?.blur(); }, [active]);
  const cap = atLarge(fontScale, 1.3), copyCap = atLarge(fontScale, 1.5);
  const feedback = useContext(GridFeedback), interaction = useContext(GridInteraction), sound = useSoundControls(active);
  const [first, setFirst] = useState<[number | null, number | null]>([null, null]), [previews, setPreviews] = useState<Pointer[]>([]), [zoom, setZoom] = useState(false), [notice, setNotice] = useState(''), [screenReader, setScreenReader] = useState(false);
  const pointers = useRef(new Map<string, Pointer>()), frame = useRef<View>(null), accepted = useRef(state.edits), firstRef = useRef(first);
  const rows = p.cells.length, columns = p.cells[0].length, pictures = useContext(SearchPicturesContext);
  // Easy boards offer a picture beside any word that has one; picture rounds show them for every word.
  const optionalPictures = p.list === 'words' && columns <= easyColumns, hasPicture = (spelling: string) => p.list === 'pictures' || optionalPictures && !!pictures.idFor(spelling);
  const anyPicture = p.words.some(w => hasPicture(w.spelling));
  const layout = searchLayout(width, height, fontScale, columns, rows, anyPicture, together, windowTop === undefined ? chrome : { top: windowTop, bottom: chrome.bottom, bar: 0 }, p.words.some(w => w.audio !== null));
  const size = zoom ? Math.max(44, layout.size) : layout.size, needsZoom = layout.size < 44;
  const currentHunter = together ? tablet ? hunter : state.turn : 0;
  const interactionRef = useRef(interaction);
  useLayoutEffect(() => {interactionRef.current=interaction;},[interaction]);
  useEffect(() => { if (state.edits > accepted.current) feedback(); accepted.current = state.edits; }, [state.edits, feedback]);
  useEffect(() => { void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader); const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader); return () => sub.remove(); }, []);
  const cancel = () => { pointers.current.clear(); setPreviews([]); interaction(false); };
  // Geometry/identity changes cancel native touches before another endpoint can be accepted.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the external touch session at this boundary.
  useEffect(() => { pointers.current.clear(); firstRef.current=[null,null]; setPreviews([]); setFirst([null,null]); setNotice(''); interaction(false); }, [resetKey, width, active, interaction, p]);
  useEffect(() => () => { interactionRef.current(false); }, []);
  const chooseFirst = useCallback((h: 0 | 1, value: number | null) => {
    const next: [number | null, number | null] = [...firstRef.current]; next[h] = value; firstRef.current = next; setFirst(next);
  }, []);
  const tap = useCallback((i: number, h: 0 | 1 = currentHunter) => {
    if (!active) return;
    setCursor(i); keyboard.current?.focus();
    const start = firstRef.current[h];
    if (start === null) { chooseFirst(h, i); setNotice('Now tap the last letter.'); }
    else { chooseFirst(h, null); if (start === i) { setNotice(''); return; } const word = foundIndex(p, start, i);
      if (word < 0) setNotice('Not a word. Try again.');
      else if (state.found.some(([j]) => j === word)) setNotice('Already found.');
      else { dispatch(['find', start, i, h]); setNotice(''); }
    }
  }, [active, currentHunter, p, state.found, dispatch, chooseFirst]);
  // Ring and direction come only from hints the engine has accepted (and so recorded as help).
  const target = hintWord(p, state.found), level = target < 0 ? 0 : state.hints[target], hinting = level > 0 ? hintFor(p, state.found, level as 1 | 2) : null, message = notice || hinting?.text || '';
  const askHint = () => { if (!active || target < 0) return; setNotice(''); dispatch(level === 2 ? ['help'] : ['hint']); };
  const spoken = `${state.found.length === p.words.length ? 'Every word found.' : `${state.found.length} of ${p.words.length} words found.`}${message ? ` ${message}` : ''}`;
  const lastSpoken = useRef(''), announcedFound = useRef(state.found.map(([i]) => i));
  useEffect(() => {
    const added = state.found.filter(([i]) => !announcedFound.current.includes(i));
    if (screenReader && spoken !== lastSpoken.current) AccessibilityInfo.announceForAccessibility?.(added.length ? `Found ${added.map(([i]) => p.words[i].spelling).join(', ')}. ${spoken}` : spoken);
    announcedFound.current = state.found.map(([i]) => i); lastSpoken.current = spoken;
  }, [spoken, screenReader, state.found, p]);
  const keyAction = useCallback((key: string) => {
    if (!active) return false;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'].includes(key)) return false;
    setKeyboardMode(true);
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (key in delta) { setCursor(c => Math.max(0, Math.min(rows * columns - 1, c + delta[key]))); return true; }
    if (key === ' ' || key === 'Enter') { tap(cursor); return true; }
    if (key === 'Escape') { chooseFirst(currentHunter, null); setNotice(''); return true; }
    return false;
  }, [active, columns, rows, tap, cursor, chooseFirst, currentHunter]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const handler = (e: KeyboardEvent) => { const target = e.target as HTMLElement | null; if (!target?.closest('[data-testid="word-search-keyboard"]') || e.altKey) return;
      if (e.metaKey || e.ctrlKey) { if (e.key.toLowerCase() === 'z') { e.preventDefault(); setNotice(''); dispatch([e.shiftKey ? 'redo' : 'undo']); } }
      else if (keyAction(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, [active, keyAction, dispatch]);
  const cellAt = (t: NativeTouchEvent) => nearestCell(t.locationX, t.locationY, size, { rows, columns });
  function begin(e: GestureResponderEvent) {
    if (!active || screenReader || panning) return;
    setKeyboardMode(false);
    for (const t of e.nativeEvent.changedTouches) {
      if (pointers.current.has(String(t.identifier)) || pointers.current.size >= (tablet && together ? 2 : 1)) continue;
      const start = cellAt(t), occupied = new Set([...pointers.current.values()].map(x => x.hunter));
      const hunter = together && tablet && occupied.has(currentHunter) ? (currentHunter === 0 ? 1 : 0) : currentHunter;
      pointers.current.set(String(t.identifier), { start, last: start, direction: null, cells: [start], hunter, moved: false, origin: { x: t.locationX, y: t.locationY } });
    }
    interaction(pointers.current.size > 0); setPreviews([...pointers.current.values()]);
  }
  function move(e: GestureResponderEvent) {
    for (const t of e.nativeEvent.changedTouches) {
      const pointer = pointers.current.get(String(t.identifier)); if (!pointer) continue;
      const ray = dragRay(pointer.start, pointer.origin, { x: t.locationX, y: t.locationY }, size, columns, rows, pointer.direction);
      if (ray.direction !== null) pointer.moved = true;
      pointer.direction = ray.direction; pointer.cells = ray.cells; pointer.last = ray.cells.at(-1)!;
    }
    setPreviews([...pointers.current.values()]);
  }
  function end(e: GestureResponderEvent) {
    const finds: [number, number, 0 | 1][] = [];
    for (const t of e.nativeEvent.changedTouches) {
      const pointer = pointers.current.get(String(t.identifier)); if (!pointer) continue;
      const ray = dragRay(pointer.start, pointer.origin, { x: t.locationX, y: t.locationY }, size, columns, rows, pointer.direction);
      pointers.current.delete(String(t.identifier));
      if (pointer.moved || ray.cells.length > 1) {
        if (ray.cells.length > 1) { const last = ray.cells.at(-1)!, near = foundIndex(p, pointer.start, last) < 0 ? snapWord(p, state.found, pointer.start, ray.direction, ray.cells.length) : null; finds.push([pointer.start, near?.end ?? last, pointer.hunter]); }
        chooseFirst(pointer.hunter, null);
      }
      else tap(pointer.start, pointer.hunter);
    }
    if (finds.length) {const fresh=finds.filter(([start,end])=>{const i=foundIndex(p,start,end);return i>=0 && !state.found.some(([j])=>j===i);});if(fresh.length){dispatch(['find-many',fresh]);setNotice('');}else setNotice(finds.some(([a,b])=>foundIndex(p,a,b)>=0) ? 'Already found.' : 'Not a word. Try again.');}
    setPreviews([...pointers.current.values()]); interaction(pointers.current.size > 0);
  }
  const path = (cells: number[], hunter: 0 | 1, key: string, preview = false) => {
    const a = cells[0], b = cells.at(-1)!, x1 = (a % columns + .5) * size, y1 = (Math.floor(a / columns) + .5) * size, x2 = (b % columns + .5) * size, y2 = (Math.floor(b / columns) + .5) * size;
    return <React.Fragment key={key}><Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors[hunter]} strokeWidth={size * .8} strokeLinecap="round" opacity={preview ? .28 : .3}/><Line x1={x1} y1={y1 + size * .3} x2={x2} y2={y2 + size * .3} stroke={colors[hunter]} strokeWidth={2.5} strokeDasharray={hunter ? '2 5' : undefined}/>{hunter === 1 && <Circle cx={x1} cy={y1} r={size * .35} fill="none" stroke={colors[1]} strokeWidth={1.5} strokeDasharray="2 4"/>}</React.Fragment>;
  };
  const hintMark = () => {
    if (!hinting) return null;
    const at = (c: number) => ({ x: (c % columns + .5) * size, y: (Math.floor(c / columns) + .5) * size }), from = at(hinting.cell), to = hinting.next === null ? null : at(hinting.next);
    return <React.Fragment key="hint"><Circle cx={from.x} cy={from.y} r={size * .46} fill="none" stroke={hintColor} strokeWidth={3}/>{to && <><Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={hintColor} strokeWidth={4} strokeLinecap="round"/><Circle cx={to.x} cy={to.y} r={size * .14} fill={hintColor}/></>}</React.Fragment>;
  };
  const list = p.list, allFound = state.found.length === p.words.length;
  const title = themes.find(t => t.id === p.theme)?.title ?? p.theme;
  const hunterCue = together && (tablet ? null : <View testID="search-turn" accessible={false} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 2, borderColor: colors[state.turn], borderStyle: state.turn ? 'dotted' : 'solid' }}><Copy maxFontSizeMultiplier={copyCap} style={{ color: colors[state.turn] }}>{`${hunterNames[state.turn]}'s turn`}</Copy></View>);
  const hunters = together && tablet && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{hunterNames.map((name, h) => <Button key={name} maxFontSizeMultiplier={cap} quiet compact selected={hunter === h} label={`${name} hunter, ${h ? 'dotted' : 'solid'} trail`} style={{ minHeight: 48, backgroundColor: hunter === h ? colors[h] : C.cream, borderColor: colors[h], borderStyle: h ? 'dotted' : 'solid', borderWidth: 2 }} textStyle={{ color: hunter === h ? C.paper : colors[h] }} onPress={() => setHunter(h as 0 | 1)}>{name}</Button>)}</View>;
  const viewportTools = needsZoom && <View testID="search-viewport-tools" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button maxFontSizeMultiplier={cap} quiet compact selected={zoom} onPress={() => { cancel(); setZoom(!zoom); setPanning(false); }}>{zoom ? 'Fit whole grid' : 'Enlarge letters'}</Button>{zoom && <Button maxFontSizeMultiplier={cap} quiet compact selected={panning} onPress={() => { cancel(); setPanning(!panning); }}>{panning ? 'Choose letters' : 'Move grid'}</Button>}</View>;
  const answerWidth = layout.large ? (layout.beside ? layout.listWidth - 24 : Math.min(width - 24, 240)) : width - 24;
  const pictureRow = layout.large && anyPicture, fitWidth = Math.max(32, answerWidth - (pictureRow ? 72 : 0));
  const answerSize = layout.large ? Math.min(16, ...p.words.map(w => fitWidth * .92 / Math.max(1, wordWidth(`✓ ${w.spelling}`)))) : 16;
  const ceiling = layout.short ? 1.3 : 1.5;
  const answerMax = atLarge(fontScale, Math.min(ceiling, ...p.words.map(w => Math.max(1, Math.floor(fitWidth * .92 / (wordWidth(`✓ ${w.spelling}`) * answerSize) * 100) / 100))));
  const board = <ScrollView keyboardShouldPersistTaps="handled" horizontal scrollEnabled={zoom && panning} style={{ maxWidth: layout.boardWidth, flexGrow: 0 }}>
    <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={zoom && panning} style={{ maxHeight: zoom ? layout.size * rows + 2 : undefined }}>
    <BoardTouchView multiTouch={tablet && together} enabled={active && !screenReader && !panning} ref={frame} testID="search-grid" onStartShouldSetResponder={() => active && !screenReader && !panning} onMoveShouldSetResponder={() => active && !screenReader && !panning} onResponderGrant={begin} onResponderStart={begin} onResponderMove={move} onResponderEnd={end} onResponderRelease={end} onResponderTerminate={cancel} onResponderTerminationRequest={() => false} style={{ ...(Platform.OS === 'web' && !panning ? { touchAction: 'none' as const } : {}), width: size * columns + 2, height: size * rows + 2, backgroundColor: '#FFFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#D7DBCC', overflow: 'hidden' }}>
      <View pointerEvents={screenReader ? 'auto' : 'none'} style={{ width: size * columns, flexDirection: 'row', flexWrap: 'wrap' }}>{p.cells.flat().map((letter, i) => <LetterCell key={i} letter={letter} index={i} size={size} selected={first.includes(i)} focused={keyboardMode && cursor === i} tap={tap} described={`Row ${Math.floor(i / columns) + 1}, column ${i % columns + 1}, ${letter}${state.found.some(([w]) => p.words[w].cells.includes(i)) ? ', found trail' : ''}`}/>)}</View>
      <View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 1, top: 1 }}><Svg width={size * columns} height={size * rows}>{state.found.map(([w, h]) => path(p.words[w].cells, h, `found-${w}`))}{previews.map((v, i) => path(v.cells, v.hunter, `pointer-${i}`, true))}{first.flatMap((cell,h) => cell === null ? [] : [path([cell], h as 0 | 1, `first-${h}`, true)])}{hintMark()}</Svg></View>
    </BoardTouchView></ScrollView>
  </ScrollView>;
  // Each word is a pill: crossed off once found, in its hunter's colour.
  const answers = p.words.map((w, i) => { const found = state.found.find(([j]) => j === i), pic = hasPicture(w.spelling); return <View key={w.id} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: pic ? 20 : 999, backgroundColor: found ? '#E4EFE9' : '#F1EDDF', borderWidth: found ? 2 : 0, borderStyle: found?.[1] === 1 ? 'dotted' : 'solid', borderColor: colors[found?.[1] ?? 0], gap: pictureRow ? 8 : 4, flexDirection: pictureRow ? 'row' : 'column', alignItems: pictureRow ? 'center' : undefined, width: layout.large ? answerWidth + 20 : undefined, maxWidth: layout.large ? layout.listWidth : width }}>
      {pic && <WordPicture spelling={w.spelling} optional={optionalPictures} hasAudio={w.audio !== null} size={layout.large ? Math.max(64, 16 * Math.min(fontScale, answerMax ?? 1.5) * 2) : 64}/>}
      <View style={{ gap: 4, flex: pictureRow ? 1 : undefined }}><Copy style={{ ...(layout.large ? { fontSize: answerSize } : {}), ...(found ? { textDecorationLine: 'line-through' as const } : {}) }} testID="search-answer" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.4} maxFontSizeMultiplier={answerMax} accessibilityLabel={`${found ? 'Found. ' : ''}${w.spelling}`}>{found ? '✓ ' : ''}{w.spelling}</Copy>
      {w.audio && <Button maxFontSizeMultiplier={cap} quiet compact disabled={!active} label={`Hear ${w.spelling}`} onPress={() => { if (sound.play(w.audio!)) { if (!state.heard) dispatch(['hear', i]); } else setNotice('Could not play that. Your puzzle is kept.'); }}>Hear word</Button>}</View>
    </View>; });
  const wordList = list !== 'hidden' ? layout.large ? <ScrollView keyboardShouldPersistTaps="handled" horizontal={!layout.beside} style={{ maxWidth: layout.listWidth, maxHeight: layout.beside ? Math.max(layout.size * rows + 2, 180) : undefined, flexGrow: 0 }} contentContainerStyle={{ flexDirection: layout.beside ? 'column' : 'row', gap: 8 }}>{answers}</ScrollView> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{answers}</View> : <Copy maxFontSizeMultiplier={copyCap} style={{ maxWidth: layout.listWidth }}>{p.words.length} hidden words</Copy>;
  const status = <Copy maxFontSizeMultiplier={cap} accessibilityLabel={spoken} accessibilityLiveRegion="polite" style={{ minHeight: 33 }}>{message || (allFound ? 'All found!' : `${state.found.length} of ${p.words.length}`)}</Copy>;
  const hintLabel = ['Hint', 'More hint', 'Show word'][level];
  return <View ref={container} testID="word-search-keyboard" onLayout={e => {
    // A height change alone (including scrolling) must not resize a live board.
    const { y, width } = e.nativeEvent.layout, key = `${y}:${width}`;
    if (key !== previousLayout.current) { previousLayout.current = key; measureHost(); }
  }} style={{ gap: layout.large ? 8 : 12 }}>
    {Platform.OS === 'ios' && <TextInput ref={keyboard} testID="search-native-keyboard" accessible={false} importantForAccessibility="no-hide-descendants" showSoftInputOnFocus={false} caretHidden contextMenuHidden autoCorrect={false} autoCapitalize="none" value="" onKeyPress={e => keyAction(e.nativeEvent.key)} onChangeText={() => keyboard.current?.clear()} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, fontSize: 18 }}/>}
    <Heading maxFontSizeMultiplier={atLarge(fontScale, wordFitMultiplier(title, 24, width, layout.short ? 1 : 2))} style={{ fontSize: 24 }}>{title}</Heading>
    {!layout.short && <>{hunterCue}{hunters}</>}
    {layout.large && status}
    {layout.large && viewportTools}
    <View testID="search-board-list" style={{ flexDirection: layout.beside ? 'row' : 'column', alignItems: 'flex-start', gap: 8 }}>{board}{layout.large && wordList}</View>
    {layout.short && <>{hunterCue}{hunters}</>}
    {!layout.large && viewportTools}
    {p.language === 'ch' && state.found.length > 0 && <View style={{ gap: 6 }}>{state.found.map(([i]) => <Copy maxFontSizeMultiplier={copyCap} key={p.words[i].id}>{p.words[i].spelling}</Copy>)}</View>}
    {!layout.large && status}
    {!layout.large && wordList}
    {allFound && p.message && <View style={{ gap: 6 }}><Heading maxFontSizeMultiplier={atLarge(fontScale, 2)} style={{ fontSize: 22 }}>The letters left behind</Heading><Copy maxFontSizeMultiplier={copyCap}>{p.message}</Copy></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button maxFontSizeMultiplier={cap} quiet compact style={{ minHeight: 48 }} disabled={!active || !state.found.length} onPress={() => { setNotice(''); dispatch(['undo']); }}>Undo</Button><Button maxFontSizeMultiplier={cap} quiet compact style={{ minHeight: 48 }} disabled={!active || !state.redo.length} onPress={() => { setNotice(''); dispatch(['redo']); }}>Redo</Button><Button maxFontSizeMultiplier={cap} quiet compact style={{ minHeight: 48 }} disabled={!active || allFound} onPress={askHint}>{hintLabel}</Button>{first.some(v => v !== null) && <Button maxFontSizeMultiplier={cap} quiet compact style={{ minHeight: 48 }} onPress={() => { chooseFirst(currentHunter, null); setNotice(''); }}>Cancel</Button>}</View>
  </View>;
}
