import { bank, initialProgram } from './engine';
import type { Descriptor } from './challenge-engine';
import type { Puzzle as RegisteredPuzzle } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
const bugCounts=new Map<number,number>();
export const beepPuzzles:RegisteredPuzzle<Descriptor>[]=[3,4,5].flatMap(l=>bank[l-1].map((row,i)=>{
 const level=l as 3|4|5, length=row.puzzle.answer.length,bug=bugCounts.get(length)??0; if(level===4)bugCounts.set(length,bug+1);
 const puzzle={...row.puzzle,seed:i+16*(bug%length)},d:Descriptor={level,puzzle,starter:initialProgram(puzzle,level),winners:row.proof.winners};
 const rule=level===3?{kind:'clean' as const}:level===4?{kind:'plan' as const,max:1 as const}:{kind:'par' as const,metric:'cards' as const,max:4};
 return {ref:{bank:200+level-3,puzzle:i,engine:'beep-bot',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'school' as const,game:'beep-bot',level,puzzle:`beep-${level}-${i}`},path:'endless' as const,tier:level,title:`Level ${level} · Shell path ${i+1}`,descriptor:d,dares:[{slot:256+(level-3)*16+i,id:`beep-${level}-${i}`,label:level===3?'No bumps or missed runs':level===4?'One fix, one Go, first try with no Help':'Use only 4 cards, first try with no Help',rule,help:'independent' as const}],awards:[{rule:level===4?{kind:'pick-up' as const,objective:'one-fix-one-go'}:rule,help:'independent' as const},null] as const,par:{metric:'cards' as const,lower:row.proof.minimum,upper:row.proof.minimum}};
}));
