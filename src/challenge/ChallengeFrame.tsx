import { SessionGate } from './SessionGate';
import { ResultOffer } from './ResultOffer';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
export function ChallengeFrame({entry,requestedPuzzle}:{entry:ChallengeEntry;requestedPuzzle?:string}) {
  const store=useStore(), owner=selectedOwner(store.save), focused=useIsFocused(), {width}=useWindowDimensions();
  const progress=progressFor(store.save,owner)??emptyChallenge(), saved=progress.paused.find(s=>s.game===entry.game&&!s.result&&!s.credited);
  const comfort=learningComfort(store.save,owner);
  const [selection,setSelection]=useState<ChallengeCard>(()=>entry.puzzles.find(p=>!p.retired&&`${p.ref.bank}:${p.ref.puzzle}`===requestedPuzzle)??entry.puzzles.find(p=>!p.retired&&progress.choice?.[0]===entry.game&&p.path===progress.choice?.[1]&&p.tier===progress.choice?.[2])??entry.puzzles.find(p=>!p.retired)!);
  const [completed,setCompleted]=useState<ChallengeSession>(), [settings,setSettings]=useState(false), [replacementGame,setReplacementGame]=useState<string>(), [dares,setDares]=useState<number[]>([]), [picking,setPicking]=useState(!saved), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [replace,setReplace]=useState(false);
  const [settling,setSettling]=useState(false), [capacity,setCapacity]=useState(false);
  const onSettled=useCallback(()=>setSettling(false),[]);
  const accepted=useRef(saved), lock=useRef(false), dispatchToken=useRef(0);
  // Store accepts a draft synchronously before durability; render receives that accepted revision.
  useLayoutEffect(()=>{if(saved && (!accepted.current || saved.id!==accepted.current.id || saved.revision>=accepted.current.revision)){accepted.current=saved;if(!saved.result)lock.current=false;}},[saved]);
  const expected=(s:ChallengeSession|undefined)=>({owner,game:entry.game,epoch:store.epoch,id:s?.id??null,revision:s?.revision??null});
  async function launch() {
    if(lock.current || saved && !replace)return;
    const token=++dispatchToken.current;
    lock.current=true;setBusy(true);setMessage('');
    try {
      const selected=comfort.youngChild?[]:dares;
      const options={supportOff:selection.dares.some(d=>selected.includes(d.slot)&&(d.rule.kind==='blind'||d.rule.kind==='plan')),ownRead:selection.dares.some(d=>selected.includes(d.slot)&&d.rule.kind==='own-read')};
      // Construct first: a throwing adapter cannot discard accepted work.
      const next=entry.start(selection.ref,owner,`challenge-${owner}-${progress.nextOrdinal}`,progress,options,selected);
      const replacement=saved&&replace?saved:progress.paused.find(s=>s.game===replacementGame);
      const guard={...expected(progress.paused.find(s=>s.game===entry.game)),...(replacement?{replace:{game:replacement.game,id:replacement.id,revision:replacement.revision}}:{})};
      if(await store.challengeSave(next,guard)) {
        accepted.current=next;setCompleted(undefined);setCapacity(false);setPicking(false);setReplace(false);setReplacementGame(undefined);
        store.challengeWorking({choice:[entry.game,selection.path,selection.tier]},{owner,epoch:store.epoch,game:entry.game,id:next.id,revision:next.revision,kind:'challenge'});
      } else setMessage('This puzzle could not start. Your saved work is kept. Continue a saved puzzle, or export a backup in Settings.');
    } catch {setMessage('This puzzle could not start. Your saved work is kept.');}
    finally {if(dispatchToken.current===token){lock.current=false;setBusy(false);}}
  }
  async function dispatch(action:unknown) {
    const current=accepted.current;if(!current || lock.current || !focused || picking)return;
    const next=entry.move(current,action);if(!next){setCapacity(!!entry.restart);setMessage(entry.restart?'This attempt is full. Start fresh with this plan to keep trying. Your marks stay kept.':'That change could not be saved. Keep this draft, or export before choosing another puzzle.');return;}
    if(next.result){setCompleted(next);if(entry.animatedRuns)setSettling(true);}
    const token=++dispatchToken.current;
    lock.current=true;setBusy(next.result!==null);setMessage('');
    const guard=expected(current);
    try {
      const durable=await store.challengeSave(next,guard);
      if(durable){if(!accepted.current || accepted.current.id===next.id&&accepted.current.revision<=next.revision)accepted.current=next;if(next.result)setCompleted(next);}
      // On a draft I/O failure Store still owns the accepted revision; render supplies it.
      else {setCompleted(undefined);setSettling(false);setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');}
    }finally{if(dispatchToken.current===token){lock.current=false;setBusy(false);}}
  }
  async function restart() {
    const current=accepted.current;if(!current||lock.current||!entry.restart)return;
    lock.current=true;setBusy(true);
    try {
      const next=entry.restart(current,`challenge-${owner}-${progress.nextOrdinal}`,progress);
      if(await store.challengeSave(next,{...expected(current),replace:{game:current.game,id:current.id,revision:current.revision}})){
        accepted.current=next;setCapacity(false);setMessage('A fresh attempt. Your plan is kept.');setCompleted(undefined);
      }else setMessage('Your original plan is kept. Retry saving before starting fresh.');
    }catch{setMessage('Your original plan is kept. Try saving again before starting fresh.');}
    finally{lock.current=false;setBusy(false);}
  }
  const round=saved??completed, playable=entry.puzzles.filter(p=>!p.retired), full=progress.paused.filter(s=>!s.credited).length>=(owner.startsWith('cove-')?4:8), marks=dareBits(progress.dares)?.filter(Boolean).length??0;
  const back=()=>router.canGoBack()?router.back():router.replace('/');
  const pinned=!!entry.animatedRuns&&!picking&&!!round&&(!round.result||settling);
  return <SafeAreaView style={styles.page}><ScrollView scrollEnabled={!pinned} contentContainerStyle={[styles.content,{gap:pinned?8:14,padding:20,...(pinned?{flex:1}: {})}]}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'}}><Button quiet compact onPress={back}>Back</Button><Heading>Challenge</Heading><LearnerChip compact/></View>
    {!pinned&&<><Copy>Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.</Copy><Copy>Your marks: {marks}. Marks are kept and never spent.</Copy></>}<SaveStatus/>
    {!!message&&<View accessibilityLiveRegion="polite"><Copy>{message}</Copy></View>}
    {capacity&&entry.restart&&<Button quiet disabled={busy} onPress={()=>void restart()}>Start fresh with this plan</Button>}
    {picking ? <>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['deep-water','endless'] as ChallengePath[]).filter(path=>playable.some(p=>p.path===path)).map(path=><Chip key={path} selected={selection.path===path} onPress={()=>{setSelection(playable.find(p=>p.path===path)!);setDares([]);}}>{path==='deep-water'?'Deep Water · A big stretch':'Endless Tide'}</Chip>)}</View>
      {playable.filter(p=>p.path===selection.path).map(p=><Button quiet key={`${p.ref.bank}-${p.ref.puzzle}`} selected={p===selection} onPress={()=>{setSelection(p);setDares([]);}}>{p.title} · Tide {p.tier}</Button>)}
      {!comfort.youngChild&&selection.dares.length>0&&<><Heading style={{fontSize:20}}>An optional dare</Heading><Copy>A miss leaves no mark and no penalty. Help is always here. Seeing the whole plan keeps your finish, but earns no dare mark.</Copy>{selection.dares.filter(d=>!d.retired).map(d=><Chip key={d.slot} selected={dares.includes(d.slot)} onPress={()=>setDares(dares.includes(d.slot)?dares.filter(n=>n!==d.slot):[d.slot])}>{d.label} · {d.help==='allowed'?'Help welcome':'On my own'}</Chip>)}</>}
      {saved&&<><Copy>Your saved Challenge puzzle stays available until a new attempt is saved. Replacing it removes it from Continue.</Copy><ToggleRow label="Start another attempt" value={replace} onChange={setReplace}/><Button quiet onPress={()=>{setPicking(false);setReplace(false);}}>Continue saved puzzle</Button></>}
      {full&&!saved&&<View style={{gap:10}}><Heading style={{fontSize:20}}>Your paused spaces are full</Heading><Copy>Finish a saved puzzle, export a backup, or choose one to replace. Your marks stay kept.</Copy>{progress.paused.filter(s=>!s.credited).map(s=><View key={s.game} style={{gap:6}}><Button quiet onPress={()=>router.replace({pathname:'/challenge',params:{game:s.game}})}>Continue {gameName(s.game)}</Button><Chip selected={replacementGame===s.game} onPress={()=>setReplacementGame(replacementGame===s.game?undefined:s.game)}>Replace {gameName(s.game)}</Chip></View>)}<Button quiet onPress={()=>setSettings(true)}>Export backup in Settings</Button></View>}
      {(!saved || replace)&&(!full||!!saved||!!replacementGame) ? <Button disabled={busy} onPress={()=>void launch()}>Start this puzzle</Button>:null}
      <Button quiet onPress={back}>Easier choice · Levels 1–5</Button>
    </> : round ? <>
      <Heading style={{fontSize:22}}>{entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.title}</Heading>
      {/* The registered Board receives dispatch only as an event callback; render does not invoke it. */}
      {(!round.result||entry.animatedRuns)&&<SessionGate key={`${owner}:${store.epoch}:${round.id}:${JSON.stringify(round.puzzle)}`} open={store.challengeOpen} expected={expected(round)} render={()=><>
        {entry.render(round,a=>void dispatch(a),focused&&(!busy||settling),width-40,onSettled)}
        {!entry.animatedRuns&&<Button quiet disabled={busy} onPress={()=>void dispatch(entry.controls.help())}>Help</Button>}
      </>}/>}
      {round.result&&!settling ? <><Heading>{round.result.event==='together'?'You solved it together!':'Puzzle solved!'}</Heading><Copy>{round.result.dares.length?'Your dare mark is kept.':'Your finished puzzle is kept. Helped finishes count too.'}</Copy>
        {owner!=='family'&&round.partner===null&&<ResultOffer progress={progress} context={entry.contextFor(round.puzzle)} comfort={comfort} facts={{atPar:round.result.event==='independent'&&round.result.cost!==null&&round.result.cost<=(entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.par?.upper??-1),firstHigher:false,dare:!!entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.dares.some(d=>!d.retired),easier:playable.some(p=>p.tier<(entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.tier??1)),harder:playable.some(p=>p.tier>(entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.tier??6))}} onChange={p=>store.challengeWorking({signal:p.signals.find(s=>s[0]===entry.contextFor(round.puzzle))},{owner,epoch:store.epoch,game:entry.game,id:round.id,revision:round.revision,kind:'challenge'})} onChoose={kind=>{const current=entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle);const next=kind==='dare'?current:playable.find(p=>p.path===current?.path&&(kind==='harder'?p.tier>(current?.tier??1):p.tier<(current?.tier??1)));if(next)setSelection(next);if(kind!=='dare')setDares([]);setPicking(true);setReplace(false);}}/>}
      </> : null}
      <Button quiet disabled={busy||settling} onPress={()=>{setPicking(true);setReplace(false);}}>Another puzzle</Button><Button quiet onPress={back}>Easier choice · Levels 1–5</Button>
    </>:null}
  </ScrollView><Settings visible={settings} onClose={()=>setSettings(false)}/></SafeAreaView>;
}
