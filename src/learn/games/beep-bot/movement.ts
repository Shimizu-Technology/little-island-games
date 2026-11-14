export type Arrow = 'up'|'right'|'down'|'left'|'repeat2'|'repeat3';
export type Puzzle = { start:number; shell:number; rocks:number[]; answer:Arrow[]; seed:number };
export const dirs:Arrow[]=['up','right','down','left'];
export function cardEffect(p:Puzzle,pos:number,card:Arrow,previous:Arrow|null):{pos:number;bump:boolean} {
  const move = card.startsWith('repeat') ? previous : card;
  if(!move || move.startsWith('repeat')) return {pos,bump:true};
  const count = card.startsWith('repeat') ? Number(card.slice(-1))-1 : 1;
  for(let i=0;i<count;i++) {
    const d=dirs.indexOf(move),x=pos%5+([0,1,0,-1][d]),y=Math.floor(pos/5)+([-1,0,1,0][d]);
    if(x<0||x>4||y<0||y>4||p.rocks.includes(y*5+x)) return {pos,bump:true};
    pos=y*5+x;
  }
  return {pos,bump:false};
}
export function step(p:Puzzle,pos:number,card:Arrow,previous:Arrow|null):number {const result=cardEffect(p,pos,card,previous);return result.bump?-1:result.pos;}
export function execution(p:Puzzle,program:Arrow[]):{path:number[];pos:number;failedCard:number|null} {
  let pos=p.start,previous:Arrow|null=null;const path=[pos];
  for(let i=0;i<program.length;i++) {
    const card=program[i],result=cardEffect(p,pos,card,previous);pos=result.pos;
    path.push(result.bump?-1:pos);
    if(result.bump)return {path,pos,failedCard:i};
    if(!card.startsWith('repeat'))previous=card;
  }
  return {path,pos,failedCard:null};
}
export const trace=(p:Puzzle,program:Arrow[]):number[]=>execution(p,program).path;
export const solves=(p:Puzzle,program:Arrow[])=>{const path=trace(p,program);return path.at(-1)===p.shell && path.slice(0,-1).every(x=>x!==p.shell);};
