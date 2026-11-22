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
import { buildHint, predictHelpLeft, predictHint, type Action, type BuildDescriptor, type PredictDescriptor, type State } from './challenge-engine';
import { deepCodes } from './program';
import { DEEP_COUNTS } from './mincost';
import { blockLabel } from './labels';
import { ProgramList } from './ProgramList';
import { ASPECT, SandCanvas, Thumbnail } from './SandCanvas';
import { bounds } from './picture';

const LETTERS = ['A', 'B', 'C', 'D'];
/** What the editor shows, step ideas first (short sides, the new turns, Grow) and pen colours last. The command codes themselves never move. */
const deepCards: [Block, number][] = (() => { const rank = (b: Block) => b.kind === 'forward' ? b.n : b.kind === 'turn' ? 200 + b.angle : b.kind === 'grow' ? 400 : 700; return deepCodes.map((b, c) => [b, c] as [Block, number]).sort((x, y) => rank(x[0]) - rank(y[0])); })();
const RULES: Record<'build' | 'predict', string> = { build: 'c2c-turtle-build-rules', predict: 'c2c-turtle-predict-rules' };
const picturesLabel = (lines: Segment[], letter: string, tone: string) => `Picture ${letter}. ${lines.length} ${lines.length === 1 ? 'line' : 'lines'}${lines.length > 1 && Math.hypot(lines[0].from.x - lines.at(-1)!.to.x, lines[0].from.y - lines.at(-1)!.to.y) < 1 ? ', ends where it began' : ''}.${tone}`;

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
  // While building on a phone the canvas gives some height to the palette below it.
  const side = Math.max(120, Math.min(width, sideBySide ? Math.min(width * 0.46, (win.height - 150) / ASPECT) : large ? 210 : d.kind === 'build' && width < 500 ? 230 : 300));
  const point = shownLines.at(-1)?.to ?? d.origin;
  const rules = RULES[d.kind], hearRules = prefs.sound !== false && learnSources[rules] ? <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => play(rules, true)}>Hear rules</Button> : null;
  const hearGrow = prefs.sound !== false && d.step === 3 && learnSources['c2c-turtle-grow'] ? <Button quiet compact maxFontSizeMultiplier={1.5} onPress={() => play('c2c-turtle-grow', true)}>Hear Grow</Button> : null;
  const canvas = <SandCanvas width={side} goal={d.kind === 'build' || s.won ? goal : []} traced={shownLines} point={point} labels={d.kind === 'build'} label={d.kind === 'build' ? `Sand canvas with the faint picture to draw. ${shownLines.length} lines drawn.` : s.won ? `The program drew ${shownLines.length} of ${lines.length} lines.` : 'Sand canvas. The picture appears here after you check.'} />;
  // Nothing is drawn until the check, so the pictures take the room the empty sand would.
  const showCanvas = d.kind === 'build' || s.won || running;
  const body = d.kind === 'build' ? <BuildControls compact={!sideBySide && win.width < 500} room={editorRoom(win.height, sideBySide)} s={s} d={d} active={active} running={running} dispatch={dispatch} commit={commit} sessionKey={sessionKey} play={play} hear={<>{hearRules}{hearGrow}</>} />
    : <PredictControls s={s} d={d} active={active} running={running} dispatch={dispatch} play={play} width={sideBySide && showCanvas ? width - side - 12 : width} large={large} hear={<>{hearRules}{hearGrow}</>} />;
  // Once settled, a right prediction keeps its drawing and program and leaves the room below for what comes next.
  if (!pinned && d.kind === 'predict' && s.won) return <View style={{ gap: 10 }}><View style={{ alignItems: 'center' }}>{canvas}</View><Copy testID="turtle-message" maxFontSizeMultiplier={1.5}>Yes! That is the picture.</Copy><ProgramList blocks={d.program} label="The program" testID="turtle-program" compact={large} /></View>;
  // Settled and right: keep the drawing and the program, and leave the room below for what comes next.
  if (!pinned && d.kind === 'build' && s.won) return <View style={{ gap: 10 }}><View style={{ alignItems: 'center' }}>{canvas}</View><Copy testID="turtle-message" maxFontSizeMultiplier={1.5}>You drew it!</Copy><ProgramList blocks={s.program} label="Your blocks" testID="turtle-program" compact={large} /></View>;
  if (!pinned) return <View style={{ gap: 10 }}>{showCanvas && <View style={{ alignItems: 'center' }}>{canvas}</View>}{body}</View>;
  const stack = <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} accessibilityLabel="Turtle program and help">{header}{body}{footer}</ScrollView>;
  return sideBySide && showCanvas
    ? <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 12 }}><View style={{ width: side }}>{canvas}</View><View style={{ flex: 1, minWidth: 0 }}>{stack}</View></View>
    : <View style={{ flex: 1, minHeight: 0, gap: 8 }}>{showCanvas && <View style={{ alignItems: 'center' }}>{canvas}</View>}{stack}</View>;
}

/** Height for the block editor. Beside the canvas it has the whole column; stacked under it, most of the screen. */
export const editorRoom = (windowHeight: number, sideBySide: boolean) => Math.min(640, Math.max(420, sideBySide ? windowHeight - 190 : Math.round(windowHeight * 0.7)));
type Play = (key: string, automatic?: boolean) => unknown;
function BuildControls({ s, d, active, running, dispatch, commit, sessionKey, play, hear, room, compact }: { room: number; compact: boolean; s: State; d: BuildDescriptor; active: boolean; running: boolean; dispatch: (a: Action) => void; commit: ChallengeViewProps<State, Action>['commit']; sessionKey?: string; play: Play; hear: React.ReactNode }) {
  // The editor keeps its place, undo history and scroll across edits. Only an explicit Reset plan starts it afresh; the round itself is keyed by the frame.
  const [resets, setResets] = useState(0);
  const program = s.draft ? decodeProgram(s.draft, code => code < deepCodes.length) : null;
  const current = program ?? emptyProgram(), idle = !active || running || s.won;
  const hint = buildHint(d, s.program, s.hintStage);
  const message = s.won ? 'You drew it!' : running ? 'Watch the turtle draw.' : s.runs > 0 ? 'Not quite. Your blocks are kept. Change one and Go again.' : compact ? 'Build blocks that draw the faint picture.' : 'Build blocks that draw the faint picture. A Repeat can hold blocks that run again.';
  return <View style={{ gap: 8 }}>
    <Copy testID="turtle-message" maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{message}</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button maxFontSizeMultiplier={1.5} style={{ flexGrow: 1 }} disabled={idle || !s.program.length} onPress={() => dispatch(['g'])}>Go!</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || s.hintStage >= 3} onPress={() => dispatch(['h'])}>{s.hintStage ? 'More help' : 'Help'}</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || (!s.draft && !s.program.length)} onPress={() => { setResets(n => n + 1); dispatch(['z']); }}>Reset plan</Button>
      {hear}
    </View>
    {s.hintStage > 0 && !s.won && <View accessibilityLiveRegion="polite" testID="turtle-hint" style={{ gap: 6, padding: 10, borderRadius: 12, backgroundColor: C.soft }}>
      <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{hint.text}</Copy>
      {hint.reveal && <ProgramList blocks={hint.reveal} label="One way to draw the picture" testID="turtle-reveal" />}
    </View>}
    <ProgramEditor key={`plan-${resets}`} program={current} songs={false} tray={d.tray} maxHeight={room} planHeight={compact ? 100 : undefined} counts={DEEP_COUNTS} disabled={idle} hear={name => play(name, true)}
      cards={deepCards.map(([block, code]) => ({ code, name: blockLabel(block), icon: <Copy maxFontSizeMultiplier={1.3}>{block.kind === 'forward' ? '↑' : block.kind === 'turn' ? '↻' : block.kind === 'grow' ? '＋' : '●'}</Copy>, speech: `k7-turtle-${code}` }))}
      onChange={async next => !!commit && !!sessionKey && !!(await commit(['e', programOperations(current, next)], sessionKey))} />
  </View>;
}

function PredictControls({ s, d, active, running, dispatch, play, width, large, hear }: { s: State; d: PredictDescriptor; active: boolean; running: boolean; dispatch: (a: Action) => void; play: Play; width: number; large: boolean; hear: React.ReactNode }) {
  const pictures = useMemo(() => d.choices.map(c => draw(c, d.origin) ?? []), [d]);
  const frame = useMemo(() => { const all = pictures.flatMap(p => bounds(p) ? [bounds(p)!] : []); return { left: Math.min(...all.map(b => b.left)), top: Math.min(...all.map(b => b.top)), right: Math.max(...all.map(b => b.right)), bottom: Math.max(...all.map(b => b.bottom)) }; }, [pictures]);
  // Two by two even at the largest text: the four pictures and Check stay together. Only a very narrow board stacks them.
  const win = useWindowDimensions(), wide = win.width > win.height && width >= 720, tight = large && !wide && width < 500;
  const idle = !active || running || s.won, columns = width >= 300 ? 2 : 1, cell = Math.max(96, Math.min(wide ? 180 : tight ? 130 : width < 500 ? 140 : 230, Math.floor((Math.min(wide ? 400 : width, 520) - 10 * (columns - 1)) / columns)));
  const stage = s.hintStage;
  const message = s.won ? 'Yes! That is the picture.' : s.wrong.length && s.pick === null ? 'Not that one. It is crossed out. Choose again.' : 'Pick the picture this program draws. Nothing draws until you check.';
  const messageLine = <Copy testID="turtle-message" maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite">{message}</Copy>;
  const program = <ProgramList blocks={d.program} label="The program" testID="turtle-program" compact={tight} />;
  const grid = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: columns * cell + (columns - 1) * 10, alignSelf: 'center' }} accessibilityLabel="Four pictures">
      {pictures.map((lines, i) => {
        const out = s.wrong.includes(i) || s.ruled.includes(i), chosen = s.pick === i, answer = s.won && d.answer === i;
        const tone = out ? ' Crossed out.' : chosen ? ' Chosen.' : answer ? ' The answer.' : '';
        return <PressableScale key={i} accessibilityRole="button" accessibilityLabel={picturesLabel(lines, LETTERS[i], tone)} accessibilityState={{ selected: chosen, disabled: idle || out }} disabled={idle || out} onPress={() => { play('tap', true); dispatch(['s', i]); }}
          style={{ width: cell, minHeight: 44, padding: 4, borderRadius: 14, borderWidth: chosen || answer ? 3 : 1, borderColor: chosen || answer ? C.teal : C.line, backgroundColor: C.paper, opacity: out ? 0.55 : 1, alignItems: 'center', gap: 2 }}>
          <Thumbnail lines={lines} frame={frame} size={cell - 14} tone={out ? 'out' : chosen ? 'chosen' : 'plain'} />
          <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: '800', color: C.ink }}>{LETTERS[i]}{out ? ' ✕' : answer ? ' ✓' : ''}</Copy>
        </PressableScale>;
      })}
    </View>;
  const actions = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button maxFontSizeMultiplier={1.5} style={{ flexGrow: 1 }} disabled={idle || s.pick === null} onPress={() => dispatch(['c'])}>Check my picture</Button>
      <Button quiet compact maxFontSizeMultiplier={1.5} disabled={idle || !predictHelpLeft(s, d)} onPress={() => dispatch(['h'])}>{stage ? 'More help' : 'Help'}</Button>
      {hear}
    </View>;
  const hintPanel = stage > 0 && !s.won && <View accessibilityLiveRegion="polite" testID="turtle-hint" style={{ padding: 10, borderRadius: 12, backgroundColor: C.soft }}><Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink }}>{predictHint(d, stage, s.ruled)}</Copy></View>;
  // In a wide landscape window the program reads on the left and the pictures, Check and Help stay together on the right.
  return wide
    ? <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}><View style={{ flex: 1, minWidth: 0, gap: 8 }}>{messageLine}{program}</View><View style={{ width: columns * cell + (columns - 1) * 10, gap: 8 }}>{grid}{actions}{hintPanel}</View></View>
    : tight ? <View style={{ gap: 8 }}>{program}{grid}{actions}{hintPanel}{messageLine}</View>
    : <View style={{ gap: 8 }}>{messageLine}{program}{grid}{actions}{hintPanel}</View>;
}
