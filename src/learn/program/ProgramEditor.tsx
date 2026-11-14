import React, { useContext, useEffect, useState } from 'react';
import { PanResponder, ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, C, Copy, PressableScale } from '../../components/ui';
import { atLarge } from '../../components/wordFit';
import { GridInteraction } from '../../puzzles/grid/preferences';
import { nodeCost, validProgram, type Node, type Program } from './model';
import { address, clone, historyEdit, insertNode, listAt, main, moveNode, removeNode, replaceNode, type EditHistory, type Location } from './edit';

type Card = { code: number; name: string; icon: React.ReactNode; speech?: string };
type Target = { location: Location; before: number; x: number; y: number; width: number; height: number };
type Selection = { location: Location; at: number };
const blockName = (path: string) => path.split('.').filter(part => part !== 'main' && part !== 'body').map(part => part.startsWith('song') ? `Song ${Number(part.slice(4)) + 1}` : part === 'yes' ? 'blocked' : part === 'no' ? 'clear' : String(Number(part) + 1)).join(', inside ');
/** Tap and drag use exactly the same pure edit and admission path. No move saves on a frame. */
export function ProgramEditor({ program, cards, onChange, disabled, hear, condition, currentPath, iteration, onStep, onRestart }: {
  program: Program; cards: Card[]; onChange: (program: Program) => boolean; disabled: boolean;
  hear: (key: string) => void; condition?: string; currentPath?: string; iteration?: number[];
  onStep?: () => void; onRestart?: () => void;
}) {
  const { fontScale } = useWindowDimensions(), cap = atLarge(fontScale, 1.5);
  const [target, setTarget] = useState<Location>(main), [selected, setSelected] = useState<Selection | null>(null);
  const [history, setHistory] = useState<EditHistory>({ past: [], future: [] }), [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false), [over, setOver] = useState<string | null>(null);
  const holdPage = useContext(GridInteraction);
  useEffect(() => { holdPage(dragging); return () => holdPage(false); }, [dragging, holdPage]);
  // Stable imperative drag registry. Only layout/ref callbacks and gesture handlers mutate it;
  // its contents never determine render output (the visible target is ordinary React state).
  const [registry] = useState(() => ({ targets: new Map<string, Target>(), views: new Map<string, View>() }));
  const announce = (key: string) => { hear('tap'); if (key !== 'tap') hear(key); };
  const accept = (candidate: Program | null, speech = 'tap') => {
    if (disabled) return false;
    if (!candidate || !validProgram(candidate)) { setMessage('That edit is too large: 80 blocks, 4 levels, 512 steps. Your plan is kept.'); return false; }
    if (!onChange(candidate)) { setMessage('That plan is too large for this round. Your plan is kept.'); return false; }
    setHistory(h => historyEdit(h, program)); setSelected(null); setMessage(''); announce(speech); return true;
  };
  const insert = (node: Node, drop?: Target, speech?: string) => {
    const location = drop?.location ?? target, list = listAt(program, location);
    if (!list) { setTarget(main); setMessage('Choose a place in the plan.'); return; }
    const at = drop?.before ?? list.length;
    const candidate = !drop && selected ? replaceNode(program, selected.location, selected.at, node) : insertNode(program, location, at, node);
    if (accept(candidate, speech) && (node.kind === 'repeat' || node.kind === 'sequence')) setTarget({ ...(selected?.location ?? location), path: [...(selected?.location ?? location).path, selected?.at ?? at, 'body'] });
  };
  const measure = () => { registry.targets.clear(); for (const [id, ref] of registry.views) ref.measureInWindow((x, y, width, height) => { const entry = JSON.parse(id) as { location: Location; before: number }; registry.targets.set(id, { ...entry, x, y, width, height }); }); };
  const hit = (x: number, y: number) => [...registry.targets.entries()].filter(([, t]) => x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height).sort((a, b) => a[1].width * a[1].height - b[1].width * b[1].height)[0];
  const drag = (node: Node, selection?: Selection) => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => !disabled && Math.abs(g.dx) > 10,
    onPanResponderGrant: () => { measure(); setDragging(true); },
    onPanResponderMove: (_, g) => setOver(hit(g.moveX, g.moveY)?.[0] ?? null),
    onPanResponderRelease: (_, g) => {
      const found = hit(g.moveX, g.moveY)?.[1]; setDragging(false); setOver(null);
      if (!found) { setMessage('Drop on a dashed place in the plan.'); return; }
      if (selection) accept(moveNode(program, selection.location, selection.at, found.location, found.before));
      else insert(node, found, node.kind === 'repeat' ? 'k7-repeat' : undefined);
    },
    onPanResponderTerminate: () => { setDragging(false); setOver(null); },
  }).panHandlers;
  const dropZone = (location: Location, before: number, label: string) => {
    const id = JSON.stringify({ location, before });
    return <View key={`drop-${id}`} ref={ref => { if (ref) registry.views.set(id, ref); else registry.views.delete(id); }} collapsable={false}>
      <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: address(target) === address(location) && !selected }} disabled={disabled}
        onPress={() => { setTarget(location); setSelected(null); setMessage(label); }}
        style={{ minHeight: 44, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: over === id ? C.teal : C.line, backgroundColor: over === id ? C.soft : C.cream, padding: 8, justifyContent: 'center' }}>
        <Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 13 }}>{label}</Copy>
      </PressableScale>
    </View>;
  };
  const render = (nodes: Node[], location: Location): React.ReactNode => <View style={{ gap: 5 }}>
    {nodes.map((node, at) => {
      const path = address(location, at), name = node.kind === 'command' ? cards.find(c => c.code === node.command)?.name ?? 'Card' : node.kind === 'repeat' ? `Repeat ${node.times}` : node.kind === 'call' ? `Song ${node.song + 1}` : node.kind === 'if' ? `If ${condition ?? 'blocked'}` : 'Together';
      const chosen = selected && address(selected.location, selected.at) === path, current = currentPath === path;
      return <View key={path} style={{ padding: 6, gap: 5, borderRadius: 12, backgroundColor: node.kind === 'repeat' ? '#F8E7BB' : C.paper, borderWidth: current ? 3 : 1, borderColor: current ? '#B2381F' : C.line }}>
        <View {...drag(node, { location, at })}>
          <PressableScale accessibilityRole="button" accessibilityLabel={`Block ${blockName(path)}: ${name}${current ? ', current step' : ''}. Tap to change; drag sideways to move.`} accessibilityState={{ selected: !!chosen }} disabled={disabled}
            onPress={() => { setSelected(chosen ? null : { location, at }); announce(node.kind === 'command' ? cards.find(c => c.code === node.command)?.speech ?? 'tap' : node.kind === 'repeat' ? 'k7-repeat' : node.kind === 'call' ? 'k7-song' : 'k7-condition'); }}
            style={{ minHeight: 48, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: chosen ? C.soft : 'transparent', borderRadius: 8 }}>
            {node.kind === 'command' ? cards.find(c => c.code === node.command)?.icon : <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 24 }}>{node.kind === 'repeat' ? '↻' : node.kind === 'call' ? '♫' : '?'}</Copy>}
            <Copy maxFontSizeMultiplier={cap} style={{ flex: 1, fontWeight: '700', color: C.ink }}>{name}{current ? ' ◀' : ''}</Copy>
          </PressableScale>
        </View>
        {(node.kind === 'repeat' || node.kind === 'sequence') && <View style={{ paddingLeft: 6, borderLeftWidth: 3, borderColor: '#94752E', gap: 5 }}>{render(node.body, { ...location, path: [...location.path, at, 'body'] })}{dropZone({ ...location, path: [...location.path, at, 'body'] }, node.body.length, `＋ Inside ${node.kind === 'repeat' ? 'repeat' : 'group'}`)}</View>}
        {node.kind === 'if' && (['yes', 'no'] as const).map(branch => <View key={branch} style={{ paddingLeft: 6, gap: 5 }}><Copy maxFontSizeMultiplier={cap}>{branch === 'yes' ? 'Blocked' : 'Otherwise'}</Copy>{render(node[branch], { ...location, path: [...location.path, at, branch] })}{dropZone({ ...location, path: [...location.path, at, branch] }, node[branch].length, `＋ ${branch === 'yes' ? 'When blocked' : 'Otherwise'}`)}</View>)}
      </View>;
    })}
  </View>;
  const selection = selected ? listAt(program, selected.location)?.[selected.at] : null;
  return <View testID="program-editor" style={{ alignSelf: 'stretch', gap: 8 }}>
    <Copy maxFontSizeMultiplier={cap} style={{ fontWeight: '800', color: C.ink }}>Blocks · {nodeCost(program)} of 80</Copy>
    <Copy maxFontSizeMultiplier={cap}>Tap a repeat, then add cards inside. Drag sideways onto a dashed place to move a card.</Copy>
    {currentPath && <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">Step: block {blockName(currentPath)}{iteration?.length ? ` · repeat ${iteration.map(i => i + 1).join(', ')}` : ''}</Copy>}
    <ScrollView nestedScrollEnabled scrollEnabled={!dragging} style={{ maxHeight: fontScale >= 1.5 ? 190 : 240 }} contentContainerStyle={{ gap: 6 }} accessibilityLabel="Nested program cards">
      {render(program.body, main)}{dropZone(main, program.body.length, '＋ End of plan')}
      {program.songs.map((song, i) => <View key={i} style={{ padding: 6, gap: 5, borderWidth: 2, borderColor: C.teal, borderRadius: 12 }}><Copy maxFontSizeMultiplier={cap}>♫ Song {i + 1}</Copy>{render(song, { song: i, path: [] })}{dropZone({ song: i, path: [] }, song.length, `＋ Inside Song ${i + 1}`)}</View>)}
    </ScrollView>
    {!!selection && selected && <View style={{ gap: 5 }}><Copy maxFontSizeMultiplier={cap}>Selected block. Tap a command to replace it.</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => { if (accept(removeNode(program, selected.location, selected.at))) setTarget(main); }}>Remove block</Button>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => insert({ kind: 'repeat', times: 2, body: [selection] })}>Wrap ×2</Button>
      {selection.kind === 'repeat' && [2, 3, 4, 6, 8].map(times => <Button key={times} compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => accept(replaceNode(program, selected.location, selected.at, { ...selection, times }))}>×{times}</Button>)}
      <Button compact quiet maxFontSizeMultiplier={cap} onPress={() => setSelected(null)}>Keep block</Button>
    </View></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {cards.map(card => <View key={card.code} {...drag({ kind: 'command', command: card.code })}><PressableScale accessibilityRole="button" accessibilityLabel={`${selected ? 'Replace with' : 'Add'} ${card.name} block`} disabled={disabled} onPress={() => insert({ kind: 'command', command: card.code }, undefined, card.speech)} style={{ minHeight: 56, minWidth: 64, borderWidth: 2, borderColor: C.teal, borderRadius: 12, padding: 8, gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>{card.icon}<Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 13 }}>{card.name}</Copy></PressableScale></View>)}
      <View {...drag({ kind: 'repeat', times: 2, body: [] })}><Button compact maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => insert({ kind: 'repeat', times: 2, body: [] }, undefined, 'k7-repeat')}>↻ Repeat ×2</Button></View>
      {condition && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => insert({ kind: 'if', yes: [], no: [] }, undefined, 'k7-condition')}>? If blocked</Button>}
      {program.songs.map((_, i) => <Button key={i} compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={() => insert({ kind: 'call', song: i }, undefined, 'k7-song')}>♫ Song {i + 1}</Button>)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled || !program.body.length || program.songs.length >= 4} onPress={() => { const next = clone(program), song = next.songs.length; next.songs.push(next.body); next.body = [{ kind: 'call', song }]; if (accept(next, 'k7-song')) setTarget(main); }}>Make plan a song</Button>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled || !history.past.length} onPress={() => { const prev = history.past.at(-1)!; if (onChange(prev)) { setHistory({ past: history.past.slice(0, -1), future: [...history.future, clone(program)] }); setTarget(main); setSelected(null); announce('tap'); } }}>Undo block edit</Button>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled || !history.future.length} onPress={() => { const next = history.future.at(-1)!; if (onChange(next)) { setHistory({ past: [...history.past, clone(program)], future: history.future.slice(0, -1) }); setTarget(main); setSelected(null); announce('tap'); } }}>Redo block edit</Button>
      {onStep && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={onStep}>Step</Button>}{onRestart && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled} onPress={onRestart}>Rewind run</Button>}
    </View>
    {(message || dragging) && <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{dragging ? 'Drop on a dashed place.' : message}</Copy>}
  </View>;
}
