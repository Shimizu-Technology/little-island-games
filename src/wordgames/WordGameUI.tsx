import React, { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { Button as IslandButton, C, Copy, Heading } from '../components/ui';
import { nativeDriver, useReducedMotion } from '../components/motion';
import { AtmosphereHeader } from '../atmosphere/AtmosphereHeader';
import { matchStats, roundDuration, type WordGame, type WordMode, type WordSession } from './session';
import { roundStats, totalScore, wordScore } from './scoring';
export function Button({ children, onPress, small = false, tone = 'primary', accessibilityLabel, disabled = false }: { children: React.ReactNode; onPress: () => void; small?: boolean; tone?: 'primary' | 'quiet'; accessibilityLabel?: string; disabled?: boolean }) {
  return <IslandButton compact={small} quiet={tone === 'quiet'} label={accessibilityLabel} onPress={onPress} disabled={disabled} style={{ minHeight: 48 }}>{children}</IslandButton>;
}
export const W = StyleSheet.create({
  screen: { gap: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  header: { padding: 16, gap: 5, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F3E4C9' },
  title: { fontSize: 30, fontWeight: '800', color: C.ink },
  label: { fontSize: 16, fontWeight: '700', color: C.ink },
  big: { fontSize: 28, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  panel: { borderRadius: 20, padding: 16, gap: 12, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#D1B78D' },
  pill: { minHeight: 54, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3E4C9', gap: 8 },
  word: { fontSize: 22, fontWeight: '800', color: C.ink, flexShrink: 1 },
  hint: { fontSize: 15, color: C.muted },
  banner: { backgroundColor: '#E2F2E4', padding: 14, borderRadius: 16, gap: 4 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { backgroundColor: '#F3D49C', borderColor: '#A06A35', borderBottomWidth: 4, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minHeight: 48, minWidth: 48 },
  letter: { fontSize: 29, fontWeight: '800', color: '#3D2B24' },
});
export function WordHeader({ game, onBack }: { game: WordGame; onBack: () => void }) {
  return <View style={W.header}><AtmosphereHeader rounded/><View style={W.row}><Button small tone="quiet" onPress={onBack}>Back</Button><Text accessibilityRole="header" style={W.title}>{game === 'word-hunt' ? 'Word Hunt' : 'Anagrams'}</Text></View><Copy>{game === 'word-hunt' ? 'Follow a trail. Discover a word.' : 'A handful of letters. A world of words.'}</Copy></View>;
}
export function ModePicker({ mode, setMode }: { mode: WordMode; setMode: (mode: WordMode) => void }) {
  return <View style={W.row}><Button small tone={mode === 'rush' ? 'primary' : 'quiet'} onPress={() => setMode('rush')}>Rush</Button><Button small tone={mode === 'chill' ? 'primary' : 'quiet'} onPress={() => setMode('chill')}>Chill / Kid Mode</Button><Button small tone={mode === 'pass-play' ? 'primary' : 'quiet'} onPress={() => setMode('pass-play')}>Pass & Play</Button></View>;
}
export function RoundBar({ round }: { round: WordSession }) {
  const stats = roundStats(round.found[round.player]);
  return <View style={[W.row, { justifyContent: 'space-between' }]}><Text style={W.big}>{stats.score.toLocaleString()} pts</Text><Text style={W.label}>{round.mode === 'chill' ? 'Chill · No timer' : `${Math.ceil(round.remainingMs / 1000)}s`}{round.mode === 'pass-play' ? ` · Player ${round.player + 1}` : ''}</Text><Text style={W.hint}>{stats.count} {stats.count === 1 ? 'word' : 'words'}{round.mode === 'pass-play' ? '' : ` · Best ${Math.max(round.best, stats.score).toLocaleString()}`}</Text></View>;
}
export function SetupCopy({ game, mode }: { game: WordGame; mode: WordMode }) {
  return <Copy>{mode === 'chill' ? 'Take your time. Hints give you a little nudge.' : mode === 'pass-play' ? `Two turns, the same ${game === 'word-hunt' ? 'board' : 'rack'}. Each player has ${roundDuration(game) / 1000} seconds. Keep your words secret until the scorecard!` : `${roundDuration(game) / 1000} seconds to find as many words as you can. Every word has at least three letters.`}</Copy>;
}
export function FinishSummary({ round, onAgain, onRematch, onBack }: { round: WordSession; onAgain: () => void; onRematch: () => void; onBack: () => void }) {
  const stats = matchStats(round), own = stats[round.player], bestWord = roundStats([...new Set(round.found.flat())]).longest;
  return <View testID="word-finish" style={W.panel}>
    <Text accessibilityRole="header" style={W.big}>{round.mode === 'pass-play' ? round.result?.winner === 'tie' ? 'A brilliant tie!' : `Player ${(round.result?.winner as number) + 1} wins!` : 'Lovely word finding!'}</Text>
    <Text style={W.label}>{round.mode === 'pass-play' ? `Player 1: ${stats[0].score.toLocaleString()} pts · Player 2: ${stats[1].score.toLocaleString()} pts` : `${own.score.toLocaleString()} points · ${own.count} ${own.count === 1 ? 'word' : 'words'}`}</Text>
    <Text style={W.label}>Best word: {bestWord || 'A fresh start awaits'}</Text>
    <View style={W.row}><Button onPress={onAgain}>Play Again</Button><Button tone="quiet" onPress={onRematch}>Rematch Same {round.game === 'word-hunt' ? 'Board' : 'Rack'}</Button><Button tone="quiet" onPress={onBack}>Back</Button></View>
    {round.mode === 'pass-play' && <View testID="word-scorecard" style={[W.row, { alignItems: 'stretch' }]}>{stats.map((stat, i) => <View key={i} style={[W.banner, { flex: 1, minWidth: 120 }]}><Text style={W.label}>Player {i + 1}</Text><Text style={W.label}>Total Score: {stat.score}</Text><Text style={W.hint}>Words Found: {stat.count}</Text><Text style={W.hint}>Unique Words: {stat.unique}</Text><Text style={W.hint}>Longest Word: {stat.longest || '—'}</Text></View>)}</View>}
  </View>;
}
/** The newest discovery settles into the ribbon; Reduce Motion keeps it still. */
export function FoundRibbon({ round }: { round: WordSession }) {
  const words = round.found[round.player], latest = words.at(-1), reduced = useReducedMotion();
  const [enter] = useState(() => new Animated.Value(1));
  useEffect(() => {
    enter.stopAnimation();
    if (!latest || reduced) { enter.setValue(1); return; }
    enter.setValue(0);
    const animation = Animated.timing(enter, { toValue: 1, duration: 180, useNativeDriver: nativeDriver });
    animation.start(); return () => animation.stop();
  }, [latest, reduced, enter]);
  if (!latest) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Recent word discoveries" contentContainerStyle={{ gap: 8 }}><Animated.View style={{ opacity: enter.interpolate({ inputRange: [0,1], outputRange: [0.6,1] }), transform: [{ translateX: enter.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }], backgroundColor: '#E2F2E4', borderRadius: 12, padding: 12 }}><Text style={W.label}>{latest} +{wordScore(latest)}</Text></Animated.View>{words.slice(-8,-1).reverse().map(word => <View key={word} style={{ padding: 12 }}><Text style={W.label}>{word}</Text></View>)}</ScrollView>;
}
export function WordList({ title, words, onWord, selected, grouped = false }: { title: string; words: readonly string[]; onWord?: (word: string) => void; selected?: string; grouped?: boolean }) {
  const lengths = grouped ? [...new Set(words.map(word => word.length))].sort((a, b) => b - a) : [0];
  return <View style={{ gap: 10 }}><Heading>{title} · {words.length}</Heading>{words.length === 0 && <Copy>Your next discovery is waiting.</Copy>}{lengths.map(length => <View key={length} style={{ gap: 8 }}>{length > 0 && <Text style={W.label}>{length} letters</Text>}<View style={W.words}>{words.filter(word => !length || word.length === length).map(word => onWord ? <Button key={word} small tone={selected === word ? 'primary' : 'quiet'} accessibilityLabel={`${word}, ${wordScore(word)} points, show letters`} onPress={() => onWord?.(word)}>{word} · {wordScore(word)}</Button> : <View key={word} style={{ minHeight: 48, padding: 12, backgroundColor: '#E2F2E4', borderRadius: 12 }}><Text style={W.label}>{word} · {wordScore(word)}</Text></View>)}</View></View>)}</View>;
}
export function PrivacyCard({ round, onReady, onBack }: { round: WordSession; onReady: () => void; onBack: () => void }) {
  return <View testID="word-privacy" style={W.panel}><Heading>{round.phase === 'handoff' ? 'Pass to Player 2!' : 'Your game is paused'}</Heading><Copy>{round.phase === 'handoff' ? 'Hand over the device. Your words stay hidden until both turns are finished.' : `Ready, Player ${round.player + 1}? Your letters and time are saved.`}</Copy><Button onPress={onReady}>{round.phase === 'handoff' ? 'Player 2 is ready' : 'Resume'}</Button><Button tone="quiet" onPress={onBack}>Back</Button></View>;
}
export function missedWords(round: WordSession, all: readonly string[]) {
  const found = new Set(round.mode === 'pass-play' ? round.found.flat() : round.found[0]);
  return all.filter(word => !found.has(word)).sort((a,b) => wordScore(b) - wordScore(a) || a.localeCompare(b));
}
export function foundWords(round: WordSession) { return [...new Set(round.mode === 'pass-play' && round.phase === 'finished' ? round.found.flat() : round.found[round.player])].sort((a,b) => b.length - a.length || a.localeCompare(b)); }
export { totalScore };
