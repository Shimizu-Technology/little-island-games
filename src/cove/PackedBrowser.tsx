import React, { useEffect, useMemo, useState } from 'react';
import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import type { ChallengeProgress } from '../state/challenge';
import { unpack } from '../state/saveBits';
import { ChooseGrid, type Filter } from './ChooseGrid';
import { hiddenIn, isSolved, packedOpen } from './catalog';
import { bankNames, difficultyOptionsFor, matchesVariant, nearestTier, type SolitaireVariant } from './shelf';

/** Numbered requests where only the latest may answer; `drop` makes every earlier one stale. */
const requests = () => { let n = 0; return { next: () => ++n, latest: (token: number) => token === n, drop: () => { n++; } }; };

/** Choose a puzzle for a packed game: one numbered grid per bank. Entries load only when one is chosen. */
export function PackedBrowser({ entry, progress, initialBand, variant, hidden = [], onChoose, onBand }: { entry: ChallengeEntry; progress: ChallengeProgress; initialBand: number; variant?: SolitaireVariant; hidden?: readonly string[]; onChoose: (card: ChallengeCard) => void; onBand: (band: number) => void }) {
  const packed = entry.packed!, opener = packedOpen(entry);
  const availableBands = useMemo(
    () => (variant ? packed.bands.filter(b => matchesVariant(b, variant)) : packed.bands),
    [packed, variant],
  );
  const [tier, setTier] = useState(() => nearestTier(entry, initialBand, variant));
  const [bank, setBank] = useState<number | undefined>(() => variant ? availableBands.find(b => b.tier === nearestTier(entry, initialBand, variant))?.bank : undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  // A row that is still loading when the chooser closes or its difficulty or set changes is dropped, never opened.
  const [request] = useState(requests), drop = () => { request.drop(); setBusy(false); };
  const codes = useMemo(() => new Map(availableBands.map(b => [b.bank, unpack(progress.banks.find(r => r[0] === b.bank)?.[1] ?? '', b.count, 3) ?? Array<number>(b.count).fill(0)])), [availableBands, progress]);
  // Puzzles a grown-up hid on this device leave the grid. A saved attempt on one still continues from the Puzzles home.
  const [found, setFound] = useState<{ key: string; rows: ReadonlyMap<number, ReadonlySet<number>>; failed?: boolean }>({ key: '', rows: new Map() }), hiddenKey = hidden.join('|');
  const skipped = hidden.length && found.key === hiddenKey ? found.rows : new Map<number, ReadonlySet<number>>();
  useEffect(() => {
    let live = true;
    if (!hidden.length) return;
    // A lookup that fails offers nothing rather than treating "unknown" as "none hidden".
    void Promise.all(availableBands.map(async b => [b.bank, await hiddenIn(entry, b.bank, hidden)] as const)).then(rows => { if (live) setFound({ key: hiddenKey, rows: new Map(rows) }); }, () => { if (live) setFound({ key: hiddenKey, rows: new Map(), failed: true }); });
    return () => { live = false; };
  }, [entry, availableBands, hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps -- The key stands for the hidden list.
  // Until the hidden rows are known, nothing is offered: a hidden puzzle must never flash up as a new choice.
  const pendingHidden = hidden.length > 0 && (found.key !== hiddenKey || !!found.failed), failed = hidden.length > 0 && found.key === hiddenKey && !!found.failed;
  const banks = availableBands.filter(b => b.tier === tier), names = bankNames(banks), current = banks.find(b => b.bank === bank) ?? banks[0];
  const open = async (index: number) => {
    if (busy || !current) return;
    const token = request.next();
    setBusy(true); setMessage('');
    try { const card = opener?.open ? packed.card(await opener.open(current.bank, index)) : undefined; if (!request.latest(token)) return; if (card) onChoose(card); else setMessage('This puzzle could not open. Try another.'); }
    catch { if (request.latest(token)) setMessage('This puzzle could not open. Your saved work is kept. Try again.'); }
    finally { if (request.latest(token)) setBusy(false); }
  };
  useEffect(() => () => request.drop(), [request]);
  const rows = !current || pendingHidden ? [] : Array.from({ length: current.count }, (_, i) => i).filter(i => !(skipped.get(current.bank)?.has(i)) && (filter !== 'finished' || isSolved(codes.get(current.bank)?.[i] ?? 0)));
  return <ChooseGrid options={difficultyOptionsFor(entry, variant)} tier={tier} onTier={t => { drop(); setTier(t); setBank(undefined); onBand(t); }}
    sets={banks.map((b, i) => ({ key: String(b.bank), label: names[i], selected: b === current, onPress: () => { drop(); setBank(b.bank); } }))}
    filters={[{ value: 'all', label: 'All' }, { value: 'finished', label: 'Finished' }]} filter={filter} onFilter={setFilter}
    status={busy ? 'Opening your puzzle…' : failed ? 'These puzzles could not be checked just now. Your saved work is kept. Close and try again.' : message} empty={filter === 'finished' ? 'Finished puzzles show here.' : pendingHidden ? '' : 'Nothing here yet.'}
    cells={rows.map(i => ({ key: `${current!.bank}:${i}`, number: i + 1, finished: isSolved(codes.get(current!.bank)?.[i] ?? 0), onPress: () => void open(i) }))}/>;
}
