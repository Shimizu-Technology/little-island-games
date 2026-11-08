import React, { useState } from 'react';
import { View } from 'react-native';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import type { ChallengeProgress } from '../state/challenge';
import { Button, Chip, Copy, Heading } from '../components/ui';
import { presentationFor } from './presentation';
import { bands, completion, infoFor, isSolved, packsFor, mixedPack } from './catalog';
export function PuzzleBrowser({ entry, progress, initialBand, hidden, onChoose, onBand, onBack, onRemix }: { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; hidden: string[]; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void; onBack: () => void; onRemix: (card: ChallengeCard, remix: string) => void }) {
  const [band, setBand] = useState(initialBand), [mode, setMode] = useState<'packs' | 'all' | 'album' | 'mixed'>('packs'), [pack, setPack] = useState(0);
  const cards = entry.puzzles.filter(p => p.tier === band && !hidden.includes(p.ref.hash)), packs = packsFor(cards), complete = cards.length > 0 && cards.every(p => isSolved(completion(progress, p.ref, entry)));
  const presentation = presentationFor(entry), mixed = mixedPack({ ...entry, puzzles: entry.puzzles.filter(p => !hidden.includes(p.ref.hash)) }, progress, card => { const d = presentation.details(card); return { technique: d.techniques.join('|'), template: d.template }; });
  const visible = mode === 'packs' ? packs[pack] ?? packs[0] ?? [] : mode === 'mixed' ? mixed : mode === 'album' ? cards.filter(p => isSolved(completion(progress, p.ref, entry))) : cards;
  return <View style={{ gap: 14 }}><Button quiet compact onPress={onBack}>← Cove</Button><Heading>{infoFor(entry.game).name}</Heading><Copy>Every band and pack is open. Next is just a suggestion.</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{bands.map((name, i) => <Chip key={name} selected={band === i + 1} onPress={() => { setBand(i + 1); setPack(0); onBand(i + 1); }}>{name}</Chip>)}</View>
    <Copy>{bands[band - 1]} · {cards.length} puzzles{cards[0] ? ` · ${presentation.details(cards[0]).specifics}` : ' · No puzzles in this band yet'}</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip selected={mode === 'packs'} onPress={() => setMode('packs')}>Packs</Chip><Chip selected={mode === 'all'} onPress={() => setMode('all')}>All puzzles</Chip><Chip selected={mode === 'album'} onPress={() => setMode('album')}>Album · finished puzzles</Chip>{mixed.length > 0 && <Chip selected={mode === 'mixed'} onPress={() => setMode('mixed')}>Mixed practice · familiar techniques</Chip>}</View>
    {complete && <Copy>Every shown puzzle in this band is solved. Replay one, choose another band, or practise with a familiar puzzle.</Copy>}
    {mode === 'packs' && packs.length > 0 && <><Copy>Pack {Math.min(pack + 1, packs.length)} of {packs.length}</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{packs.map((_, i) => <Chip key={i} selected={pack === i} onPress={() => setPack(i)}>Pack {i + 1}</Chip>)}</View></>}
    {visible.map((p, i) => <View key={p.ref.hash} style={{ gap: 6 }}><Button quiet onPress={() => onChoose(p)}>{p.title} · {mode === 'packs' ? i + 1 : entry.puzzles.indexOf(p) + 1}{isSolved(completion(progress, p.ref, entry)) ? ' · Finished' : ''}</Button>{isSolved(completion(progress, p.ref, entry)) && presentation.remixes?.map(remix => <Button quiet compact key={remix.id} onPress={() => onRemix(p, remix.id)}>Remix · {remix.label} · same puzzle</Button>)}</View>)}
    {visible.length === 0 && <Copy>{mode === 'album' ? 'Finished puzzles will be here, in any order.' : 'Choose another band. Your finished history stays kept.'}</Copy>}
    {cards.find(p => !isSolved(completion(progress, p.ref, entry))) && <Button onPress={() => onChoose(cards.find(p => !isSolved(completion(progress, p.ref, entry)))!)}>Next suggestion</Button>}
  </View>;
}
