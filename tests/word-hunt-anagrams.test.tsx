import { elapseRound } from '../src/wordgames/clock';
import React from 'react';
import Activity from '../src/app/word-games';
import { WordGamesCards } from '../src/wordgames/WordGamesCards';
import { applyWordGameSave, validWordGames, withoutWordGameOwner } from '../src/state/wordGames';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { addLearner, selectLearner } from '../src/learn/learners';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { WordHuntScreen } from '../src/wordgames/WordHuntScreen';
import { AnagramsScreen } from '../src/wordgames/AnagramsScreen';
import { HuntBoard } from '../src/wordgames/HuntBoard';
import { emptySave, parseSave } from '../src/state/validation';
import { validActivities } from '../src/state/activities';
import { shelfGames } from '../src/learn/home';
import type { WordSession } from '../src/wordgames/session';
import { getWordLexicon, isValidPrefix } from '../src/wordgames/lexicon';
import { generateBoard, solveBoard, validHuntPath, traceTile, tileAtPoint } from '../src/wordgames/wordHuntEngine';
import { generateRack, solveRack, canBuildWord, selectRackTile, shuffleRack, scrambleRack } from '../src/wordgames/anagramsEngine';
import { wordScore } from '../src/wordgames/scoring';
import { createWordSession, changeSelection, submitWord, finishRound, startSecondPlayer, pauseRound, resumeRound, rematch, validWordSession } from '../src/wordgames/session';
const routeFixture=vi.hoisted(()=>({game:'word-hunt'}));
const navigation=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>routeFixture,useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn(),push:navigation.push},Redirect:'Redirect'}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
vi.mock('../src/components/GameIcon',()=>({GameIcon:'GameIcon'}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Recovery',()=>({Recovery:()=>null}));
vi.mock('../src/cards/CardGameScreen',()=>({CardGameScreen:()=>null}));
vi.mock('../src/racer/RaceScreen',()=>({RaceScreen:()=>null}));
vi.mock('../src/mystery/MysteryScreen',()=>({MysteryScreen:()=>null}));
vi.mock('../src/party/PartyScreen',()=>({PartyScreen:()=>null}));
vi.mock('../src/components/Audio',()=>({useSoundControls:()=>({play:vi.fn(),stop:vi.fn()})}));
vi.mock('../src/state/Store',()=>({useStore:()=>({ready:true,epoch:0,save:emptySave(),wordGameUpdate:()=>true})}));
vi.mock('../src/practice/useRoundPractice',async()=>{
  const React=await import('react');
  return {useRoundPractice:()=>{
    const [pending,setPending]=React.useState(false), next=React.useRef<(()=>void)|null>(null);
    return {pending,request:(start:()=>void)=>{next.current=start;setPending(true);},panel:pending?React.createElement('Button',{onPress:()=>{setPending(false);next.current?.();}},'Complete practice'):null};
  }};
});
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', useWindowDimensions:()=>({width:390,height:844}), Platform: { OS: 'ios' },
  StyleSheet: { create: (s: object) => s, absoluteFill: {} },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  AppState: { addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} interpolate() { return 0; } }, timing: () => ({ start() {} }) },
}));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Polyline: 'Polyline' }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Copy: 'Copy', Heading: 'Heading', PressableScale: 'Tile', styles:{page:{},content:{}}, C: { ink: '#3D2B24', muted: '#665247' } }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/motion', () => ({ nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => <div data-testid="atmosphere-header"/> }));
let screen: ReactTestRenderer | undefined;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
const press = async (label: string) => { const button = screen!.root.findAllByType('Button' as React.ElementType).find(node => [node.props.children].flat().join('') === label); expect(button, label).toBeDefined(); await act(async () => button!.props.onPress()); };
const visible = () => JSON.stringify(screen!.toJSON());

describe('reviewed offline word games', () => {
  it('builds only clean whole prose words, once', () => {
    const words = getWordLexicon();

    expect(words.size).toBeGreaterThanOrEqual(1400);
    expect(getWordLexicon()).toBe(words);
    expect([...words].every(word => /^[A-Z]{3,8}$/.test(word))).toBe(true);
    expect(words.has('HTTPS')).toBe(false); expect(words.has('READING')).toBe(true);
    for (const fragment of ['BLEU','ING','FUL','PRE','TELE','GEO','BIO']) expect(words.has(fragment), fragment).toBe(false);
    expect(words.has('READ.SHORT')).toBe(false); expect(words.has('V25')).toBe(false);
    expect(isValidPrefix('CA')).toBe(true); expect(isValidPrefix('ZZZZ')).toBe(false);
  });
  it('uses the classic scoring ladder', () => {
    expect([2,3,4,5,6,7,8,9].map(wordScore)).toEqual([0,100,400,800,1400,1800,2200,2600]);
  });
  for (const size of [4,5] as const) it(`certifies ${size}×${size} boards across 20 seeds`, () => {
    for (let seed = 0; seed < 20; seed++) {
      const grid = generateBoard(size, seed), words = solveBoard(grid);
      expect(grid).toEqual(generateBoard(size, seed));
      expect(words.size).toBeGreaterThanOrEqual(size === 4 ? 25 : 45);
      expect([...words.keys()].some(word => word.length >= 5)).toBe(true);
      for (const [word,path] of words) { expect(validHuntPath(path,grid)).toBe(true); expect(path.map(i=>grid[i]).join('')).toBe(word); }
    }
  });
  it('allows diagonals, forbids reuse, pops step-back and ignores corners', () => {
    expect(traceTile([0,5],0,4)).toEqual([0]); expect(traceTile([0,5],10,4)).toEqual([0,5,10]);
    expect(traceTile([0,5,10],0,4)).toEqual([0,5,10]); expect(traceTile([0],15,4)).toEqual([0]);
    expect(tileAtPoint(50,50,400,4)).toBe(0); expect(tileAtPoint(99,99,400,4)).toBeNull();
    expect(validHuntPath([0,5,0],Array(16).fill('A'))).toBe(false);
  });
  for (const size of [6,7] as const) it(`certifies ${size}-tile racks across 20 seeds`, () => {
    for (let seed=0; seed<20; seed++) {
      const rack=generateRack(size,seed), words=solveRack(rack);
      expect(rack).toEqual(generateRack(size,seed)); expect(words.length).toBeGreaterThanOrEqual(12);
      expect(words.some(word=>word.length===size)).toBe(true); expect(getWordLexicon().has(rack.join(''))).toBe(false);
      expect(words.every(word=>canBuildWord(word,rack))).toBe(true);
    }
  });
  it('enforces rack letter multisets and selection operations', () => {
    expect(canBuildWord('AAA',['A','B','C'])).toBe(false);
    expect(selectRackTile([0,1],0,6)).toEqual([1]); expect(selectRackTile([0],2,6)).toEqual([0,2]);
    expect(new Set(shuffleRack([0,1,2,3,4,5],42))).toEqual(new Set([0,1,2,3,4,5]));
  });
  it('handles rush, pause, chill, duplicate submit, handoff, winner and rematch', () => {
    let s=createWordSession('word-hunt',4,'pass-play',42);
    const [word,path]=[...solveBoard(s.tiles)][0];
    s=submitWord(changeSelection(s,[...path])); expect(s.found[0]).toEqual([word]);
    s=submitWord(changeSelection(s,[...path])); expect(s.found[0]).toEqual([word]);
    s=finishRound(s); expect(s.phase).toBe('handoff'); expect(validWordSession(s)).toBe(true);
    const p2=startSecondPlayer(s); expect(p2.tiles).toEqual(s.tiles); expect(p2.found[1]).toEqual([]);
    const end=elapseRound(p2,80000); expect(end.result?.winner).toBe(0); expect(validWordSession(end)).toBe(true);
    expect(rematch(rematch(end)).id).not.toBe(rematch(end).id); expect(rematch(end).tiles).toEqual(end.tiles); expect(rematch(end).found).toEqual([[],[]]);
    const chill=createWordSession('anagrams',6,'chill',42); expect(elapseRound(chill,999999)).toBe(chill);
    const paused=pauseRound(chill); expect(elapseRound(paused,1000)).toBe(paused); expect(resumeRound(paused).phase).toBe('playing');
    expect(validWordSession(chill)).toBe(true);
  });
});

describe('independent word-game persistence and integration', () => {
  for (const game of ['word-hunt','anagrams'] as const) it(`round trips ${game} with strict saves and restore guards`, () => {
    const session=game === 'word-hunt' ? createWordSession(game,5,'rush',99) : createWordSession(game,7,'pass-play',99);
    const initial=emptySave(), saved=applyWordGameSave(initial,game,session,{owner:'family',id:null,epoch:2},2);
    expect(saved).not.toBe(initial); expect(parseSave(JSON.stringify(saved))).toEqual(saved);
    expect(saved.wordGames?.people.family[game]).toEqual(session); expect(saved.activities).toBeUndefined();
    const paused=pauseRound(session), next=applyWordGameSave(saved,game,paused,{owner:'family',id:session.id,revision:session.revision,epoch:2},2);
    expect(parseSave(JSON.stringify(next))).toEqual(next);
    expect(applyWordGameSave(next,game,session,{owner:'family',id:session.id,revision:0,epoch:2},2)).toBe(next);
    expect(applyWordGameSave(next,game,session,{owner:'family',id:session.id,epoch:1},2)).toBe(next);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,version:2}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,tiles:['HTTPS']}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,selection:[0,0]}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,found:[['ZZZZ'],[]]}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,hidden:'payload'}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game]:{...session,result:{winner:1}}}}},['family'])).toBe(false);
    expect(validWordGames({version:1,people:{family:{[game==='word-hunt'?'anagrams':'word-hunt']:session}}},['family'])).toBe(false);
  });
  it('leaves the frozen rosters unchanged and presents dedicated cards with dedicated routes',async()=>{
    expect(shelfGames.some(game=>(game.id as string)==='word-hunt'||(game.id as string)==='anagrams')).toBe(false);
    expect(validActivities({'word-hunt':createWordSession('word-hunt',4,'chill',1)})).toBe(false);
    expect(readFileSync('src/app/shelf.tsx','utf8')).toContain('<WordGamesCards/>');
    expect(readFileSync('src/hub/EverythingScreen.tsx','utf8')).toContain('<WordGamesCards/>');
    await act(async()=>{screen=create(<WordGamesCards/>);});
    for(const game of ['word-hunt','anagrams'] as const){
      await act(async()=>screen!.root.findByProps({testID:`word-game-card-${game}`}).props.onPress());
      expect(navigation.push).toHaveBeenLastCalledWith({pathname:'/word-games',params:{game}});
    }
  });
  it('keeps word sessions per learner across profile changes, encoding, restore and learner removal',()=>{
    const old=emptySave(); expect(JSON.parse(encodeSave(old))).not.toHaveProperty('wordGames');
    let save=migrateProfiles(old);
    const family=createWordSession('word-hunt',4,'chill',181);
    save=applyWordGameSave(save,'word-hunt',family,{owner:'family',id:null,epoch:1},1);
    save={...save,learning:addLearner(save.learning,'Test learner','child-one')};
    const child=createWordSession('word-hunt',4,'chill',182);
    expect(applyWordGameSave(save,'word-hunt',child,{owner:'family',id:null,epoch:1},1)).toBe(save);
    save=applyWordGameSave(save,'word-hunt',child,{owner:'child-one',id:null,epoch:1},1);
    const restored=migrateProfiles(parseSave(encodeSave(save)));
    expect(restored.wordGames?.people.family['word-hunt']).toEqual(family); expect(restored.wordGames?.people['child-one']['word-hunt']).toEqual(child);
    const switched={...restored,learning:selectLearner(restored.learning,'family')};
    expect(applyWordGameSave(switched,'word-hunt',child,{owner:'child-one',id:child.id,epoch:1},1)).toBe(switched);
    const removed=withoutWordGameOwner(switched,'child-one'); expect(removed.wordGames?.people['child-one']).toBeUndefined(); expect(removed.wordGames?.people.family['word-hunt']).toEqual(family);
    expect(validWordGames({version:1,people:{unknown:{}}},['family'])).toBe(false);
  });

});
describe('real screen interactions', () => {
  it('keeps the drag surface free of disabled native buttons and maps centered pointer events', async () => {
    const tiles=generateBoard(4,31), onTile=vi.fn(), onRelease=vi.fn(), onCancel=vi.fn(), onTracingChange=vi.fn();
    await act(async()=>{screen=create(<HuntBoard tiles={tiles} size={4} path={[]} width={320} interactive onTile={onTile} onRelease={onRelease} onCancel={onCancel} onTracingChange={onTracingChange}/>);});
    expect(screen!.root.findAllByType('Tile' as React.ElementType)).toHaveLength(0);
    const board=screen!.root.findByProps({testID:'hunt-board'});
    await act(async()=>board.props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40,pageX:60,pageY:140}}));
    await act(async()=>board.props.onPanResponderMove({nativeEvent:{locationX:120,locationY:120,pageX:140,pageY:220}}));
    expect(onTile.mock.calls.map(call=>call[0])).toEqual([0,5]); expect(onTracingChange).toHaveBeenLastCalledWith(true);
    await act(async()=>board.props.onPanResponderRelease({nativeEvent:{locationX:120,locationY:120}})); expect(onRelease).toHaveBeenCalledOnce(); expect(onTracingChange).toHaveBeenLastCalledWith(false);
    await act(async()=>board.props.onPanResponderTerminate()); expect(onCancel).toHaveBeenCalledOnce(); expect(onTracingChange).toHaveBeenLastCalledWith(false);
    await act(async()=>board.props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40}}));
    await act(async()=>screen!.unmount()); screen=undefined; expect(onTracingChange).toHaveBeenLastCalledWith(false);
  });
  it('starts Word Hunt, taps a diagonal trail, submits, hints, pauses and reviews missed paths', async () => {
    let saved: WordSession | null = null;
    await act(async () => { screen=create(<WordHuntScreen session={null} onSave={next=>{saved=next;}} onBack={()=>{}}/>); });
    await press('Start Word Hunt'); expect((saved as WordSession | null)?.game).toBe('word-hunt');
    await press('Use tap tracing');
    const initial=saved! as WordSession, [word,path]=[...solveBoard(initial.tiles)].find(([,path])=>path.some((tile,i)=>i>0 && Math.abs(tile-path[i-1])%4!==0 && Math.floor(tile/4)!==Math.floor(path[i-1]/4)))!;
    for (const tile of path) { const button=screen!.root.findAllByType('Tile' as React.ElementType)[tile]; await act(async()=>button.props.onPress()); }
    expect(visible()).toContain(`+${wordScore(word)}`); await press('Submit'); expect(saved!.found[0]).toContain(word);
    await press('Hint'); expect(visible()).toContain('green tile');
    await press('Pause'); expect(screen!.root.findAllByProps({testID:'hunt-board'})).toHaveLength(0);
    await press('Resume'); await press('Finish round');
    expect(screen!.root.findByProps({testID:'word-finish'})).toBeDefined(); expect(visible()).toContain('Play Again');
    const missed=screen!.root.findAllByType('Button' as React.ElementType).find(node=>node.props.label?.includes('show letters'))!;
    await act(async()=>missed.props.onPress());
    expect(screen!.root.findByType(HuntBoard).props.path.length).toBeGreaterThanOrEqual(3);
    await press('Rematch Same Board'); expect(saved!.tiles).toEqual(initial.tiles); expect(saved!.found[0]).toEqual([]);
  });
  it('runs Anagrams selection, shuffle, clear, submit, private handoff and scorecard', async () => {
    let saved: WordSession | null = null; const onActionFocus=vi.fn();
    await act(async()=>{screen=create(<AnagramsScreen session={null} onSave={next=>{saved=next;}} onBack={()=>{}} onActionFocus={onActionFocus}/>);});
    await press('Pass & Play'); await press('7 tiles · Big Rack'); await press('Start Anagrams');
    const initial=saved! as WordSession, word=solveRack(initial.tiles)[0], used:number[]=[];
    for (const letter of word) {
      const tile=initial.tiles.findIndex((value,index)=>value===letter&&!used.includes(index)); used.push(tile);
      const button=screen!.root.findByProps({testID:'anagrams-rack'}).findAllByType('Tile' as React.ElementType).find(node=>node.props.accessibilityLabel.includes(`tile ${tile+1}`))!;
      await act(async()=>button.props.onPress());
    }
    await press('Enter'); expect(saved!.found[0]).toContain(word); await press('Shuffle');
    await act(async()=>screen!.root.findByProps({testID:'anagrams-rack'}).findAllByType('Tile' as React.ElementType)[0].props.onPress());
    await press('Clear'); expect(saved!.selection).toEqual([]);
    await press('Finish round'); expect(onActionFocus).toHaveBeenCalled(); expect(visible()).toContain('Pass to Player 2!'); expect(visible()).not.toContain(word);
    expect(screen!.root.findAllByProps({testID:'anagrams-rack'})).toHaveLength(0);
    await press('Player 2 is ready'); expect(saved!.tiles).toEqual(initial.tiles); expect(saved!.remainingMs).toBe(60000);
    await press('Finish round'); expect(visible()).toContain('Player 1 wins!'); expect(screen!.root.findByProps({testID:'word-scorecard'})).toBeDefined();
    const summaryText=screen!.root.findByProps({testID:'word-finish'}).findAllByType('Text' as React.ElementType).map(node=>[node.props.children].flat().join('')).join(' ');
    expect(summaryText).toContain('Best word: '+word); expect(summaryText).toContain('Player 1: '+wordScore(word).toLocaleString()+' pts');
    await press('Rematch Same Rack'); expect(saved!.tiles).toEqual(initial.tiles);
  });
  it('restores behind a pause card, counts time during repeated input, and stops at zero', async () => {
    vi.useFakeTimers();
    let saved: WordSession | null = null;
    const session=createWordSession('anagrams',6,'rush',4);
    await act(async()=>{ screen=create(<AnagramsScreen session={session} onSave={next=>{saved=next;}} onBack={()=>{}}/>); });
    expect(visible()).toContain('Your game is paused'); await press('Resume');
    for(let i=0;i<10;i++) { await act(async()=>{ vi.advanceTimersByTime(400); }); await press('Clear'); }
    expect(saved!.remainingMs).toBeLessThanOrEqual(57000);
    await act(async()=>{ vi.advanceTimersByTime(61000); }); expect(saved!.phase).toBe('finished');
  });
  it('does not advance a rejected stale save and honors sound off', async () => {
    const onSave=vi.fn(()=>false), feedback=vi.fn();
    await act(async()=>{ screen=create(<AnagramsScreen session={null} onSave={onSave} onBack={()=>{}} sound={false} onFeedback={feedback}/>); });
    await press('Start Anagrams'); expect(visible()).toContain('Start Anagrams'); expect(feedback).not.toHaveBeenCalled();
  });
});

describe('activity route practice integration',()=>{
  for(const game of ['word-hunt','anagrams'] as const) it(`shows the optional practice panel before starting and rematching ${game}`,async()=>{
    routeFixture.game=game;
    await act(async()=>{screen=create(<Activity/>);});
    await press(game==='word-hunt'?'Start Word Hunt':'Start Anagrams');
    expect(visible()).toContain('Complete practice');
    await press('Complete practice');
    expect(screen!.root.findAllByProps({testID:game==='word-hunt'?'hunt-board':'anagrams-rack'})).toHaveLength(1);
    await press('Finish round'); await press(game==='word-hunt'?'Rematch Same Board':'Rematch Same Rack');
    expect(visible()).toContain('Complete practice'); await press('Complete practice');
    expect(screen!.root.findAllByProps({testID:'word-finish'})).toHaveLength(0);
  });
});

describe('R1 regressions',()=>{
  it('keeps native parent scrolling locked only during tracing, including cancel and unmount',async()=>{
    routeFixture.game='word-hunt';
    await act(async()=>{screen=create(<Activity/>);}); await press('Start Word Hunt'); await press('Complete practice');
    const page=()=>screen!.root.findByType('ScrollView' as React.ElementType), board=()=>screen!.root.findByProps({testID:'hunt-board'});
    expect(page().props.scrollEnabled).toBe(true);
    await act(async()=>board().props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40}})); expect(page().props.scrollEnabled).toBe(false);
    await act(async()=>board().props.onPanResponderRelease({nativeEvent:{locationX:40,locationY:40}})); expect(page().props.scrollEnabled).toBe(true);
    await act(async()=>board().props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40}})); expect(page().props.scrollEnabled).toBe(false);
    await act(async()=>board().props.onPanResponderTerminate()); expect(page().props.scrollEnabled).toBe(true);
    await act(async()=>board().props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40}}));
    await press('Pause'); expect(page().props.scrollEnabled).toBe(true);
  });
  it('unlocks the old scroll owner when a live board becomes a passive review board',async()=>{
    const tiles=generateBoard(4,10), onTracingChange=vi.fn();
    await act(async()=>{screen=create(<HuntBoard tiles={tiles} size={4} path={[]} width={320} interactive onTracingChange={onTracingChange}/>);});
    await act(async()=>screen!.root.findByProps({testID:'hunt-board'}).props.onPanResponderGrant({nativeEvent:{locationX:40,locationY:40}}));
    expect(onTracingChange).toHaveBeenLastCalledWith(true);
    await act(async()=>screen!.update(<HuntBoard tiles={tiles} size={4} path={[]} width={320}/>));
    expect(onTracingChange).toHaveBeenLastCalledWith(false);
  });
  it('paints the connector between wood and the crisp foreground glyph layer',async()=>{
    await act(async()=>{screen=create(<HuntBoard tiles={generateBoard(4,12)} size={4} path={[0,5]} width={320}/>);});
    const board=screen!.root.findByProps({testID:'hunt-board'}), children=board.children.filter(child=>typeof child!=='string');
    const trail=children.findIndex(child=>child.props.testID==='hunt-trail'), letters=children.findIndex(child=>child.props.testID==='hunt-letters');
    expect(trail).toBeGreaterThan(0); expect(letters).toBeGreaterThan(trail);
  });
  for(const game of ['word-hunt','anagrams'] as const) it(`marks only the selected next-round size for ${game}, and rematches use the saved size`,async()=>{
    const session=game==='word-hunt'?finishRound(createWordSession(game,5,'chill',73)):finishRound(createWordSession(game,7,'chill',73));
    const Component=game==='word-hunt'?WordHuntScreen:AnagramsScreen;
    await act(async()=>{screen=create(<Component session={session} onSave={()=>{}} onBack={()=>{}} width={350}/>);});
    const small=game==='word-hunt'?'4 × 4':'6 tiles', big=game==='word-hunt'?'5 × 5':'7 tiles';
    const button=(label:string)=>screen!.root.findAllByType('Button' as React.ElementType).find(node=>node.props.children===label)!;
    expect(button(big).props.selected).toBe(true); expect(button(big).props.quiet).toBe(false); expect(button(small).props.selected).toBe(false); expect(button(small).props.quiet).toBe(true);
    await press(small); expect(button(small).props.selected).toBe(true); expect(button(big).props.quiet).toBe(true);
    await press(game==='word-hunt'?'Rematch Same Board':'Rematch Same Rack');
    if(game==='anagrams'){
      const answer=screen!.root.findByProps({testID:'anagrams-answer'}), rack=screen!.root.findByProps({testID:'anagrams-rack'});
      expect(answer.findAllByType('Tile' as React.ElementType)).toHaveLength(7);
      expect(answer.props.style[1].maxWidth).toBe(240); expect(rack.props.style[1].maxWidth).toBe(240);
    } else expect(screen!.root.findByType(HuntBoard).props.size).toBe(5);
  });
  it('never starts on a complete anagram even when a different full-length arrangement is accepted',()=>{
    const letters=[...'SHELTER'], seed=71, first=scrambleRack(letters,seed,new Set());
    const lexicon=new Set([letters.join(''),first.join('')]);
    const rack=scrambleRack(letters,seed,lexicon);
    expect(lexicon.has(rack.join(''))).toBe(false); expect([...rack].sort()).toEqual([...letters].sort());
    expect(rack).toEqual(scrambleRack(letters,seed,lexicon));
  });
  it('flushes fractions of a second on pause and navigation unmount without double-charging',async()=>{
    vi.useFakeTimers(); let saved:WordSession|null=null;
    await act(async()=>{screen=create(<AnagramsScreen session={createWordSession('anagrams',6,'rush',19)} onSave={next=>{saved=next;}} onBack={()=>{}}/>);});
    await press('Resume'); await act(async()=>{vi.advanceTimersByTime(350);}); await press('Pause');
    expect(saved!.remainingMs).toBe(59650);
    await press('Resume'); await act(async()=>{vi.advanceTimersByTime(425);});
    await act(async()=>screen!.unmount()); screen=undefined;
    expect(saved!.phase).toBe('paused'); expect(saved!.remainingMs).toBe(59225);
  });
});
