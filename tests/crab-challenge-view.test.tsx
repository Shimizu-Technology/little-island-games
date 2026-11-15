import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeBoard } from '../src/learn/games/crab-commands/challenge-view';
import * as hintEngine from '../src/learn/games/crab-commands/challenge-engine';
import { challengeEngine, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
vi.mock('../src/content/learnAudio',async()=>({learnSources:Object.fromEntries(Object.keys((await import('../scripts/learn/c1-crab.json')).default).map(k=>[k,1]))}));
vi.mock('react-native',()=>({View:'div',ScrollView:'section'}));
vi.mock('../src/components/ui',()=>({View:'div',Button:'button',Copy:'p',PressableScale:'button',C:{ink:'#183F39',soft:'#E5EFE5'}}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/learn/program/ProgramEditor',()=>({ProgramEditor:'block-editor'}));
const sound=vi.hoisted(()=>({play:vi.fn(),stop:vi.fn()}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>sound}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again ×2'}}));
let root:ReactTestRenderer|undefined;
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;vi.unstubAllGlobals();});
const state=(i=0)=>challengeEngine.create(crabPuzzles[i].descriptor,{version:1},{supportOff:false,ownRead:false});
const mount=async(s:State,dispatch=vi.fn())=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);await act(async()=>{root=create(<ChallengeBoard state={s} dispatch={dispatch} active width={335}/>);});return dispatch;};
const press=async(label:string)=>act(async()=>{const b=root!.root.findAllByType('button').find(b=>b.props.accessibilityLabel===label||b.children.join('')===label);expect(b,label).toBeDefined();b!.props.onPress();});
it('first help shows only the next step; full plan takes two more explicit choices',async()=>{
 let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;await mount(s);
 await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');},{timeout:5000,interval:20});expect(JSON.stringify(root!.toJSON())).not.toContain('One working plan:');
 expect(root!.root.findAllByType('p').find(p=>p.children.join('').startsWith('Add card 1:'))!.props.style.color).toBe('#183F39');
 await press('More help');s=challengeEngine.step(s,['h'],s.descriptor)!.state;
 await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));expect(JSON.stringify(root!.toJSON())).toContain('Show the whole plan');
});
it('selects a broken card, replaces it, inserts before it and removes it through explicit controls',async()=>{
 const s=state(7),dispatch=await mount(s);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Replace with Turn right');expect(dispatch).toHaveBeenLastCalledWith(['r',0,6]);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Insert before');await press('Insert Walk');expect(dispatch).toHaveBeenLastCalledWith(['i',0,4]);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Remove card');expect(dispatch).toHaveBeenLastCalledWith(['x',0]);
});
it('hides footprints for the blind dare, keeps help available and labels walking costs',async()=>{
 const s={...state(),supportOff:true};await mount(s);expect(root!.root.findByProps({level:s.descriptor.level}).props.plan).toBeUndefined();expect(JSON.stringify(root!.toJSON())).toContain('Mud 2 / sand 1 / turn 0');
});
it('an inactive board has no automatic ticks and makes no accepted edit',async()=>{
 const s=state(),dispatch=vi.fn();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 await act(async()=>{root=create(<ChallengeBoard state={s} dispatch={dispatch} active={false} width={335}/>);});await press('Add Walk');expect(dispatch).not.toHaveBeenCalled();
});
it('P2-1: editing consumes the displayed hint until another explicit Help, including after undo',async()=>{
 let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;await mount(s);
 await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');});
 s=challengeEngine.step(s,['a',6],s.descriptor)!.state;
 await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));
 expect(JSON.stringify(root!.toJSON())).not.toContain('Add card 2:');expect(JSON.stringify(root!.toJSON())).not.toContain('Finding one step');
 s=challengeEngine.step(s,['u'],s.descriptor)!.state;
 await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));expect(JSON.stringify(root!.toJSON())).not.toContain('Add card 1:');
});
it('P3-1: More help keeps the exact proposed step visible',async()=>{
 let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;s=challengeEngine.step(s,['h'],s.descriptor)!.state;await mount(s);
 await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');});expect(JSON.stringify(root!.toJSON())).toContain('Show the whole plan');
});
it('P3-3: planning displays the current planned walking cost',async()=>{
 let s=state(0);s=challengeEngine.step(s,['a',4],s.descriptor)!.state;await mount(s);const text=JSON.stringify(root!.toJSON());expect(text).toContain('Plan cost');expect(text).toContain('1');
});
it('P2-6: local playback reaches home and plays win without saving any animation tick',async()=>{
 vi.useFakeTimers();const settled=vi.fn(),dispatch=vi.fn();let s=state(0);s=challengeEngine.step(s,['a',4],s.descriptor)!.state;s=challengeEngine.step(s,['a',4],s.descriptor)!.state;
 try{await mount(s,dispatch);s=challengeEngine.step(s,['g'],s.descriptor)!.state;await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={dispatch} active width={335} onSettled={settled}/>));
 expect(settled).not.toHaveBeenCalled();for(let i=0;i<4;i++)await act(async()=>{vi.advanceTimersByTime(140);});
 expect(JSON.stringify(root!.toJSON())).toContain('Home! Every shell collected.');expect(sound.play).toHaveBeenCalledWith('win',true);expect(settled).toHaveBeenCalledTimes(1);expect(dispatch).not.toHaveBeenCalled();
 }finally{vi.useRealTimers();}
});
it('LEAD-NOTES: the beach and horizontal program stay outside the scrolling editing controls',async()=>{
 await mount(state(7));const beach=root!.root.findByProps({level:state(7).descriptor.level}),program=root!.root.findByProps({accessibilityLabel:'Your program editor'}),controls=root!.root.findByProps({accessibilityLabel:'Plan and commands'});
 expect(program.props.horizontal).toBe(true);expect(program.parent).toBe(beach.parent?.parent);expect(controls.parent).toBe(program.parent);expect(controls.props.style.flex).toBe(1);
});

it('P2-8: staged speech keys have reachable lesson, feedback, help, footprints and marks buttons',async()=>{
 await mount({...state(0),supportOff:true});await press('Hear this puzzle');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-lesson-mud-1');
 await press('Hear rules');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-mud-rules');await press('Hear about footprints');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-footprints');await press('Hear about marks');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-marks');
 let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));
 await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');});await press('Hear help');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-first-hint');
 s=challengeEngine.step(s,['h'],s.descriptor)!.state;await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));await press('Hear help');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-more-help');
 s=state(1);for(let i=0;i<4;i++)s=challengeEngine.step(s,['a',4],s.descriptor)!.state;s={...s,runs:1,cursor:4};await act(async()=>root!.unmount());root=undefined;await mount(s);await press('Hear feedback');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-budget');
 s={...state(0),runs:1,cursor:0};await act(async()=>root!.unmount());root=undefined;await mount(s);await press('Hear feedback');expect(sound.play).toHaveBeenLastCalledWith('c1-crab-retry');
});

it('P3-5: equivalent replayed arrays do not restart the hint search',async()=>{
 const spy=vi.spyOn(hintEngine,'nextHintSliced');let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;
 try{await mount(s);await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');});const n=spy.mock.calls.length;
 await act(async()=>root!.update(<ChallengeBoard state={{...s,program:[...s.program]}} dispatch={vi.fn()} active width={335}/>));expect(spy.mock.calls.length).toBe(n);expect(JSON.stringify(root!.toJSON())).not.toContain('Finding one step');
 }finally{spy.mockRestore();}
});
it('largest text: titles, instructions and navigation scroll while beach and program stay pinned',async()=>{
 const s=state(7);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);await act(async()=>{root=create(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335} header={<p>Full size puzzle title</p>} footer={<button>Choose another puzzle</button>}/>);});
 const controls=root!.root.findByProps({accessibilityLabel:'Plan and commands'});expect(controls.findAllByType('p').some(p=>p.children.includes('Full size puzzle title'))).toBe(true);
 expect(controls.findAllByType('button').some(b=>b.children.includes('Choose another puzzle'))).toBe(true);
 expect(root!.root.findByProps({accessibilityLabel:'Your program editor'}).props.horizontal).toBe(true);
});
it('P3-3: editing after a failed run returns to the full planned cost',async()=>{
 let s=state(0);s=challengeEngine.step(s,['a',4],s.descriptor)!.state;s=challengeEngine.step(s,['g'],s.descriptor)!.state;s=challengeEngine.step(s,['a',4],s.descriptor)!.state;
 expect(s.runs).toBe(1);expect(s.cursor).toBe(0);await mount(s);
 expect(root!.root.findAllByType('p').some(p=>p.children.join('').startsWith('Plan cost: 3 of 3'))).toBe(true);
});
it('C1d: on a foggy tray puzzle the board opens in blocks with Go! and Help beside both beaches, never below the editor', async () => {
 const p = crabPuzzles.find(c => c.ref.bank === 15)!, s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
 const dispatch = await mount(s);
 const run = root!.root.findByProps({ testID: 'crab-challenge-block-run' });
 expect(run.findAllByType('button').map(b => b.children.join(''))).toEqual(['Go!', 'Help']);
 expect(root!.root.findAllByType('button').filter(b => b.children.join('') === 'Go!')).toHaveLength(1);
 expect(root!.root.findAllByType('beach' as never)).toHaveLength(2);
 await act(async () => run.findAllByType('button')[1].props.onPress());
 expect(dispatch).toHaveBeenLastCalledWith(['h']);
});
it('C1d fix P1-1: the visible help ladder walks every Songs and Foggy puzzle from an empty plan to a helped win, in the editor\'s own words', async () => {
 const { readFileSync } = await import('node:fs');
 const { blockSolutions } = await import('../src/learn/games/crab-commands/challenge-content');
 const { applyStep, describeStep, nearestBlocks } = await import('../src/learn/games/crab-commands/block-hint');
 const { programOperations } = await import('../src/learn/program/operations');
 const { programCodes } = await import('../src/learn/games/crab-commands/program');
 // Every control a hint names exists, with that exact label, in the shared block editor.
 const editor = readFileSync('src/learn/program/ProgramEditor.tsx', 'utf8');
 for (const control of ['＋ End of plan', '＋ Inside ', '＋ ${branch === \'yes\' ? \'When blocked\' : \'Otherwise\'}', 'Make plan a song', '↻ Repeat ×2', '? If blocked', '♫ Song', 'Remove block', '×{times}']) expect(editor, control).toContain(control);
 const labels: Record<string, string> = { forward: 'Walk', 'turn-left': 'Turn left', 'turn-right': 'Turn right' }, name = (c: number) => labels[programCodes[c]];
 const words = /^(Build the group for Song 1 in the plan first\. )?(Tap “＋ (End of plan|Inside repeat|When blocked|Otherwise|Inside Song \d)”( in [^,]+(, [^,]+)*)?, then tap (Walk|Turn left|Turn right|↻ Repeat ×2|\? If blocked|♫ Song \d)\.( The Repeat starts at ×2\.| Its two branches start empty\.)?|Tap the Repeat at .+, then tap ×(2|3|4|6|8)\.|Tap .+ \(.+\), then tap (Walk|Turn left|Turn right) to replace it\.|Tap .+ \(.+\), then tap Remove block\.|Your group of cards is ready\. Tap “Make plan a song”: .+)$/;
 const shown = () => root!.root.findAllByType('p').map(p => p.children.join('')).find(t => /^(Build the group|Tap (“|the Repeat|plan|song)|Your group|Your blocks reach home|One working plan)/.test(t));
 for (const p of crabPuzzles.filter(c => c.ref.bank === 14 || c.ref.bank === 15)) {
  const d = p.descriptor;
  let s = challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }), program = { version: 1 as const, body: [], songs: [] } as import('../src/learn/program/model').Program;
  // The last step shows the whole plan, every branch and song spelled out.
  let whole = s; for (let i = 0; i < 3; i++) whole = challengeEngine.step(whole, ['h'], d)!.state;
  if (root) await act(async () => root!.unmount()); await mount(whole);
  expect(shown(), p.title).toMatch(/^One working plan: /);
  expect(shown()).not.toContain('a block');
  expect(shown()).toContain(p.ref.bank === 15 ? 'If blocked [' : 'Song 1 is [');
  let steps = 0;
  for (; steps < 40; steps++) {
   s = challengeEngine.step(s, ['h'], d)!.state;
   await act(async () => root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));
   const line = shown()!;
   if (line.startsWith('Your blocks reach home')) break;
   expect(line, `${p.title} step ${steps}`).toMatch(words);
   if (steps === 0 && p.ref.bank === 14) expect(line).toMatch(/^Build the group for Song 1 in the plan first\. Tap “＋ End of plan”/);
   const near = nearestBlocks(program, blockSolutions(d))!;
   expect(describeStep(near.first!, program, name)).toBe(line);
   const next = applyStep(program, near.first!)!;
   s = challengeEngine.step(s, ['e', programOperations(program, next)], d)!.state; program = next;
  }
  expect(steps, p.title).toBeGreaterThan(2);
  const won = challengeEngine.step(s, ['g'], d)!;
  expect(won.state.won, p.title).toBe(true);
  expect(challengeEngine.inspect(won.state, d).dareEligible).toBe(false);
 }
});
it('C1d fix: on a block puzzle the help ladder shows beside the beach with Go!, never inside the strip under the editor', async () => {
 const p = crabPuzzles.find(c => c.ref.bank === 15)!;
 let s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
 s = challengeEngine.step(s, ['h'], p.descriptor)!.state;
 await mount(s);
 const hintText = (node: { findAllByType: (t: never) => { children: unknown[] }[] }) => node.findAllByType('p' as never).map(n => n.children.join('')).filter(t => t.startsWith('Tap “'));
 expect(hintText(root!.root as never)).toHaveLength(1);
 const strip = root!.root.findAll(n => n.props.accessibilityLabel === 'Plan and commands');
 for (const section of strip) expect(hintText(section as never)).toHaveLength(0);
 expect(root!.root.findAllByType('button').some(b => b.children.join('') === 'More help')).toBe(true);
 // The pinned phone screen has no room for lines the editor already covers.
 const texts = root!.root.findAllByType('p' as never).map(n => n.children.join(''));
 expect(texts.some(t => t.startsWith('Plan · '))).toBe(false);
 expect(texts).not.toContain('Tap a command below to add it.');
});
it('C1d fix: on a single-beach block puzzle, Go!, Help and the help text sit full width under the beach, not beside it', async () => {
 const p = crabPuzzles.find(c => c.ref.bank === 14)!;
 let s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
 s = challengeEngine.step(s, ['h'], p.descriptor)!.state;
 await mount(s);
 const beachRow = root!.root.findByType('beach' as never).parent!;
 expect(beachRow.findAll(n => n.props.testID === 'crab-challenge-block-run')).toHaveLength(0);
 expect(beachRow.findAllByType('p' as never).some(n => n.children.join('').startsWith('Build the group'))).toBe(false);
 const help = root!.root.findAllByType('p' as never).find(n => n.children.join('').startsWith('Build the group'))!;
 expect(help.props.maxFontSizeMultiplier).toBe(1.5);
});
it('C1d fix: on a block puzzle the help text scrolls in a bounded box and More help sits beside Go!, so the palette keeps its room at the largest text', async () => {
 for (const bank of [14, 15]) {
  const p = crabPuzzles.find(c => c.ref.bank === bank)!;
  let s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
  s = challengeEngine.step(s, ['h'], p.descriptor)!.state;
  for (const next of ['More help', 'Show the whole plan']) {
   if (root) await act(async () => root!.unmount());
   await mount(s);
   const run = root!.root.findByProps({ testID: 'crab-challenge-block-run' });
   const more = run.findAllByType('button' as never).find(b => b.children.join('') === next);
   expect(more, `${bank} ${next}`).toBeDefined();
   expect(more!.props.maxFontSizeMultiplier).toBe(1.5);
   const box = root!.root.findByProps({ testID: 'crab-challenge-help' });
   expect(box.type).toBe('section');
   expect(box.props.style.maxHeight).toBeLessThanOrEqual(116);
   for (const t of box.findAllByType('p' as never)) expect(t.props.maxFontSizeMultiplier).toBe(1.5);
   s = challengeEngine.step(s, ['h'], p.descriptor)!.state;
  }
 }
});
