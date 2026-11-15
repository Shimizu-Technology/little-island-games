import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, C, Copy, PressableScale } from '../../components/ui';
import { atLarge } from '../../components/wordFit';
import { GridInteraction } from '../../puzzles/grid/preferences';
import { nodeCost, validProgram, type Node, type Program } from './model';
import { address, clone, historyEdit, insertNode, listAt, main, moveNode, removeNode, replaceNode, type EditHistory, type Location } from './edit';
import { clipped, edgeScroll, type Rect } from './geometry';
import { blockPosition } from './hints';
import { PaletteDrag } from './PaletteDrag';

type Card = { code: number; name: string; icon: React.ReactNode; speech?: string };
type Target = { location: Location; before: number; x: number; y: number; width: number; height: number };
type Selection = { location: Location; at: number };
/** Imperative gesture/layout state has no render output. React state owns visible feedback. */
class EditorRuntime {
  nodes = new Map<string, View>();
  targets = new Map<string, Target>();
  views = new Map<string, View>();
  viewport: Rect | null = null;
  viewportView: View | null = null;
  scroll: ScrollView | null = null;
  offset = 0; content = 0; measuring = 0; saving = false;
  pointer: {x:number;y:number} | null = null;
  set(values: Partial<EditorRuntime>) { Object.assign(this, values); }
}

const blockName = blockPosition;
/** Tap and drag use exactly the same pure edit and admission path. No move saves on a frame. */
export function ProgramEditor({ program, cards, onChange, disabled, hear, condition, currentPath, iteration, onStep, onRestart, onFlat, maxHeight = 420, refusal, tray, songs = true, repeat = true }: {
  program: Program; cards: Card[]; onChange: (program: Program) => boolean | {accepted:false;reason:string} | Promise<boolean | {accepted:false;reason:string}>; disabled: boolean;
  hear: (key: string) => void; condition?: string; currentPath?: string; iteration?: number[];
  onStep?: () => void; onRestart?: () => void; onFlat?: () => void; maxHeight?: number; refusal?: string;
  /** A level's smaller block limit (every block counted), refused here before saving. */
  tray?: number; songs?: boolean; repeat?: boolean;
}) {
  const { fontScale } = useWindowDimensions(), cap = atLarge(fontScale, 1.5);
  const [target, setTarget] = useState<Location>(main), [selected, setSelected] = useState<Selection | null>(null);
  const [history, setHistory] = useState<EditHistory>({ past: [], future: [] }), [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false), [over, setOver] = useState<string | null>(null);
  const holdPage = useContext(GridInteraction);
  useEffect(() => { holdPage(dragging); return () => holdPage(false); }, [dragging, holdPage]);
  // Stable imperative drag registry. Only layout/ref callbacks and gesture handlers mutate it;
  // its contents never determine render output (the visible target is ordinary React state).
  const [registry] = useState(() => new EditorRuntime());
  const announce = (key: string) => { hear('tap'); if (key !== 'tap') hear(key); };
  const commit = async (candidate: Program): Promise<boolean> => {
    if(disabled || registry.saving)return false;
    registry.set({saving:true});setSaving(true);
    try { const result=await onChange(candidate);if(result===true)return true;if(typeof result==='object'){setMessage(result.reason+' Your plan is kept.');return false;} } catch { /* Accepted state stays visible. */ }
    finally {registry.set({saving:false});setSaving(false);}
    setMessage(refusal ?? 'That change could not be saved in this attempt. Your plan is kept.');return false;
  };
  const accept = async (candidate: Program | null, speech = 'tap') => {
    if (disabled) return false;
    if (!candidate || !validProgram(candidate)) { setMessage('That edit is too large: 80 blocks, 4 levels, 512 steps. Your plan is kept.'); return false; }
    if (tray !== undefined && nodeCost(candidate) > tray) { setMessage(`The tray holds ${tray} blocks. Your plan is kept. A Repeat block can hold cards that run again.`); return false; }
    if (!(await commit(candidate))) return false;
    setHistory(h => historyEdit(h, program)); setSelected(null); setMessage(''); announce(speech); return true;
  };
  const insert = async (node: Node, drop?: Target, speech?: string) => {
    const location = drop?.location ?? target, list = listAt(program, location);
    if (!list) { setTarget(main); setMessage('Choose a place in the plan.'); return; }
    const at = drop?.before ?? list.length;
    const candidate = !drop && selected ? replaceNode(program, selected.location, selected.at, node) : insertNode(program, location, at, node);
    if (await accept(candidate, speech) && (node.kind === 'repeat' || node.kind === 'sequence')) setTarget({ ...(selected?.location ?? location), path: [...(selected?.location ?? location).path, selected?.at ?? at, 'body'] });
  };
  const measure = () => {
    const generation = registry.measuring+1;registry.set({measuring:generation});
    registry.targets.clear();
    registry.set({viewport:null});
    registry.viewportView?.measureInWindow((x,y,width,height)=>{
      if(generation!==registry.measuring)return;
      const viewport={x,y,width,height};registry.set({viewport});
      for (const [id, ref] of registry.views) ref.measureInWindow((tx,ty,tw,th)=>{
        if(generation!==registry.measuring)return;
        const visible=clipped({x:tx,y:ty,width:tw,height:th},viewport);
        if(visible)registry.targets.set(id,{...JSON.parse(id),...visible});
      });
    });
  };
  const hit = (x:number,y:number) => [...registry.targets.entries()].filter(([,t])=>x>=t.x&&x<=t.x+t.width&&y>=t.y&&y<=t.y+t.height).sort((a,b)=>a[1].width*a[1].height-b[1].width*b[1].height)[0];
  useEffect(()=>{
    if(!dragging)return;
    const timer=setInterval(()=>{
      const v=registry.viewport,point=registry.pointer;
      if(!v||!point||point.x<v.x||point.x>v.x+v.width)return;
      const delta=edgeScroll(point.y,v),next=Math.max(0,Math.min(registry.content-v.height,registry.offset+delta));
      if(delta&&next!==registry.offset){registry.targets.clear();registry.set({measuring:registry.measuring+1});registry.scroll?.scrollTo({y:next,animated:false});}
    },60);
    return()=>clearInterval(timer);
  },[dragging,registry]);
  useEffect(()=>{
    if(!currentPath)return;
    const timer=setTimeout(()=>{
      const viewport=registry.viewport;
      if(!viewport)return;
      registry.nodes.get(currentPath)?.measureInWindow((_,y,__,height)=>{
        if(y<viewport.y||y+height>viewport.y+viewport.height)registry.scroll?.scrollTo({y:Math.max(0,registry.offset+y-viewport.y),animated:false});
      });
    },0);
    return()=>clearTimeout(timer);
  },[currentPath,registry]);
  const palette = (node: Node, tap: () => void, child: React.ReactNode) => <PaletteDrag disabled={disabled||saving||saving} tap={tap} start={() => { measure(); setDragging(true); }} move={(x, y) => {registry.set({pointer:{x,y}});setOver(hit(x, y)?.[0] ?? null);}} cancel={() => { setDragging(false); setOver(null); registry.set({pointer:null}); }} drop={(x, y) => { const found = hit(x, y)?.[1]; if (found) void insert(node, found, node.kind === 'repeat' ? 'k7-repeat' : undefined); else setMessage('Drop on a dashed place in the plan.'); }}>{child}</PaletteDrag>;
  const dropZone = (location: Location, before: number, label: string) => {
    const id = JSON.stringify({ location, before });
    return <View key={`drop-${id}`} ref={ref => { if (ref) registry.views.set(id, ref); else registry.views.delete(id); }} collapsable={false}>
      <PressableScale accessibilityRole="button" accessibilityLabel={selected ? `Move selected block to ${label}` : label} accessibilityState={{ selected: address(target) === address(location) && !selected }} disabled={disabled||saving}
        onPress={() => { if(selected){void accept(moveNode(program,selected.location,selected.at,location,before));}else{setTarget(location);setMessage(label);} }}
        style={{ minHeight: 44, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: over === id ? C.teal : C.line, backgroundColor: over === id ? C.soft : C.cream, padding: 8, justifyContent: 'center' }}>
        <Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 13 }}>{label}</Copy>
      </PressableScale>
    </View>;
  };
  const render = (nodes: Node[], location: Location): React.ReactNode => <View style={{ gap: 5 }}>
    {nodes.map((node, at) => {
      const path = address(location, at), name = node.kind === 'command' ? cards.find(c => c.code === node.command)?.name ?? 'Card' : node.kind === 'repeat' ? `Repeat ${node.times}` : node.kind === 'call' ? `Song ${node.song + 1}` : node.kind === 'if' ? `If ${condition ?? 'edge or obstacle blocked'}` : 'Together';
      const chosen = selected && address(selected.location, selected.at) === path, current = currentPath === path;
      return <View key={path} collapsable={false} ref={ref=>{if(ref)registry.nodes.set(path,ref);else registry.nodes.delete(path);}} style={{ padding: 6, gap: 5, borderRadius: 12, backgroundColor: node.kind === 'repeat' ? '#F8E7BB' : C.paper, borderWidth: current ? 3 : 1, borderColor: current ? '#B2381F' : C.line }}>
        {selected && dropZone(location,at,`Before ${blockPosition(path)}`)}
        <View>
          <PressableScale accessibilityRole="button" accessibilityLabel={`Block in ${blockName(path)}: ${name}${current ? ', current step' : ''}. Tap to change.`} accessibilityState={{ selected: !!chosen }} disabled={disabled||saving}
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
  const repeatButton = repeat && palette({ kind: 'repeat', times: 2, body: [] }, () => insert({ kind: 'repeat', times: 2, body: [] }, undefined, 'k7-repeat'), <Button compact label="Add Repeat 2 times" maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={() => insert({ kind: 'repeat', times: 2, body: [] }, undefined, 'k7-repeat')}>↻ Repeat ×2</Button>);
  return <View testID="program-editor" style={{ alignSelf: 'stretch', maxHeight, gap:4 }}>
    <Copy maxFontSizeMultiplier={cap} style={{ fontWeight: '800', color: C.ink }}>{tray === undefined ? `Blocks · ${nodeCost(program)} of 80` : nodeCost(program) >= tray ? `Tray full · ${nodeCost(program)} of ${tray} blocks${repeat ? '. A Repeat saves space' : ''}` : `Tray · ${nodeCost(program)} of ${tray} blocks`}</Copy>
    {currentPath && <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">Step: block {blockName(currentPath)}{iteration?.length ? ` · repeat ${iteration.map(i => i + 1).join(', ')}` : ''}</Copy>}
    <View testID="program-plan-viewport" ref={ref=>{registry.set({viewportView:ref});}} collapsable={false} onLayout={measure}><ScrollView ref={ref=>{registry.set({scroll:ref});}} nestedScrollEnabled scrollEnabled={!dragging} onScroll={event=>{registry.set({offset:event.nativeEvent.contentOffset.y});measure();}} scrollEventThrottle={16} onContentSizeChange={(_,height)=>{registry.set({content:height});}} style={{ height: fontScale >= 1.5 ? 120 : 140, maxHeight: fontScale >= 1.5 ? 120 : 140 }} contentContainerStyle={{ gap: 6 }} accessibilityLabel="Nested program cards">
      {render(program.body, main)}{dropZone(main, program.body.length, '＋ End of plan')}
      {program.songs.map((song, i) => <View key={i} style={{ padding: 6, gap: 5, borderWidth: 2, borderColor: C.teal, borderRadius: 12 }}><Copy maxFontSizeMultiplier={cap}>♫ Song {i + 1}</Copy>{render(song, { song: i, path: [] })}{dropZone({ song: i, path: [] }, song.length, `＋ Inside Song ${i + 1}`)}</View>)}
    </ScrollView></View>
    <ScrollView nestedScrollEnabled style={{flexShrink:1,maxHeight:Math.max(64,maxHeight-190)}} contentContainerStyle={{gap:6}} accessibilityLabel="Block tools">
    <Copy maxFontSizeMultiplier={cap} style={{fontSize:13}}>{repeat ? 'Tap Repeat, then cards inside.' : 'Build a group, then Make plan a song.'} To move, select a block then a dashed place.</Copy>
    {!!selection && selected && <View style={{ gap: 5 }}><Copy maxFontSizeMultiplier={cap}>Selected block. Tap a command to replace it.</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={async () => { if (await accept(removeNode(program, selected.location, selected.at))) setTarget(main); }}>Remove block</Button>
      {repeat && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={() => insert({ kind: 'repeat', times: 2, body: [selection] })}>Wrap ×2</Button>}
      {selection.kind === 'repeat' && [2, 3, 4, 6, 8].map(times => <Button key={times} compact quiet label={`Repeat ${times} times`} maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={() => accept(replaceNode(program, selected.location, selected.at, { ...selection, times }))}>×{times}</Button>)}
      <Button compact quiet maxFontSizeMultiplier={cap} onPress={() => setSelected(null)}>Keep block</Button>
    </View></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {/* On a tray level Repeat leads, so the level's key tool is never the one past the pane's edge. */}
      {tray !== undefined && repeatButton}
      {cards.map(card => <React.Fragment key={card.code}>{palette({ kind: 'command', command: card.code }, () => insert({ kind: 'command', command: card.code }, undefined, card.speech), <PressableScale accessibilityRole="button" accessibilityLabel={`${selected ? 'Replace with' : 'Add'} ${card.name} block`} disabled={disabled||saving} onPress={() => insert({ kind: 'command', command: card.code }, undefined, card.speech)} style={{ minHeight: 56, minWidth: 64, borderWidth: 2, borderColor: C.teal, borderRadius: 12, padding: 8, gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>{card.icon}<Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 13 }}>{card.name}</Copy></PressableScale>)}</React.Fragment>)}
      {tray === undefined && repeatButton}
      {condition && <Button compact quiet label="Add condition: edge or obstacle blocked" maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={() => insert({ kind: 'if', condition: {kind:'blocked'}, yes: [], no: [] }, undefined, 'k7-condition')}>? If blocked</Button>}
      {songs && program.songs.map((_, i) => <Button key={i} compact quiet label={`Add Song ${i+1}`} maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={() => insert({ kind: 'call', song: i }, undefined, 'k7-song')}>♫ Song {i + 1}</Button>)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {songs && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving || !program.body.length || program.songs.length >= 4} onPress={async () => { const next = clone(program), song = next.songs.length; next.songs.push(next.body); next.body = [{ kind: 'call', song }]; if (await accept(next, 'k7-song')) setTarget(main); }}>Make plan a song</Button>}
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving || !history.past.length} onPress={async () => { const prev = history.past.at(-1)!; if (await commit(prev)) { setHistory({ past: history.past.slice(0, -1), future: [...history.future, clone(program)] }); setTarget(main); setSelected(null); announce('tap'); } }}>Undo block edit</Button>
      <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving || !history.future.length} onPress={async () => { const next = history.future.at(-1)!; if (await commit(next)) { setHistory({ past: [...history.past, clone(program)], future: history.future.slice(0, -1) }); setTarget(main); setSelected(null); announce('tap'); } }}>Redo block edit</Button>
      {onFlat && <Button compact quiet maxFontSizeMultiplier={cap} disabled={saving} onPress={onFlat}>Arrow editor</Button>}
      {onStep && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={onStep}>Step</Button>}{onRestart && <Button compact quiet maxFontSizeMultiplier={cap} disabled={disabled||saving} onPress={onRestart}>Rewind run</Button>}
    </View>
    {(message || dragging) && <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{dragging ? 'Drop on a dashed place.' : message}</Copy>}
    </ScrollView>
  </View>;
}
