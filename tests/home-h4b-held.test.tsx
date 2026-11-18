import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {EntityArt} from '../src/home/runtime/EntityArt';
import {buildScene} from '../src/home/scene/graph';
import {pickEntity,prepareHits} from '../src/home/runtime/pick';
import {roomPoint} from '../src/home/scene/types';
import {labFixtures} from '../src/home/runtime/lab';
vi.mock('react-native',()=>({View:'view'}));
vi.mock('react-native-svg',()=>Object.fromEntries(['G','Circle','Ellipse','Rect','Path'].map(k=>[k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('../src/home/runtime/MealArt',()=>({MealArt:()=>null}));
vi.mock('../src/home/characterRenderer',()=>({HomeCharacter:()=>null}));
vi.mock('../src/home/art/Items',()=>({ItemArt:()=>React.createElement('floor-art')}));
vi.mock('../src/home/art/More',()=>({MoreItemArt:()=>React.createElement('floor-art')}));
describe('the real drink container matches its meal art',()=>{
 for (const slot of [0,1,2] as const) for (const empty of [false,true]) it(`keeps ${slot} ${empty?'empty':'full'} held cup at hand scale`,()=>{
  const state=labFixtures[`rig-menu-${slot}`]();
  const item=state.rooms.home.instances.find(i=>i.item==='coconut-drink')!;
  item.empty=empty;
  state.rooms.home.characters[0].holding=item.id;
  const scene=buildScene(state),entity=scene.entities[`home/item/${item.id}`];
  const html=renderToStaticMarkup(<EntityArt entity={entity} reduced={false}/>);
  expect(html).toContain('<svg');
  expect(html).not.toContain('floor-art');
  if(slot===1)expect(html).toContain('scale(1.328125)');
 });
});

for(const slot of [0,1,2] as const) for(const empty of [false,true]) it(`held ${slot}/${empty} paint, aim and picking use the hand centre`,()=>{
 const state=labFixtures[`rig-menu-${slot}`]();
 const cup=state.rooms.home.instances.find(i=>i.item==='coconut-drink')!;
 cup.empty=empty;state.rooms.home.characters[0].holding=cup.id;
 const scene=buildScene(state),e=scene.entities[`home/item/${cup.id}`];
 expect(e.visual).toEqual({x:0,y:0});
 expect(e.bounds.top).toBeGreaterThan(-31);
 expect(pickEntity(prepareHits(scene).home,roomPoint(e.contact.x,e.contact.y),.5)).toBe(e.id);
 if(slot===1){const p=scene.entities['character/1'];
  expect(pickEntity(prepareHits(scene).home,roomPoint(p.contact.x-25,p.contact.y-40),.5)).toBe(p.id);
 }
});
