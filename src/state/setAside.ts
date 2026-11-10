import { bankSize, packedBank } from './bankFacts';
import { dareBits, saveCatalog, type SaveCatalog } from './challenge';
import { asciiId, pack, plain, uint, unpack } from './saveBits';

/** What one owner lost from the active save. The caller preserves the original bytes, which still hold all of it. */
export type SetAside = { owner: string; games: string[]; marks: number };
export type SetAsideResult = { raw: string; setAside: SetAside[] };
type Row = Record<string, unknown>;

/**
 * A save can name puzzle content this build doesn't have: a dev or TestFlight build with other banks,
 * a rolled-back build, or a bank whose size changed. Launch must still reach the app, so before validation
 * the paused rounds and marks rows that point at unresolvable content are taken out of a copy.
 * Everything else, including every other learner, is untouched. Never call this on bytes you then discard:
 * the original must be preserved, because it is the only remaining copy of what was set aside.
 */
export function setAsideUnresolved(raw: string, catalog: SaveCatalog = saveCatalog): SetAsideResult {
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return { raw, setAside: [] }; }
  if (!plain(v) || v.version !== 3 || !plain(v.profiles) || !plain(v.profiles.people)) return { raw, setAside: [] };
  const setAside: SetAside[] = [];
  const groups: [Row, boolean][] = [[v.profiles.people, false]];
  if (plain(v.cove) && plain(v.cove.people)) groups.push([v.cove.people, true]);
  for (const [people, cove] of groups) for (const [owner, person] of Object.entries(people)) {
    if (!plain(person) || !plain(person.challenge)) continue;
    const result = resolveProgress(person.challenge, cove, catalog);
    if (!result) continue;
    people[owner] = { ...person, challenge: result.progress };
    setAside.push({ owner, games: result.games, marks: result.marks });
  }
  return setAside.length ? { raw: JSON.stringify(v), setAside } : { raw, setAside };
}

function resolveProgress(progress: Row, cove: boolean, catalog: SaveCatalog) {
  const bankFor = (slot: unknown) => { const bank = uint(slot, 511) ? catalog.banks.get(slot) : undefined; return bank && (!cove || bank.cove) ? bank : undefined; };
  const ref = (slot: unknown, puzzle: unknown) => { const bank = bankFor(slot); return !!bank && uint(puzzle, 1023) && puzzle < bankSize(bank); };
  const resolves = (s: unknown) => {
    if (!plain(s) || !plain(s.puzzle)) return true; // not a content question; ordinary validation decides
    const p = s.puzzle, bank = bankFor(p.bank), codec = typeof s.codec === 'string' ? catalog.codecs.get(s.codec) : undefined;
    return !!bank && ref(p.bank, p.puzzle) && bank.engine === p.engine && bank.rules === p.rules && (packedBank(bank) || bank.entries[p.puzzle as number]?.hash === p.hash)
      && !!codec && codec.game === s.game && (!cove || codec.cove)
      && (!Array.isArray(s.selectedDares) || s.selectedDares.every(slot => { const dare = uint(slot, 4095) ? catalog.dares.get(slot) : undefined; return !!dare && dare.bank === p.bank && dare.puzzle === p.puzzle; }));
  };
  const games: string[] = []; let marks = 0, changed = false;
  const next: Row = { ...progress };
  const keep = <T,>(field: string, test: (item: T) => boolean, onDrop?: (item: T) => void) => {
    const list = progress[field];
    if (!Array.isArray(list)) return;
    const kept = list.filter(item => test(item as T) || (onDrop?.(item as T), false));
    if (kept.length !== list.length) { next[field] = kept; changed = true; }
  };
  keep<Row>('paused', resolves, s => { if (asciiId(s?.game)) games.push(s.game); });
  keep<unknown[]>('banks', row => !Array.isArray(row) || row.length !== 3 || (() => {
    const bank = bankFor(row[0]);
    return !!bank && !!unpack(row[1], bankSize(bank), 3) && !!unpack(row[2], bankSize(bank), 2);
  })(), () => { marks++; });
  for (const field of ['bests', 'recent', 'solutions']) keep<unknown[]>(field, row => !Array.isArray(row) || ref(row[0], row[1]));
  keep<unknown[]>('cursors', row => !Array.isArray(row) || !!bankFor(row[0]));
  for (const field of ['signals', 'practice']) keep<unknown[]>(field, row => !Array.isArray(row) || typeof row[0] !== 'string' || catalog.contexts.has(row[0]));
  if (Array.isArray(progress.choice) && ![...catalog.banks.values()].some(b => b.engine === (progress.choice as unknown[])[0] && (!cove || b.cove))) { next.choice = null; changed = true; }
  const dares = cove ? null : dareBits(progress.dares);
  if (dares?.some((n, i) => n && !catalog.dares.has(i))) {
    const known = dares.map((n, i) => n && catalog.dares.has(i) ? 1 : 0);
    next.dares = known.some(Boolean) ? pack(known, 1) : ''; marks++; changed = true;
  }
  return changed ? { progress: next, games, marks } : null;
}
