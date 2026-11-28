import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import { Copy, Heading, PressableScale } from '../components/ui';
import { selectRackTile, shuffleRack, solveRack, type RackSize } from './anagramsEngine';
import { changeSelection, createWordSession, finishRound, rematch, resumeRound, selectedWord, startSecondPlayer, submitWord, wordStatus, type WordMode } from './session';
import { useWordRound, type WordScreenProps } from './useWordRound';
import { Button, FinishSummary, FoundRibbon, foundWords, missedWords, ModePicker, PrivacyCard, RoundBar, SetupCopy, W, WordHeader, WordList } from './WordGameUI';
import { wordScore } from './scoring';
export function AnagramsScreen(props: WordScreenProps) {
  const { round, change, live, pause } = useWordRound(props);
  const [mode, setMode] = useState<WordMode>(round?.mode ?? 'chill'), [size, setSize] = useState<RackSize>(round?.game === 'anagrams' ? round.size : 6);
  const [feedback, setFeedback] = useState(''), [hint, setHint] = useState<number>(), [review, setReview] = useState('');
  const start = () => {
    const run = () => { change(createWordSession('anagrams', size, mode, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0, round?.best)); setFeedback(''); setHint(undefined); setReview(''); };
    if (props.beforeNewRound) props.beforeNewRound(run); else run();
  };
  const replay = () => {
    const run = () => { if (round) { change(rematch(round)); setReview(''); setFeedback(''); } };
    if (props.beforeNewRound) props.beforeNewRound(run); else run();
  };
  const submit = () => {
    const current = live.current;
    if (!current || current.phase !== 'playing') return;
    const word = selectedWord(current), status = wordStatus(current);
    setFeedback(status === 'new' ? `${word} +${wordScore(word)}` : status === 'found' ? `${word} · Found` : word.length < 3 ? 'Try three or more letters' : 'Try another word');
    if (status === 'new' && props.sound !== false) props.onFeedback?.('word');
    change(submitWord(current)); setHint(undefined);
  };
  if (round && round.game !== 'anagrams') return null;
  const status = round ? wordStatus(round) : 'building';
  return <View style={W.screen}><WordHeader game="anagrams" onBack={() => { pause(); props.onBack(); }}/>
    {!round ? <View style={W.panel}><Heading>Mix a little word magic</Heading><ModePicker mode={mode} setMode={setMode}/><View style={W.row}><Button small tone={size === 6 ? 'primary' : 'quiet'} onPress={() => setSize(6)}>6 tiles · Classic</Button><Button small tone={size === 7 ? 'primary' : 'quiet'} onPress={() => setSize(7)}>7 tiles · Big Rack</Button></View><SetupCopy game="anagrams" mode={mode}/><Copy>Tap letters to build a word. Tap a chosen tile or answer slot to remove it. Enter each word once.</Copy><Button onPress={start}>Start Anagrams</Button></View>
    : round.phase === 'handoff' || round.phase === 'paused' ? <PrivacyCard round={round} onReady={() => change(round.phase === 'handoff' ? startSecondPlayer(round) : resumeRound(round))} onBack={props.onBack}/>
    : round.phase === 'finished' ? <>
      <FinishSummary round={round} onAgain={start} onRematch={replay} onBack={props.onBack}/>
      <View style={W.banner}><Text style={W.big}>{review || round.tiles.join(' ')}</Text><Copy>Tap any word below to see how these letters fit.</Copy></View>
      <WordList title="Found Words" words={foundWords(round)} selected={review} onWord={setReview} grouped/>
      <WordList title="Best Words You Missed" words={missedWords(round, solveRack(round.tiles))} selected={review} onWord={setReview} grouped/>
      <View style={W.panel}><Heading>Next round</Heading><ModePicker mode={mode} setMode={setMode}/><View style={W.row}><Button small onPress={() => setSize(6)}>6 tiles</Button><Button small onPress={() => setSize(7)}>7 tiles</Button></View><Button onPress={start}>Start with these choices</Button></View>
    </> : <>
      <RoundBar round={round}/>
      <View style={[W.pill, { backgroundColor: status === 'new' ? '#1F7A5A' : status === 'found' ? '#B87A1E' : '#F3E4C9' }]}><Text accessibilityLiveRegion="polite" style={[W.word, status === 'new' ? { color: '#FFFDF8' } : status === 'found' ? { color: '#20160F' } : undefined]}>{selectedWord(round) || 'Build your word'}</Text><Text style={[W.label, status === 'new' ? { color: '#FFFDF8' } : status === 'found' ? { color: '#20160F' } : undefined]}>{status === 'new' ? `+${wordScore(selectedWord(round))}` : status === 'found' ? 'Found' : ''}</Text></View>
      <View testID="anagrams-answer" style={[W.row, { justifyContent: 'center', maxWidth: size === 7 && (props.width ?? 350) < 384 ? 240 : '100%', alignSelf: 'center' }]}>{Array.from({ length: round.size }, (_, slot) => {
        const tile = round.selection[slot];
        return <PressableScale key={slot} disabled={tile === undefined} accessibilityRole="button" accessibilityLabel={tile === undefined ? `Empty answer slot ${slot + 1}` : `Remove ${round.tiles[tile]} from slot ${slot + 1}`} onPress={() => change(changeSelection(round, round.selection.filter((_, i) => i !== slot)))} style={[W.tile, { width: 48, height: 52, backgroundColor: '#FFF4DC', borderBottomWidth: 2 }]}><Text style={W.letter}>{tile === undefined ? '·' : round.tiles[tile]}</Text></PressableScale>;
      })}</View>
      <View testID="anagrams-rack" style={[W.row, { justifyContent: 'center', paddingVertical: 12, maxWidth: round.size === 7 && (props.width ?? 350) < 384 ? 240 : '100%', alignSelf: 'center' }]}>{round.order.map(tile => <PressableScale key={tile} accessibilityRole="button" accessibilityLabel={`${round.tiles[tile]}, tile ${tile + 1}${round.selection.includes(tile) ? ', selected, tap to remove' : ''}`} accessibilityState={{ selected: round.selection.includes(tile) }} onPress={() => change(changeSelection(round, selectRackTile(round.selection, tile, round.size)))} style={[W.tile, { width: 48, height: 58, backgroundColor: hint === tile ? '#D6EBCA' : round.selection.includes(tile) ? '#E4D8C4' : '#F3D49C' }]}><Text style={W.letter}>{round.tiles[tile]}</Text></PressableScale>)}</View>
      <Text accessibilityLiveRegion="polite" style={W.label}>{feedback || 'Every word begins with a tap.'}</Text>
      <View style={W.row}><Button onPress={submit}>Enter</Button><Button tone="quiet" onPress={() => { change(changeSelection(round, round.selection, shuffleRack(round.order, round.seed + round.revision + 1))); if (props.sound !== false) props.onFeedback?.('tap'); }}>Shuffle</Button><Button tone="quiet" onPress={() => { change(changeSelection(round, [])); setHint(undefined); }}>Clear</Button></View>
      <View style={W.row}>{round.mode === 'chill' && <Button small tone="quiet" onPress={() => { const next = solveRack(round.tiles).find(word => !round.found[round.player].includes(word)); setHint(next ? round.tiles.indexOf(next[0]) : undefined); setFeedback(next ? `Try a ${next.length}-letter word. Start with the green tile.` : 'You found every word!'); }}>Hint</Button>}<Button small tone="quiet" onPress={pause}>Pause</Button><Button small tone="quiet" onPress={() => { change(finishRound(round)); if (props.sound !== false) props.onFeedback?.('finish'); }}>Finish round</Button></View>
      <FoundRibbon round={round}/><WordList title="Found Words" words={foundWords(round)} grouped/>
    </>}
  </View>;
}
