import { createRng } from '../rng';
import { exactKeys, plain, uint } from '../../state/saveBits';

export type Mode = 'draw-one' | 'draw-three' | 'freecell';
export const modes: readonly Mode[] = ['draw-one', 'draw-three', 'freecell'];
/** Card IDs: suit * 13 + rank - 1. Clubs, diamonds, spades, hearts. */
export const rank = (c: number) => c % 13 + 1;
export const suit = (c: number) => Math.floor(c / 13);
export const red = (c: number) => suit(c) % 2 === 1;
export const CARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export type Deal = { mode: Mode; cards: string };
export const makeDeal = (mode: Mode, seed: number): Deal => ({ mode, cards: createRng(seed).shuffle(Array.from({length:52},(_,i)=>i)).map(c=>CARD_ALPHABET[c]).join('') });
/** Bottom to top. 0..7 tableau; 8..11 foundations; 12..15 cells (Klondike: 12 stock, 13 waste). */
export type Position = { piles: number[][]; hidden: number[]; known: number[] };
export type Move = readonly [from: number, to: number, count: number];
export const DRAW: Move = [12, 13, 0];
export const RECYCLE: Move = [13, 12, 0];
export const validDeal = (x: unknown): x is Deal => plain(x) && exactKeys(x, ['mode', 'cards']) && modes.includes(x.mode as Mode) && typeof x.cards === 'string' && x.cards.length === 52 && new Set(x.cards).size === 52 && [...x.cards].every(c=>CARD_ALPHABET.includes(c));
export const validMove = (x: unknown): x is Move => Array.isArray(x) && x.length === 3 && uint(x[0], 15) && uint(x[1], 15) && uint(x[2], 13);
export const columns = (mode: Mode) => mode === 'freecell' ? 8 : 7;
export function opening(d: Deal): Position {
  const deck = [...d.cards].map(c=>CARD_ALPHABET.indexOf(c));
  const piles = Array.from({ length: 16 }, (): number[] => []), hidden = Array<number>(8).fill(0);
  if (d.mode === 'freecell') deck.forEach((c, i) => piles[i % 8].push(c));
  else {
    // Deal left to right, one more exposed column each pass, as at a real table.
    for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) piles[col].push(deck.shift()!);
    for (let i = 0; i < 7; i++) hidden[i] = i;
    piles[12] = deck.reverse();
  }
  const known=Array<number>(52).fill(0); piles.forEach((p,i)=>p.forEach((c,j)=>{if(d.mode==='freecell' || i<7 && j>=hidden[i]) known[c]=1;}));
  return { piles, hidden, known };
}
export const won = (s: Position) => s.piles.slice(8, 12).every(p => p.length === 13);
export const descending = (cards: readonly number[]) => cards.every((c, i) => !i || rank(cards[i - 1]) === rank(c) + 1 && red(cards[i - 1]) !== red(c));
export function validPosition(x: unknown, mode: Mode): x is Position {
  if (!plain(x) || !exactKeys(x, ['piles', 'hidden', 'known']) || !Array.isArray(x.piles) || x.piles.length !== 16 || !x.piles.every(p => Array.isArray(p) && p.length <= 52 && p.every(c => uint(c, 51))) || !Array.isArray(x.hidden) || x.hidden.length !== 8 || !x.hidden.every(n => uint(n, 6))) return false;
  if(!Array.isArray(x.known)||x.known.length!==52||!x.known.every(n=>uint(n,1)))return false;
  const s = x as Position, all = s.piles.flat();
  if(s.piles.some((p,i)=>p.some((c,j)=>(mode==='freecell'||i!==12&&(i>=8||j>=s.hidden[i]))&&!s.known[c])))return false;
  if (all.length !== 52 || new Set(all).size !== 52) return false;
  if (s.piles.slice(8, 12).some((p, i) => p.some((c, j) => suit(c) !== i || rank(c) !== j + 1))) return false;
  if (mode === 'freecell') return s.hidden.every(n => n === 0) && s.piles.slice(12).every(p => p.length <= 1);
  return s.piles[7].length === 0 && s.piles[14].length === 0 && s.piles[15].length === 0 && s.hidden[7] === 0 && s.hidden.every((n, i) => n <= i && (!s.piles[i].length ? n === 0 : n < s.piles[i].length)) && s.piles.slice(0, 7).every((p, i) => descending(p.slice(s.hidden[i])));
}
/** Supermoves only when they can be decomposed into legal single-card moves using spare places. */
export function capacity(s: Position, destination: number): number {
  const cells = s.piles.slice(12).filter(p => !p.length).length;
  const empty = s.piles.slice(0, 8).filter((p, i) => i !== destination && !p.length).length;
  return (cells + 1) * 2 ** empty;
}
export function apply(s: Position, mode: Mode, a: Move): Position {
  const [from, to, n] = a, src = s.piles[from], dst = s.piles[to];
  if (!src || !dst || from === to) return s;
  if (mode !== 'freecell' && n === 0) {
    const piles = s.piles.map(p => [...p]);
    if (from === 12 && to === 13 && src.length) for (let i = 0; i < (mode === 'draw-one' ? 1 : 3) && piles[12].length; i++) piles[13].push(piles[12].pop()!);
    else if (from === 13 && to === 12 && src.length && !dst.length) piles[12] = piles[13].splice(0).reverse();
    else return s;
    const known=[...s.known]; piles[13].forEach(c=>{known[c]=1;});
    return { piles, hidden: [...s.hidden], known };
  }
  const cols = columns(mode);
  if (!n || n > src.length || from >= 8 && (n !== 1 || mode !== 'freecell' && from !== 13 && from > 11) || from < 8 && (from >= cols || src.length - n < s.hidden[from])) return s;
  const cards = src.slice(-n), first = cards[0];
  if (!descending(cards)) return s;
  if (to >= 8 && to <= 11) {
    if (n !== 1 || suit(first) !== to - 8 || rank(first) !== dst.length + 1) return s;
  } else if (to < cols) {
    if (dst.length ? rank(dst.at(-1)!) !== rank(first) + 1 || red(dst.at(-1)!) === red(first) : mode !== 'freecell' && rank(first) !== 13) return s;
    if (mode === 'freecell' && n > capacity(s, to)) return s;
  } else if (mode === 'freecell' && to >= 12) {
    if (n !== 1 || dst.length) return s;
  } else return s;
  const piles = s.piles.map(p => [...p]), hidden = [...s.hidden];
  piles[from].splice(-n); piles[to].push(...cards);
  if (from < cols && hidden[from] && piles[from].length === hidden[from]) hidden[from]--;
  const known=[...s.known]; if(from<cols && piles[from].length)known[piles[from].at(-1)!]=1;
  return { piles, hidden, known };
}
/** All legal choices, including foundation reversals; no hidden-card-dependent filtering. */
export function legalMoves(s: Position, mode: Mode): Move[] {
  const out: Move[] = [], cols = columns(mode);
  for (let from = 0; from < 16; from++) {
    const max = from < cols ? s.piles[from].length - s.hidden[from] : 1;
    for (let n = 1; n <= Math.min(13, max); n++) for (let to = 0; to < 16; to++) {
      const a: Move = [from, to, n];
      if (apply(s, mode, a) !== s) out.push(a);
    }
  }
  if (mode !== 'freecell') for (const a of [DRAW, RECYCLE]) if (apply(s, mode, a) !== s) out.push(a);
  return out;
}
export const positionKey = (s: Position) => s.piles.map((p, i) => `${s.hidden[i] ?? 0}:${p.join('.')}`).join('|');
