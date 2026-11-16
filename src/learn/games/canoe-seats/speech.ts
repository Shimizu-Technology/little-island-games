import { attrOf, clueText, friendNames, UNARY, type CanoePuzzle, type Clue, type Kind } from './rules';

/**
 * Spoken lines. Clue cards carry no words, so each friend-only clue has its own recorded line,
 * keyed by kind, friends and seat. Hat and fruit clues (Deep Water and up) show their words as a
 * caption until a narration queue can join shorter lines (lead follow-up, FND-07/K9).
 */
const slug = (pool: number) => friendNames[pool].replace(/\s+/g, '-');
const SYMMETRIC: ReadonlySet<Kind> = new Set(['next', 'far', 'gap']);
export function clueKey(p: CanoePuzzle, c: Clue): string | null {
  if (attrOf(p, c.x) !== 0 || (c.y !== undefined && attrOf(p, c.y) !== 0)) return null;
  const x = p.cast[c.x];
  if (c.k === 'at') return `canoe-at-${slug(x)}-${c.s! + 1}`;
  if (UNARY.has(c.k)) return `canoe-${c.k}-${slug(x)}`;
  const y = p.cast[c.y!], [a, b] = SYMMETRIC.has(c.k) && y < x ? [y, x] : [x, y];
  return `canoe-${c.k}-${slug(a)}-${slug(b)}`;
}
/** Every friend-only clue line a School level can show: up to five seats, eight friends. Symmetric kinds once per pair. */
export function friendClueLines(): Record<string, string> {
  const out: Record<string, string> = {}, pools = friendNames.map((_, i) => i);
  const add = (cast: number[], c: Clue) => { const p: CanoePuzzle = { n: 5, attrs: 1, cast, clues: [] }; out[clueKey(p, c)!] = clueText(p, c); };
  for (const x of pools) {
    const rest = pools.filter(v => v !== x);
    for (let s = 0; s < 5; s++) add([x, ...rest.slice(0, 4)], { k: 'at', x: 0, s });
    add([x, ...rest.slice(0, 4)], { k: 'end', x: 0 });
    add([x, ...rest.slice(0, 4)], { k: 'mid', x: 0 });
    for (const y of rest) for (const k of ['ahead', 'next', 'far', 'gap'] as Kind[]) {
      if (SYMMETRIC.has(k) && y < x) continue;
      add([x, y, ...pools.filter(v => v !== x && v !== y).slice(0, 3)], { k, x: 0, y: 1 });
    }
  }
  return out;
}
/** Short on-screen captions for teaching boards; the spoken teaching lines say a little more. */
export const teachCaptions: Record<string, string> = {
  at: 'New card: count the dots from the front.', ahead: 'New card: the arrows point to the front.', next: 'New card: side by side.',
  end: 'New card: the very front or the very back.', far: 'New card: not side by side.', gap: 'New card: one seat between.',
  mid: 'New card: not at either end.', whatif: 'Try a seat. If a clue breaks, try another.',
};
export const gameLines: Record<string, string> = {
  'canoe-intro': 'Seat every friend so every picture clue is true.',
  'canoe-help': 'Pick up a friend and tap a seat. Seat one is at the front. Tap a clue to hear it, and tap it again to mark it done.',
  'canoe-coach': 'Pick up a friend, then tap a seat.',
  'canoe-all-seated': 'Everyone has a seat!',
  'canoe-not-yet': 'Not quite yet. Everyone is still in their seats.',
  'canoe-keepers': 'Each of you holds some clues. Say them out loud, but do not show them.',
  'canoe-pass': 'Pass the device. No peeking!',
  'canoe-hint-look': 'Look at this clue first.',
  'canoe-hint-think': 'Think about which seat this friend cannot have.',
  'canoe-teach-at': 'This card shows the seat. Count from the front.',
  'canoe-teach-ahead': 'The arrow points to the front. This friend sits somewhere in front.',
  'canoe-teach-next': 'Two seats side by side. These friends sit right next to each other.',
  'canoe-teach-end': 'One of the two end seats, the very front or the very back.',
  'canoe-teach-far': 'A wall between them. These two do not sit next to each other.',
  'canoe-teach-gap': 'One empty seat between them. Exactly one seat apart.',
  'canoe-teach-mid': 'Not at either end. Somewhere in the middle.',
  'canoe-teach-whatif': 'Try a friend in a seat. If a clue breaks, that seat is wrong.',
};
