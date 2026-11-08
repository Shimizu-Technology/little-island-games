/** Reproducible SVG->PNG sources; no native dependency. Run: node --experimental-strip-types scripts/art/bake-lagoon.ts */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
// @ts-expect-error Node's type-stripping runner requires explicit extensions.
import { projectTrack } from '../../src/arcade/games/lagoon-run/camera.ts';
// @ts-expect-error Node's type-stripping runner requires explicit extensions.
import { quadHomography, inverse3 } from '../../src/arcade/games/lagoon-run/quad.ts';
// @ts-expect-error Node's type-stripping runner requires explicit extensions.
import { canoePath } from './lagoon-paths.ts';
const dir='assets/arcade/lagoon';mkdirSync(dir,{recursive:true});
const manifest:Record<string,unknown>={density:3,source:'scripts/art/bake-lagoon.ts',assets:{}};
function bake(name:string,width:number,height:number,body:string,density=3) {
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
 writeFileSync(`${dir}/${name}.svg`,svg);
 execFileSync('rsvg-convert',['-w',String(Math.ceil(width*density)),'-h',String(Math.ceil(height*density)),'-o',`${dir}/${name}.png`,`${dir}/${name}.svg`]);
 const bytes=readFileSync(`${dir}/${name}.png`);
 (manifest.assets as Record<string,unknown>)[name]={width,height,bytes:bytes.length,...(density===3?{}:{density}),sha256:createHash('sha256').update(bytes).digest('hex')};
}
for(let f=0;f<12;f++) {
 let joints='',grain='',nails='';const phase=f*.065/12;
 for(let i=-1;i<43;i++) {
  const z=-1.18+i*.065+phase;if(z<=-1.2||z>=1.5)continue;
  const p=projectTrack(1,z),s=p.scale,w=179.4*s,y=p.y-290;
  joints+=`M${195-w} ${y}H${195+w}`;
  for(let lane=0;lane<3;lane++) {const x=projectTrack(lane,z).x;grain+=`M${x-39*s} ${y-3*s}q${16*s} ${-4*s} ${42*s} ${-s}m${-23*s} ${-3*s}q${7*s} ${-3*s} ${12*s} 0`;}
  for(const lane of [-.4,.4,.6,1.4,1.6,2.4]) {const x=projectTrack(lane,z).x;nails+=`M${x-s} ${y-3*s}h${2*s}`;}
 }
 bake(`floor-${f}`,390,370,`<path d="${joints}" stroke="#126272" stroke-width=".85" fill="none"/><path d="${grain}" stroke="#8C4829" stroke-width=".8" stroke-opacity=".7" fill="none"/><path d="${nails}" stroke="#443F51" stroke-width="1.4" stroke-linecap="round"/>`);
}
// Material textures map to existing projected deck corners (including every incline section).
bake('deck',128,256,'<rect x="1" y="1" width="126" height="254" fill="#DDA35E" stroke="#674B3E" stroke-width="2"/>'+Array.from({length:12},(_,i)=>`<path d="M1 ${(i+1)*256/13}H127" stroke="#A56B3F"/>`).join(''));
bake('incline',128,128,'<rect x="1" y="1" width="126" height="126" fill="#DDA35E" stroke="#674B3E" stroke-width="2"/><path d="M1 42H127M1 85H127" stroke="#A56B3F"/><path d="M53 20H75V65H94L64 112L34 65H53Z" fill="#176B70" stroke="#FFF0BE" stroke-width="2"/>');
bake('roof',128,256,'<rect x="1" y="1" width="126" height="254" fill="#DEA16D" stroke="#674B3E" stroke-width="2"/>'+Array.from({length:12},(_,i)=>`<path d="M1 ${(i+1)*256/13}H127" stroke="#A56B3F"/>`).join(''));
bake('post',24,64,'<path d="M4 51L1 61H12L20 52Z" fill="#183F69" fill-opacity=".32"/><path d="M8 57V8H16V57Z M5 8H19V13H5Z" fill="#E68D36" stroke="#6E4038"/><path d="M8 12H16V21H8Z" fill="#FFF298" stroke="#D46D25" stroke-width=".5"/>');
bake('rail',160,144,'<path d="M16 128L0 139H13L31 128Z" fill="#183F69" fill-opacity=".32"/><path d="M16 56Q80 92 144 56" fill="none" stroke="#FFF0A7" stroke-width="3"/><path d="M8 128V27H24V128Z M3 27H29V38H3Z" fill="#E68D36" stroke="#6E4038" stroke-width="2"/><path d="M8 38H24V58H8Z" fill="#FFF298" stroke="#D46D25"/>');
bake('rope',128,24,'<path d="M0 3Q64 35 128 3" fill="none" stroke="#FFF0A7" stroke-width="3"/>');
bake('deck-left',16,16,'<rect width="16" height="16" fill="#A0643E" stroke="#674B3E"/>');
bake('deck-right',16,16,'<rect width="16" height="16" fill="#704A36" stroke="#674B3E"/>');
bake('deck-side-left',32,32,'<path d="M0 0H32L0 32Z" fill="#A0643E"/>');
bake('deck-side-right',32,32,'<path d="M0 0H32L0 32Z" fill="#704A36"/>');
bake('shell-burst',48,48,'<path d="M24 2L28 15L42 8L34 22L47 27L33 30L38 44L25 35L16 47L17 32L2 33L13 23L3 12L19 16Z" fill="#FFE9A7" stroke="#B76A20" stroke-width="1"/><text x="24" y="30" text-anchor="middle" fill="#5B4844" font-family="Arial" font-size="14" font-weight="900">+1</text>',9);
bake('marker-note',80,30,'<rect width="80" height="26" rx="9" fill="#FFF2CF"/><text x="0" y="21" fill="#243D51" font-family="Arial" font-size="21" font-weight="900">+10</text>',9);
bake('support',16,128,'<path d="M2 1H14V127H2Z" fill="#78513A" stroke="#674B3E" stroke-width="2"/><path d="M3 6H13" stroke="#E9B56B" stroke-width="4"/>');
const depths=[.1,.6,1,1.4],canoes=[];
for(let f=0;f<depths.length;f++) {
 const z=depths[f],p=[projectTrack(.7,z),projectTrack(1.3,z),projectTrack(1.3,z-.18),projectTrack(.7,z-.18)];
 const all=['shadow','wake','hull','inside','cargo','rail','float'].map(part=>canoePath(p,0,part));
 // The authored curves may overhang their control quad; a generous tight crop retains wake and outrigger.
 const minX=Math.floor(p[0].x-35*p[0].scale),minY=Math.floor(p[3].y-72*p[0].scale),width=Math.ceil(p[1].x-minX+65*p[0].scale),height=Math.ceil(p[0].y-minY+30*p[0].scale);
 for(const moving of [false,true]) {
 const [shadow,wake,hull,inside,cargo,rail,float]=all;
 bake(`canoe-${moving?'moving':'still'}-${f}`,width,height,`<g transform="translate(${-minX} ${-minY})"><path d="${shadow}" fill="#344B50" fill-opacity=".22"/>${moving?`<path d="${wake}" fill="none" stroke="#E6FFF0" stroke-width="3" stroke-linecap="round"/>`:''}<path d="${hull}" fill="${moving?'#E6A157':'#C87550'}" stroke="#3E424F" stroke-width="2"/><path d="${inside}" fill="#665148"/><path d="${cargo}" fill="#D5AE6F" stroke="#674B3E" stroke-width="2" stroke-linejoin="round"/><path d="${rail}" fill="none" stroke="#FFE0A2" stroke-width="3" stroke-linejoin="round"/><path d="${float}" fill="#D59A5F" stroke="#3E424F" stroke-width="2" stroke-linejoin="round"/></g>`);
 }
 canoes.push({depth:z,width,height,inverse:inverse3(quadHomography(p.map(a=>({x:a.x-minX,y:a.y-minY})) as [typeof p[0],typeof p[0],typeof p[0],typeof p[0]]))});
}
writeFileSync(`${dir}/manifest.json`,JSON.stringify({...manifest,canoes},null,2)+'\n');
