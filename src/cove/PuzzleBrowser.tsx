import React, { useMemo, useState } from 'react';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import type { ChallengeProgress } from '../state/challenge';
import { presentationFor } from './presentation';
import { PackedBrowser } from './PackedBrowser';
import { ChooseGrid, type Filter } from './ChooseGrid';
import { completionLookup, isSolved, mixedPack, type Reader } from './catalog';
import { difficultyOptionsFor, nearestTier } from './shelf';

export type BrowserProps = { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; hidden: readonly string[]; reader?: Reader; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void; onBack: () => void };
/** Choose a puzzle, for inline and packed games alike. */
export function PuzzleBrowser(props: BrowserProps) {
  return props.entry.packed && !props.entry.puzzles.length ? <PackedBrowser {...props}/> : <CardBrowser {...props}/>;
}
function CardBrowser({ entry, progress, initialBand, hidden, reader = 'Growing', onChoose, onBand, onBack }: BrowserProps) {
  const [tier, setTier] = useState(() => nearestTier(entry, initialBand)), [filter, setFilter] = useState<Filter>('all');
  const presentation = presentationFor(entry);
  const code = useMemo(() => completionLookup(progress, entry), [progress, entry]);
  // Numbers stay put within a difficulty: a hidden puzzle leaves a gap rather than renumbering the rest.
  const numbered = useMemo(() => entry.puzzles.filter(p => p.tier === tier).map((card, i) => ({ card, number: i + 1 })).filter(({ card }) => !hidden.includes(card.ref.hash)), [entry, tier, hidden]);
  const mixed = useMemo(() => mixedPack({ ...entry, puzzles: entry.puzzles.filter(p => !hidden.includes(p.ref.hash)) }, progress, card => { const d = presentation.details(card); return { technique: d.techniques.join('|'), template: d.template }; }, 0, code), [entry, hidden, progress, presentation, code]);
  const number = useMemo(() => new Map(numbered.map(n => [n.card.ref.hash, n.number])), [numbered]);
  const shown = filter === 'mixed' ? mixed.map((card, i) => ({ card, number: number.get(card.ref.hash) ?? i + 1 })) : filter === 'finished' ? numbered.filter(n => isSolved(code(n.card.ref))) : numbered;
  const filters: { value: Filter; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'finished', label: 'Finished' }, ...(mixed.length ? [{ value: 'mixed' as const, label: 'Mixed practice' }] : [])];
  return <ChooseGrid title="Choose a puzzle" options={difficultyOptionsFor(entry)} tier={tier} onTier={t => { setTier(t); onBand(t); }} filters={filters} filter={filter} onFilter={setFilter} onClose={onBack}
    empty={filter === 'finished' ? 'Finished puzzles show here.' : 'Nothing here yet.'}
    cells={shown.map(({ card, number }) => { const readers = presentation.details(card).readers; return { key: card.ref.hash, number, finished: isSolved(code(card.ref)), readAlong: !!readers?.length && !readers.includes(reader), onPress: () => onChoose(card) }; })}/>;
}
