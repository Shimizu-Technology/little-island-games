/** Turtle programs as short text, e.g. `r4(f60 t90) t45`. Used by baked content and tests; saves keep their own codecs. */
import type { Block } from './engine';
const colorLetter = { coral: 'c', teal: 't', gold: 'g' } as const;
const colorOf = { c: 'coral', t: 'teal', g: 'gold' } as const;

/** Every block counts, including each one inside a Repeat (W0-03): `r4(f60 t90)` is 3, not 1. */
export const blockCost = (blocks: readonly Block[]): number => blocks.reduce((n, b) => n + 1 + (b.kind === 'repeat' ? blockCost(b.body) : 0), 0);
export const blockDepth = (blocks: readonly Block[]): number => blocks.reduce((d, b) => Math.max(d, b.kind === 'repeat' ? 1 + blockDepth(b.body) : 0), 0);
/** What the same picture costs with no Repeat: one block per drawing command. */
export function flatCost(blocks: readonly Block[]): number {
  const count = (list: readonly Block[]): number => list.reduce((n, b) => n + (b.kind === 'repeat' ? b.times * count(b.body) : 1), 0);
  return count(blocks);
}

export function formatBlocks(blocks: readonly Block[]): string {
  return blocks.map(b => b.kind === 'forward' ? `f${b.n}` : b.kind === 'turn' ? `t${b.angle}` : b.kind === 'color' ? `k${colorLetter[b.color]}` : b.kind === 'grow' ? 'g' : `r${b.times}(${formatBlocks(b.body)})`).join(' ');
}

export function parseBlocks(text: string): Block[] | null {
  const tokens = text.match(/r\d+\(|\)|[ftkg]\w*/g) ?? [];
  if (tokens.join('') !== text.replace(/\s+/g, '')) return null;
  const stack: Block[][] = [[]], times: number[] = [];
  for (const token of tokens) {
    const top = stack[stack.length - 1];
    if (token.startsWith('r')) { times.push(Number(token.slice(1, -1))); stack.push([]); }
    else if (token === ')') {
      if (stack.length < 2) return null;
      const body = stack.pop()!, n = times.pop()!;
      stack[stack.length - 1].push({ kind: 'repeat', times: n, body });
    } else if (token[0] === 'f' && /^f\d+$/.test(token)) top.push({ kind: 'forward', n: Number(token.slice(1)) });
    else if (token[0] === 't' && /^t\d+$/.test(token)) top.push({ kind: 'turn', angle: Number(token.slice(1)) });
    else if (token[0] === 'k' && token.length === 2 && token[1] in colorOf) top.push({ kind: 'color', color: colorOf[token[1] as keyof typeof colorOf] });
    else if (token === 'g') top.push({ kind: 'grow' });
    else return null;
  }
  return stack.length === 1 ? stack[0] : null;
}
