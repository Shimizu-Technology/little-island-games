import { ResultOffer } from './ResultOffer';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import { Button, Chip, Copy, Heading, ToggleRow, styles } from '../components/ui';
import { SaveStatus } from '../components/SaveStatus';
import { LearnerChip } from '../personalization/LearnerChip';
import { useStore } from '../state/Store';
import { dareBits, emptyChallenge } from '../state/challenge';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import { learningComfort } from '../state/validation';
import type { ChallengeCard, ChallengeEntry, ChallengePath } from './types';
/** A separate slot: entering or leaving Challenge never replaces a School round. */
export function ChallengeFrame({entry}:{entry:ChallengeEntry}) {
  const store=useStore(), owner=selectedOwner(store.save), focused=useIsFocused(), {width}=useWindowDimensions();
  const progress=progressFor(store.save,owner)??emptyChallenge(), saved=progress.paused.find(s=>s.game===entry.game);
  const comfort=learningComfort(store.save,owner);
  const [selection,setSelection]=useState<ChallengeCard>(()=>entry.puzzles.find(p=>p.path===progress.choice?.[1]&&p.tier===progress.choice?.[2])??entry.puzzles[0]);
  const [options,setOptions]=useState({supportOff:false,ownRead:false}), [dares,setDares]=useState<number[]>([]), [picking,setPicking]=useState(!saved), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [replace,setReplace]=useState(false);
  const accepted=useRef(saved), lock=useRef(false);
  // Store accepts a draft synchronously before durability; render receives that accepted revision.
  useLayoutEffect(()=>{if(saved && (!accepted.current || saved.id!==accepted.current.id || saved.revision>=accepted.current.revision)){accepted.current=saved;if(!saved.result)lock.current=false;}},[saved]);
  const expected=(s=accepted.current)=>({owner,game:entry.game,epoch:store.epoch,id:s?.id??null,revision:s?.revision??null});
  async function launch() {
    if(lock.current || saved && !replace)return;
    lock.current=true;setBusy(true);setMessage('');
    try {
      if(saved) {
        if(!await store.challengeDiscard(expected(saved))) {setMessage('Your saved puzzle is still kept. Try again.');return;}
        accepted.current=undefined;
      }
      const next=entry.start(selection.ref,owner,`challenge-${owner}-${progress.nextOrdinal}`,progress,options,comfort.youngChild?[]:dares);
      if(await store.challengeSave(next,expected(undefined))) {
        accepted.current=next;setPicking(false);setReplace(false);
        // Full-envelope start must settle before an ordinary working-set commit.
        store.challengeWorking({choice:[entry.game,selection.path,selection.tier]},{owner,epoch:store.epoch,game:entry.game,id:next.id,revision:next.revision,kind:'challenge'});
      } else setMessage('Your saved work is kept. Try again or export a backup in Settings.');
    } catch {setMessage('This puzzle could not start. Your saved work is kept.');}
    finally {lock.current=false;setBusy(false);}
  }
  async function dispatch(action:unknown) {
    const current=accepted.current;if(!current || lock.current || !focused || picking)return;
    const next=entry.move(current,action);if(!next){setMessage('That change could not be saved. Keep this draft, or export before choosing another puzzle.');return;}
    lock.current=true;setBusy(next.result!==null);setMessage('');
    const guard=expected(current);
    try {
      const durable=await store.challengeSave(next,guard);
      if(durable && (!accepted.current || accepted.current.id===next.id&&accepted.current.revision<=next.revision))accepted.current=next;
      // On a draft I/O failure Store still owns the accepted revision; render supplies it.
      else setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');
    }finally{lock.current=false;setBusy(false);}
  }
  const round=saved, marks=dareBits(progress.dares)?.filter(Boolean).length??0;
  const back=()=>router.canGoBack()?router.back():router.replace('/');
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={[styles.content,{gap:14,padding:20}]}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'}}><Button quiet compact onPress={back}>Back</Button><Heading>Challenge</Heading><LearnerChip compact/></View>
    <Copy>Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.</Copy><Copy>Your marks: {marks}. Marks are kept and never spent.</Copy><SaveStatus/>
    {!!message&&<View accessibilityLiveRegion="polite"><Copy>{message}</Copy></View>}
    {picking ? <>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['deep-water','endless'] as ChallengePath[]).filter(path=>entry.puzzles.some(p=>p.path===path)).map(path=><Chip key={path} selected={selection.path===path} onPress={()=>{setSelection(entry.puzzles.find(p=>p.path===path)!);setDares([]);}}>{path==='deep-water'?'Deep Water · A big stretch':'Endless Tide'}</Chip>)}</View>
      {entry.puzzles.filter(p=>p.path===selection.path).map(p=><Button quiet key={`${p.ref.bank}-${p.ref.puzzle}`} selected={p===selection} onPress={()=>{setSelection(p);setDares([]);}}>{p.title} · Tide {p.tier}</Button>)}
      {!comfort.youngChild&&selection.dares.length>0&&<><Heading style={{fontSize:20}}>An optional dare</Heading><Copy>A miss leaves no mark and no penalty. Help is always here.</Copy>{selection.dares.map(d=><Chip key={d.slot} selected={dares.includes(d.slot)} onPress={()=>setDares(dares.includes(d.slot)?dares.filter(n=>n!==d.slot):[d.slot])}>{d.label} · {d.help==='allowed'?'Help welcome':'On my own'}</Chip>)}<ToggleRow label="Support off" detail="Choose before starting for a Blind dare" value={options.supportOff} onChange={supportOff=>setOptions({...options,supportOff})}/><ToggleRow label="Own read" detail="Read-aloud stays available; hearing it ends this dare only" value={options.ownRead} onChange={ownRead=>setOptions({...options,ownRead})}/></>}
      {saved&&<><Copy>Your saved Challenge puzzle stays available. A new attempt keeps the previous attempt in recovery storage.</Copy><ToggleRow label="Start another attempt" value={replace} onChange={setReplace}/><Button quiet onPress={()=>{setPicking(false);setReplace(false);}}>Continue saved puzzle</Button></>}
      {!saved || replace ? <Button disabled={busy} onPress={()=>void launch()}>Start this puzzle</Button>:null}
      <Button quiet onPress={back}>Easier choice · Levels 1–5</Button>
    </> : round ? <>
      <Heading style={{fontSize:22}}>{entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.title}</Heading>
      {/* The registered Board receives dispatch only as an event callback; render does not invoke it. */}
      {/* eslint-disable-next-line react-hooks/refs -- Typed registration binds dispatch to Board event handlers. */}
      {!round.result&&entry.render(round,a=>void dispatch(a),focused&&!busy,width-40)}
      {round.result ? <><Heading>{round.result.event==='together'?'You solved it together!':'Puzzle solved!'}</Heading><Copy>{round.result.dares.length?'Your dare mark is kept.':'Your finished puzzle is kept. Helped finishes count too.'}</Copy>
        {owner!=='family'&&round.partner===null&&<ResultOffer progress={progress} context={entry.contextFor(round.puzzle)} comfort={comfort} facts={{atPar:round.result.event==='independent'&&round.result.cost!==null&&round.result.cost<=(entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.par?.upper??-1),firstHigher:false,dare:entry.puzzles.some(p=>p.dares.length>0),harder:entry.puzzles.some(p=>p.tier>(entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle)?.tier??6))}} onChange={p=>store.challengeWorking({signal:p.signals.find(s=>s[0]===entry.contextFor(round.puzzle))},{owner,epoch:store.epoch,game:entry.game,id:round.id,revision:round.revision,kind:'challenge'})} onChoose={kind=>{const current=entry.puzzles.find(p=>p.ref.bank===round.puzzle.bank&&p.ref.puzzle===round.puzzle.puzzle);const next=kind==='dare'?current:entry.puzzles.find(p=>kind==='harder'?p.tier>(current?.tier??1):p.tier<(current?.tier??1));if(next)setSelection(next);setPicking(true);setReplace(false);}}/>}
      </> : <Button quiet disabled={busy} onPress={()=>void dispatch(entry.controls.help())}>Help</Button>}
      <Button quiet disabled={busy} onPress={()=>{setPicking(true);setReplace(false);}}>Another puzzle</Button><Button quiet onPress={back}>Easier choice · Levels 1–5</Button>
    </>:null}
  </ScrollView></SafeAreaView>;
}
