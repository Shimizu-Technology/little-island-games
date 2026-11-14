// P1b review P3-1: the Challenge ID "drop-puzzles" must not leak into the paused-space controls.
import React from 'react';
import { act, create } from 'react-test-renderer';
import { it, expect, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { challengeEntries } from '../src/challenge/catalog';
import { emptyChallenge } from '../src/state/challenge';
import { registration as coconut } from '../src/challenge/registrations/drop-puzzles';
import { registration as nets } from '../src/challenge/registrations/fishing-nets';
const fixture=vi.hoisted(()=>({store:{epoch:0,save:{} as any}}));
vi.mock('../src/puzzles/bankAssets',async()=>{const {readFileSync}=await import('node:fs');return {bankTransport:{read:async(name:string)=>readFileSync('src/content/puzzles/assets/'+name+'.lipuzzle','utf8')}};});
vi.mock('../src/state/Store',()=>({useStore:()=>fixture.store}));
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>({width:390,height:844})}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main',useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>true,back:vi.fn(),replace:vi.fn()}}));
vi.mock('../src/puzzles/grid/GridScroll',()=>({GridScroll:'section'}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',styles:{}}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/LearnerChip',()=>({LearnerChip:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it('full paused spaces name Coconut Drop by its shelf name in Continue and Replace (review P3-1)',async()=>{
 const entries=[coconut,...challengeEntries.filter(e=>e.game!==coconut.game&&e.game!==nets.game)].slice(0,8);
 expect(entries).toHaveLength(8);
 const progress=emptyChallenge();
 for(const [i,e] of entries.entries()){const ref=e.puzzles[0]?.ref??await e.packed!.choose(e.packed!.bands[0].bank,progress);progress.paused.push(e.start(ref,'family','paused-'+i,{...progress,nextOrdinal:i+1},{supportOff:false,ownRead:false},[]));}
 progress.nextOrdinal=9;progress.paused.sort((a,b)=>a.game.localeCompare(b.game));
 fixture.store.save={settings:{sound:false},players:[],challenge:progress};
 let r:any;
 try{await act(async()=>{r=create(<ChallengeFrame entry={nets}/>);});
 const labels=r.root.findAllByType('button').map((b:any)=>b.children.filter((c:any)=>typeof c==='string').join(''));expect(JSON.stringify(r.toJSON())).toContain('Your paused spaces are full');expect(labels).not.toContain('Continue Drop Puzzles');expect(labels).toContain('Continue Coconut Drop');expect(labels).toContain('Replace Coconut Drop');expect(labels.some((l:string)=>l.includes('Drop Puzzles'))).toBe(false);
 }finally{if(r)await act(async()=>r.unmount());}
});
