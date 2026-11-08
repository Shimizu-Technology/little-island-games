import { expect, it } from 'vitest';
import { fixture } from './helpers/save-packed';
import { emptySave } from '../src/state/validation';
import { migrateProfiles } from '../src/state/profiles';
import { putProgress, finishChallenge } from '../src/state/challengeDrafts';
import { emptyChallenge, type Terminal } from '../src/state/challenge';
import { prepareSessionContent, ContentPendingError } from '../src/state/sessionContent';
it('before credit, an exact packaged hash and replay verdict are still required after structural load',async()=>{
 const f=fixture(),before=f.session(),terminal:Terminal={event:'independent',awards:3,dares:[],cost:1,solution:null};
 const catalog={...f.catalog,codecs:new Map([...f.catalog.codecs].map(([id,c])=>[id,{...c,evaluate:(s:typeof before)=>s.revision===1?terminal:null}]))};
 const save=putProgress(migrateProfiles(emptySave()),'family',{...emptyChallenge(),nextOrdinal:2,paused:[before]});
 const done={...before,revision:1,payload:1,result:terminal},guard={owner:'family',game:before.game,id:before.id,revision:0,epoch:1};
 expect(()=>finishChallenge(save,done,guard,1,catalog)).toThrow(ContentPendingError);
 await prepareSessionContent(done,catalog,{loader:f.loader});
 expect(finishChallenge(save,{...done,puzzle:{...done.puzzle,hash:'f'.repeat(64)}},guard,1,catalog)).toBe(save);
 const credited=finishChallenge(save,done,guard,1,catalog);expect(credited).not.toBe(save);expect(credited.challenge!.paused).toEqual([]);expect(credited.challenge!.bests).toEqual([[100,0,1]]);
});
