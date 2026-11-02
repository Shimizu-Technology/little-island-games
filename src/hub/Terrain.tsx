import React, { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
export const Palm = memo(function Palm() {
 return <G stroke="#476E59" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
  <Path d="M-3 53Q10 25 1 0L9 -2Q21 24 6 54Z" fill="#BC9A69"/>
  <Path d="M4 0Q-24 -23 -38 -5Q-18 -6 -4 8Q-22 2 -28 23Q-9 15 5 4Q15 24 34 23Q33 6 12 0Q36 -12 42 -1Q35 -29 7 -6Q12 -33 -3 -30Q-12 -17 4 0Z" fill="#6B9C73"/>
  <Path d="M4 0L-26 -5M7 0L29 -6M5 -1L-1 -21" fill="none" stroke="#98B483"/>
  <Circle cx={3} cy={5} r={4} fill="#A48C5C"/><Circle cx={10} cy={7} r={4} fill="#A48C5C"/>
 </G>;
});
export const Terrain = memo(function Terrain({ wide = false, width, height }: { wide?: boolean; width: number; height: number }) {
 const palmScale = `${height*400/(width*660)*(wide ? 1.4 : 1)} ${wide ? 1.4 : 1}`;
 const paths = wide ? 'M116 185Q200 224 284 185M64 396Q200 350 336 396M132 607Q200 555 268 607M200 212V577' : 'M108 157Q200 203 292 157M100 315Q200 278 300 315M104 473Q203 440 304 473M200 174V540Q201 593 208 617';
 return <Svg width="100%" height="100%" viewBox="0 0 400 660" preserveAspectRatio="none" accessible={false}>
  <Path d="M23 84Q47 14 146 27Q207 -2 263 30Q363 9 379 112Q411 203 377 292Q411 405 359 489Q344 601 250 636Q155 677 78 606Q2 561 26 471Q-5 392 20 308Q-17 187 23 84Z" fill="#93C9C8"/>
  <Path d="M23 74Q47 4 146 17Q207 -12 263 20Q363 -1 379 102Q411 193 377 282Q411 395 359 479Q344 591 250 626Q155 667 78 596Q2 551 26 461Q-5 382 20 298Q-17 177 23 74Z" fill="#F0DFB2" stroke="#D7C594" strokeWidth={2.5}/>
  <Path d="M35 81Q57 20 147 30Q207 2 261 33Q350 14 366 108Q398 193 365 281Q399 394 346 474Q332 580 246 612Q159 652 89 585Q15 545 39 460Q8 381 33 297Q-3 179 35 81Z" fill="#D1DFAF"/>
  <Path d={paths} stroke="#B6C795" strokeWidth={26} fill="none" strokeLinecap="round"/>
  <Path d={paths} stroke="#F4E6BF" strokeWidth={21} fill="none" strokeLinecap="round"/>
  <Path d="M226 351Q260 335 268 359Q282 382 251 397Q220 403 219 383Q202 365 226 351Z" fill="#7EB5A9" stroke="#90B78F" strokeWidth={5}/>
  <Path d="M230 358Q251 351 258 365M230 381Q247 388 257 378" fill="none" stroke="#D7E7C9" strokeWidth={2.5}/>
  <G transform="translate(204 52) scale(.7)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(43 231) scale(.69)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(357 235) scale(.77)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(44 454) scale(.57)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G transform="translate(340 560) scale(.74)"><G transform={`scale(${palmScale})`}><Palm/></G></G>
  <G fill="#9FAE94" stroke="#778B79" strokeWidth={2}>
   <Path d="M24 356Q18 340 30 338Q43 336 46 353Z"/><Path d="M339 405Q338 392 353 391L362 407Z"/>
   <Path d="M90 569Q81 554 94 551Q109 552 110 568Z"/>
  </G>
  {[[164,241],[155,253],[321,528],[308,539],[76,407],[87,416],[275,74]].map(([x,y],i)=><G key={i} transform={`translate(${x} ${y})`}>
   <Path d="M0 9V0M0 7L-5 4" stroke="#7D9E65" strokeWidth={2}/><Circle r={4.5} fill={i%2?'#DFB368':'#D28F80'}/><Circle r={1.5} fill="#FFF1C2"/>
  </G>)}
  <G stroke="#8A795C" strokeWidth={2} fill="#CFB386"><Path d="M74 582L37 635L59 651L96 598Z"/>
   <Path d="M70 590L89 602M63 600L82 613M56 610L75 624M49 620L68 634M41 630L61 644"/>
   <Path d="M74 582V573M96 598V589M37 635V626M59 651V642" strokeWidth={4}/>
  </G>
 </Svg>;
});
