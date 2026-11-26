import React, { memo } from 'react';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { IllustratedArt, MAP_DOOR_ART, type MapDoor } from '../art/illustrated';
import type { PlaceId } from './model';
const ink = '#354E49';
/** The six core doors' approved storybook art. Locker and Badges keep their silhouettes until they fold into Home. */
export const DOOR_ART: Partial<Record<PlaceId, MapDoor>> = { home: 'home', school: 'learn', arcade: 'arcade', cove: 'puzzles', hall: 'game-hall', library: 'library' };
/** A door's illustration, or its authored silhouette (2.5-unit island outlines) when it has none. */
export const Landmark = memo(function Landmark({ id }: { id: PlaceId }) {
 const door = DOOR_ART[id];
 if (door) return <IllustratedArt source={MAP_DOOR_ART[door]}/>;
 return <Svg width="100%" height="100%" viewBox="0 0 180 142" accessible={false}>
  <Ellipse cx={90} cy={130} rx={75} ry={9} fill="#739174" opacity={.18}/>
  <G stroke={ink} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
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
