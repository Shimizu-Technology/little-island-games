import { PuzzleEnding } from '../puzzles/ui/PuzzleEnding';
import { adjacentTide } from '../puzzles/flow';
import { SessionGate } from './SessionGate';
import { ResultOffer } from './ResultOffer';
import { ratingDue, resultOffer } from './offers';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import { Button, Chip, Copy, Heading, ToggleRow, styles } from '../components/ui';
import { Settings } from '../components/Settings';
import type { ChallengeSession } from '../state/challenge';
import { SaveStatus } from '../components/SaveStatus';
import { LearnerChip } from '../personalization/LearnerChip';
import { useStore } from '../state/Store';
import { dareBits, emptyChallenge } from '../state/challenge';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import { learningComfort } from '../state/validation';
import { shelfGames } from '../learn/home';
import type { ChallengeCard, ChallengeEntry, ChallengePath } from './types';
const gameName = (game: string) => shelfGames.find(item=>item.id===game)?.name ?? game.replace(/(^|-)([a-z0-9])/g,(_match,separator:string,letter:string)=>`${separator?' ':''}${letter.toUpperCase()}`);
/** A separate slot: entering or leaving Challenge never replaces a School round. */
export function ChallengeFrame({entry}:{entry:ChallengeEntry}) {
  const store=useStore(), owner=selectedOwner(store.save), focused=useIsFocused(), {width}=useWindowDimensions();
  const progress=progressFor(store.save,owner)??emptyChallenge(), saved=progress.paused.find(s=>s.game===entry.game&&!s.result&&!s.credited);
  const comfort=learningComfort(store.save,owner);
  const [selection,setSelection]=useState<ChallengeCard>(()=>entry.puzzles.find(p=>progress.choice?.[0]===entry.game&&p.path===progress.choice?.[1]&&p.tier===progress.choice?.[2])??entry.puzzles[0]);
  const [completed,setCompleted]=useState<ChallengeSession>(), [settings,setSettings]=useState(false), [replacementGame,setReplacementGame]=useState<string>(), [dares,setDares]=useState<number[]>([]), [picking,setPicking]=useState(!saved), [busy,setBusy]=useState(false), [launching,setLaunching]=useState(false), [message,setMessage]=useState(''), [replace,setReplace]=useState(false);
  const [fresh,setFresh]=useState<'choose'|'confirm'|null>(null);
  const accepted=useRef(saved), lock=useRef(false), dispatchToken=useRef(0);
  // Store accepts a draft synchronously before durability; render receives that accepted revision.
  useLayoutEffect(()=>{if(saved && (!accepted.current || saved.id!==accepted.current.id || saved.revision>=accepted.current.revision)){accepted.current=saved;if(!saved.result)lock.current=false;}},[saved]);
  const expected=(s:ChallengeSession|undefined)=>({owner,game:entry.game,epoch:store.epoch,id:s?.id??null,revision:s?.revision??null});
  async function launch(target: ChallengeCard = selection, chosenDares: number[] = dares, replaceSaved = false) {
    if(lock.current || saved && !replace && !replaceSaved)return;
    const token=++dispatchToken.current;
    lock.current=true;setBusy(true);setLaunching(true);setMessage('');
    try {
      const selected=comfort.youngChild?[]:chosenDares;
      const options={supportOff:target.dares.some(d=>selected.includes(d.slot)&&d.rule.kind==='blind'),ownRead:target.dares.some(d=>selected.includes(d.slot)&&d.rule.kind==='own-read')};
      // Construct first: a throwing adapter cannot discard accepted work.
      const next=entry.start(target.ref,owner,`challenge-${owner}-${progress.nextOrdinal}`,progress,options,selected);
      const replacement=saved&&(replace||replaceSaved)?saved:progress.paused.find(s=>s.game===replacementGame);
      const guard={...expected(progress.paused.find(s=>s.game===entry.game)),...(replacement?{replace:{game:replacement.game,id:replacement.id,revision:replacement.revision}}:{})};
      if(await store.challengeSave(next,guard)) {
        accepted.current=next;setCompleted(undefined);setPicking(false);setReplace(false);setFresh(null);setReplacementGame(undefined);
        store.challengeWorking({choice:[entry.game,target.path,target.tier]},{owner,epoch:store.epoch,game:entry.game,id:next.id,revision:next.revision,kind:'challenge'});
      } else setMessage('This puzzle could not start. Your saved work is kept. Continue a saved puzzle, or export a backup in Settings.');
    } catch {setMessage('This puzzle could not start. Your saved work is kept.');}
    finally {if(dispatchToken.current===token){lock.current=false;setBusy(false);setLaunching(false);}}
  }
  const sessionKey=(s:ChallengeSession)=>`${owner}:${store.epoch}:${s.id}:${s.revision}`;
  async function dispatch(action:unknown):Promise<ChallengeSession|null> {
    const current=accepted.current;if(!current || lock.current || !focused || picking)return null;
    const next=entry.move(current,action);if(!next){setMessage('This draft is kept. Try Help or choose another puzzle.');return null;}
    const token=++dispatchToken.current;
    lock.current=true;setBusy(next.result!==null);setMessage('');
    const guard=expected(current);
    try {
      const durable=await store.challengeSave(next,guard);
      if(durable){if(!accepted.current || accepted.current.id===next.id&&accepted.current.revision<=next.revision)accepted.current=next;if(next.result)setCompleted(next);return next;}
      // On a draft I/O failure Store still owns the accepted revision; render supplies it.
      else setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');
      return null;
    }finally{if(dispatchToken.current===token){lock.current=false;setBusy(false);}}
  }
  const round=saved??completed, full=progress.paused.filter(s=>!s.credited).length>=(owner.startsWith('cove-')?4:8), marks=dareBits(progress.dares)?.filter(Boolean).length??0;
  const currentCard = round && entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle);
  const offerContext = round ? entry.contextFor(round.puzzle) : '';
  const offerFacts = {atPar:round?.result?.event==='independent'&&round.result.cost!==null&&round.result.cost<=(currentCard?.par?.upper??-1),firstHigher:false,dare:entry.puzzles.some(p=>p.dares.length>0),easier:entry.puzzles.some(p=>p.tier<(currentCard?.tier??1)),harder:entry.puzzles.some(p=>p.tier>(currentCard?.tier??6))};
  const signal=progress.signals.find(s=>s[0]===offerContext);
  const personal=owner!=='family'&&round?.partner===null;
  const hasOffer=!!(personal&&comfort.offers&&!comfort.youngChild&&signal&&!signal[4]&&(ratingDue(progress,offerContext)||resultOffer(signal,comfort,offerFacts)));
  const showDirections=comfort.offers&&!comfort.youngChild&&!hasOffer&&!(personal&&signal?.[4]);
  function chooseNext(direction: 'easier'|'same'|'harder') {
    if(!currentCard)return;
    const recent=progress.recent.flatMap(([bank,puzzle])=>entry.puzzles.filter(p=>p.ref.bank===bank&&p.ref.puzzle===puzzle));
    const next=adjacentTide(entry.puzzles.filter(p=>p.path===currentCard.path),currentCard,direction,recent);
    if(next){setSelection(next);setDares([]);void launch(next,[]);}else{setPicking(true);setReplace(false);setDares([]);}
  }
  function freshPuzzle() {
    if(!currentCard)return;
    const recent=progress.recent.flatMap(([bank,puzzle])=>entry.puzzles.filter(p=>p.ref.bank===bank&&p.ref.puzzle===puzzle));
    const next=adjacentTide(entry.puzzles.filter(p=>p.path===currentCard.path),currentCard,'same',recent);
    setPicking(true);setReplace(false);setDares([]);setFresh(next&&saved?'choose':null);
    if(next)setSelection(next);
    else setMessage('There is no other puzzle at this tide. Your draft is kept. Continue it or choose another tide.');
  }
  const completionFacts=round?.result?entry.completionFacts?.(round)??null:null;
  const defaultPraise=round?.result?.event==='together'?'You worked through this puzzle together.':completionFacts?.helpUsed?'You finished this puzzle with help.':completionFacts?.failed?'You kept trying and solved it.':'You completed this puzzle.';
  const back=()=>router.canGoBack()?router.back():router.replace('/');
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={[styles.content,{gap:14,padding:20}]}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'}}><Button quiet compact onPress={back}>Back</Button><Heading>Challenge</Heading><LearnerChip compact/></View>
    <Copy>Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.</Copy><Copy>Your marks: {marks}. Marks are kept and never spent.</Copy><SaveStatus/>
    {!!message&&<View accessibilityLiveRegion="polite"><Copy>{message}</Copy></View>}
    {picking ? <>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['deep-water','endless'] as ChallengePath[]).filter(path=>entry.puzzles.some(p=>p.path===path)).map(path=><Chip key={path} selected={selection.path===path} onPress={()=>{setSelection(entry.puzzles.find(p=>p.path===path)!);setDares([]);setFresh(null);}}>{path==='deep-water'?'Deep Water · A big stretch':'Endless Tide'}</Chip>)}</View>
      {entry.puzzles.filter(p=>p.path===selection.path).map(p=><Button quiet key={`${p.ref.bank}-${p.ref.puzzle}`} selected={p===selection} onPress={()=>{setSelection(p);setDares([]);setFresh(null);}}>{p.title} · Tide {p.tier}</Button>)}
      {!comfort.youngChild&&selection.dares.length>0&&<><Heading style={{fontSize:20}}>An optional dare</Heading><Copy>A miss leaves no mark and no penalty. Help is always here.</Copy>{selection.dares.map(d=><Chip key={d.slot} selected={dares.includes(d.slot)} onPress={()=>setDares(dares.includes(d.slot)?dares.filter(n=>n!==d.slot):[d.slot])}>{d.label} · {d.help==='allowed'?'Help welcome':'On my own'}</Chip>)}</>}
      {saved&&!fresh&&<><Copy>Your saved Challenge puzzle stays available until a new attempt is saved. Replacing it removes it from Continue.</Copy><ToggleRow label="Start another attempt" value={replace} onChange={setReplace}/><Button quiet onPress={()=>{setPicking(false);setReplace(false);}}>Continue saved puzzle</Button></>}
      {saved&&fresh&&<>
        <Copy>{fresh==='confirm'?'Start this fresh puzzle and replace your saved draft?':'A fresh puzzle with the same idea is ready. Your draft stays saved until you start.'}</Copy>
        <Button disabled={busy} onPress={()=>fresh==='confirm'?void launch(selection,[],true):setFresh('confirm')}>{fresh==='confirm'?'Replace saved puzzle and start':'Start fresh puzzle'}</Button>
        <Button quiet onPress={()=>{setPicking(false);setFresh(null);setReplace(false);}}>Continue saved puzzle</Button>
      </>}
      {full&&!saved&&<View style={{gap:10}}><Heading style={{fontSize:20}}>Your paused spaces are full</Heading><Copy>Finish a saved puzzle, export a backup, or choose one to replace. Your marks stay kept.</Copy>{progress.paused.filter(s=>!s.credited).map(s=><View key={s.game} style={{gap:6}}><Button quiet onPress={()=>router.replace({pathname:'/challenge',params:{game:s.game}})}>Continue {gameName(s.game)}</Button><Chip selected={replacementGame===s.game} onPress={()=>setReplacementGame(replacementGame===s.game?undefined:s.game)}>Replace {gameName(s.game)}</Chip></View>)}<Button quiet onPress={()=>setSettings(true)}>Export backup in Settings</Button></View>}
      {!fresh&&(!saved || replace)&&(!full||!!saved||!!replacementGame) ? <Button disabled={busy} onPress={()=>void launch()}>Start this puzzle</Button>:null}
      <Button quiet onPress={back}>Easier choice · Levels 1–5</Button>
    </> : round ? <>
      <Heading style={{fontSize:22}}>{entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.title}</Heading>
      {/* The registered Board receives dispatch only as an event callback; render does not invoke it. */}
      {!round.result&&!launching&&<SessionGate key={`${owner}:${store.epoch}:${round.id}:${JSON.stringify(round.puzzle)}`} open={store.challengeOpen} expected={expected(round)} onStartFresh={()=>store.challengeDiscard(expected(round))} render={()=><>
        {entry.render(round,a=>void dispatch(a),focused&&!busy,width-40,{key:sessionKey(round),onFresh:freshPuzzle,commit:async(action,key)=>{const current=accepted.current;if(!current||key!==sessionKey(current))return null;const session=await dispatch(action);return session?{key:sessionKey(session),session}:null;}})}
        {entry.helpUI!=='board'&&<Button quiet disabled={!focused||busy} onPress={()=>void dispatch(entry.controls.help())}>Help</Button>}
      </>}/>}
      {round.result ? <><Heading>{round.result.event==='together'?'You solved it together!':'Puzzle solved!'}</Heading><Copy>{round.result.dares.length?'Your dare mark is kept.':'Your finished puzzle is kept. Helped finishes count too.'}</Copy>
        {hasOffer&&<ResultOffer progress={progress} context={offerContext} comfort={comfort} facts={offerFacts} onChange={p=>store.challengeWorking({signal:p.signals.find(s=>s[0]===entry.contextFor(round.puzzle))},{owner,epoch:store.epoch,game:entry.game,id:round.id,revision:round.revision,kind:'challenge'})} onChoose={kind=>{const current=entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle);const next=kind==='dare'?current:entry.puzzles.find(p=>kind==='harder'?p.tier>(current?.tier??1):p.tier<(current?.tier??1));if(next)setSelection(next);if(kind!=='dare')setDares([]);setPicking(true);setReplace(false);setFresh(null);}}/>}
        <PuzzleEnding praise={entry.completionText?.(round.puzzle,round.result,completionFacts) ?? defaultPraise} disabled={busy} showDirections={showDirections}
          onChoose={chooseNext} onAnother={()=>chooseNext('same')}
          onRest={back}/>
      </> : null}
      {!round.result&&<><Button quiet disabled={busy} onPress={()=>{setPicking(true);setReplace(false);setFresh(null);}}>Another puzzle</Button><Button quiet onPress={back}>Easier choice · Levels 1–5</Button></>}
    </>:null}
  </ScrollView><Settings visible={settings} onClose={()=>setSettings(false)}/></SafeAreaView>;
}
