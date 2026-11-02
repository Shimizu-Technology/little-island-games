import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { PlaceId } from './model';
const ink = '#354E49';
/** Authored silhouettes, not variants of a shared house. 2.5-unit island outlines. */
export const Landmark = memo(function Landmark({ id }: { id: PlaceId }) {
 return <Svg width="100%" height="100%" viewBox="0 0 180 142" accessible={false}>
  <Ellipse cx={90} cy={130} rx={75} ry={9} fill="#739174" opacity={.18}/>
  <G stroke={ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
   {id === 'school' && <>
    <Path d="M15 119H167L174 132H8Z" fill="#E3D2A0"/><Path d="M23 65H151V121H23Z" fill="#F9E5AF"/>
    <Path d="M14 67L39 39H137L161 67Z" fill="#D3915E"/><Path d="M38 48H137M29 58H147" stroke="#E9B07A"/>
    <Path d="M70 64V28L88 12L106 28V64Z" fill="#FFF3CC"/><Path d="M65 29L88 8L112 29Z" fill="#B66F55"/>
    <Path d="M80 48V36Q88 27 96 36V48Z" fill="#677A62"/><Path d="M84 37V42L81 47H95L92 42V37" fill="#E8B752"/><Circle cx={88} cy={50} r={2} fill="#E8B752"/>
    <Path d="M75 121V85Q88 73 101 85V121" fill="#73958A"/><Path d="M29 79H58V101H29ZM117 79H145V101H117Z" fill="#B7DBD9"/>
    <Path d="M43 80V101M30 90H57M131 80V101M118 90H144"/><Path d="M158 109V22"/>

    <Path d="M19 111V132M10 118H32M142 119H171M150 113V130" stroke="#F9F0D9" strokeWidth={4}/>
   </>}
   {id === 'library' && <>
    <Path d="M32 119V58Q32 20 66 20Q101 20 101 58V119Z" fill="#C5D8B8"/>
    <Path d="M23 48Q65 -5 108 48Z" fill="#658F80"/><Path d="M35 36Q67 26 95 36" stroke="#9EB99C"/>
    <Rect x={49} y={54} width={32} height={28} rx={13} fill="#FFF1C5"/><Path d="M65 55V81M50 68H80"/>
    <Path d="M90 69H153V120H90Z" fill="#E6DFC1"/>
    <Path d="M81 66Q102 50 121 62Q140 48 165 60L160 83Q141 72 122 84Q103 72 84 83Z" fill="#FFF6D8"/>
    <Path d="M121 62L122 84M91 67L111 67M134 66L154 63" stroke="#BEA979"/>
    <Path d="M51 120V101Q65 85 79 101V120" fill="#687F76"/>
    <Path d="M112 120V94H143V120M127 95V119" fill="#90B6AE"/>
    <Path d="M23 87H12V100"/><Rect x={7} y={99} width={13} height={19} rx={3} fill="#F0C86D"/><Path d="M13 103V114" stroke="#FFF2B8"/>
    <Path d="M41 124H89M35 130H96" stroke="#CDB88A"/>
   </>}
   {id === 'arcade' && <>
    <Path d="M25 60H151V125H25Z" fill="#E8A492"/><Path d="M151 60L170 48V115L151 125Z" fill="#BD7E75"/>
    <Path d="M17 56L34 28H146L163 56Z" fill="#65AEB0"/><Rect x={35} y={25} width={111} height={40} rx={12} fill="#FFF0BC"/>
    <Rect x={47} y={34} width={87} height={22} rx={7} fill="#336F72"/>
    <Path d="M59 45Q70 29 80 45T103 45T124 45" stroke="#A9E2D5" strokeWidth={4}/>
    {[43,62,81,100,119,138].map(x=><Circle key={x} cx={x} cy={29} r={2.4} fill="#EBA958" stroke="none"/>)}
    <Path d="M65 125V87Q88 72 112 87V125" fill="#466B69"/>
    <Path d="M87 82V124" stroke="#A8CFBB"/>
    <Path d="M30 73H56V100H30Z" fill="#FFF4CC"/><Path d="M36 87H48M42 81V93"/>
    <Path d="M122 76H144V102H122Z" fill="#DCE6C2"/><Circle cx={130} cy={85} r={2} fill={ink}/><Circle cx={137} cy={93} r={2} fill={ink}/>
    <Path d="M57 128H119" stroke="#E2C08D" strokeWidth={5}/>
   </>}
   {id === 'hall' && <>
    <Path d="M13 123H169L176 133H6Z" fill="#DCC9A1"/>
    <Path d="M29 65V123M148 65V123M52 67V122M126 67V122" stroke="#9B7B53" strokeWidth={8}/>
    <Path d="M15 67L48 27H132L165 67Z" fill="#E6E6BE"/>
    <Path d="M48 27H69L58 47H32ZM90 27H111L125 47H90ZM58 47H90V67H42ZM125 47H149L165 67H139Z" fill="#6B9380"/>
    <Path d="M48 27H132M32 47H149" stroke="#516D5A"/>
    <Path d="M33 77Q90 101 146 77" fill="none"/><Path d="M43 81L49 97L60 85M76 90L86 104L97 90M116 86L129 98L135 81" fill="#D8987A"/>
    <Path d="M64 113H117V122H64ZM73 108V116M108 108V116" fill="#BDA26E"/>
    <Rect x={72} y={1} width={31} height={30} rx={6} fill="#FFF4CB" transform="rotate(9 88 16)"/>
    <Circle cx={80} cy={9} r={2} fill={ink}/><Circle cx={94} cy={22} r={2} fill={ink}/><Circle cx={87} cy={16} r={2} fill={ink}/>
   </>}
   {id === 'home' && <>
    {/* Same broad terracotta roof, round attic, timber floor beam and shoreline as BuildingArt. */}
    <Path d="M21 52H158V120H21Z" fill="#D7B589"/><Path d="M15 53L34 11H146L165 53Z" fill="#C77760"/>
    <Path d="M31 25H149M24 39H155" stroke="#E8AA80"/>
    <Circle cx={90} cy={32} r={11} fill="#F6DFA9"/>
    <Path d="M27 57H153V81H27Z" fill="#F1DEBA"/><Path d="M27 84H153" stroke="#A87852" strokeWidth={6}/>
    <Path d="M31 61H59V76H31ZM120 61H148V76H120ZM31 94H59V113H31ZM120 94H148V113H120Z" fill="#A9CFC8"/>
    <Path d="M73 119V92H105V119" fill="#6E9989"/><Path d="M81 62H101V79H81Z" fill="#B3D8CE"/>
    <Path d="M18 120Q90 111 162 120V134H18Z" fill="#ECD3A0"/><Path d="M17 135Q48 125 77 135T165 135" stroke="#8EC8BE" strokeWidth={5}/>
    <Path d="M129 16V4H142V24" fill="#C9AB83"/>
   </>}
   {id === 'locker' && <>
    <Path d="M35 43H144V123H35Z" fill="#A8C6BF"/><Path d="M35 43L23 51L88 8L157 51L144 43Z" fill="#DBC28B"/>
    <Path d="M39 39L88 17L139 39M48 30L129 30" stroke="#B6A06E"/>
    <Path d="M49 52H94V123H49Z" fill="#F7E6BC"/><Path d="M55 57Q79 87 55 119M87 57Q64 87 87 119" fill="#D9A08D"/>
    <Path d="M105 60H135M120 60V68L105 78H135L120 68" fill="none"/>
    <Path d="M112 76L102 84L109 94L113 90V113H133V90L137 94L144 84L133 76Q124 84 112 76Z" fill="#F8D46F"/>
    <Path d="M29 124H151M33 130H147" stroke="#D2B58B" strokeWidth={4}/>
    <Path d="M22 105Q8 80 20 76Q32 83 22 105ZM150 115Q145 94 161 91Q168 104 150 115Z" fill="#6FA78C"/>
   </>}
   {id === 'badges' && <>
    <Ellipse cx={90} cy={123} rx={72} ry={12} fill="#DBC8A2"/><Ellipse cx={90} cy={116} rx={57} ry={10} fill="#F3E5C5"/>
    <Path d="M53 44V111M126 44V111" stroke="#A8885E" strokeWidth={7}/>
    <Path d="M39 45L90 8L141 45Z" fill="#D5AF58"/><Path d="M56 35H124" stroke="#F3CE7D"/>
    <Path d="M63 115V98H115V115Z" fill="#C7B28B"/><Path d="M79 98V84H100V98" fill="#E2BB5C"/>
    <Path d="M71 56H108V68Q108 84 90 88Q71 83 71 68Z" fill="#F2CF70"/><Path d="M71 60H59Q57 77 77 77M108 60H121Q123 77 103 77" fill="none"/>
    <Path d="M90 60L93 67L101 68L95 73L96 81L90 77L83 81L85 73L79 68L87 67Z" fill="#FFF3BC" strokeWidth={1.7}/>
    <Path d="M28 108V91M152 108V91M28 93Q90 111 152 93" fill="none"/>
    <Path d="M41 97L45 109L55 101M126 101L136 109L140 97" fill="#C58C77"/>
   </>}
  </G>
 </Svg>;
});
