/** Independent certificate verifier. Does not import the playing engine, move generator or solver. */
export function verifyLine(cards: string, mode: string, moves: readonly (readonly number[])[]): boolean {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if(cards.length!==52 || new Set(cards).size!==52 || [...cards].some(c=>!alphabet.includes(c)) || !['draw-one','draw-three','freecell'].includes(mode))return false;
  const free=mode==='freecell', cols=free?8:7, stacks:number[][]=Array.from({length:16},()=>[]), covered=Array<number>(8).fill(0);
  const deck=[...cards].map(c=>alphabet.indexOf(c));
  if(free)for(let i=0;i<52;i++)stacks[i%8].push(deck[i]);
  else {for(let r=0;r<7;r++)for(let c=r;c<7;c++)stacks[c].push(deck.shift()!);stacks[12]=deck.reverse();for(let c=0;c<7;c++)covered[c]=c;}
  const value=(c:number)=>c%13+1,colour=(c:number)=>Math.floor(c/13)%2;
  for(const m of moves) {
    if(m.length!==3||!m.every(Number.isInteger))return false;
    const [a,b,n]=m;
    if(a<0||a>15||b<0||b>15||a===b||n<0||n>13)return false;
    const src=stacks[a],dst=stacks[b];
    if(!free&&n===0){
      if(a===12&&b===13&&src.length){for(let k=0;k<(mode==='draw-one'?1:3)&&src.length;k++)dst.push(src.pop()!);continue;}
      if(a===13&&b===12&&src.length&&!dst.length){dst.push(...src.splice(0).reverse());continue;}
      return false;
    }
    if(!n||n>src.length||a<8&&(a>=cols||src.length-n<covered[a])||a>=8&&(n!==1||!free&&a>=12&&a!==13))return false;
    const moving=src.slice(-n),bottom=moving[0];
    if(moving.some((c,i)=>i>0&&(value(moving[i-1])!==value(c)+1||colour(c)===colour(moving[i-1]))))return false;
    if(b>=8&&b<12){if(n!==1||Math.floor(bottom/13)!==b-8||value(bottom)!==dst.length+1)return false;}
    else if(b<cols){
      if(dst.length?(value(dst.at(-1)!)!==value(bottom)+1||colour(dst.at(-1)!)===colour(bottom)):!free&&value(bottom)!==13)return false;
      if(free){let spaces=0,empty=0;for(let c=12;c<16;c++)if(!stacks[c].length)spaces++;for(let c=0;c<8;c++)if(c!==b&&!stacks[c].length)empty++;if(n>(spaces+1)*Math.pow(2,empty))return false;}
    } else if(free&&b>=12){if(n!==1||dst.length)return false;}else return false;
    src.splice(-n);dst.push(...moving);
    if(a<cols&&covered[a]&&src.length===covered[a])covered[a]--;
    if(stacks.flat().length!==52||new Set(stacks.flat()).size!==52)return false;
  }
  return stacks.slice(8,12).every((p,i)=>p.length===13&&p.every((c,j)=>c===i*13+j));
}
