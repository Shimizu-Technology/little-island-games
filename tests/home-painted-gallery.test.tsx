import React from 'react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LivingArt } from '../src/home/art/LivingArt';
import { SeatArt } from '../src/home/art/SeatArt';
import { ItemArt } from '../src/home/art/Items';
import { MoreItemArt } from '../src/home/art/More';
import { CrabFriend } from '../src/home/art/CrabFriend';
import { Islander } from '../src/islander/rig/Islander';
import { seatSockets } from '../src/home/art/sockets';
import { anchorsFor } from '../src/home/scene/species';

vi.mock('react-native', () => ({
  View: ({children, style, ...p}: any) => React.createElement('div', {...p, style:{...style, transform:style?.transform?.map((t: Record<string,number>)=>Object.entries(t).map(([k,v])=>`${k}(${v})`).join(' ')).join(' ')}}, children),
  Image: ({source, style, ...p}: any) => React.createElement('img', {...p, src:`data:image/webp;base64,${readFileSync(source).toString('base64')}`, style:{...style, objectFit:'contain'}}),
}));
vi.mock('react-native-svg', () => Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Pattern','LinearGradient','RadialGradient','Stop','Text'].map(k=>[k,k==='G'?'g':k[0].toLowerCase()+k.slice(1)]).concat([['default','svg']])));
vi.mock('react-native-reanimated',()=>({default:{createAnimatedComponent:(c:unknown)=>c},useSharedValue:(value:number)=>({value}),useAnimatedProps:()=>({}),cancelAnimation:()=>{},withRepeat:()=>0,withSequence:()=>0,withTiming:()=>0,Easing:{inOut:()=>0,sin:0}}));
vi.mock('../src/arcade/Art',()=>({StickerArt:()=>null}));

it('renders the production painted props, states and socket sandwiches in a reproducible proof sheet', () => {
  const cards: React.ReactNode[]=[];
  const add=(name:string,art:React.ReactNode)=>cards.push(<article key={name}><h2>{name}</h2>{art}</article>);
  for(const id of ['fridge','stove','sink-counter','tv','radio','lamp','teddy','cupcake','coconut-drink']) {
    add(`${id} · rest`,<LivingArt id={id} size={240}/>);
    if(['fridge','stove','sink-counter','tv','radio','lamp'].includes(id))add(`${id} · on`,<LivingArt id={id} size={240} state={{on:true}} reduced/>);
    if(id==='coconut-drink')add('coconut · empty',<LivingArt id={id} size={240} state={{empty:true}}/>);
  }
  add('bookcase',<MoreItemArt id="bookcase" size={240}/>);
  add('monstera',<ItemArt item="plant" size={240}/>);
  add('crab',<CrabFriend size={180}/>);
  for(const id of ['bed','sofa','bathtub','bubble-bath']) {
    add(`${id} · empty`,<SeatArt id={id} size={300}/>);
    for(const mirrored of [false,true]) {
      const base=id.includes('bath')?'bathe':'lie', anchor=anchorsFor(0,base,'right'), socket=seatSockets[id][0];
      const art=<div style={{position:'relative',width:300,height:300,transform:mirrored?'scaleX(-1)':undefined}}>
        <div style={{position:'absolute'}}><SeatArt id={id} size={300} layer="back"/></div>
        <div style={{position:'absolute',left:socket.at[0]*300+anchor.bounds.left,top:socket.at[1]*300+anchor.bounds.top}}><Islander base={base} size={224} facing="right" reduced/></div>
        <div style={{position:'absolute'}}><SeatArt id={id} size={300} layer="front" occupied/></div>
      </div>;
      add(`${id} · occupied${mirrored?' · mirrored':''}`,art);
    }
  }
  const html=render(<main>{cards}</main>);
  expect(html.replace(/data:image[^"]+/g, '')).not.toMatch(/NaN|Infinity/);
  expect(cards.length).toBeGreaterThan(25);
  if(process.env.TOCA_PAINTED_GALLERY) {
    mkdirSync(process.env.TOCA_PAINTED_GALLERY,{recursive:true});
    writeFileSync(`${process.env.TOCA_PAINTED_GALLERY}/painted-gallery.html`,`<!doctype html><meta charset="utf-8"><title>Painted Home production art</title><style>*{box-sizing:border-box}body{margin:0;background:#f6e8ce;color:#4a3328;font:15px system-ui}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px}article{background:#fff8e9;border-radius:16px;padding:8px;min-height:340px;overflow:hidden}h2{font-size:14px;margin:4px 0 10px}svg{overflow:visible}img{display:block}</style>${html}`);
  }
});
