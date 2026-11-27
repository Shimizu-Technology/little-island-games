import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Creator } from "../src/personalization/Creator";
import { defaultLook } from "../src/islander/look";
import { Board, LastPicnicWord } from "../src/learn/games/hafa-adai/view";
import { chamoruWords, chamoruWord } from "../src/learn/content/chamoru";
import type { HafaAdaiState, IslandState } from "../src/learn/games/hafa-adai/engine";
import type { BoardProps } from "../src/learn/types";
import { TopicPage } from "../src/library/Topics";
import type { CatalogItem } from "../src/library/catalog";
import items from "../content/library/items.json";
const f=vi.hoisted(()=>({height:844,fontScale:3.2,person:{} as any,personalize:vi.fn(),close:vi.fn()}));
vi.mock("react-native",()=>({View:"View",Text:"Text",Pressable:"Pressable",useWindowDimensions:()=>({width:390,height:f.height,fontScale:f.fontScale}),StyleSheet:{create:(v:any)=>v},Platform:{OS:"ios"}}));
vi.mock("react-native-svg",()=>({default:"Svg",Circle:"Circle",Ellipse:"Ellipse",Path:"Path",Rect:"Rect",G:"G"}));
vi.mock("../src/components/Text",()=>({Text:"Text"}));
vi.mock("../src/components/ui",()=>({C:{},styles:{},Sheet:({children,footer}:any)=><View>{children}<View testID="footer">{footer}</View></View>,
  Button:({children,...props}:any)=><button {...props}>{children}</button>,Copy:"Text",Heading:"Text",PressableScale:"Pressable",Chip:"Chip"}));
vi.mock("../src/state/Store",()=>({useStore:()=>({save:{learning:{}},epoch:0,personalize:f.personalize})}));
vi.mock("../src/learn/learners",()=>({activeLearner:()=>({id:"child",name:"Child"})}));
vi.mock("../src/personalization/model",()=>({personFor:()=>f.person}));
vi.mock("../src/personalization/catalog",()=>({canWear:()=>true}));
vi.mock("../src/ui/fonts",()=>({useNunitoLoaded:()=>false}));
vi.mock("../src/personalization/StyleEditor",()=>({StyleEditor:({onChange}:any)=><Button onPress={()=>onChange({...defaultLook,presentation:"girl"})}>Girl</Button>}));
vi.mock("../src/learn/Coach",()=>({CoachSpot:({children}:any)=>children}));
vi.mock("../src/learn/games/hafa-adai/pictures",()=>({WordPicture:"WordPicture"}));
vi.mock("../src/library/ui",()=>({s:{body:{fontSize:22}},Action:({children,...p}:any)=><button {...p}>{children}</button>,LibraryIcon:"Icon",ItemPicture:"ItemPicture"}));
vi.mock("../src/library/LibraryArt",()=>({LibraryArt:"Art"}));
vi.mock("../src/library/Reader",()=>({SentenceLine:"SentenceLine"}));
vi.mock("../src/library/catalog",()=>({exhibits:[],itemById:()=>undefined,canOpen:()=>true}));
const View="View" as any;
const Button="button" as any;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let tree:ReactTestRenderer;
beforeEach(()=>{ f.height=844; f.person={look:defaultLook,earned:[],made:false};f.personalize.mockReset().mockReturnValue(true);f.close.mockReset(); });
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());});
const press=(label:string)=>tree.root.findAllByType("button").find(n=>n.children.includes(label))!;
describe("Q1 creator footer and completion",()=>{
  it.each([844,480])("at height %s: separate buttons, save selected look, then confirm",async height=>{
    f.height=height;
    await act(async()=>{tree=create(<Creator onClose={f.close}/>);});
    const footer=tree.root.findByProps({testID:"footer"});
    const row=footer.findAll(n=>String(n.type)==="View"&&n.props.style?.flexDirection)[0];
    expect(row.props.style.flexDirection).toBe(height<500?"row":"column");
    if(height>=500)for(const child of row.children as any[])expect(child.props.style?.flex).not.toBe(1);
    await act(async()=>press("Girl").props.onPress());
    await act(async()=>press("Done!").props.onPress());
    expect(f.personalize).toHaveBeenCalledWith({look:{...defaultLook,presentation:"girl"},made:true},{learner:"child",epoch:0});
    expect(tree.root.findAll(n=>String(n.type)==="Text").some(n=>n.children.includes("Your islander is ready for island adventures."))).toBe(true);
    expect(f.close).not.toHaveBeenCalled();
  });
  it("Make it later preserves the old look",async()=>{
    await act(async()=>{tree=create(<Creator onClose={f.close}/>);});
    await act(async()=>press("Girl").props.onPress());
    await act(async()=>press("Make it later").props.onPress());
    expect(f.personalize).not.toHaveBeenCalled();expect(f.close).toHaveBeenCalledOnce();
  });
});
it("Q2 all six picture taps reveal the exact CHamoru word inside that picture, including the last tap",async()=>{
  const ids=["food","colors","numbers","greetings","family","body_parts"].map(c=>chamoruWords.find(w=>w.category===c)!.id);
  let state:IslandState={items:ids,activity:"explore",taps:[],starter:0};
  const render=()=> <Board {...{session:{state,options:{mode:"solo",pace:"easy"},revision:1},width:340,active:true,soundOn:false,coach:{active:false},sound:vi.fn(),cheer:vi.fn(),practice:vi.fn(),update:(next:IslandState)=>{state=next;}} as unknown as BoardProps<HafaAdaiState>}/>;
  await act(async()=>{tree=create(render());});
  for(const id of ids){
    const word=chamoruWord(id)!;
    const tile=tree.root.find(n=>String(n.type)==="Pressable"&&n.props.accessibilityLabel===word.english.split(" / ")[0]);
    await act(async()=>tile.props.onPress());await act(async()=>tree.update(render()));
    const seen=tree.root.find(n=>String(n.type)==="Pressable"&&n.props.accessibilityLabel===`${word.english.split(" / ")[0]}, seen`);
    expect(seen.findAll(n=>String(n.type)==="Text").some(n=>n.children.includes(word.term))).toBe(true);
  }
});
it("Q2 the completion card retains the sixth picture's CHamoru word",async()=>{
  const word=chamoruWords.find(w=>w.category==="body_parts")!;
  await act(async()=>{tree=create(<LastPicnicWord state={{items:[word.id],activity:"explore",taps:[word.id],starter:0}}/>);});
  expect(tree.root.findAll(n=>String(n.type)==="Text").some(n=>n.children.includes(word.term))).toBe(true);
});
it.each(["history-colonization","history-war-survival"])("History %s has an initially collapsed, expandable unchanged co-reading note",async id=>{
  const item=items.find(i=>i.id===id)!;expect(item).toBeDefined();
  const record={id,title:item.title,category:item.category,item} as unknown as CatalogItem;
  await act(async()=>{tree=create(<TopicPage record={record} layer="tell" onLayer={vi.fn()} saved={false} toggleSaved={vi.fn()} collections={[item.category]} selected="" speak={vi.fn()} go={vi.fn()} make={vi.fn()}/>);});
  const note=()=>tree.root.findAll(n=>String(n.type)==="Text").filter(n=>n.children.includes(item.grownUpNote!));
  expect(note()).toHaveLength(0);expect(press("For grown-ups").props.expanded).toBe(false);
  await act(async()=>press("For grown-ups").props.onPress());expect(note()).toHaveLength(1);
  await act(async()=>press("For grown-ups").props.onPress());expect(note()).toHaveLength(0);
});
