/** Tide Logic Challenge board (C4): write a rule, find the rule behind a sorted belt, or trace a flip gate. */
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, C, Copy } from '../../../components/ui';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import { useReducedMotion } from '../../../components/motion';
import { LARGE_TEXT } from '../../../components/wordFit';
import type { ChallengeViewProps } from '../../../challenge/types';
import { learnSources } from '../../../content/learnAudio';
import { Cargo, bucketLabel, itemOf } from './art';
import { FRAMES, bell, catchWords, goalSentence, routes, ruleWords, type Side } from './rules';
import { CLEAR, HELP, RUN, UNDO, answerOf, challengeEngine, helpLeft, hintText, pick, setBlock, type Action, type State } from './challenge-engine';

const SIDE = ['left', 'right'] as const;
/** Voiced by the lead in a later audio batch (scripts/learn/c4-tide-logic.json); each button appears only once its line resolves. */
const RULES = { write: 'c4-tide-write-rules', find: 'c4-tide-find-rules', trace: 'c4-tide-trace-rules' } as const;
const optionLabel = (kind: string, v: string) => kind === 'side' || kind === 'start' ? bucketLabel(v) : kind === 'when' ? (v === 'on' ? 'on this catch' : 'on the catch before') : kind === 'join' ? v.toUpperCase() : v === 'not bell' ? 'NO bell' : v.startsWith('not ') ? `NOT ${v.slice(4)}` : v === 'bell' ? '🔔 bell' : v;
export function ChallengeBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const d = s.d, f = FRAMES[d.frame], prefs = useContext(AudioPreferences), { play: tone, stop } = useSoundControls(prefs.sound ?? true), reduced = useReducedMotion();
  const win = useWindowDimensions(), large = win.fontScale >= LARGE_TEXT, wide = win.width > win.height && width >= 640;
  // On a phone the belt is one sideways row, so the rule and its controls stay in view at every text size.
  const oneRow = !wide && width < 600;
  const [editing, setEditing] = useState<number | null>(null);
  // Playback: after a Run every catch is tested in turn and lands where the rule sends it; a miss stops at the first wrong catch.
  const [playback, setPlayback] = useState({ run: s.runs, cursor: s.won ? d.belt.length : -1 });
  if (playback.run !== s.runs) setPlayback({ run: s.runs, cursor: 0 });
  const end = s.won || s.miss === null ? d.belt.length : s.miss + 1, playing = playback.cursor >= 0 && playback.cursor < end;
  // Playback is only display, so it also runs on a solved board, which the frame shows inactive; edits stay blocked by `idle`.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const next = playback.cursor + 1;
      setPlayback(p => ({ ...p, cursor: next }));
      tone(next >= end ? (s.won ? 'win' : 'wrong') : 'tap', true);
    }, reduced ? 20 : 260);
    return () => clearTimeout(timer);
  }, [playing, playback.cursor, end, reduced, s.won, tone]);
  useEffect(() => { if (!active) stop(); return stop; }, [active, stop]);
  const idle = !active || s.won || playing;
  const send = (a: Action) => { if (idle || !challengeEngine.step(s, a, d)) return; tone('tap', true); dispatch(a); };
  const sorted = d.kind === 'trace' ? null : s.draft.every(x => x >= 0) ? routes(f, s.draft, d.belt) : null;
  const want = d.kind === 'trace' ? answerOf(d) as Side[] : routes(f, d.target, d.belt);
  // Marks belong to the draft that ran; an edit since then clears them.
  const ran = s.last === s.draft.join(','), shown = playback.cursor < 0 || !ran ? 0 : Math.min(playback.cursor, end);
  const catchSize = width >= 600 ? 64 : 56;
  const goal = d.kind === 'write' ? goalSentence(f, d.target) : d.kind === 'find' ? 'Read the sorted belt. Build a rule that sorts every catch the same way.' : '';
  const belt = <View style={{ backgroundColor: '#E2F3F2', borderRadius: 18, padding: 10, gap: 8 }}>
    <ScrollView horizontal={oneRow} scrollEnabled={oneRow} nestedScrollEnabled accessibilityLabel={oneRow ? 'Cargo belt. Scroll sideways to see every catch.' : undefined} contentContainerStyle={oneRow ? { gap: 6, paddingRight: 4 } : undefined}>
    <View testID="tide-challenge-belt" style={{ flexDirection: 'row', flexWrap: oneRow ? 'nowrap' : 'wrap', justifyContent: 'center', gap: 6 }}>
      {d.belt.map((c, i) => {
        const item = itemOf(c), tested = i < shown, wrong = s.miss === i && !playing && !s.won, landed = tested ? (d.kind === 'trace' ? s.draft[i] : sorted?.[i]) : undefined;
        const label = `Catch ${i + 1}: ${catchWords(c)}${d.kind === 'find' ? `, sorted ${SIDE[want[i]]}` : ''}${d.kind === 'trace' && s.draft[i] >= 0 ? `, you send it ${SIDE[s.draft[i]]}` : ''}${landed !== undefined && landed >= 0 ? `, ${landed === want[i] ? 'right' : 'wrong'} bucket` : ''}`;
        return <View key={i} accessible={d.kind !== 'trace'} accessibilityLabel={label} style={{ alignItems: 'center', minWidth: d.kind === 'trace' ? 96 : 64, padding: 3, borderRadius: 12, borderWidth: wrong || playing && i === shown ? 3 : 0, borderColor: wrong ? '#B74431' : '#287A82', backgroundColor: wrong ? '#FFE0D8' : playing && i === shown ? '#FFF2BA' : 'transparent' }}>
          <Cargo item={item} size={item.size === 'big' ? catchSize : catchSize * 49 / 64} />
          <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700' }}>{`${i + 1} · ${item.size}`}</Copy>
          {d.kind === 'find' && <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', color: want[i] ? '#9A4A2E' : '#22686F' }}>{want[i] ? 'right →' : '← left'}</Copy>}
          {d.kind === 'trace' && <View style={{ flexDirection: 'row', gap: 4 }}>{([0, 1] as Side[]).map(side => <Button key={side} compact quiet maxFontSizeMultiplier={1.3} selected={s.draft[i] === side} disabled={idle} label={`Send catch ${i + 1} ${SIDE[side]}${s.draft[i] === side ? ', chosen' : ''}`} onPress={() => send(pick(i, side))}>{side ? '→' : '←'}</Button>)}</View>}
          {landed !== undefined && landed >= 0 && <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', color: landed === want[i] ? '#22686F' : '#8D3528' }}>{`${landed ? 'R' : 'L'} ${landed === want[i] ? '✓' : '✗'}`}</Copy>}
        </View>;
      })}
    </View>
    </ScrollView>
    <View style={{ height: 9, borderRadius: 5, backgroundColor: '#B49C77' }} />
    <View testID="tide-buckets" style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 8 }}><Copy maxFontSizeMultiplier={1.3} style={{ flexShrink: 1 }}>{'← LEFT BUCKET'}</Copy><Copy maxFontSizeMultiplier={1.3} style={{ flexShrink: 1, textAlign: 'right' }}>{'RIGHT BUCKET →'}</Copy></View>
    {playing && <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={{ textAlign: 'center', fontWeight: '700' }}>{`Testing catch ${shown + 1}${f.id === 'bell' && bell(d.belt[shown]) ? ' · ♪ it rings' : ''}${f.id === 'bell' && shown > 0 && bell(d.belt[shown - 1]) ? ' · the catch before rang' : ''}`}</Copy>}
  </View>;
  const rule = d.kind === 'trace'
    ? <View testID="tide-rule" style={{ padding: 10, borderRadius: 14, borderWidth: 2, borderColor: '#287A82', backgroundColor: '#FFF9EA', gap: 4 }}><Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '800' }}>THE RULE</Copy><Copy maxFontSizeMultiplier={1.5}>{ruleWords(f, d.target)}</Copy><Copy maxFontSizeMultiplier={1.5}>{goalSentence(f, d.target)}</Copy></View>
    : <View testID="tide-rule" style={{ padding: 10, borderRadius: 14, borderWidth: 2, borderColor: '#287A82', backgroundColor: '#FFF9EA', gap: 6 }}>
      <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '800' }}>BUILD THE RULE</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {f.id === 'flip' ? <Copy maxFontSizeMultiplier={1.5}>GATE STARTS</Copy> : <Copy maxFontSizeMultiplier={1.5}>IF</Copy>}
        {f.id === 'bell' && <Copy maxFontSizeMultiplier={1.5}>{'🔔 rings'}</Copy>}
        {(f.id === 'flip' ? [1, 0] : f.slots.map((_, i) => i)).map(i => {
          const slot = f.slots[i], v = s.draft[i] >= 0 ? slot.options[s.draft[i]] : '';
          const empty = slot.kind === 'side' ? 'choose bucket' : slot.kind === 'start' ? 'which side? +' : slot.kind === 'join' ? 'AND/OR +' : slot.kind === 'when' ? 'on which catch? +' : 'clue +';
          return <React.Fragment key={i}>
            {f.id === 'flip' && i === 0 && <Copy maxFontSizeMultiplier={1.5}>· EVERY</Copy>}
            {f.id === 'bell' && i === 1 && <Copy maxFontSizeMultiplier={1.5}>AND</Copy>}
            {f.id === 'three' && i === 2 && <Copy maxFontSizeMultiplier={1.5}>(</Copy>}
            {slot.kind === 'side' && <Copy maxFontSizeMultiplier={1.5}>→</Copy>}
            <Button compact quiet maxFontSizeMultiplier={1.5} selected={editing === i} disabled={idle} label={`Choose ${slot.name}, currently ${v || 'empty'}`} onPress={() => setEditing(editing === i ? null : i)}>{v ? optionLabel(slot.kind, v) : empty}</Button>
            {f.id === 'three' && i === 4 && <Copy maxFontSizeMultiplier={1.5}>)</Copy>}
            {f.id === 'flip' && i === 0 && <Copy maxFontSizeMultiplier={1.5}>FLIPS IT</Copy>}
          </React.Fragment>;
        })}
        {f.id !== 'flip' && <Copy maxFontSizeMultiplier={1.5}>{'ELSE → '}{bucketLabel(s.draft[f.slots.length - 1] < 0 ? '' : SIDE[1 - s.draft[f.slots.length - 1]])}</Copy>}
      </View>
      {editing !== null && <View testID="tide-options" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{f.slots[editing].options.map((v, o) => <Button key={v} compact maxFontSizeMultiplier={1.5} selected={s.draft[editing] === o} disabled={idle} onPress={() => { send(setBlock(editing, o)); setEditing(null); }}>{optionLabel(f.slots[editing].kind, v)}</Button>)}</View>}
    </View>;
  const filled = s.draft.every(x => x >= 0);
  const message = s.won ? (playing ? 'Watch every catch land.' : d.kind === 'trace' ? 'Every catch traced right.' : 'Your rule sorts every catch.')
    : playing ? 'Testing each catch against your rule.'
    : s.miss !== null ? (d.kind === 'trace' ? `Catch ${s.miss + 1} is not where the gate sends it. Follow the gate from catch 1.` : `Catch ${s.miss + 1}, the ${catchWords(d.belt[s.miss])}, goes ${SIDE[(sorted ?? want)[s.miss]].toUpperCase()} with your rule, but it belongs ${SIDE[want[s.miss]].toUpperCase()}. Change a block and run again.`)
    : s.runs > 0 && s.last === s.draft.join(',') ? 'Change something before you run again.' : '';
  const controls = <View style={{ gap: 8 }}>
    {!!message && <Copy testID="tide-message" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5}>{message}</Copy>}
    {s.hint > 0 && !s.won && <View testID="tide-hint" accessibilityLiveRegion="polite" style={{ padding: 10, borderRadius: 12, backgroundColor: C.soft }}><Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{hintText(s)}</Copy></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button maxFontSizeMultiplier={1.5} style={{ flexGrow: 1 }} disabled={idle || !filled || s.last === s.draft.join(',')} onPress={() => send(RUN)}>{d.kind === 'trace' ? 'Check' : '▶ Run the belt'}</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || !s.undo.length} onPress={() => send(UNDO)}>↶ Undo</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || s.draft.every(x => x < 0)} onPress={() => send(CLEAR)}>Clear</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || !helpLeft(s)} onPress={() => send(HELP)}>{s.hint === 0 ? 'Help' : 'More help'}</Button>
      {prefs.sound !== false && !!learnSources[RULES[d.kind]] && <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => tone(RULES[d.kind], true)}>Hear rules</Button>}
      {prefs.sound !== false && (f.id === 'not' || f.id === 'bell') && !!learnSources[f.id === 'not' ? 'c4-tide-not' : 'c4-tide-bell'] && <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => tone(f.id === 'not' ? 'c4-tide-not' : 'c4-tide-bell', true)}>{f.id === 'not' ? 'Hear NOT' : 'Hear the bell'}</Button>}
    </View>
  </View>;
  const goalLine = <Copy testID="tide-goal" maxFontSizeMultiplier={large ? 1.5 : undefined} style={{ fontWeight: '700' }}>{goal}</Copy>;
  // Tracing starts from the rule, so it comes first; writing and finding start from the goal and the belt.
  // The rule card already says what the gate does in words, so a trace needs no second goal line.
  const lead = d.kind === 'trace' ? rule : goalLine;
  return wide
    ? <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><View style={{ width: '50%', gap: 8 }}>{lead}{belt}</View><View style={{ flex: 1, minWidth: 0, gap: 8 }}>{d.kind === 'trace' ? null : rule}{controls}</View></View>
    : <View style={{ gap: 8 }}>{lead}{belt}{d.kind === 'trace' ? null : rule}{controls}</View>;
}
