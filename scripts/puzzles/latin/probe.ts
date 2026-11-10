import { generatePuzzle } from './generate';
import { kinds } from '../../../src/puzzles/latin/core';
import { grade } from '../../../src/puzzles/latin/solver';
for(const kind of kinds)for(let tier=0;tier<6;tier++){const start=Date.now();let made=0;const hist:Record<string,number>={};for(let i=1;i<=8;i++){const p=generatePuzzle(kind,i+tier*16777216,tier);if(p){made++;const g=grade(p);hist[g.ceiling]=(hist[g.ceiling]??0)+1;}}console.log(JSON.stringify({kind,tier,made,ms:Date.now()-start,hist}));}
