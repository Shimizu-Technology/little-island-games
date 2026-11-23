import React, { useLayoutEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, Copy, PressableScale, C } from '../../../components/ui';
import { atLarge, LARGE_TEXT } from '../../../components/wordFit';
import { CoachSpot } from '../../Coach';
import type { LabProgram } from './content';
import { FREE_EDITS, checkedDraft, hint, nearest, ready, sourceFor, type Action, type Attempt } from './attempt';
import { pythonText, runPython } from './python';
const face = Platform.select({ ios: 'Menlo', default: 'monospace' });
/** Code and trace panes scroll vertically; code wraps without shrinking the type. */
export function ProgramPanel({ d, state: s, send, active, width, onNext, coaching = false }: { d: LabProgram; state: Attempt; send: (a: Action) => void; active: boolean; width: number; coaching?: boolean; onNext?: () => void }) {
  const win = useWindowDimensions(), cap = atLarge(win.fontScale, 1.5), codeCap = atLarge(win.fontScale, 1.3);
  const wide = win.width > win.height && width >= 520, large = win.fontScale >= LARGE_TEXT;
  const [slot, setSlot] = useState(() => Math.max(0, s.picks.findIndex(i => i < 0))), [traceAt, setTraceAt] = useState(0);
  const scroll = useRef<ScrollView>(null), positions = useRef(new Map<number, number>());
  const revealLine = (line: number) => scroll.current?.scrollTo({ y: Math.max(0, (positions.current.get(line) ?? 0) - 6), animated: false });
  const focusLine = d.mode === 'build' && !s.won ? d.slots[slot].line : 0;
  useLayoutEffect(() => { scroll.current?.scrollTo({ y: Math.max(0, (positions.current.get(focusLine) ?? 0) - 6), animated: false }); }, [focusLine, win.width, win.fontScale]);
  const shown = d.mode === 'predict' ? d.lines : sourceFor(d, s.picks);
  const alreadyRun = checkedDraft(s, d), showTrace = s.won || alreadyRun && d.mode === 'build';
  const result = showTrace ? runPython(shown) : { output: [], trace: [], error: null };
  const cursor = Math.max(0, Math.min(traceAt, result.trace.length - 1));
  const frame = result.trace[cursor];
  const seek = (next: number) => { const target = result.trace[Math.max(0, Math.min(next, result.trace.length - 1))]; if (target) { setTraceAt(Math.max(0, Math.min(next, result.trace.length - 1))); revealLine(target.line); } };
  const inactive = !active || s.won, selected = d.slots[Math.min(slot, d.slots.length - 1)];
  const near = d.mode === 'build' && s.edits >= FREE_EDITS ? nearest(d, s.picks) : null;
  const paneHeight = Math.max(132, Math.min(wide ? win.height - 175 : win.height * 0.26, wide ? 350 : large ? 140 : 225));
  const code = <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 5 }}>
    <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 15, fontWeight: '800' }}>{d.mode === 'predict' ? 'Read the program' : 'Tap a blank to change it'}</Copy>
    <ScrollView ref={scroll} nestedScrollEnabled style={{ height: paneHeight, flexGrow: 0, borderRadius: 12, backgroundColor: '#23334D' }} contentContainerStyle={{ padding: 8, gap: 2 }} accessibilityLabel="Python program, scroll for all lines">
      {shown.map((line, i) => {
        const edit = d.slots.findIndex(s => s.line === i), chosen = d.mode === 'build' && edit === slot;
        const depth = (line.length - line.trimStart().length) / 4;
        const spoken = `Line ${i + 1}${depth ? `, inside ${depth} ${depth === 1 ? 'block' : 'blocks'}` : ''}: ${line.trim()}`;
        // A separate gutter keeps every wrapped continuation attached to its numbered statement.
        // Display indentation is compact; the spoken/source form retains the exact Python blocks.
        const measured = (event: import('react-native').LayoutChangeEvent) => { positions.current.set(i, event.nativeEvent.layout.y); if (i === focusLine) revealLine(i); };
        const text = <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
          <Copy maxFontSizeMultiplier={codeCap} style={{ fontFamily: face, fontSize: 14, lineHeight: 21, color: '#B9CADE', width: 25, textAlign: 'right' }}>{i + 1}</Copy>
          <View testID="lab-code-statement" style={{ flex: 1, minWidth: 0, paddingLeft: depth * 12, borderLeftWidth: depth ? 1 : 0, borderLeftColor: '#657995' }}>
            <Copy maxFontSizeMultiplier={codeCap} style={{ fontFamily: face, fontSize: 14, lineHeight: 21, color: '#FFFFFF' }}>{line.trimStart()}</Copy>
          </View>
        </View>;
        return d.mode === 'build' && edit >= 0 && !s.won ? <PressableScale key={i} onLayout={measured} accessibilityRole="button" accessibilityLabel={`Edit ${spoken[0].toLowerCase() + spoken.slice(1)}`} accessibilityState={{ selected: chosen, disabled: !active }} disabled={!active} onPress={() => setSlot(edit)} style={{ minHeight: 44, padding: 6, borderWidth: 2, borderColor: chosen ? '#F5D886' : 'transparent', borderRadius: 7 }}>{coaching && active && chosen ? <CoachSpot active>{text}</CoachSpot> : text}</PressableScale> : <View key={i} onLayout={measured} accessible accessibilityRole="text" accessibilityLabel={spoken} style={{ padding: 4, backgroundColor: frame?.line === i ? '#425372' : 'transparent' }}>{text}</View>;

      })}
    </ScrollView>
  </View>;
  const guide = (children: React.ReactNode) => <CoachSpot active={coaching && active} handAt="none">{children}</CoachSpot>;
  const controls = <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 7 }}>
    {d.mode === 'build' && !s.won && <>
      <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 15 }}>{`Line ${selected.line + 1}: choose a value`}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityLabel="Touch values">
        {selected.choices.map((value, i) => <Button compact quiet key={i} maxFontSizeMultiplier={cap} selected={s.picks[slot] === i} disabled={inactive || !!near && nearest(d, s.picks.map((v, j) => j === slot ? i : v)).distance >= near.distance} onPress={() => { send(['e', slot, i]); const next = s.picks.findIndex((v, j) => j > slot && v < 0); if (next >= 0) { setSlot(next); } }} label={`Line ${selected.line + 1}, choose ${value}`}>{value}</Button>)}
      </View>
    </>}
    {d.mode === 'predict' && !s.won && guide(<View style={{ gap: 4 }}><Copy maxFontSizeMultiplier={codeCap} style={{ fontSize: 14 }}>Scroll for all 4 outputs</Copy><ScrollView nestedScrollEnabled style={{ maxHeight: wide ? Math.max(120, win.height - 255) : large ? 140 : 200, flexGrow: 0 }} contentContainerStyle={{ gap: 6 }} accessibilityLabel="Four possible outputs">
      {d.choices.map((choice, i) => <Button compact quiet key={i} maxFontSizeMultiplier={codeCap} textStyle={{ fontFamily: face, fontSize: 14, textAlign: 'left' }} style={{ alignItems: 'stretch' }} label={`Output ${'ABCD'[i]}: ${choice.replace(/\n/g, ', then ')}${s.wrong.includes(i) ? ', crossed out' : ''}`} selected={s.prediction === i} disabled={inactive || s.wrong.includes(i) || s.edits >= FREE_EDITS && i !== d.answer} onPress={() => send(['p', i])}>{`${'ABCD'[i]}   ${choice.replace(/\n/g, ' · then ') || '(nothing)'}${s.wrong.includes(i) ? '  ×' : ''}`}</Button>)}
    </ScrollView></View>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {s.won ? onNext && <Button compact maxFontSizeMultiplier={cap} onPress={onNext} disabled={!active}>Next program</Button> : <Button compact maxFontSizeMultiplier={cap} disabled={inactive || !ready(s, d) || alreadyRun} onPress={() => { setTraceAt(0); send(['c']); }}>{d.mode === 'predict' ? 'Check prediction' : 'Run code'}</Button>}
      {d.mode === 'build' && !s.won && <Button compact quiet maxFontSizeMultiplier={cap} disabled={inactive || !s.undo.length || s.edits >= FREE_EDITS && nearest(d, s.undo.at(-1)!).distance >= nearest(d, s.picks).distance} onPress={() => send(['u'])}>Undo</Button>}
    </View>
    {!s.won && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {(['Look', 'One step', 'Clear'] as const).map((word, i) => <Button key={word} compact quiet maxFontSizeMultiplier={codeCap} textStyle={{ fontSize: 14 }} label={`${word} help`} disabled={inactive || s.help >= i + 1} onPress={() => send(['h', (i + 1) as 1|2|3])}>{word}</Button>)}
    </View>}
    <Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite" style={{ fontSize: 15 }}>{s.won ? 'That works. Take a look at the trace, or leave it here.' : alreadyRun ? 'This plan was already run. Change a choice to try another plan.' : s.failed ? 'Not yet. Your work is kept. Change a choice and try again.' : d.mode === 'predict' ? 'Choose what prints before you run.' : near ? 'Your plan is kept. The choices now point toward a working plan.' : 'Build the goal with the touch values.'}</Copy>
  </View>;
  return <View style={{ gap: 8 }}>
    <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 16, fontWeight: '700' }}>{`${d.idea} · ${d.mode === 'predict' ? 'Predict' : 'Build'}`}</Copy>
    {d.mode === 'build' && <ScrollView nestedScrollEnabled style={{ maxHeight: 64, flexGrow: 0 }} accessibilityLabel="Goal output"><Copy maxFontSizeMultiplier={codeCap} style={{ fontFamily: face, fontSize: 14 }}>Goal: {d.output.replace(/\n/g, ' · ')}</Copy></ScrollView>}
    <View testID="lab-workspace" style={{ flexDirection: wide ? 'row' : 'column', gap: 10, alignItems: 'stretch' }}>{code}{controls}</View>
    {!!s.help && !s.won && <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 15, backgroundColor: C.soft, padding: 9 }} accessibilityLiveRegion="polite">{hint(d, s)}</Copy>}
    {showTrace && <View style={{ gap: 6 }}>
      <Copy maxFontSizeMultiplier={codeCap} style={{ fontFamily: face, fontSize: 14 }}>Result: {result.output.join(' · then ') || '(nothing printed)'}</Copy>
      <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 15, fontWeight: '700' }}>Trace · line {(frame?.line ?? 0) + 1}</Copy>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 100, flexGrow: 0 }} accessibilityLabel="Values and printed output"><Copy maxFontSizeMultiplier={codeCap} style={{ fontFamily: face, fontSize: 14 }}>{frame ? Object.entries(frame.watch).map(([k, v]) => `${k} = ${pythonText(v)}`).join(' · ') : 'No values yet'}{'\n'}Printed: {frame?.output.join(' · ') || '(nothing yet)'}</Copy></ScrollView>
      {result.error && <Copy maxFontSizeMultiplier={cap}>{result.error}</Copy>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Button compact quiet maxFontSizeMultiplier={cap} disabled={!active && !s.won || !frame || cursor === 0} onPress={() => seek(cursor - 1)}>Earlier line</Button>
        <Button compact quiet maxFontSizeMultiplier={cap} disabled={!active && !s.won || !frame || cursor >= result.trace.length - 1} onPress={() => seek(cursor + 1)}>Next line</Button>
        <Button compact quiet maxFontSizeMultiplier={cap} disabled={!active && !s.won || !frame || cursor >= result.trace.length - 1} onPress={() => seek(result.trace.length - 1)}>Last line</Button>
      </View>
    </View>}
  </View>;
}
