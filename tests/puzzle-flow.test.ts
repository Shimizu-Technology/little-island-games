import { expect, it } from 'vitest';
import { adjacentTide, finishOriginalPuzzle, originalRoundDone } from '../src/puzzles/flow';
it('stops original rounds at four puzzles with no duplicate finish or fifth puzzle', () => {
  let round = { finished: [] as readonly string[] };
  for (const id of ['a', 'b', 'c', 'd']) round = finishOriginalPuzzle(round, id);
  expect(originalRoundDone(round)).toBe(true);
  expect(finishOriginalPuzzle(round, 'e')).toBe(round);
  expect(finishOriginalPuzzle(round, 'd')).toBe(round);
});
it('chooses only the requested adjacent tide without speed, placement or mutating its catalog', () => {
  const a = { tier: 1 }, b = { tier: 3 }, c = { tier: 2 }, d = { tier: 3 };
  const catalog = Object.freeze([a, b, c, d]);
  expect(adjacentTide(catalog, b, 'easier')).toBe(c);
  expect(adjacentTide(catalog, c, 'harder')).toBe(d);
  expect(adjacentTide(catalog, b, 'same')).toBe(d);
  expect(adjacentTide(catalog, a, 'easier')).toBeNull();
});

it('F4: all six same-tier cards rotate before repeating, and a singleton never redeals',()=>{
 const cards=Array.from({length:6},(_,id)=>({id,tier:2}));let current=cards[0];const seen:number[]=[];
 for(let i=0;i<12;i++){current=adjacentTide(cards,current,'same')!;seen.push(current.id);}
 expect(seen).toEqual([1,2,3,4,5,0,1,2,3,4,5,0]);expect(adjacentTide([cards[0]],cards[0],'same')).toBeNull();
});
