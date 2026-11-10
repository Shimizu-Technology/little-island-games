import { crossings, shapeOf, solved, type BridgesPuzzle, type Counts } from './core';
import type { Change, MarkRules } from './marks';
import { planHint, type Plan, type Technique } from './solver';

/** Short names for the skill line and the hint card. */
export const techniqueNames: Record<Technique, string> = {
  tidy: 'Tidy up', full: 'Full island', 'must-reach': 'Must reach', isolation: 'Don’t cut off', 'way-out': 'Only way across', 'what-if': 'What if', chain: 'Follow it through',
};
const word = (n: number) => n === 1 ? 'one bridge' : n === 2 ? 'two bridges' : `${n} bridges`;
const side = (p: BridgesPuzzle, island: number, link: number) => {
  const { islands, links } = shapeOf(p), l = links[link], o = l.a === island ? l.b : l.a, a = islands[island], b = islands[o];
  return b.x > a.x ? 'to the right' : b.x < a.x ? 'to the left' : b.y > a.y ? 'below' : 'above';
};
export type Cue = { technique: Technique | 'clash' | 'mistake'; focus: number[]; links: number[]; look: string; think: string; show: string };

/** Plain words for the next hint. The plan comes from the same engine that grades the bank. */
export function cueFor(p: BridgesPuzzle, counts: Counts, plan: Plan = planHint(p, counts)): Cue | null {
  const { islands, links, around } = shapeOf(p);
  if (plan.kind === 'solved') return null;
  if (plan.kind === 'clash') {
    const crossing = crossings(p, counts).length > 0, s = islands[plan.island];
    return { technique: 'clash', focus: [plan.island], links: [plan.link], look: crossing ? 'Two bridges cross here.' : `This ${s.clue} has too many bridges.`,
      think: crossing ? 'Bridges can never cross. One of them has to go.' : `It shows ${s.clue}, so it can only have ${word(s.clue)} in all.`, show: 'One bridge taken away.' };
  }
  if (plan.kind === 'mistake') {
    const l = links[plan.link];
    return { technique: 'mistake', focus: [l.a, l.b], links: [plan.link], look: 'Check the bridges between these two islands.',
      think: 'The numbers can’t all be met with this many bridges here. Taking one away keeps the rest of your map.', show: 'One bridge taken away.' };
  }
  const s = islands[plan.island], n = s.clue, have = around[plan.island].reduce((k, e) => k + counts[e], 0), where = plan.links.map(e => side(p, plan.island, e));
  const total = plan.counts.reduce((k, c, i) => k + c - counts[plan.links[i]], 0), places = where.length === 1 ? where[0] : `${where.slice(0, -1).join(', ')} and ${where.at(-1)}`;
  const show = `${total === 1 ? 'One bridge' : `${total} bridges`} added ${places}.`;
  const focus = [plan.island, ...plan.links.map(e => links[e].a === plan.island ? links[e].b : links[e].a)];
  switch (plan.technique) {
    case 'full': {
      // Full fills every place with room, so one place filled means it was the only one left.
      const only = plan.links.length === 1;
      return { technique: 'full', focus, links: plan.links, look: `Look at this ${n}.`,
        think: only ? `Only one neighbour still has room, so its ${n - have === 1 ? 'bridge goes' : 'bridges go'} there.` : `It still needs ${word(n - have)}. Its neighbours have room for exactly that many, so every place fills up.`, show };
    }
    case 'must-reach': return { technique: 'must-reach', focus, links: plan.links, look: `Look at this ${n} and its neighbours.`,
      think: `Even if every other neighbour took all the bridges it could, this ${n} would still be short. So a bridge goes ${places}.`, show };
    case 'isolation': return { technique: 'isolation', focus, links: plan.links, look: 'Look at this little group of islands.',
      think: 'If they used up all their bridges on each other, they would be cut off from the rest of the map. So a bridge has to reach out.', show };
    case 'way-out': return { technique: 'way-out', focus, links: plan.links, look: 'Look at how this part of the map joins the rest.',
      think: `There is only one place left where a bridge could join them. Everything must connect, so a bridge goes ${places}.`, show };
    case 'what-if': return { technique: 'what-if', focus, links: plan.links, look: `Look ${places} of this ${n}.`,
      think: 'Imagine it the other way. Then a nearby island could not get the bridges its number needs. So this is the only way that works.', show };
    default: return { technique: plan.technique, focus, links: plan.links, look: `Look ${places} of this ${n}.`,
      think: 'Try the other choice in your head and follow it island by island. Before long a rule breaks: a number can’t be met, bridges would cross, or a group gets cut off. So it must be this way.', show };
  }
}

/** Bridges on the shared mark board: one place per link, 0 to 2 bridges, never across another bridge. */
export const bridgesRules: MarkRules<BridgesPuzzle> = {
  places: p => shapeOf(p).links.length,
  max: 2,
  allowed: (p, marks, index, value) => !value || !shapeOf(p).crosses[index].some(j => marks[j] > 0),
  legal: (p, marks) => !crossings(p, marks).length,
  solved: (p, marks) => solved(p, marks),
  hintMove: (p, marks): Change[] | null => {
    const plan = planHint(p, marks);
    if (plan.kind === 'place') return plan.links.map((e, i) => [e, plan.counts[i]] as const);
    // A rule break or a wrong bridge loses one bridge at a time, as the card says.
    if (plan.kind === 'clash' || plan.kind === 'mistake') return [[plan.link, Math.max(0, marks[plan.link] - 1)]];
    return null;
  },
  answer: marks => marks.join(''),
};
