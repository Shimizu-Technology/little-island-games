import React, { memo } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { mapLayout, SAND_PATH_STROKE_WIDTH, TERRAIN_VIEWBOX, terrainPathData, type MapLayout } from './model';
export const Palm = memo(function Palm() {
 return <G stroke="#476E59" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
  <Path d="M-3 53Q10 25 1 0L9 -2Q21 24 6 54Z" fill="#BC9A69"/>
  <Path d="M4 0Q-24 -23 -38 -5Q-18 -6 -4 8Q-22 2 -28 23Q-9 15 5 4Q15 24 34 23Q33 6 12 0Q36 -12 42 -1Q35 -29 7 -6Q12 -33 -3 -30Q-12 -17 4 0Z" fill="#6B9C73"/>
  <Path d="M4 0L-26 -5M7 0L29 -6M5 -1L-1 -21" fill="none" stroke="#98B483"/>
  <Circle cx={3} cy={5} r={4} fill="#A48C5C"/><Circle cx={10} cy={7} r={4} fill="#A48C5C"/>
 </G>;
});
// Literal require thunks keep both orientations bundled by Metro without loading either at import time.
const paintedTerrain: Record<'portrait' | 'landscape', () => ImageSourcePropType> = {
 portrait: () => require('../../assets/art/map/island-portrait.webp'),
 landscape: () => require('../../assets/art/map/island-landscape.webp'),
};
export const Terrain = memo(function Terrain({ wide, layout, width, height }: { wide?: boolean; layout?: MapLayout; width: number; height: number }) {
 const activeLayout = layout ?? mapLayout(width, height);
 const isWide = wide ?? activeLayout.wide;
 const palmScale = `${height*TERRAIN_VIEWBOX.width/(width*TERRAIN_VIEWBOX.height)*(isWide ? 1.4 : 1)} ${isWide ? 1.4 : 1}`;
 const paths = terrainPathData(activeLayout, width, height);
 return <View pointerEvents="none" accessible={false} style={{ width, height, backgroundColor: '#2C93A1' }}>
  <Svg width="100%" height="100%" viewBox={`0 0 ${TERRAIN_VIEWBOX.width} ${TERRAIN_VIEWBOX.height}`} preserveAspectRatio="none" accessible={false}>
  {/* Instant Guam fallback silhouette: reef halo, northern plateau, Orote peninsula, southern hills, Cocos islet. */}
  <Path d="M168 46Q210 38 258 84Q312 72 346 86Q364 134 352 198Q324 252 308 308Q302 356 322 414Q354 476 326 534Q286 588 214 606Q146 604 114 552Q84 510 74 454Q78 408 102 374Q74 358 30 338Q28 322 72 314Q54 298 102 288Q114 236 130 184Q138 122 146 78Q152 50 168 46Z" fill="#93C9C8"/>
  <Path d="M170 54Q210 46 254 90Q306 78 338 92Q354 136 342 196Q316 248 300 304Q294 352 314 410Q344 470 318 524Q280 578 214 594Q152 592 122 544Q92 504 84 452Q88 408 112 374Q82 356 40 336Q42 322 84 316Q68 302 110 294Q122 242 138 188Q146 126 152 84Q156 58 170 54Z" fill="#F0DFB2" stroke="#D7C594" strokeWidth={2.5}/>
  <Path d="M174 64Q212 58 252 98Q298 88 328 100Q342 140 330 194Q306 244 290 302Q284 352 304 408Q330 464 308 516Q274 566 214 580Q158 578 132 534Q104 496 96 450Q100 410 124 374Q96 354 56 336Q64 326 98 322Q96 306 122 296Q134 244 148 192Q156 132 162 90Q164 68 174 64Z" fill="#D1DFAF"/>
  {/* Northern limestone plateau canopy */}
  <Path d="M164 186Q158 128 166 76Q208 62 252 102Q296 92 324 106Q336 146 322 192Q272 204 226 196Q192 202 164 186Z" fill="#9AC07C"/>
  {/* Southern volcanic hills */}
  <Path d="M126 520Q166 486 218 504Q268 474 310 508Q294 554 214 574Q150 568 126 520Z" fill="#9EC17D"/>
  <Path d="M166 554Q212 512 276 544Q246 572 192 570Z" fill="#88AE6B"/>
  {/* Cocos Islet (southwest) and tiny reef islet (northwest) */}
  <Path d="M104 606Q114 590 128 594Q132 608 112 618Q98 618 104 606Z" fill="#93C9C8"/>
  <Path d="M108 604Q115 594 124 597Q126 605 113 612Q104 612 108 604Z" fill="#D1DFAF" stroke="#F0DFB2" strokeWidth={2}/>
  <Path d="M48 118Q60 110 74 118Q76 128 60 130Q46 128 48 118Z" fill="#F0DFB2" stroke="#93C9C8" strokeWidth={3}/>
  <Path d={paths} stroke="#B6C795" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <Path d={paths} stroke="#F4E6BF" strokeWidth={SAND_PATH_STROKE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <G transform="translate(216 146) scale(.62)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(128 242) scale(.60)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(306 238) scale(.64)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(114 452) scale(.56)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(292 518) scale(.64)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  {[[110,362],[118,448],[300,474],[144,536],[262,554]].map(([x,y],i)=><G key={i} transform={`translate(${x} ${y})`}>
   <Path d="M0 8V0M0 6L-4 3" stroke="#7D9E65" strokeWidth={2}/><Circle r={4} fill={i%2?'#DFB368':'#D28F80'}/><Circle r={1.4} fill="#FFF1C2"/>
  </G>)}
  <G stroke="#8A795C" strokeWidth={2} fill="#CFB386"><Path d="M84 466L54 474L58 486L88 478Z"/>
   <Path d="M78 468L82 480M70 470L74 482M62 472L66 484"/>
  </G>
 </Svg>
  {/* Keep the instant vector frame underneath, including when the bitmap fails to load. */}
  <Image key={isWide ? 'landscape' : 'portrait'} testID="painted-island-terrain" source={paintedTerrain[isWide ? 'landscape' : 'portrait']()} resizeMode="cover" fadeDuration={0} accessible={false} style={{ position: 'absolute', width, height }}/>
 </View>;
});
