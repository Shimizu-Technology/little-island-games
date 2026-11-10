import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import type { ChallengeCard, ChallengeEntry, PackedBand } from '../challenge/types';
import type { ChallengeProgress } from '../state/challenge';
import { unpack } from '../state/saveBits';
import { Button, Chip, Copy, Heading } from '../components/ui';
import { latinRungs } from '../puzzles/latin/rungs';
import type { LatinKind } from '../puzzles/latin/core';
import { bands as bandNames, infoFor, isSolved, packedOpen } from './catalog';

const summaryOf = (game: string, b: PackedBand) => (latinRungs as Partial<Record<string, readonly { title: string; summary: string; size: number }[]>>)[game as LatinKind]?.find(r => r.title === b.title);
/** Bands and banks of a packed game. Every bank is open; entries load only when one is chosen. */
export function PackedBrowser({ entry, progress, initialBand, onChoose, onBand, onBack }: { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void; onBack: () => void }) {
  const packed = entry.packed!, opener = packedOpen(entry);
  const [tier, setTier] = useState(() => packed.bands.some(b => b.tier === initialBand) ? initialBand : packed.bands[0]?.tier ?? 1);
  const [list, setList] = useState<{ bank: number; album: boolean } | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const codes = useMemo(() => new Map(packed.bands.map(b => [b.bank, unpack(progress.banks.find(r => r[0] === b.bank)?.[1] ?? '', b.count, 3) ?? Array<number>(b.count).fill(0)])), [packed, progress]);
  const finished = (bank: number) => codes.get(bank)?.filter(isSolved).length ?? 0;
  const go = async (pick: () => Promise<ChallengeCard | undefined>) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { const card = await pick(); if (card) onChoose(card); else setMessage('This puzzle could not open. Try another.'); }
    catch { setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { setBusy(false); }
  };
  const next = (bank: number) => go(async () => packed.card(await packed.choose(bank, progress)));
  const open = (bank: number, index: number) => go(async () => opener?.open ? packed.card(await opener.open(bank, index)) : undefined);
  const banks = packed.bands.filter(b => b.tier === tier), current = list && packed.bands.find(b => b.bank === list.bank);
  const rows = current ? Array.from({ length: current.count }, (_, i) => i).filter(i => !list!.album || isSolved(codes.get(current.bank)?.[i] ?? 0)) : [];
  const header = <View style={{ gap: 14 }}>
    <Button quiet compact onPress={current ? () => setList(null) : onBack}>{current ? `← ${bandNames[tier - 1]}` : '← Cove'}</Button>
    <Heading>{infoFor(entry.game).name}</Heading>
    <Copy>Every band and pack is open. Puzzles in a pack go from gentler to harder. Next is just a suggestion.</Copy>
    {!current && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{bandNames.map((name, i) => <Chip key={name} selected={tier === i + 1} onPress={() => { setTier(i + 1); onBand(i + 1); }}>{name}</Chip>)}</View>}
    {busy && <Copy accessibilityLiveRegion="polite">Opening your puzzle…</Copy>}
    {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
    {current && <><Heading style={{ fontSize: 22 }}>{current.title} · {current.count} puzzles · {finished(current.bank)} finished</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Chip selected={!list!.album} onPress={() => setList({ bank: current.bank, album: false })}>All puzzles</Chip><Chip selected={list!.album} onPress={() => setList({ bank: current.bank, album: true })}>Album · finished puzzles</Chip></View></>}
    {!current && (banks.length ? banks.map(b => { const info = summaryOf(entry.game, b); return <View key={b.bank} style={{ gap: 8, paddingVertical: 6 }}>
      <Heading style={{ fontSize: 22 }}>{b.title}{info ? ` · ${info.size}×${info.size}` : ''}</Heading>
      {info && <Copy>{info.summary}</Copy>}
      <Copy>{b.count} puzzles · {finished(b.bank)} finished</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button disabled={busy} onPress={() => void next(b.bank)}>Next {b.title} puzzle</Button><Button quiet disabled={busy} onPress={() => setList({ bank: b.bank, album: false })}>All {b.count}</Button></View>
    </View>; }) : <Copy>No puzzles in this band yet. Choose another band.</Copy>)}
  </View>;
  return <FlatList style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }} data={rows} keyExtractor={i => String(i)} initialNumToRender={16} maxToRenderPerBatch={16} windowSize={5}
    ListHeaderComponent={header}
    renderItem={({ item: i }) => <Button quiet disabled={busy} onPress={() => void open(current!.bank, i)}>{`${current!.title} ${i + 1}${isSolved(codes.get(current!.bank)?.[i] ?? 0) ? ' · Finished' : ''}`}</Button>}
    ListEmptyComponent={current && list?.album ? <Copy>Finished puzzles will be here, in any order.</Copy> : null}
  />;
}
