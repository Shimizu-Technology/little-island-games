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
import { floorBandSvg, PROPS, PROP_SIZE } from './lagoon-art';
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
writeFileSync('src/arcade/games/lagoon-run/art.generated.ts',`/* Generated by scripts/art/bake-lagoon.ts. Do not edit. */\nexport const floorArt = {\n${generated.join('\n')}\n} as const;\nexport const propArt: Partial<Record<string, () => number[]>> = {\n${propLines.join('\n')}\n};\n`);
