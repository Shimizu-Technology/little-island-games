import React from 'react';
import { it, expect, vi } from 'vitest';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { RoomArt, SkyArt, ShoreArt } from '../src/home/art/Room';
import { RoomShellArt, MoreItemArt } from '../src/home/art/More';
import { ItemArt } from '../src/home/art/Items';
import { roomDefaultTheme } from '../src/home/art/roomDefaults';
import { moreCatalog } from '../src/home/catalogMore';
import { catalog } from '../src/home/catalog';
import { Islander } from '../src/islander/rig/Islander';
vi.mock('react-native-reanimated',()=>({default:{createAnimatedComponent:(c:React.ElementType)=>({animatedProps:_a,...props}:Record<string,unknown>)=>React.createElement(c,{...props,'data-animated':true})},useSharedValue:(value:number)=>({value}),useAnimatedProps:()=>({}),cancelAnimation:()=>{},withRepeat:()=>0,withSequence:()=>0,withTiming:()=>0,Easing:{inOut:()=>0,sin:0}}));
vi.mock('react-native-svg',()=>Object.fromEntries(Object.entries({default:'svg',G:'g',Circle:'circle',Ellipse:'ellipse',Rect:'rect',Path:'path',Defs:'defs',ClipPath:'clipPath',Pattern:'pattern',Text:'text',Filter:'filter',FeColorMatrix:'feColorMatrix'}).map(([name,tag])=>[name,({children,accessible:_a,...props}:Record<string,unknown>)=>React.createElement(tag,props,children as React.ReactNode)])));
vi.mock('../src/arcade/Art',()=>({StickerArt:()=>null}));
vi.mock('../src/badges/BadgeArt',()=>({BadgeGlyph:()=>null}));
const placements: readonly (readonly [string,number,number,number])[] = [
  ['sofa',282,365,152],['side-table',431,378,100],['potted-fern',443,318,83],
  ['teddy',554,464,62],['round-rug',355,472,148],['teapot',433,316,54],
];
const extras: Record<'home'|'kitchen'|'treehouse'|'beach',readonly (readonly [string,number,number,number])[]> = {
  home:[['floor-lamp',650,355,123],['bookcase',690,292,112],['toy-box',171,471,82]],
  kitchen:[['fridge',184,375,204],['stove',682,395,150],['cake-stand',620,360,62]],
  treehouse:[['hammock',623,423,173],['banana-plant',182,394,104],['guitar',712,445,92]],
  beach:[['surfboard',180,395,122],['lantern',650,354,94],['shell-pile',614,480,68]],
};
it('keeps every item art and the four furnished rooms renderable',()=>{
  const ids=[...Object.keys(catalog),...Object.keys(moreCatalog)];
  expect(ids).toHaveLength(63);
  for(const id of ids) expect(render(id in moreCatalog?<MoreItemArt id={id}/>:<ItemArt item={id as keyof typeof catalog}/>)).toContain('<svg');
  expect(render(<MoreItemArt id="sofa" active animated/>)).not.toBe(render(<MoreItemArt id="sofa" active animated reduced/>));
  expect(render(<ItemArt item="aquarium" active animated/>)).not.toBe(render(<ItemArt item="aquarium" active animated reduced/>));
  expect(render(<RoomArt theme={roomDefaultTheme.home}/>)).toContain('viewBox="0 0 800 560"');
  for(const room of ['kitchen','treehouse','beach'] as const) expect(render(<RoomShellArt room={room} theme={roomDefaultTheme[room]}/>)).toContain('viewBox="0 0 800 560"');
  const dir=process.env.HOME_V22_EVIDENCE;if(!dir)return;
  const style='<style>body{margin:0;background:#f9f1e5;color:#3c524d;font:14px system-ui}h1{font-size:18px;margin:8px}h2{font-size:15px;margin:8px}.scene{position:relative;width:100%;aspect-ratio:800/560;overflow:hidden}.scene>svg{position:absolute;inset:0;width:100%;height:100%}.item{position:absolute}.item svg{width:100%;height:100%}.reference{display:block;width:100%;height:auto}.label{padding:5px;background:#f5e9d1}</style>';
  for(const width of [390,1024])for(const room of ['home','kitchen','treehouse','beach'] as const){
    const shell=room==='home'?render(<RoomArt theme={roomDefaultTheme.home}/>):render(<RoomShellArt room={room} theme={roomDefaultTheme[room]}/>);
    const items=[...placements,...extras[room]].map(([id,x,y,size])=>`<div class="item" style="left:${(x-size/2)/8}%;top:${(y-size*.85)/5.6}%;width:${size/8}%;height:${size/5.6}%">${render(id in moreCatalog?<MoreItemArt id={id} size={size}/>:<ItemArt item={id as keyof typeof catalog} size={size}/>)}</div>`).join('');
    const islander=`<div class="item" style="left:58%;top:43%;width:20.375%;height:29.1%">${render(<Islander size={163}/>)}</div>`;
    const refs:{[key:string]:string}={home:'toca-6.jpg',kitchen:'toca-5.jpg',treehouse:'toca-7.jpg',beach:'toca-1.jpg'};
    const ref=`/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/islander/v22/refs/${refs[room]}`;
    writeFileSync(`${dir}/${room}-${width}.html`,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}<main style="width:${width}px"><div class="label">Little Island · ${room} · ${width}px</div><div class="scene">${shell}${items}${islander}</div><div class="label">Reference (internal study only)</div><img class="reference" src="file://${ref}"></main>`);
  }
  let sheet=`<!doctype html><meta charset="utf-8">${style}<style>.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}.tile{background:#fffaf1;padding:5px;border-radius:7px}.tile svg{display:block;margin:auto}.tile small{display:block;white-space:nowrap;overflow:hidden}</style><h1>All 63 items · original, coral and lagoon · 120 px</h1>`;
  for(const tint of ['original','coral','lagoon'] as const){sheet+=`<h2>${tint}</h2><div class="grid">`;for(const id of ids)sheet+=`<div class="tile"><small>${id}</small>${render(id in moreCatalog?<MoreItemArt id={id} size={120} tint={tint}/>:<ItemArt item={id as keyof typeof catalog} size={120} tint={tint}/>)}</div>`;sheet+='</div>';}
  writeFileSync(`${dir}/all-items-120.html`,sheet);
  writeFileSync(`${dir}/outdoors.html`,`<!doctype html><meta charset="utf-8">${style}<main style="width:390px">${render(<SkyArt/>)}${render(<ShoreArt/>)}</main>`);
}, 30000);
