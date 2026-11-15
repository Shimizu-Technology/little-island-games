/** Private QA fixtures: every checkpoint is produced through legal moves. */
import{apply,DECK,DRAW,legalMoves,rank,type Deal,type Move}from'../../../src/puzzles/table/solitaire';
import{solve}from'../../../src/puzzles/table/solver';
import{lineFromProof}from'../../../src/puzzles/table/proof';
import{encodeBoard,fresh,moveTable,readTable,type TablePayload}from'../../../src/puzzles/table/checkpoint';
export function tallFixture(){
 const run=Array.from({length:13},(_,i)=>{const rank=13-i;return(rank%2?0:13)+rank-1;}),reserved=new Map<number,number>([[27,run[0]],...run.slice(1).map((c,i):[number,number]=>[28+i,c])]);
 const rest=DECK.filter(c=>!run.includes(c)),deal:Deal={mode:'draw-one',cards:Array.from({length:52},(_,i)=>reserved.get(i)??rest.shift()!)};let payload=fresh(deal);
 for(let i=0;i<12;i++){payload=moveTable(deal,payload,DRAW)!;payload=moveTable(deal,payload,[13,6,1])!;}
 return{deal,payload};
}
export function capFixture(deal:Deal,count=1024):{deal:Deal;payload:TablePayload;next:Move;last:Move}{
 if(deal.mode!=='freecell')throw new Error('The long-path QA walk uses FreeCell.');
 const solved=solve(deal,undefined,10000),line=lineFromProof(deal)??(solved.status==='solved'?solved.moves:null);if(!line)throw new Error('QA deal needs a winning line.');
 let payload=fresh(deal),last:Move=line[0];
 // Stop one card before the goal, then return the other Kings. The round never
 // passes through a terminal position. Four Kings can wander among 12 places.
 for(const move of line.slice(0,-1)){payload=moveTable(deal,payload,move)!;last=move;}
 for(let from=8;from<12;from++){const s=readTable(payload,deal)!.position;if(s.piles[from].length!==13)continue;const to=s.piles.slice(0,8).findIndex(p=>!p.length);last=[from,to,1];payload=moveTable(deal,payload,last)!;}
 const seen=new Set(readTable(payload,deal)!.path);
 while(readTable(payload,deal)!.history.length<count){
  const s=readTable(payload,deal)!.position,choices=legalMoves(s,deal.mode).filter(a=>(a[1]<8||a[1]>=12)&&a[2]===1&&rank(s.piles[a[0]].at(-1)!)===13).map(move=>({move,key:encodeBoard(apply(s,deal.mode,move))})).filter(c=>!seen.has(c.key));
  const i=readTable(payload,deal)!.history.length;if(!choices.length)throw new Error(`QA walk stopped at ${i}.`);
  const chosen=choices[(i*17+3)%choices.length];last=chosen.move;payload=moveTable(deal,payload,last)!;seen.add(chosen.key);
 }
 const s=readTable(payload,deal)!.position,next=legalMoves(s,deal.mode).find(a=>(a[1]<8||a[1]>=12)&&a[2]===1&&rank(s.piles[a[0]].at(-1)!)===13&&!seen.has(encodeBoard(apply(s,deal.mode,a))));
 if(!next)throw new Error('QA cap needs a distinct next position.');return{deal,payload,next,last};
}
