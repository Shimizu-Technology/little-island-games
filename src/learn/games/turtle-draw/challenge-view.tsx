/** Deep Water boards: draw it (the K7 block editor within a tray) and predict the picture (four pictures, pick one, then watch it drawn). */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Button, C, Copy, PressableScale } from '../../../components/ui';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import { useReducedMotion } from '../../../components/motion';
import { LARGE_TEXT } from '../../../components/wordFit';
import { learnSources } from '../../../content/learnAudio';
import type { ChallengeViewProps } from '../../../challenge/types';
import { ProgramEditor } from '../../program/ProgramEditor';
import { decodeProgram } from '../../program/codec';
import { programOperations } from '../../program/operations';
import { emptyProgram } from '../../program/model';
import { draw, type Block, type Segment } from './engine';
import { blockCost } from './dsl';
import { buildHint, predictHint, type Action, type BuildDescriptor, type PredictDescriptor, type State } from './challenge-engine';
import { deepCodes } from './program';
import { DEEP_COUNTS } from './mincost';
import { blockLabel } from './labels';
import { ProgramList } from './ProgramList';
import { ASPECT, SandCanvas, Thumbnail } from './SandCanvas';
import { bounds } from './picture';

const LETTERS = ['A', 'B', 'C', 'D'];
const RULES: Record<'build' | 'predict', string> = { build: 'c2c-turtle-build-rules', predict: 'c2c-turtle-predict-rules' };
const picturesLabel = (lines: Segment[], letter: string, tone: string) => `Picture ${letter}. ${lines.length} lines${lines.length > 1 && Math.hypot(lines[0].from.x - lines.at(-1)!.to.x, lines[0].from.y - lines.at(-1)!.to.y) < 1 ? ', ends where it began' : ''}.${tone}`;

export function ChallengeBoard({ state: s, dispatch, active, width, onSettled, header, footer, commit, sessionKey }: ChallengeViewProps<State, Action>) {
  const d = s.descriptor, prefs = useContext(AudioPreferences), { play, stop } = useSoundControls(prefs.sound ?? true), reduced = useReducedMotion();
  const win = useWindowDimensions(), large = win.fontScale >= LARGE_TEXT, pinned = header !== undefined;
  const sideBySide = pinned && win.width > win.height && width >= 520;
  const shown: Block[] = d.kind === 'build' ? s.program : d.program;
  const lines = useMemo(() => (shown.length ? draw(shown, d.origin) : null) ?? [], [shown, d.origin]);
  const goal = useMemo(() => draw(d.kind === 'build' ? d.target : d.program, d.origin) ?? [], [d]);
  const key = JSON.stringify(shown);
  const [playback, setPlayback] = useState({ run: s.runs, key, cursor: s.won ? lines.length : 0, playing: false }), [seen, setSeen] = useState(s.runs);
  const [reopened] = useState(s.won), missed = useRef(s.wrong.length);
  useEffect(() => { if (reopened) onSettled?.(); }, [reopened, onSettled]);
  // A run (or a right check) draws the picture line by line. A wrong check draws nothing.
  if (seen !== s.runs) { setSeen(s.runs); if (d.kind === 'build' || s.won) setPlayback({ run: s.runs, key, cursor: 0, playing: true }); }
  useEffect(() => { if (s.wrong.length > missed.current) { missed.current = s.wrong.length; play('wrong', true); } }, [s.wrong.length, play]);
  useEffect(() => {
    if (!active || !playback.playing) return;
    const timer = setTimeout(() => {
      if (playback.cursor < lines.length) { setPlayback(p => ({ ...p, cursor: p.cursor + 1 })); play('tap', true); }
      else { setPlayback(p => ({ ...p, playing: false })); play(s.won ? 'win' : 'wrong', true); onSettled?.(); }
    }, reduced ? 20 : Math.max(35, Math.min(220, 4000 / Math.max(1, lines.length))));
    return () => clearTimeout(timer);
  }, [active, playback, lines.length, reduced, s.won, onSettled, play]);
  useEffect(() => { if (!active) stop(); return stop; }, [active, stop]);
  const running = playback.playing || playback.run !== s.runs && (d.kind === 'build' || s.won);
  const cursor = playback.key === key && playback.run === s.runs ? playback.cursor : s.won && playback.run === s.runs ? lines.length : 0;
  const shownLines = d.kind === 'predict' && !s.won ? [] : lines.slice(0, cursor);
  const side = Math.max(120, Math.min(width, sideBySide ? Math.min(width * 0.46, (win.height - 150) / ASPECT) : large ? 210 : 300));
  const point = shownLines.at(-1)?.to ?? d.origin;
  const rules = RULES[d.kind], hearRules = prefs.sound !== false && learnSources[rules] ? <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => play(rules, true)}>Hear rules</Button> : null;
  const canvas = <SandCanvas width={side} goal={d.kind === 'build' || s.won ? goal : []} traced={shownLines} point={point} labels={d.kind === 'build'} label={d.kind === 'build' ? `Sand canvas with the faint picture to draw. ${shownLines.length} lines drawn.` : s.won ? `The program drew ${shownLines.length} of ${lines.length} lines.` : 'Sand canvas. The picture appears here after you check.'} />;
  const body = d.kind === 'build' ? <BuildControls s={s} d={d} active={active} running={running} dispatch={dispatch} commit={commit} sessionKey={sessionKey} play={play} hear={hearRules} />
    : <PredictControls s={s} d={d} active={active} running={running} dispatch={dispatch} play={play} width={sideBySide ? width - side - 12 : width} large={large} hear={hearRules} />;
  if (!pinned) return <View style={{ gap: 10 }}>{canvas}{body}</View>;
  const stack = <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} accessibilityLabel="Turtle program and help">{header}{body}{footer}</ScrollView>;
  return sideBySide
    ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 }}><View style={{ width: side }}>{canvas}</View><View style={{ flex: 1, minWidth: 0 }}>{stack}</View></View>
    : <View style={{ flex: 1, minHeight: 0, gap: 8 }}><View style={{ alignItems: 'center' }}>{canvas}</View>{stack}</View>;
}

type Play = (key: string, automatic?: boolean) => unknown;
function BuildControls({ s, d, active, running, dispatch, commit, sessionKey, play, hear }: { s: State; d: BuildDescriptor; active: boolean; running: boolean; dispatch: (a: Action) => void; commit: ChallengeViewProps<State, Action>['commit']; sessionKey?: string; play: Play; hear: React.ReactNode }) {
  const program = s.draft ? decodeProgram(s.draft, code => code < deepCodes.length) : null;
  const current = program ?? emptyProgram(), idle = !active || running || s.won;
  const hint = buildHint(d, s.program, s.hintStage);
  const message = s.won ? 'You drew it!' : running ? 'Watch the turtle draw.' : s.runs > 0 ? 'Not quite. Your blocks are kept. Change one and Go again.' : 'Build blocks that draw the faint picture. A Repeat can hold blocks that run again.';
  return <View style={{ gap: 8 }}>
    <Copy testID="turtle-message" maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{message}</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button maxFontSizeMultiplier={1.5} style={{ flexGrow: 1 }} disabled={idle || !s.program.length} onPress={() => dispatch(['g'])}>Go!</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || s.hintStage >= 3} onPress={() => dispatch(['h'])}>{s.hintStage ? 'More help' : 'Help'}</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || (!s.draft && !s.program.length)} onPress={() => dispatch(['z'])}>Reset plan</Button>
      {hear}
    </View>
    {s.hintStage > 0 && !s.won && <View accessibilityLiveRegion="polite" testID="turtle-hint" style={{ gap: 6, padding: 10, borderRadius: 12, backgroundColor: C.soft }}>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{hint.text}</Copy>
      {hint.reveal && <ProgramList blocks={hint.reveal} label="One way to draw the picture" testID="turtle-reveal" />}
    </View>}
    <ProgramEditor key={`${sessionKey}:${s.draft === null}`} program={current} songs={false} tray={d.tray} counts={DEEP_COUNTS} disabled={idle} hear={name => play(name, true)}
      cards={deepCodes.map((block, code) => ({ code, name: blockLabel(block), icon: <Copy maxFontSizeMultiplier={1.3}>{block.kind === 'forward' ? '↑' : block.kind === 'turn' ? '↻' : block.kind === 'grow' ? '＋' : '●'}</Copy>, speech: `k7-turtle-${code}` }))}
      onChange={async next => !!commit && !!sessionKey && !!(await commit(['e', programOperations(current, next)], sessionKey))} />
    <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 13 }}>{`Tray · ${blockCost(s.program)} of ${d.tray} blocks`}</Copy>
  </View>;
}

function PredictControls({ s, d, active, running, dispatch, play, width, large, hear }: { s: State; d: PredictDescriptor; active: boolean; running: boolean; dispatch: (a: Action) => void; play: Play; width: number; large: boolean; hear: React.ReactNode }) {
  const pictures = useMemo(() => d.choices.map(c => draw(c, d.origin) ?? []), [d]);
  const frame = useMemo(() => { const all = pictures.flatMap(p => bounds(p) ? [bounds(p)!] : []); return { left: Math.min(...all.map(b => b.left)), top: Math.min(...all.map(b => b.top)), right: Math.max(...all.map(b => b.right)), bottom: Math.max(...all.map(b => b.bottom)) }; }, [pictures]);
  const idle = !active || running || s.won, columns = large ? 1 : 2, cell = Math.max(96, Math.floor((Math.min(width, 420) - 10 * (columns - 1)) / columns));
  const stage = s.hintStage;
  const message = s.won ? 'Yes! That is the picture. Watch it drawn.' : s.wrong.length && s.pick === null ? 'Not that one. It is crossed out. Choose again.' : 'Read the program, then choose the picture it draws. Nothing is drawn until you check.';
  return <View style={{ gap: 8 }}>
    <Copy testID="turtle-message" maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{message}</Copy>
    <ProgramList blocks={d.program} label="The program" testID="turtle-program" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityLabel="Four pictures">
      {pictures.map((lines, i) => {
        const out = s.wrong.includes(i) || s.ruled.includes(i), chosen = s.pick === i, answer = s.won && d.answer === i;
        const tone = out ? ' Crossed out.' : chosen ? ' Chosen.' : answer ? ' The answer.' : '';
        return <PressableScale key={i} accessibilityRole="button" accessibilityLabel={picturesLabel(lines, LETTERS[i], tone)} accessibilityState={{ selected: chosen, disabled: idle || out }} disabled={idle || out} onPress={() => { play('tap', true); dispatch(['s', i]); }}
          style={{ width: cell, minHeight: 44, padding: 4, borderRadius: 14, borderWidth: chosen || answer ? 3 : 1, borderColor: chosen || answer ? C.teal : C.line, backgroundColor: C.paper, opacity: out ? 0.55 : 1, alignItems: 'center', gap: 2 }}>
          <Thumbnail lines={lines} frame={frame} size={cell - 14} tone={out ? 'out' : chosen ? 'chosen' : 'plain'} />
          <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '800', color: C.ink }}>{LETTERS[i]}{out ? ' ✕' : answer ? ' ✓' : ''}</Copy>
        </PressableScale>;
      })}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button maxFontSizeMultiplier={1.5} style={{ flexGrow: 1 }} disabled={idle || s.pick === null} onPress={() => dispatch(['c'])}>Check my picture</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || stage >= 3} onPress={() => dispatch(['h'])}>{stage ? 'More help' : 'Help'}</Button>
      {hear}
    </View>
    {stage > 0 && !s.won && <View accessibilityLiveRegion="polite" testID="turtle-hint" style={{ padding: 10, borderRadius: 12, backgroundColor: C.soft }}><Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{predictHint(d, stage)}</Copy></View>}
  </View>;
}
