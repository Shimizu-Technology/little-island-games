/** Reproducible SVG->PNG sources; no native dependency.
 * Run: node --import ./scripts/puzzles/register.mjs scripts/art/bake-lagoon.ts
 * Needs rsvg-convert (librsvg). Writes assets/arcade/lagoon and src/arcade/games/lagoon-run/art.generated.ts. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { projectTrack } from '../../src/arcade/games/lagoon-run/camera';
import { quadHomography, inverse3 } from '../../src/arcade/games/lagoon-run/quad';
import { FLOOR_BANDS, FLOOR_DENSITY } from '../../src/arcade/games/lagoon-run/floorBands';
import { LOOKS } from '../../src/arcade/games/lagoon-run/look';
import { canoePath } from './lagoon-paths';
import { floorBandSvg, PROPS, PROP_SIZE, RAILS, HAZARD_ART, HAZARD_FRAMES, SHELL_SVG, powerSvg } from './lagoon-art';
const dir='assets/arcade/lagoon';mkdirSync(dir,{recursive:true});
const manifest:Record<string,unknown>={density:3,source:'scripts/art/bake-lagoon.ts',assets:{}};
/** Body already drawn in output pixels (density applied by the caller). */
function bakeSized(name:string,width:number,height:number,density:number,body:string,pixelBody=false) {
 const w=Math.ceil(width*density),h=Math.ceil(height*density);
 const svg=pixelBody?`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
 writeFileSync(`${dir}/${name}.svg`,svg);
 execFileSync('rsvg-convert',['-w',String(w),'-h',String(h),'-o',`${dir}/${name}.png`,`${dir}/${name}.svg`]);
 const bytes=readFileSync(`${dir}/${name}.png`);
 (manifest.assets as Record<string,unknown>)[name]={width,height,density,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
function bake(name:string,width:number,height:number,body:string) {
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
 writeFileSync(`${dir}/${name}.svg`,svg);
 execFileSync('rsvg-convert',['-w',String(Math.ceil(width*3)),'-h',String(Math.ceil(height*3)),'-o',`${dir}/${name}.png`,`${dir}/${name}.svg`]);
 const bytes=readFileSync(`${dir}/${name}.png`);
 (manifest.assets as Record<string,unknown>)[name]={width,height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
const generated:string[]=[];
// Scrolling deck: one periodic slice per camera band and world (see floorBands.ts).
for(const look of Object.values(LOOKS)) {
 mkdirSync(`${dir}/${look.id}`,{recursive:true});
 const files=FLOOR_BANDS.map(band=>{
  const name=`${look.id}/floor-${band.index}`;
  bakeSized(name,band.width,band.height,FLOOR_DENSITY,floorBandSvg(band,look,band.width*FLOOR_DENSITY,band.height*FLOOR_DENSITY),true);
  return `require('../../../../assets/arcade/lagoon/${name}.png')`;
 });
 generated.push(`  ${look.id}: () => [${files.join(', ')}],`);
}
// Scenery props per world, at uniform proportions (density covers the nearest pass at 1.25 zoom).
const propLines:string[]=[];
for(const [id,makers] of Object.entries(PROPS)) {
 const look=LOOKS[id as keyof typeof LOOKS];
 const files=makers.map((make,i)=>{const name=`${id}/prop-${i}`;bakeSized(name,PROP_SIZE.width,PROP_SIZE.height,4,make(look));return `require('../../../../assets/arcade/lagoon/${name}.png')`;});
 propLines.push(`  ${id}: () => [${files.join(', ')}],`);
}
const railLines=Object.entries(RAILS).map(([id,make])=>{const name=`${id}/rail`;bakeSized(name,160,144,3,make(LOOKS[id as keyof typeof LOOKS]));return `  ${id}: () => require('../../../../assets/arcade/lagoon/${name}.png'),`;});
// Touchable actors as images: drawn once, never redrawn when a pre-mounted twin first shows.
mkdirSync(`${dir}/actors`,{recursive:true});
const actorLines:string[]=[];
const viewBoxed=(name:string,width:number,height:number,vb:readonly number[],body:string,density=4)=>{
 const w=Math.ceil(width*density),h=Math.ceil(height*density);
 writeFileSync(`${dir}/${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vb[0]} ${vb[1]}" preserveAspectRatio="none">${body}</svg>`);
 execFileSync('rsvg-convert',['-w',String(w),'-h',String(h),'-o',`${dir}/${name}.png`,`${dir}/${name}.svg`]);
 const bytes=readFileSync(`${dir}/${name}.png`);
 (manifest.assets as Record<string,unknown>)[name]={width,height,density,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 return `require('../../../../assets/arcade/lagoon/${name}.png')`;
};
for(const [kind,art] of Object.entries(HAZARD_ART)) {
 const frame=HAZARD_FRAMES[art.action];
 const main=viewBoxed(`actors/${kind}`,frame.width,frame.height,frame.vb,art.svg());
 const ball=art.ball?viewBoxed(`actors/${kind}-ball`,frame.width,frame.height,frame.vb,art.ball()):undefined;
 actorLines.push(`  ${JSON.stringify(kind)}: { art: ${main}${ball?`, ball: ${ball}`:''} },`);
}
const shellLine=viewBoxed('actors/shell',30,30,[32,32],SHELL_SVG,5);
const powerLines=['magnet','kite','sandals','shield'].map(kind=>`  ${kind}: ${viewBoxed(`actors/power-${kind}`,44,44,[64,64],powerSvg(kind),5)},`);
// Material textures map to existing projected deck corners (including every incline section).
// Deck tops and the ramp (LG-S3 redraw): staggered planks with a lit leading edge; the ramp shows
// two small painted chevrons instead of a dark wedge with a huge arrow.
const planksSvg=(w:number,h:number,rows:number,tones:string[],seam:string)=>{let out='';for(let r=0;r<rows;r++){const y0=r*h/rows,y1=(r+1)*h/rows,joints=r%2?[0,.36,.74,1]:[0,.22,.6,1];for(let j=0;j<joints.length-1;j++)out+=`<rect x="${joints[j]*w}" y="${y0}" width="${(joints[j+1]-joints[j])*w}" height="${y1-y0+.3}" fill="${tones[(r*2+j)%tones.length]}"/><path d="M${joints[j]*w} ${y0}V${y1}" stroke="${seam}" stroke-opacity=".35"/>`;out+=`<path d="M0 ${y0}H${w}" stroke="${seam}" stroke-opacity=".5"/>`;}return out;};
const deckTones=['#E8B878','#DDA765','#D29B5A','#E3B070','#CC9455'];
bake('deck',128,256,planksSvg(128,256,12,deckTones,'#7A4A2C')+'<rect x="1" y="1" width="126" height="254" fill="none" stroke="#5E3F2E" stroke-width="2"/><path d="M3 3H125" stroke="#FFE7B5" stroke-width="3" stroke-opacity=".8"/>');
bake('incline',128,128,planksSvg(128,128,6,['#EDC283','#E2B272','#D8A564'],'#7A4A2C')+'<rect x="1" y="1" width="126" height="126" fill="none" stroke="#5E3F2E" stroke-width="2"/><path d="M3 3H125" stroke="#FFE7B5" stroke-width="3" stroke-opacity=".8"/><path d="M48 78L64 62L80 78M48 102L64 86L80 102" fill="none" stroke="#FFF2CF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9"/><path d="M48 78L64 62L80 78M48 102L64 86L80 102" fill="none" stroke="#2E8F87" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>');
bake('roof',128,256,planksSvg(128,256,10,['#D99A66','#CE8D5C','#E2A673','#C58352'],'#6E3F2B')+'<rect x="1" y="1" width="126" height="254" fill="none" stroke="#5E3F2E" stroke-width="2"/><path d="M3 3H125" stroke="#FFE2B0" stroke-width="3" stroke-opacity=".8"/>');
bake('post',24,64,'<path d="M4 51L1 61H12L20 52Z" fill="#183F69" fill-opacity=".32"/><path d="M8 57V8H16V57Z M5 8H19V13H5Z" fill="#E68D36" stroke="#6E4038"/><path d="M8 12H16V21H8Z" fill="#FFF298" stroke="#D46D25" stroke-width=".5"/>');
bake('rail',160,144,'<path d="M16 128L0 139H13L31 128Z" fill="#183F69" fill-opacity=".32"/><path d="M16 56Q80 92 144 56" fill="none" stroke="#FFF0A7" stroke-width="3"/><path d="M8 128V27H24V128Z M3 27H29V38H3Z" fill="#E68D36" stroke="#6E4038" stroke-width="2"/><path d="M8 38H24V58H8Z" fill="#FFF298" stroke="#D46D25"/>');
bake('rope',128,24,'<path d="M0 3Q64 35 128 3" fill="none" stroke="#FFF0A7" stroke-width="3"/>');
bake('deck-left',16,16,'<rect width="16" height="16" fill="#A0643E" stroke="#674B3E"/>');
bake('deck-right',16,16,'<rect width="16" height="16" fill="#704A36" stroke="#674B3E"/>');
bake('deck-side-left',32,32,'<path d="M0 0H32L0 32Z" fill="#9A6440"/><path d="M0 0H32" stroke="#E2B074" stroke-width="3"/>');
bake('deck-side-right',32,32,'<path d="M0 0H32L0 32Z" fill="#6B4533"/><path d="M0 0H32" stroke="#B58050" stroke-width="3"/>');
bake('support',16,128,'<path d="M2 1H14V127H2Z" fill="#78513A" stroke="#674B3E" stroke-width="2"/><path d="M3 6H13" stroke="#E9B56B" stroke-width="4"/>');
const depths=[.1,.6,1,1.4],canoes=[];
for(let f=0;f<depths.length;f++) {
 const z=depths[f],p=[projectTrack(.7,z),projectTrack(1.3,z),projectTrack(1.3,z-.18),projectTrack(.7,z-.18)];
 const all=['shadow','wake','hull','side','inside','cargo','rail','float'].map(part=>canoePath(p,0,part));
 // The authored curves may overhang their control quad; a generous tight crop retains wake and outrigger.
 const minX=Math.floor(p[0].x-35*p[0].scale),minY=Math.floor(p[3].y-72*p[0].scale),width=Math.ceil(p[1].x-minX+65*p[0].scale),height=Math.ceil(p[0].y-minY+30*p[0].scale);
 for(const moving of [false,true]) {
 const [shadow,wake,hull,side,inside,cargo,rail,float]=all;
 // LG-S3 redraw: slim outrigger hull, lit gunwale, shaded side, lashed cargo, float on two booms.
 const wood=moving?['#E9A85E','#C9813F','#8E5530']:['#C98257','#A5643F','#6E3F2B'];
 bake(`canoe-${moving?'moving':'still'}-${f}`,width,height,`<g transform="translate(${-minX} ${-minY})" stroke-linejoin="round" stroke-linecap="round"><path d="${shadow}" fill="#1D4F5C" fill-opacity=".26"/>${moving?`<path d="${wake}" fill="none" stroke="#E6FFF0" stroke-width="3"/>`:''}<path d="${float}" fill="${wood[0]}" stroke="#3E424F" stroke-width="2"/><path d="${hull}" fill="${wood[1]}" stroke="#3E424F" stroke-width="2"/><path d="${side}" fill="${wood[2]}" fill-opacity=".55"/><path d="${inside}" fill="#5A4134"/><path d="${rail}" fill="none" stroke="#FFE0A2" stroke-width="2.6"/>${moving?`<path d="${rail}" fill="none" stroke="#2F8F87" stroke-width="1.2" stroke-dasharray="6 5"/>`:''}<path d="${cargo}" fill="#D9B477" stroke="#674B3E" stroke-width="2"/></g>`);
 }
 canoes.push({depth:z,width,height,inverse:inverse3(quadHomography(p.map(a=>({x:a.x-minX,y:a.y-minY})) as [typeof p[0],typeof p[0],typeof p[0],typeof p[0]]))});
}
writeFileSync(`${dir}/manifest.json`,JSON.stringify({...manifest,canoes},null,2)+'\n');
writeFileSync('src/arcade/games/lagoon-run/art.generated.ts',`/* Generated by scripts/art/bake-lagoon.ts. Do not edit. */\nexport const floorArt = {\n${generated.join('\n')}\n} as const;\nexport const propArt: Partial<Record<string, () => number[]>> = {\n${propLines.join('\n')}\n};\n/** Lazy, like the other art maps: tests never load PNG sources. */\nexport const hazardArt = (): Record<string, { art: number; ball?: number }> => ({\n${actorLines.join('\n')}\n});\nexport const shellArt = () => ${shellLine};\nexport const railArt: Partial<Record<string, () => number>> = {\n${railLines.join('\n')}\n};\nexport const powerArt = (): Record<string, number> => ({\n${powerLines.join('\n')}\n});\n`);
