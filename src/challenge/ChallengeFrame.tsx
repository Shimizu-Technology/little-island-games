import { PuzzleEnding } from '../puzzles/ui/PuzzleEnding';
import { adjacentTide } from '../puzzles/flow';
import { SessionGate } from './SessionGate';
import { ResultOffer } from './ResultOffer';
import { ratingDue, resultOffer } from './offers';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import { Button, Chip, Copy, Heading, ToggleRow, styles } from '../components/ui';
import { wordFitMultiplier } from '../components/wordFit';
import { Settings } from '../components/Settings';
import type { ChallengeSession, PuzzleRef } from '../state/challenge';
import { SaveStatus } from '../components/SaveStatus';
import { LearnerChip } from '../personalization/LearnerChip';
import { useStore } from '../state/Store';
import { dareBits, emptyChallenge } from '../state/challenge';
import { progressFor, selectedOwner } from '../state/challengeDrafts';
import { learningComfort } from '../state/validation';
import { shelfGames } from '../learn/home';
import type { ChallengeCard, ChallengeEntry, ChallengePath, PackedBand, RegisteredDare } from './types';
import { GridInteraction } from '../puzzles/grid/preferences';
type Choice = ChallengeCard | PackedBand;
const isBand = (c: Choice | undefined): c is PackedBand => !!c && 'kind' in c && c.kind === 'band';
/** The dare chosen at Start stays named, quietly, through the round: no pressure wording and no clock. */
export function ChosenDare({dare,maxScale=2}:{dare:RegisteredDare;maxScale?:number}) {
  const help=dare.help==='allowed'?'Help welcome':'On my own';
  return <View testID="chosen-dare" accessible accessibilityRole="text" accessibilityLabel={`Your chosen dare: ${dare.label}. ${help}.`} style={{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:12,paddingVertical:5,borderRadius:16,backgroundColor:'#F0F1E8'}}><Copy maxFontSizeMultiplier={maxScale} style={{fontSize:14,lineHeight:20}}>Dare: {dare.label} · {help}</Copy></View>;
}
const gameName = (game: string) => shelfGames.find(item=>item.id===game)?.name ?? game.replace(/(^|-)([a-z0-9])/g,(_match,separator:string,letter:string)=>`${separator?' ':''}${letter.toUpperCase()}`);
/** A separate slot: entering or leaving Challenge never replaces a School round. */
export function ChallengeFrame({entry,requestedPuzzle}:{entry:ChallengeEntry;requestedPuzzle?:string}) {
  const store=useStore(), owner=selectedOwner(store.save), focused=useIsFocused(), {width}=useWindowDimensions(), insets=useSafeAreaInsets();
  const progress=progressFor(store.save,owner)??emptyChallenge(), saved=progress.paused.find(s=>s.game===entry.game&&!s.result&&!s.credited);
  const comfort=learningComfort(store.save,owner);
  // Packed banks are offered whole, before the authored cards of their path. Inline-only entries have none.
  // Retired cards stay resolvable for saved rounds but are never offered or dealt.
  const playable=entry.puzzles.filter(p=>!p.retired), bands=entry.packed?.bands??[], every:Choice[]=[...bands,...playable];
  const choices=(path:ChallengePath)=>every.filter(p=>p.path===path);
  const cardOf=(ref:PuzzleRef)=>entry.puzzles.find(p=>p.ref.bank===ref.bank&&p.ref.puzzle===ref.puzzle)??entry.packed?.card(ref);
  const choiceOf=(bank:number,puzzle:number):Choice|undefined=>playable.find(p=>p.ref.bank===bank&&p.ref.puzzle===puzzle)??bands.find(b=>b.bank===bank);
  const requested=playable.find(p=>`${p.ref.bank}:${p.ref.puzzle}`===requestedPuzzle);
  const [selection,setSelection]=useState<Choice>(()=>requested??every.find(p=>progress.choice?.[0]===entry.game&&p.path===progress.choice?.[1]&&p.tier===progress.choice?.[2])??every[0]);
  const [completed,setCompleted]=useState<ChallengeSession>(), [settings,setSettings]=useState(false), [replacementGame,setReplacementGame]=useState<string>(), [dares,setDares]=useState<number[]>([]), [picking,setPicking]=useState(!!requested||!saved), [busy,setBusy]=useState(false), [launching,setLaunching]=useState(false), [message,setMessage]=useState(''), [replace,setReplace]=useState(false);
  const [fresh,setFresh]=useState<'choose'|'confirm'|null>(null);
  const [settling,setSettling]=useState(false), [capacity,setCapacity]=useState(false);
  // A board that owns a touch holds the page scroll until release (Cove grids and Slip Tide).
  const [held,setHeld]=useState(false);
  const onSettled=useCallback(()=>setSettling(false),[]);
  const accepted=useRef(saved), lock=useRef(false), dispatchToken=useRef(0);
  // Store accepts a draft synchronously before durability; render receives that accepted revision.
  useLayoutEffect(()=>{if(saved && (!accepted.current || saved.id!==accepted.current.id || saved.revision>=accepted.current.revision)){accepted.current=saved;if(!saved.result)lock.current=false;}},[saved]);
  const expected=(s:ChallengeSession|undefined)=>({owner,game:entry.game,epoch:store.epoch,id:s?.id??null,revision:s?.revision??null});
  async function launch(choice: Choice = selection, chosenDares: number[] = dares, replaceSaved = false) {
    if(lock.current || saved && !replace && !replaceSaved)return;
    const token=++dispatchToken.current;
    lock.current=true;setBusy(true);setLaunching(true);setMessage('');
    try {
      // A band picks a concrete entry and verifies its content before anything is constructed.
      const target=isBand(choice)?entry.packed?.card(await entry.packed.choose(choice.bank,progress,(saved??completed)?.puzzle)):choice;
      if(!target)throw new Error('Unknown puzzle.');
      const selected=comfort.youngChild?[]:chosenDares;
      const options={supportOff:target.dares.some(d=>selected.includes(d.slot)&&(d.rule.kind==='blind'||d.rule.kind==='plan')),ownRead:target.dares.some(d=>selected.includes(d.slot)&&d.rule.kind==='own-read')};
      // Construct first: a throwing adapter cannot discard accepted work.
      const next=entry.start(target.ref,owner,`challenge-${owner}-${progress.nextOrdinal}`,progress,options,selected);
      const replacement=saved&&(replace||replaceSaved)?saved:progress.paused.find(s=>s.game===replacementGame);
      const guard={...expected(progress.paused.find(s=>s.game===entry.game)),...(replacement?{replace:{game:replacement.game,id:replacement.id,revision:replacement.revision}}:{})};
      if(await store.challengeSave(next,guard)) {
        accepted.current=next;setCompleted(undefined);setCapacity(false);setPicking(false);setReplace(false);setFresh(null);setReplacementGame(undefined);
        store.challengeWorking({choice:[entry.game,target.path,target.tier]},{owner,epoch:store.epoch,game:entry.game,id:next.id,revision:next.revision,kind:'challenge'});
      } else setMessage('This puzzle could not start. Your saved work is kept. Continue a saved puzzle, or export a backup in Settings.');
    } catch {setMessage('This puzzle could not start. Your saved work is kept.');}
    finally {if(dispatchToken.current===token){lock.current=false;setBusy(false);setLaunching(false);}}
  }
  const sessionKey=(s:ChallengeSession)=>`${owner}:${store.epoch}:${s.id}:${s.revision}`;
  async function dispatch(action:unknown):Promise<ChallengeSession|null> {
    const current=accepted.current;if(!current || lock.current || !focused || picking)return null;
    const next=entry.move(current,action);
    if(!next){const full=!!entry.restart&&!!entry.full?.(current);setCapacity(full);setMessage(full?'This attempt is full. Choose Keep my plan in a new attempt to keep trying. Your marks stay kept.':'This draft is kept. Try Help or choose another puzzle.');return null;}
    if(next.result){setCompleted(next);if(entry.animatedRuns)setSettling(true);}
    const token=++dispatchToken.current;
    lock.current=true;setBusy(next.result!==null);setMessage('');
    const guard=expected(current);
    try {
      const durable=await store.challengeSave(next,guard);
      if(durable){if(!accepted.current || accepted.current.id===next.id&&accepted.current.revision<=next.revision)accepted.current=next;if(next.result)setCompleted(next);return next;}
      // On a draft I/O failure Store still owns the accepted revision; render supplies it.
      else {setCompleted(undefined);setSettling(false);setMessage('Keep the app open. Retry saving or export your accepted work in Settings.');}
      return null;
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
  const round=saved??completed, full=progress.paused.filter(s=>!s.credited).length>=(owner.startsWith('cove-')?4:8), marks=dareBits(progress.dares)?.filter(Boolean).length??0;
  const currentCard = round && cardOf(round.puzzle);
  const currentChoice:Choice|undefined = currentCard && (bands.find(b=>b.bank===currentCard.ref.bank)??currentCard);
  // A dare invitation opens a card that has a playable dare: this one, or else a playable authored card of the same
  // path and tier (packed bands carry no dares; retired dares never count). With neither, nothing offers a dare.
  const dareChoice:ChallengeCard|undefined = currentChoice && (!isBand(currentChoice)&&currentChoice.dares.some(d=>!d.retired)?currentChoice:playable.find(p=>p.path===currentChoice.path&&p.tier===currentChoice.tier&&p.dares.some(d=>!d.retired)));
  const offerContext = round ? entry.contextFor(round.puzzle) : '';
  // Offers stay on the current puzzle and path, and never deal a retired card.
  const pathChoices = currentChoice ? choices(currentChoice.path) : [];
  const offerFacts = {atPar:round?.result?.event==='independent'&&round.result.cost!==null&&round.result.cost<=(currentCard?.par?.upper??-1),firstHigher:false,dare:!!dareChoice,easier:pathChoices.some(p=>p.tier<(currentChoice?.tier??1)),harder:pathChoices.some(p=>p.tier>(currentChoice?.tier??6))};
  const signal=progress.signals.find(s=>s[0]===offerContext);
  const personal=owner!=='family'&&round?.partner===null;
  const hasOffer=!!(personal&&comfort.offers&&!comfort.youngChild&&signal&&!signal[4]&&(ratingDue(progress,offerContext)||resultOffer(signal,comfort,offerFacts)));
  const showDirections=comfort.offers&&!comfort.youngChild&&!hasOffer&&!(personal&&signal?.[4]);
  const recentChoices=()=>progress.recent.flatMap(([bank,puzzle])=>{const c=choiceOf(bank,puzzle);return c?[c]:[];});
  // The same band deals another of its own entries; directions move between bands and cards of the path.
  const nextChoice=(here:Choice,direction:'easier'|'same'|'harder')=>direction==='same'&&isBand(here)?here:adjacentTide(choices(here.path),here,direction,recentChoices());
  function chooseNext(direction: 'easier'|'same'|'harder') {
    if(!currentChoice)return;
    const next=nextChoice(currentChoice,direction);
    if(next){setSelection(next);setDares([]);void launch(next,[]);}else{setPicking(true);setReplace(false);setDares([]);}
  }
  function freshPuzzle() {
    if(!currentChoice)return;
    const next=nextChoice(currentChoice,'same');
    setPicking(true);setReplace(false);setDares([]);setFresh(next&&saved?'choose':null);
    if(next)setSelection(next);
    else setMessage('There is no other puzzle at this tide. Your draft is kept. Continue it or choose another tide.');
  }
  const completionFacts=round?.result?entry.completionFacts?.(round)??null:null;
  const defaultPraise=round?.result?.event==='together'?'You worked through this puzzle together.':completionFacts?.helpUsed?'You finished this puzzle with help.':completionFacts?.failed?'You kept trying and solved it.':'You completed this puzzle.';
  const back=()=>router.canGoBack()?router.back():router.replace('/');
  const keepPlan='Keep my plan in a new attempt';
  const pinned=!!entry.animatedRuns&&!picking&&!!round&&(!round.result||settling);
  // A pinned board fills the page with scrolling off. Return to the top first: a page left scrolled far down the
  // picker (likely at the largest text) would otherwise keep showing empty space below the board.
  const page=useRef<ScrollView>(null);
  useLayoutEffect(()=>{if(pinned)page.current?.scrollTo({y:0,animated:false});},[pinned]);
  // Large titles stop growing where their longest word still fits the line, so none breaks mid-word.
  // A pinned board's chrome stays compact (Back stops at 1.3x), so its title and dare line stop at 1.5x.
  const PINNED_MAX=1.5;
  const fit=(text:string,size:number)=>wordFitMultiplier(text,size,width-(pinned?24:40)-insets.left-insets.right,pinned?PINNED_MAX:undefined);
  const dare=round&&!round.result?round.selectedDares.flatMap(slot=>currentCard?.dares.filter(d=>d.slot===slot&&!d.retired)??[])[0]:undefined;
  const title=currentCard?.title??'';
  const solved=round?.result?.event==='together'?'You solved it together!':'Puzzle solved!';
  return <SafeAreaView style={styles.page}><GridInteraction.Provider value={setHeld}><ScrollView ref={page} scrollEnabled={!pinned&&!held} contentContainerStyle={[styles.content,{gap:pinned?8:14,padding:20,...(pinned?{flex:1,paddingHorizontal:12,paddingTop:10,paddingBottom:10}: {})}]}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'}}><Button quiet compact maxFontSizeMultiplier={pinned?1.3:undefined} onPress={back}>Back</Button>{!pinned&&<Heading maxFontSizeMultiplier={fit('Challenge',32)}>Challenge</Heading>}<LearnerChip compact/></View>
    {!pinned&&<><Copy>Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.</Copy><Copy>Your marks: {marks}. Marks are kept and never spent.</Copy></>}
    {!pinned&&<SaveStatus/>}
    {!pinned&&!!message&&<View accessibilityLiveRegion="polite"><Copy>{message}</Copy></View>}
    {!pinned&&capacity&&entry.restart&&<Button quiet disabled={busy} onPress={()=>void restart()}>{keepPlan}</Button>}
    {picking ? <>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['deep-water','endless'] as ChallengePath[]).filter(path=>every.some(p=>p.path===path)).map(path=><Chip key={path} selected={selection.path===path} onPress={()=>{setSelection(choices(path)[0]);setDares([]);setFresh(null);}}>{path==='deep-water'?'Deep Water · A big stretch':'Endless Tide'}</Chip>)}</View>
      {choices(selection.path).map(p=>isBand(p)?<Button quiet key={`band-${p.bank}`} selected={p===selection} onPress={()=>{setSelection(p);setDares([]);setFresh(null);}}>{`${p.title} · Tide ${p.tier} · ${p.count} puzzles`}</Button>:<Button quiet key={`${p.ref.bank}-${p.ref.puzzle}`} selected={p===selection} onPress={()=>{setSelection(p);setDares([]);setFresh(null);}}>{p.title} · Tide {p.tier}</Button>)}
      {!comfort.youngChild&&!isBand(selection)&&selection.dares.some(d=>!d.retired)&&<><Heading style={{fontSize:20}}>An optional dare</Heading><Copy>A miss leaves no mark and no penalty. Help is always here.{entry.dareHelp?` ${entry.dareHelp}`:''}</Copy>{selection.dares.filter(d=>!d.retired).map(d=><Chip key={d.slot} selected={dares.includes(d.slot)} onPress={()=>setDares(dares.includes(d.slot)?dares.filter(n=>n!==d.slot):[d.slot])}>{d.label} · {d.help==='allowed'?'Help welcome':'On my own'}</Chip>)}</>}
      {saved&&!fresh&&<><Copy>Your saved Challenge puzzle stays available until a new attempt is saved. Replacing it removes it from Continue.</Copy><ToggleRow label="Start another attempt" value={replace} onChange={setReplace}/><Button quiet onPress={()=>{setPicking(false);setReplace(false);}}>Continue saved puzzle</Button></>}
      {saved&&fresh&&<>
        <Copy>{fresh==='confirm'?'Start this fresh puzzle and replace your saved draft?':'A fresh puzzle with the same idea is ready. Your draft stays saved until you start.'}</Copy>
        <Button disabled={busy} onPress={()=>fresh==='confirm'?void launch(selection,[],true):setFresh('confirm')}>{fresh==='confirm'?'Replace saved puzzle and start':'Start fresh puzzle'}</Button>
        <Button quiet onPress={()=>{setPicking(false);setFresh(null);setReplace(false);}}>Continue saved puzzle</Button>
      </>}
      {full&&!saved&&<View style={{gap:10}}><Heading style={{fontSize:20}}>Your paused spaces are full</Heading><Copy>Finish a saved puzzle, export a backup, or choose one to replace. Your marks stay kept.</Copy>{progress.paused.filter(s=>!s.credited).map(s=><View key={s.game} style={{gap:6}}><Button quiet onPress={()=>router.replace({pathname:'/challenge',params:{game:s.game}})}>Continue {gameName(s.game)}</Button><Chip selected={replacementGame===s.game} onPress={()=>setReplacementGame(replacementGame===s.game?undefined:s.game)}>Replace {gameName(s.game)}</Chip></View>)}<Button quiet onPress={()=>setSettings(true)}>Export backup in Settings</Button></View>}
      {!fresh&&(!saved || replace)&&(!full||!!saved||!!replacementGame) ? <Button disabled={busy} onPress={()=>void launch()}>Start this puzzle</Button>:null}
      <Button quiet onPress={back}>{entry.backLabel??'Easier choice · Levels 1–5'}</Button>
    </> : round ? <>
      {!pinned&&<Heading maxFontSizeMultiplier={fit(title,22)} style={{fontSize:22}}>{title}</Heading>}{!pinned&&dare&&<ChosenDare dare={dare}/>}
      {/* The registered Board receives dispatch only as an event callback; render does not invoke it. */}
      {(!round.result||entry.animatedRuns)&&!launching&&<SessionGate key={`${owner}:${store.epoch}:${round.id}:${JSON.stringify(round.puzzle)}`} open={entry.packed?async e=>{await entry.packed!.prepare(round.puzzle);return store.challengeOpen(e);}:store.challengeOpen} expected={expected(round)} onStartFresh={()=>store.challengeDiscard(expected(round))} render={()=><>
        {entry.render(round,a=>void dispatch(a),focused&&(!busy||settling),width-(pinned?24:40),{key:sessionKey(round),onFresh:freshPuzzle,onSettled,commit:async(action,key)=>{const current=accepted.current;if(!current||key!==sessionKey(current))return null;const session=await dispatch(action);return session?{key:sessionKey(session),session}:null;},...(pinned?{
          header:<><Heading maxFontSizeMultiplier={fit(title,22)} style={{fontSize:22}}>{title}</Heading>{dare&&<ChosenDare dare={dare} maxScale={PINNED_MAX}/>}<SaveStatus/>{!!message&&<Copy accessibilityLiveRegion="polite">{message}</Copy>}{capacity&&entry.restart&&<Button quiet disabled={busy} onPress={()=>void restart()}>{keepPlan}</Button>}</>,
          footer:<><Button quiet disabled={busy||settling} onPress={()=>{setPicking(true);setReplace(false);setFresh(null);}}>Another puzzle</Button><Button quiet onPress={back}>{entry.backLabel??'Easier choice · Levels 1–5'}</Button></>,
        }:{})})}
        {entry.helpUI!=='board'&&<Button quiet disabled={!focused||busy} onPress={()=>void dispatch(entry.controls.help())}>Help</Button>}
      </>}/>}
      {round.result&&!settling ? <><Heading maxFontSizeMultiplier={fit(solved,32)}>{solved}</Heading><Copy>{round.result.dares.length?'Your dare mark is kept.':'Your finished puzzle is kept. Helped finishes count too.'}</Copy>
        {hasOffer&&<ResultOffer progress={progress} context={offerContext} comfort={comfort} facts={offerFacts} onChange={p=>store.challengeWorking({signal:p.signals.find(s=>s[0]===entry.contextFor(round.puzzle))},{owner,epoch:store.epoch,game:entry.game,id:round.id,revision:round.revision,kind:'challenge'})} onChoose={kind=>{const current=currentChoice;const next=kind==='dare'?dareChoice:pathChoices.find(p=>kind==='harder'?p.tier>(current?.tier??1):p.tier<(current?.tier??1));if(next)setSelection(next);if(kind!=='dare')setDares([]);setPicking(true);setReplace(false);setFresh(null);}}/>}
        <PuzzleEnding praise={entry.completionText?.(round.puzzle,round.result,completionFacts) ?? defaultPraise} disabled={busy} showDirections={showDirections}
          onChoose={chooseNext} onAnother={()=>chooseNext('same')}
          onRest={back}/>
      </> : null}
      {!pinned&&!round.result&&<><Button quiet disabled={busy||settling} onPress={()=>{setPicking(true);setReplace(false);setFresh(null);}}>Another puzzle</Button><Button quiet onPress={back}>{entry.backLabel??'Easier choice · Levels 1–5'}</Button></>}
    </>:null}
  </ScrollView></GridInteraction.Provider><Settings visible={settings} onClose={()=>setSettings(false)}/></SafeAreaView>;
}
