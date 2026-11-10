import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import type { ChallengeProgress } from '../state/challenge';
import { Button, Chip, Copy, Heading } from '../components/ui';
import { presentationFor } from './presentation';
import { PackedBrowser } from './PackedBrowser';
import { bands, completionLookup, infoFor, isSolved, packsFor, mixedPack, type Reader } from './catalog';
export function PuzzleBrowser(props: { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; hidden: string[]; reader?: Reader; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void; onBack: () => void; onRemix: (card: ChallengeCard, remix: string) => void }) {
  return props.entry.packed && !props.entry.puzzles.length ? <PackedBrowser {...props}/> : <CardBrowser {...props}/>;
}
function CardBrowser({ entry, progress, initialBand, hidden, reader = 'Growing', onChoose, onBand, onBack, onRemix }: { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; hidden: string[]; reader?: Reader; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void; onBack: () => void; onRemix: (card: ChallengeCard, remix: string) => void }) {
  const [band, setBand] = useState(initialBand), [mode, setMode] = useState<'packs' | 'all' | 'album' | 'mixed'>('packs'), [pack, setPack] = useState(0);
  const presentation = presentationFor(entry);
  const index = useMemo(() => new Map(entry.puzzles.map((p, i) => [p.ref.hash, i + 1])), [entry]);
  const code = useMemo(() => completionLookup(progress, entry), [progress, entry]);
  const available = useMemo(() => entry.puzzles.filter(p => !hidden.includes(p.ref.hash)), [entry, hidden]);
  const cards = useMemo(() => available.filter(p => p.tier === band), [available, band]);
  const packs = useMemo(() => packsFor(cards), [cards]), complete = cards.length > 0 && cards.every(p => isSolved(code(p.ref)));
  const mixed = useMemo(() => mixedPack({ ...entry, puzzles: available }, progress, card => { const d = presentation.details(card); return { technique: d.techniques.join('|'), template: d.template }; }, 0, code), [entry, available, progress, presentation, code]);
  const visible = mode === 'packs' ? packs[pack] ?? packs[0] ?? [] : mode === 'mixed' ? mixed : mode === 'album' ? cards.filter(p => isSolved(code(p.ref))) : cards;
  const next = cards.find(p => !isSolved(code(p.ref)));
  return <FlatList style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 14 }} data={visible} keyExtractor={p => p.ref.hash} initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5}
    ListHeaderComponent={<View style={{ gap: 14 }}><Button quiet compact onPress={onBack}>← Cove</Button><Heading>{infoFor(entry.game).name}</Heading><Copy>Every band and pack is open. Next is just a suggestion. Reader: {reader}. Reading badges help you choose; a grown-up can read along.</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{bands.map((name, i) => <Chip key={name} selected={band === i + 1} onPress={() => { setBand(i + 1); setPack(0); onBand(i + 1); }}>{name}</Chip>)}</View>
      <Copy>{bands[band - 1]} · {cards.length} puzzles{cards[0] ? ` · ${presentation.details(cards[0]).specifics}` : ' · No puzzles in this band yet'}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip selected={mode === 'packs'} onPress={() => setMode('packs')}>Packs</Chip><Chip selected={mode === 'all'} onPress={() => setMode('all')}>All puzzles</Chip><Chip selected={mode === 'album'} onPress={() => setMode('album')}>Album · finished puzzles</Chip>{mixed.length > 0 && <Chip selected={mode === 'mixed'} onPress={() => setMode('mixed')}>Mixed practice · familiar techniques</Chip>}</View>
      {complete && <Copy>Every shown puzzle in this band is solved. Replay one, choose another band, or practise with a familiar puzzle.</Copy>}
      {mode === 'packs' && packs.length > 0 && <><Copy>Pack {Math.min(pack + 1, packs.length)} of {packs.length}</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{packs.map((_, i) => <Chip key={i} selected={pack === i} onPress={() => setPack(i)}>Pack {i + 1}</Chip>)}</View></>}
    </View>}
    renderItem={({ item: p, index: i }) => { const details = presentation.details(p), suitable = !details.readers?.length || details.readers.includes(reader); return <View style={{ gap: 6 }}><Button quiet onPress={() => onChoose(p)}>{p.title} · {mode === 'packs' ? i + 1 : index.get(p.ref.hash)}{isSolved(code(p.ref)) ? ' · Finished' : ''}</Button>{!!details.readers?.length && <Copy>{suitable ? 'For your reader level' : 'Read along together'} · {details.readers.join(', ')}</Copy>}{isSolved(code(p.ref)) && presentation.remixes?.map(remix => <Button quiet compact key={remix.id} onPress={() => onRemix(p, remix.id)}>Remix · {remix.label} · same puzzle</Button>)}</View>; }}
    ListEmptyComponent={<Copy>{mode === 'album' ? 'Finished puzzles will be here, in any order.' : 'Choose another band. Your finished history stays kept.'}</Copy>}
    ListFooterComponent={next ? <Button onPress={() => onChoose(next)}>Next suggestion</Button> : null}
  />;
}
