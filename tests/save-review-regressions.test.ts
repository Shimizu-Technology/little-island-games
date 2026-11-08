import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {emptyChallenge,validChallengeProgress,registerSaveContent} from '../src/state/challenge';
import {checkpointAudit,newCheckpoint} from '../src/state/checkpoint';
import {challengeTransition,finishChallenge} from '../src/state/challengeDrafts';
import {emptySave,parseSave} from '../src/state/validation';
import {migrateProfiles,encodeSave} from '../src/state/profiles';
import {addLearner} from '../src/learn/learners';
import {fixtureCatalog,session,moved} from './helpers/save-contract';
const e=(s:ReturnType<typeof session>)=>({epoch:1,owner:s.owner,game:s.game,id:s.id,revision:s.revision});
const fresh=()=>migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
const start=(s:ReturnType<typeof session>)=>{const save=fresh();return challengeTransition(save,s,{...e(s),id:null,revision:null},1,fixtureCatalog);};
it('P2-1 canonical empty dares remove the 4KB upgrade window',()=>{
 expect(emptyChallenge().dares).toBe('');expect(validChallengeProgress({...emptyChallenge(),dares:''},'family',fixtureCatalog)).toBe(true);
 const old=parseSave(readFileSync('tests/fixtures/save-v3/fix-upgrade-window-2.json','utf8'));expect(Buffer.byteLength(encodeSave(migrateProfiles(old)))).toBeLessThanOrEqual(2000000);
});
it('P2-3 audit codes are at most four digits',()=>{expect(()=>checkpointAudit(newCheckpoint('table'),10000)).toThrow();});
it('P2-3 registration refuses an overcommitted session allocation',()=>{
 const codec={...fixtureCatalog.codecs.get('save-proof-v1')!,budget:{wrapper:700,draft:1000,undo:2500,audit:641}};
 expect(()=>registerSaveContent({banks:new Map(),codecs:new Map([['overcommitted',codec]]),dares:new Map(),contexts:new Set()})).toThrow();
});
it('P2-4 Together can be confirmed at terminal transition',()=>{const s=session('a'),save=start(s),end=moved({...s,partner:'family'},{end:true});expect(finishChallenge(save,end,e(s),1,fixtureCatalog)).not.toBe(save);});
it('P2-4 nonexistent partners are caught before a board starts',()=>{const s={...session('a'),partner:'ghost'};expect(start(s).challenge!.paused).toEqual([]);});
it('P2-5 a move validates one engine exactly once',()=>{
 const s=session('a'),save=start(s),codec=fixtureCatalog.codecs.get(s.codec)!;let calls=0;
 const catalog={...fixtureCatalog,codecs:new Map([[s.codec,{...codec,validate:(v:typeof s)=>{calls++;return codec.validate(v);}}]])};
 expect(challengeTransition(save,moved(s),e(s),1,catalog)).not.toBe(save);expect(calls).toBe(1);
});
