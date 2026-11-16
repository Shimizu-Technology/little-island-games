import{apply,forcedFoundation,legalMoves,opening,won,type Deal,type Move,type Position}from'./solitaire';
// Format-1 choice ordinals retain the old foundation-to-cell slots. They
// remain reserved in certificates; apply() rejects a certificate using one.
function choices(s:Position):Move[]{
 const moves=legalMoves(s,'freecell');
 for(let from=8;from<12;from++)if(s.piles[from].length)for(let to=12;to<16;to++)if(!s.piles[to].length)moves.push([from,to,1]);
 return moves.sort((a,b)=>a[0]-b[0]||a[2]-b[2]||a[1]-b[1]);
}
const same=(a:Move,b:Move)=>a.every((n,i)=>n===b[i]);
/** Original compact certificate: choices between canonical safe-foundation closures. */
export function proofForLine(d:Deal,line:readonly Move[]):string{
 if(d.mode!=='freecell'||line.length>240)throw new Error('Invalid FreeCell certificate.');
 let s=opening(d),proof='';
 for(const a of line){const forced=forcedFoundation(s,d.mode);if(forced){if(!same(forced,a))throw new Error('Certificate disagrees with safe closure.');}
  else{const index=choices(s).findIndex(b=>same(a,b));if(index<0||index>65535)throw new Error('Illegal certificate choice.');proof+=index<255?index.toString(16).padStart(2,'0'):`ff${index.toString(16).padStart(4,'0')}`;}
  const next=apply(s,d.mode,a);if(next===s)throw new Error('Illegal certificate step.');s=next;
 }
 if(!won(s))throw new Error('Certificate does not finish.');return proof;
}
const cached=new WeakMap<Deal,{key:string;line:Move[]|null}>();
/** Every decoded choice and implicit move replays through the real rules, inside the witnessed cap. */
function decodeProof(d:Deal):Move[]|null{
 if(d.mode!=='freecell'||typeof d.proof!=='string'||d.proof.length>1440||!/^(?:[0-9a-f]{2})*$/.test(d.proof))return null;
 let s=opening(d),at=0;const line:Move[]=[];
 while(!won(s)&&line.length<240){let a=forcedFoundation(s,d.mode);
  if(!a){if(at+2>d.proof.length)return null;let index=parseInt(d.proof.slice(at,at+2),16);at+=2;
   if(index===255){if(at+4>d.proof.length)return null;index=parseInt(d.proof.slice(at,at+4),16);at+=4;if(index<255)return null;}
   a=choices(s)[index]??null;if(!a)return null;
  }
  const next=apply(s,d.mode,a);if(next===s)return null;s=next;line.push(a);
 }
 return won(s)&&at===d.proof.length?line:null;
}

/** Mutation-sensitive cache. Banks load one deal at a time; no eager full-bank witness index. */
export function lineFromProof(d:Deal):Move[]|null{
 const key=JSON.stringify([d.mode,d.cards,d.proof]),old=cached.get(d);if(old?.key===key)return old.line;
 const line=decodeProof(d);if(line){for(const a of line)Object.freeze(a);Object.freeze(line);}cached.set(d,{key,line});return line;
}
