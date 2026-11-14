import React, { useCallback, useState } from 'react';
import { registerRootComponent } from 'expo';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, Heading, C } from '../../src/components/ui';
import { WordSearchBoard } from '../../src/puzzles/words/WordSearchBoard';
import { searchEngine, type Action } from '../../src/puzzles/words/game';
import { fixturePuzzles } from '../../tests/fixtures/word-search/registration';
import { GridFeedback, GridInteraction } from '../../src/puzzles/grid/preferences';
import { useSoundControls } from '../../src/components/Audio';
// Separate entry, separate app identifier. No fixture flag is available to a shipping bake.
function App() {
  const {width}=useWindowDimensions(),[index,setIndex]=useState(0),[round,setRound]=useState(0),[both,setBoth]=useState(false),[held,setHeld]=useState(false),sound=useSoundControls(true);
  const p=fixturePuzzles[index].descriptor;
  const [state,setState]=useState(()=>searchEngine.create(p,{version:1},{supportOff:false,ownRead:false}));
  const select=(i:number)=>{setRound(n=>n+1);setIndex(i);setState(searchEngine.create(fixturePuzzles[i].descriptor,{version:1},{supportOff:false,ownRead:false}));};
  const dispatch=useCallback((a:Action)=>setState(s=>searchEngine.step(s,a,s.puzzle)?.state??s),[]);
  return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><GridFeedback.Provider value={()=>sound.play('tap')}><GridInteraction.Provider value={setHeld}><ScrollView scrollEnabled={!held} contentContainerStyle={{padding:20,gap:12}}><Heading maxFontSizeMultiplier={1} style={{fontSize:20}}>Word Search · test fixture</Heading><Copy maxFontSizeMultiplier={1} style={{fontSize:14}}>Test only · no family approval.</Copy><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(0)}>Pictures</Button>{[1,2,3,4,5,6,7,8].map(i=><Button maxFontSizeMultiplier={1} compact quiet key={i} onPress={()=>select(i)}>Ray {i}</Button>)}<Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(9)}>No list</Button><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>{setBoth(true);select(10);}}>Twin hunt</Button><Button maxFontSizeMultiplier={1} compact quiet selected={both} onPress={()=>setBoth(x=>!x)}>Two hunters</Button><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(index)}>Fresh fixture</Button></View><WordSearchBoard key={round} state={state} dispatch={dispatch} active={!searchEngine.inspect(state,p).solved} width={Math.min(width-40,660)} together={both}/></ScrollView></GridInteraction.Provider></GridFeedback.Provider></SafeAreaView>;
}
registerRootComponent(()=> <SafeAreaProvider><App/></SafeAreaProvider>);
