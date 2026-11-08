import { registerSaveContent, type Bank, type ChallengeSession, type SaveCatalog, type Terminal } from '../../src/state/challenge';
import { plain, uint, exactKeys } from '../../src/state/saveBits';
import { validCheckpoint } from '../../src/state/checkpoint';
export const fixtureHash = 'a'.repeat(64);
export const bank: Bank = { slot:0,engine:'save-proof',rules:1,entries:Array.from({length:1024},(_,ordinal)=>({ordinal,hash:fixtureHash})),awards:Array<number>(1024).fill(3),cove:true };
const evaluate = (session: ChallengeSession): Terminal | null => {
  const p = session.payload as { moves:number; end:boolean; helped:boolean; awards:number; dares:number[] };
  return p.end ? { event:session.partner ? 'together' : p.helped ? 'helped' : 'independent',awards:p.awards,dares:p.dares,cost:p.moves,solution:null } : null;
};
export const fixtureCatalog: SaveCatalog = { banks:new Map([[0,bank]]),codecs:new Map([['save-proof-v1',{
  game:'save-proof',cove:true,
  validate:(s:ChallengeSession)=>{
    const p=s.payload;
    return plain(p) && exactKeys(p,['moves','end','helped','awards','dares','checkpoint']) && uint(p.moves,1_000_000) && typeof p.end === 'boolean' && typeof p.helped === 'boolean' && uint(p.awards,3) && Array.isArray(p.dares) && p.dares.every(n=>uint(n,4095)) && (p.checkpoint === null || validCheckpoint(p.checkpoint));
  },evaluate,
  canStart:(s:ChallengeSession)=>(s.payload as {moves:number;end:boolean}).moves===0 && !(s.payload as {end:boolean}).end,
  extends:(before:ChallengeSession,next:ChallengeSession)=>{
    const a=before.payload as {moves:number;helped:boolean},b=next.payload as {moves:number;helped:boolean};
    return b.moves>=a.moves && (!a.helped||b.helped);
  },
}]]),dares:new Map(Array.from({length:9},(_,slot)=>[slot,{kind:['par','clean','plan','blind','whole','two-ways','pick-up','own-read','edits'][slot] as 'par',help:slot===1||slot===4||slot===7?'independent' as const:'allowed' as const,bank:0,puzzle:0}])),contexts:new Set(['save-proof']) };
export const installFixture = () => registerSaveContent(fixtureCatalog);
export function session(owner='family',id=`proof-${owner}`,ordinal=1): ChallengeSession {
 return {version:1,owner,game:'save-proof',id,ordinal,revision:0,puzzle:{bank:0,puzzle:0,engine:'save-proof',rules:1,hash:fixtureHash},codec:'save-proof-v1',payload:{moves:0,end:false,helped:false,awards:0,dares:[],checkpoint:null},selectedDares:[],partner:null,result:null,credited:false};
}
export function moved(s:ChallengeSession,patch:Record<string,unknown>={}):ChallengeSession {
 const next={...s,revision:s.revision+1,payload:{...s.payload as object,moves:s.revision+1,...patch}};
 return {...next,result:evaluate(next)};
}
