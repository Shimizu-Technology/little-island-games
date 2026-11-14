import React, { useCallback, useState } from 'react';
import { registerRootComponent } from 'expo';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Copy, Heading, C } from '../../src/components/ui';
import { WordSearchBoard } from '../../src/puzzles/words/WordSearchBoard';
import { SearchChrome } from '../../src/puzzles/words/layout';
import { searchEngine, type Action } from '../../src/puzzles/words/game';
import { fixturePuzzles } from '../../tests/fixtures/word-search/registration';
import { GridFeedback, GridInteraction } from '../../src/puzzles/grid/preferences';
import { useSoundControls } from '../../src/components/Audio';
import { SearchPicturesContext } from '../../src/puzzles/words/picture-context';
import { createSearchPictures } from '../../src/puzzles/words/pictures';
import { pictureTransport } from '../../src/content/pictures/transport';
import { searchPictureEntries, searchPictureAssets } from '../../tests/fixtures/word-search/pictures.generated';
const fixturePictures = createSearchPictures(searchPictureEntries, searchPictureAssets, pictureTransport);
// Separate entry, separate app identifier. No fixture flag is available to a shipping bake.
function App() {
  const {width}=useWindowDimensions(),insets=useSafeAreaInsets(),[menu,setMenu]=useState(false),[maxGrid,setMaxGrid]=useState(false),[index,setIndex]=useState(0),[round,setRound]=useState(0),[both,setBoth]=useState(false),[held,setHeld]=useState(false),sound=useSoundControls(true);
  const base=fixturePuzzles[index].descriptor;
  const largest={...fixturePuzzles[1].descriptor,cells:Array.from({length:16},(_,r)=>Array.from({length:16},(_,c)=>r===0&&c<4?fixturePuzzles[1].descriptor.cells[0][c]:'A')),words:fixturePuzzles[1].descriptor.words.map(w=>({...w,cells:w.cells.map(i=>Math.floor(i/6)*16+i%6)}))};
  const p=maxGrid?largest:base;
  const [state,setState]=useState(()=>searchEngine.create(p,{version:1},{supportOff:false,ownRead:false}));
  const select=(i:number)=>{setMaxGrid(false);setMenu(false);setRound(n=>n+1);setIndex(i);setState(searchEngine.create(fixturePuzzles[i].descriptor,{version:1},{supportOff:false,ownRead:false}));};
  const dispatch=useCallback((a:Action)=>setState(s=>searchEngine.step(s,a,s.puzzle)?.state??s),[]);
  return <SafeAreaView style={{flex:1,backgroundColor:C.cream}}><GridFeedback.Provider value={()=>sound.play('tap')}><GridInteraction.Provider value={setHeld}><ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={!held} contentContainerStyle={{padding:20,gap:12}}><Heading maxFontSizeMultiplier={1} style={{fontSize:20}}>Word Search · test fixture</Heading><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>setMenu(x=>!x)}>Fixtures</Button>{menu && <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(0)}>Pictures</Button>{[1,2,3,4,5,6,7,8].map(i=><Button maxFontSizeMultiplier={1} compact quiet key={i} onPress={()=>select(i)}>Ray {i}</Button>)}<Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(9)}>No list</Button><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>{setBoth(true);select(10);}}>Twin hunt</Button><Button maxFontSizeMultiplier={1} compact quiet selected={both} onPress={()=>setBoth(x=>!x)}>Two hunters</Button><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>select(index)}>Fresh fixture</Button><Button maxFontSizeMultiplier={1} compact quiet onPress={()=>{setMaxGrid(true);setMenu(false);setRound(n=>n+1);setState(searchEngine.create(largest,{version:1},{supportOff:false,ownRead:false}));}}>Largest grid</Button></View>}<SearchChrome.Provider value={{top:insets.top,bottom:insets.bottom,bar:110}}><WordSearchBoard key={round} state={state} dispatch={dispatch} active={!searchEngine.inspect(state,p).solved} width={width-40} together={both}/></SearchChrome.Provider></ScrollView></GridInteraction.Provider></GridFeedback.Provider></SafeAreaView>;
}
registerRootComponent(()=> <SafeAreaProvider><SearchPicturesContext.Provider value={fixturePictures}><App/></SearchPicturesContext.Provider></SafeAreaProvider>);
