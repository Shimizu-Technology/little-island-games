import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Icon, PressTarget, Sheet, Text, glyphs, theme } from '../ui';
import type { IconGlyph } from '../ui';
import type { Mistakes } from './local';
import { CoveMotif } from './CoveArt';
import { FaceButton } from './PeoplePicker';
import { TIPS } from './shelf';

/** Mistake checking in plain words; the saved values stay `Friendly`, `Plain` and `Rewind`. */
export const MISTAKE_WORDS: readonly { value: Mistakes; label: string }[] = [
  { value: 'Friendly', label: 'Friendly' },
  { value: 'Plain', label: 'Check when I ask' },
  { value: 'Rewind', label: 'Rewind' },
];
function Row({ glyph, label, onPress, disabled }: { glyph: IconGlyph; label: string; onPress: () => void; disabled?: boolean }) {
  return <PressTarget testID={`more-${label}`} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.row}>
    <Icon glyph={glyph} tone="lagoon"/><Text variant="body" style={styles.rowWord}>{label}</Text>
  </PressTarget>;
}
type Step = 'main' | 'send' | 'tips' | 'roles' | 'restart';

/**
 * The board's More sheet: short, undimmed and over the bottom of the screen so the board stays in view above it.
 * Everything that is not playing lives here, each one tap away, with sub-steps (Send to…, How to play, Roles,
 * Restart) shown in place with a way back.
 */
export function RoundMore({ visible, onClose, game, mistakes, onMistakes, onRestart, onNew, onChoose, people, onSend, role, onGrownUps, busy }: {
  visible: boolean;
  onClose: () => void;
  game: string;
  mistakes?: Mistakes;
  onMistakes?: (value: Mistakes) => void;
  onRestart?: () => void;
  onNew?: () => void;
  onChoose?: () => void;
  /** People this puzzle can be sent to. */
  people: readonly { id: string; name: string }[];
  onSend?: (to: string) => Promise<boolean>;
  /** The together role card, only while playing together. */
  role?: string;
  onGrownUps?: () => void;
  busy?: boolean;
}) {
  const [view, setView] = useState<Step>('main'), [sent, setSent] = useState('');
  const close = () => { setView('main'); setSent(''); onClose(); };
  const back = <Button label="Back" variant="quiet" target="adult" onPress={() => { setView('main'); setSent(''); }}/>;
  const tips = TIPS[game] ?? [];
  return <Sheet mode="small" visible={visible} title={view === 'send' ? 'Send to…' : view === 'tips' ? 'How to play' : view === 'roles' ? 'Roles' : view === 'restart' ? 'Restart this puzzle?' : 'More'} onClose={close}>
    {view === 'main' && <>
      {onMistakes && <View accessibilityRole="radiogroup" accessibilityLabel="Mistakes" style={styles.chips}>
        {MISTAKE_WORDS.map(m => <PressTarget key={m.value} role="radio" checked={mistakes === m.value} testID={`mistakes-${m.value}`} accessibilityLabel={`Mistakes: ${m.label}`} onPress={() => onMistakes(m.value)} style={[styles.chip, { backgroundColor: mistakes === m.value ? theme.colors.lagoon : theme.colors.lagoonSoft }]}>
          <Text variant="caption" tone={mistakes === m.value ? 'surface' : 'ink'} style={styles.rowWord}>{m.label}</Text>
        </PressTarget>)}
      </View>}
      {onRestart && <Row glyph={glyphs.ArrowClockwise} label="Restart this puzzle" disabled={busy} onPress={() => setView('restart')}/>}
      {onNew && <Row glyph={glyphs.Plus} label="New puzzle" disabled={busy} onPress={() => { close(); onNew(); }}/>}
      {onChoose && <Row glyph={glyphs.GridFour} label="Choose a puzzle" onPress={() => { close(); onChoose(); }}/>}
      {onSend && people.length > 0 && <Row glyph={glyphs.PaperPlaneTilt} label="Send to…" onPress={() => setView('send')}/>}
      {!!role && <Row glyph={glyphs.UsersThree} label="Roles" onPress={() => setView('roles')}/>}
      {tips.length > 0 && <Row glyph={glyphs.Question} label="How to play" onPress={() => setView('tips')}/>}
      {onGrownUps && <Row glyph={glyphs.LockSimple} label="Grown-ups" onPress={() => { close(); onGrownUps(); }}/>}
    </>}
    {view === 'restart' && <>
      <Button testID="more-restart-confirm" label="Restart" disabled={busy} onPress={() => { close(); onRestart?.(); }}/>
      <Button label="Keep playing" variant="quiet" target="adult" onPress={() => setView('main')}/>
    </>}
    {view === 'send' && <>
      {sent ? <Text variant="body" accessibilityLiveRegion="polite">Sent to {sent}.</Text> : <View style={styles.faces}>{people.map(p => <FaceButton key={p.id} id={p.id} name={p.name} label={`Send to ${p.name}`} onPress={() => void onSend?.(p.id).then(ok => { if (ok) setSent(p.name); })}/>)}</View>}
      {back}
    </>}
    {view === 'roles' && <><Text variant="body">{role}</Text>{back}</>}
    {view === 'tips' && <>
      <View style={styles.tipArt}><CoveMotif game={game} size={64}/></View>
      {tips.map((tip, i) => <View key={tip} style={styles.tip}><View style={styles.dot}><Text variant="caption" tone="surface" style={styles.rowWord}>{i + 1}</Text></View><Text variant="body" style={styles.tipWord}>{tip}</Text></View>)}
      {back}
    </>}
  </Sheet>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space.lg, borderRadius: theme.radius.full },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.xs },
  rowWord: { fontWeight: '700' },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  tipArt: { alignItems: 'center' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  dot: { width: 32, height: 32, borderRadius: theme.radius.full, backgroundColor: theme.colors.lagoon, alignItems: 'center', justifyContent: 'center' },
  tipWord: { flex: 1 },
} as const;
