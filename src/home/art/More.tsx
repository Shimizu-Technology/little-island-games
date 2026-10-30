import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, Filter, FeColorMatrix, Pattern, ClipPath, Text as SvgText } from "react-native-svg";
import type { HomeState } from "../model";
import { type TintId, type RoomId } from "../catalogMore";
import { material, shade } from "./Tint";
import { wallColors, floorColors } from "./Room";
import { ShellWallDetails, ShellFloorDetails } from "./ShellDetails";
import { ItemFinish, ItemLife, ItemMotion } from "./Finish";
import { RoomWallFinish, RoomFloorFinish } from "./RoomFinish";
const ink = "#385451", wood = "#D99E6C", pale = "#FFF1D3", leaf = "#79B090";
const star = "M75 30L87 55L115 59L94 79L99 106L75 93L51 106L56 79L35 59L63 55Z";
export function MoreItemArt({ id, size = 120, mirrored = false, rotation = 0, active = false, muted = false, tint = "original", animated = false, reduced = false }: {
  id: string; size?: number; mirrored?: boolean; rotation?: 0 | 90 | 180 | 270; active?: boolean; muted?: boolean; tint?: TintId; animated?: boolean; reduced?: boolean;
}) {
  const color = material(tint, ['#79BDB1', '#EC9989', '#E9C475'][id.length % 3]);
  const light = shade(color, .32), dark = shade(color, -.18);
  const legs = <Path d="M33 89L29 116M115 86L120 111" stroke={wood} strokeWidth={7}/>;
  const cushion = <><Path d="M24 75Q21 61 36 58L112 53Q127 55 129 72L125 95L38 104L24 94Z" fill={color}/><Path d="M31 77L119 69L124 89L39 98Z" fill={light}/><Path d="M75 74L79 94" stroke={dark}/></>;
  let art: React.ReactNode;
  switch (id) {
    case 'sofa': case 'armchair':
      art = <>{legs}<Path d="M28 77V43Q27 28 42 27L110 23Q122 24 122 39V77" fill={color}/><Path d="M35 42L113 36V73L35 80Z" fill={light}/>{cushion}<Path d="M22 62Q14 61 16 76L20 97L38 103V77Q37 65 22 62M123 57Q137 56 136 70L132 92L119 96V72Q118 62 123 57" fill={color}/>{id === 'armchair' && <Path d="M51 43Q76 33 99 41V65L52 69Z" fill={pale}/>}</>;
      break;
    case 'bunk-bed':
      art = <><Path d="M20 19V117M126 12V110" stroke={wood} strokeWidth={9}/>{[29,79].map(y=><G key={y} transform={`translate(0 ${y})`}><Path d="M18 9L112 1L134 20L39 30Z" fill={pale}/><Path d="M52 7L112 2L132 20L59 27Z" fill={color}/><Path d="M20 19L39 36L134 26V18L39 28L20 11Z" fill={wood}/><Path d="M30 2V-9M30-7L116-14V1" fill="none" stroke={wood} strokeWidth={5}/></G>)}<Path d="M97 42L105 118M116 39L124 115M99 57L118 54M102 77L121 74M105 98L124 95" fill="none" stroke={wood} strokeWidth={4}/></>;
      break;
    case 'hammock':
      art = <><Path d="M17 23L26 113M134 17L125 113M15 114H39M114 114H139" stroke={wood} strokeWidth={7}/><G transform={active ? 'translate(0 -6)' : undefined}><Path d="M20 37Q73 108 131 31Q100 127 40 89Z" fill={color}/><Path d="M30 52Q76 107 121 47M43 69L50 93M62 81L68 100M85 80L86 99M105 66L105 85" fill="none" stroke={light} strokeWidth={4}/></G></>;
      break;
    case 'floor-cushion': art = <>{cushion}<Path d="M40 79Q75 88 111 73" fill="none" stroke={dark}/><Circle cx={77} cy={79} r={3} fill={dark}/></>; break;
    case 'rocking-chair':
      art = <>{legs}<Path d="M39 76L34 23L94 18L105 71Z" fill={color}/><Path d="M48 30L53 65M67 28L72 63M86 26L91 61" stroke={light} strokeWidth={5}/><Path d="M15 107Q72 133 137 102" fill="none" stroke={wood} strokeWidth={7}/><Path d="M25 77L105 67L130 84L48 99Z" fill={color}/><Path d="M28 84L49 104L130 91V84L48 97Z" fill={dark}/></>; break;
    case 'stool':
      art = <><Path d="M55 78L48 113M94 78L101 111M51 106L99 103" stroke={wood} strokeWidth={7} fill="none"/><Ellipse cx={75} cy={75} rx={33} ry={13} fill={color}/><Path d="M42 75Q75 91 108 75V84Q75 100 42 84Z" fill={dark}/><Ellipse cx={75} cy={73} rx={30} ry={9} fill={light}/></>; break;
    case 'desk': case 'side-table': case 'coffee-table': case 'kitchen-table':
      art = <G transform={id==='side-table'?'translate(20 -5) scale(.73 1)':id==='coffee-table'?'translate(0 32) scale(1 .73)':undefined}>{legs}{id==='kitchen-table' && <Path d="M49 86L48 120M106 66L108 103" stroke={wood} strokeWidth={7}/>}<Path d="M19 64L111 53L136 73L43 89L19 77Z" fill={wood}/><Path d="M19 64L111 53L136 73L43 82Z" fill={color}/><Path d="M29 65L106 57" stroke={light} strokeWidth={3}/>{id === 'desk' && <><Path d="M86 84V104L125 98V77Z" fill={wood}/><Path d="M97 92L111 90" stroke={ink}/></>}</G>; break;
    case 'fridge':
      art = <>
        <Path d="M32 24L111 17L127 28V108L48 118L32 106Z" fill="#A8B4AE"/>
        <Path d="M32 24L111 17L127 28L48 37Z" fill={light}/>
        <Path d="M48 37L127 28V107L48 118Z" fill={color}/>
        <Path d="M53 43L121 35V71L53 80Z" fill={light}/>
        <Path d="M53 83L121 74V104L53 113Z" fill={color}/>
        <Path d="M53 80L121 71" stroke={ink} strokeWidth={2}/>
        <Path d="M60 49v20m0 18v17" stroke="#F7F3E6" strokeWidth={5}/>
        <Path d="M53 43l68-8M53 83l68-9" stroke="#FFFFFF" strokeWidth={1.5} opacity={.65}/>
        <Circle cx={106} cy={88} r={4} fill="#E5B67D"/>
        <Path d="M48 115v5m73-14v9" stroke="#8E8070" strokeWidth={5}/>
      </>;
      break;
    case 'dresser': case 'bookcase':
      art = <>{legs}<Path d="M26 24L111 16L129 28V102L43 115L26 104Z" fill={dark}/><Path d="M26 24L111 16L129 28L43 38Z" fill={light}/><Path d="M43 38L129 28V102L43 115Z" fill={id === 'bookcase' ? wood : color}/>{[0,1,2].map(n=><G key={n}><Path d={`M50 ${46+n*22}L121 ${36+n*22}V${53+n*22}L50 ${64+n*22}Z`} fill={id==='bookcase' ? '#BA805D' : light}/>{id==='bookcase' ? [0,1,2,3].map(i=><Path key={i} d={`M${55+i*16} ${60+n*22-i*2}v-14h9v13`} fill={[color,pale,'#B7A6CF',leaf][i]}/>) : <Path d={`M76 ${51+n*22}l18-2`} stroke={ink}/>}</G>)}</>; break;
    case 'stove': case 'sink-counter':
      art = <><Path d="M23 52L112 44L133 61V109L43 120L23 105Z" fill={color}/><Path d="M23 52L112 44L133 61L43 72Z" fill={pale}/>{id==='stove' ? <><Ellipse cx={75} cy={57} rx={22} ry={7} fill={ink}/><Path d="M55 42V57Q76 68 96 55V39" fill={wood}/><Ellipse cx={75} cy={40} rx={21} ry={7} fill={light}/><Path d="M48 44H39M98 40H107" strokeWidth={4}/><Path d="M53 86L121 78V104L53 113Z" fill={dark}/>{[57,82,107].map(x=><Circle key={x} cx={x} cy={76-(x-57)/8} r={3} fill={pale}/>)}{active && <Path d="M63 29Q54 22 64 13M80 27Q90 18 81 9M95 28Q106 21 99 15" fill="none" stroke={pale} strokeWidth={4}/>}</> : <><Ellipse cx={77} cy={58} rx={25} ry={9} fill="#A8C7C6"/><Path d="M87 54V32Q87 20 77 25V34" fill="none" stroke={ink} strokeWidth={5}/><Path d="M49 78V111M88 75V106M65 88v10M103 84v10" stroke={dark}/></>}</>; break;
    case 'cake-stand': art = <><Ellipse cx={75} cy={112} rx={30} ry={7} fill={color}/><Path d="M75 110V83" stroke={color} strokeWidth={9}/><Ellipse cx={75} cy={81} rx={49} ry={12} fill={light}/><Path d="M41 77V54Q75 41 109 54V77Q75 91 41 77Z" fill="#EAC09A"/><Ellipse cx={75} cy={53} rx={34} ry={10} fill={pale}/><Path d="M43 56Q49 78 57 60Q66 76 74 61Q86 77 94 60Q102 71 108 56" fill={pale}/><Circle cx={76} cy={43} r={6} fill="#EC9989"/></>; break;
    case 'fruit-bowl': art = <>{[48,73,98].map((x,i)=><G key={x}><Circle cx={x} cy={66-i%2*10} r={17} fill={['#EC9989','#E9C475',leaf][i]}/><Path d={`M${x} ${50-i%2*10}q-2-10 8-9`} fill="none"/></G>)}<Path d="M27 75Q74 101 123 73Q114 118 76 116Q39 116 27 75Z" fill={color}/><Path d="M41 87Q77 102 109 85" stroke={light} fill="none" strokeWidth={4}/></>; break;
    case 'teapot': art = <><Path d="M103 66Q139 48 131 82Q126 100 106 94" fill="none" stroke={color} strokeWidth={9}/><Path d="M46 72L21 57L29 84L50 99" fill={color}/><Path d="M47 59Q75 45 103 59L112 98Q78 125 43 100Z" fill={color}/><Ellipse cx={76} cy={59} rx={29} ry={8} fill={light}/><Circle cx={76} cy={47} r={6} fill={wood}/><Path d="M56 82Q75 92 96 79" fill="none" stroke={light} strokeWidth={5}/>{active && <Path d="M66 33Q55 24 66 14M86 31Q97 24 88 12" fill="none" stroke={pale} strokeWidth={4}/>}</>; break;
    case 'potted-fern': case 'cactus': case 'flower-vase': case 'banana-plant':
      art = <><Path d="M75 91V28" stroke={leaf} strokeWidth={5}/>{id==='cactus' ? <Path d="M65 89V34Q75 17 85 34V65Q98 69 98 49Q108 39 113 51V71Q111 85 85 82V96M65 65Q43 69 43 48Q32 38 29 52V73Q35 88 65 82" fill={leaf}/> : id==='flower-vase' ? [48,76,102].map((x,i)=><G key={x}><Path d={`M75 94L${x} ${40+i%2*15}`} stroke={leaf}/>{[0,1,2,3,4].map(n=><Ellipse key={n} cx={x} cy={29+i%2*15} rx={7} ry={11} transform={`rotate(${n*72} ${x} ${40+i%2*15})`} fill={light}/>)}<Circle cx={x} cy={40+i%2*15} r={6} fill="#E9C475"/></G>) : id==='banana-plant' ? <><Path d="M75 89Q62 53 75 21M75 69Q99 43 113 34" fill="none" stroke={leaf} strokeWidth={5}/><Path d="M75 34Q38 37 30 8Q61 2 75 34M77 49Q87 4 120 18Q124 45 77 49M69 62Q31 75 20 46Q48 34 69 62M86 73Q106 41 133 60Q123 84 86 73" fill={leaf}/><Path d="M74 34L44 16M80 46L111 24M65 61L34 51M88 73L119 62" stroke="#A8CFA7" strokeWidth={1.5}/></> : [0,1,2].map(n=><G key={n} transform={`translate(0 ${n*20})`}><Path d="M75 37Q34 45 29 15Q64 5 75 37M75 37Q84 2 121 17Q114 44 75 37" fill={leaf}/><Path d="M75 37L43 22M75 37L108 22" stroke="#A8CFA7" strokeWidth={1.5}/></G>)}<Path d="M49 87H102L96 113Q75 125 56 113Z" fill={color}/><Path d="M50 88H102V96H52Z" fill={light}/></>; break;
    case 'shell-pile': art = <>{[0,1,2].map(n=><G key={n} transform={`translate(${n*33-30} ${n%2*13})`}><Path d="M60 106Q32 87 43 72Q50 65 56 72Q62 55 70 69Q83 57 88 73Q105 69 105 84Q105 98 78 109Z" fill={n===1?pale:color}/><Path d="M69 103L50 78M71 103L66 75M75 103L83 76M78 104L97 84" stroke={dark} fill="none" strokeWidth={1.5}/></G>)}</>; break;
    case 'table-lamp': case 'floor-lamp': case 'lantern':
      art = <G transform={id==='table-lamp'?'translate(18 35) scale(.76 .7)':undefined}>{active && <Circle cx={75} cy={61} r={52} fill="#FFE7A0" stroke="none" opacity={.4}/>}<Ellipse cx={75} cy={115} rx={28} ry={6} fill={wood}/><Path d="M75 110V53" stroke={wood} strokeWidth={7}/>{id==='lantern' ? <><Path d="M57 30Q57 5 75 7Q96 6 95 30" fill="none" stroke={wood} strokeWidth={5}/><Rect x={49} y={33} width={54} height={65} rx={10} fill={active?'#FFE7A0':light}/><Path d="M47 33H105M47 99H105M60 36V96M91 36V96" stroke={color} strokeWidth={5}/><Path d="M75 87Q62 78 75 58Q88 76 75 87Z" fill="#E9C475"/></> : <><Path d="M50 22H99L119 66Q76 84 31 66Z" fill={active?'#FFE7A0':color}/><Path d="M47 58Q74 67 105 57" fill="none" stroke={light} strokeWidth={5}/><Path d="M105 72V87"/><Circle cx={105} cy={90} r={3} fill={color}/></>}</G>; break;
    case 'string-lights': art = <><Path d="M9 32Q75 95 142 24" fill="none" stroke={wood} strokeWidth={3}/>{[0,1,2,3,4,5].map(n=><G key={n} transform={`translate(${18+n*23} ${43+Math.sin(n/5*Math.PI)*22-n*2})`}>{active && <Circle r={14} cy={10} fill="#FFE7A0" opacity={.5} stroke="none"/>}<Path d="M0 0v8"/><Ellipse cy={14} rx={7} ry={10} fill={active && n%2===0?pale:n%2?light:color}/></G>)}</>; break;
    case 'teddy': art = <G transform={active?'rotate(-8 75 100)':undefined}><Circle cx={44} cy={31} r={15} fill={color}/><Circle cx={104} cy={31} r={15} fill={color}/><Ellipse cx={75} cy={87} rx={30} ry={32} fill={color}/><Ellipse cx={75} cy={90} rx={18} ry={23} fill={light}/><Circle cx={75} cy={49} r={31} fill={color}/><Ellipse cx={75} cy={59} rx={16} ry={12} fill={pale}/><Circle cx={63} cy={45} r={3} fill={ink}/><Circle cx={87} cy={45} r={3} fill={ink}/><Path d="M70 54H80L75 60ZM75 60V65" fill={ink}/><Ellipse cx={43} cy={84} rx={12} ry={20} fill={color}/><Ellipse cx={108} cy={active?65:84} rx={12} ry={20} fill={color}/><Ellipse cx={52} cy={111} rx={18} ry={12} fill={light}/><Ellipse cx={99} cy={111} rx={18} ry={12} fill={light}/></G>; break;
    case 'ball': art = <G transform={active?'translate(0 -20)':undefined}><Circle cx={75} cy={84} r={34} fill={color}/><Path d="M46 68Q83 64 94 111M58 55Q69 91 107 88M45 96Q71 83 91 55" stroke={pale} strokeWidth={5} fill="none"/></G>; break;
    case 'dollhouse': art = <><Path d="M24 54L75 14L130 49V113L24 120Z" fill={wood}/><Path d="M17 55L75 9L137 47L129 55L75 23L25 63Z" fill={color}/><Path d="M36 63L116 56V105L36 112Z" fill={pale}/><Path d="M76 36V107M36 86L116 79" stroke={wood} strokeWidth={5}/><Rect x={47} y={66} width={15} height={13} rx={2} fill={light}/><Path d="M88 105V89L106 87V103" fill={color}/></>; break;
    case 'easel': art = <><Path d="M75 17L29 119M75 17L125 116M75 17L83 119" stroke={wood} strokeWidth={6}/><Path d="M34 30L113 25V88L34 94Z" fill={pale}/><Circle cx={92} cy={45} r={10} fill="#E9C475"/><Path d="M39 81L62 54L81 72L96 59L108 81Z" fill={color}/><Path d="M28 97L122 89" stroke={wood} strokeWidth={7}/></>; break;
    case 'guitar': art = <G transform="rotate(23 75 70)"><Path d="M69 62V17H81V62" fill={wood}/><Rect x={65} y={7} width={20} height={21} rx={5} fill={color}/><Path d="M63 57Q43 52 44 71Q51 83 39 94Q29 121 74 123Q119 121 109 94Q96 83 104 71Q107 52 86 57Z" fill={color}/><Circle cx={75} cy={84} r={13} fill={dark}/><Path d="M70 21V109M75 21V109M80 21V109" stroke={pale} strokeWidth={1}/><Path d="M62 111H88" stroke={wood} strokeWidth={5}/>{active && <Path d="M112 62Q128 73 116 89M124 53Q145 76 128 99" fill="none" stroke="#E9C475" strokeWidth={3}/>}</G>; break;
    case 'kite': art = <><Path d="M75 15L116 56L77 94L36 55Z" fill={color}/><Path d="M75 15L77 94M36 55L116 56" stroke={pale} strokeWidth={3}/><Path d="M77 94Q113 104 83 121" fill="none" stroke={wood}/><Path d="M90 101L81 96V107ZM97 112L106 106V117Z" fill={light}/></>; break;
    case 'round-rug': case 'striped-rug': case 'star-rug':
      art = <G transform="translate(0 44) scale(1 .58)">{id==='star-rug' ? <Path d={star} fill={color}/> : <Ellipse cx={75} cy={75} rx={67} ry={40} fill={color}/>}<Ellipse cx={75} cy={76} rx={id==='star-rug'?19:55} ry={id==='star-rug'?13:29} fill="none" stroke={light} strokeWidth={4}/>{id==='striped-rug' && [0,1,2,3,4].map(n=><Path key={n} d={`M${38+n*18} 47v57`} stroke={light} strokeWidth={6}/>)}</G>; break;
    case 'sea-picture': case 'world-map': case 'mirror':
      art = <><Rect x={21} y={25} width={110} height={80} rx={id==='mirror'?28:7} fill={id==='mirror'?color:wood}/><Rect x={28} y={32} width={96} height={66} rx={id==='mirror'?22:3} fill={id==='mirror'?'#BBD9DD':color}/>{id==='sea-picture'? <><Circle cx={100} cy={49} r={10} fill={pale}/><Path d="M30 69Q52 58 76 71Q100 79 122 66V96H30Z" fill={light}/><Path d="M30 89Q63 75 122 91" stroke={pale} fill="none" strokeWidth={4}/></> : id==='world-map'? <><Path d="M39 48L65 42L78 52L64 63L60 79L50 83L47 63ZM87 47L113 52L110 66L100 72L108 86L90 82L84 65Z" fill={leaf}/><Path d="M33 65H119M76 37V94" fill="none" stroke={pale} opacity={.5}/></> : <Path d="M44 79L91 42M59 87L106 50" stroke="#F2F5E8" strokeWidth={7}/>}<Path d="M30 30H119" stroke={light}/></>; break;
    case 'clock': art = <><Circle cx={75} cy={65} r={44} fill={color}/><Circle cx={75} cy={65} r={35} fill={pale}/>{[0,1,2,3].map(n=><Path key={n} d="M75 34v6" transform={`rotate(${n*90} 75 65)`} strokeWidth={3}/>)}<Path d={active?'M75 43V65L95 73':'M75 43V65L93 57'} fill="none" strokeWidth={4}/><Circle cx={75} cy={65} r={4} fill={color}/></>; break;
    default: return null;
  }
  const flip = mirrored !== (rotation === 180 || rotation === 270);
  return <Svg width={size} height={size} viewBox="0 0 150 130" accessible={false}><Defs><Filter id={`more-muted-${id}`}><FeColorMatrix type="saturate" values="0"/></Filter></Defs><G filter={muted?`url(#more-muted-${id})`:undefined}><Ellipse cx={75} cy={120} rx={54} ry={6} fill={ink} opacity={.12}/><G transform={flip?'translate(150 0) scale(-1 1)':undefined} stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round"><ItemMotion active={active} animated={animated} reduced={reduced}>{art}<ItemFinish id={id} color={color}/></ItemMotion><ItemLife id={id} color={color} active={active} animated={animated} reduced={reduced}/></G></G></Svg>;
}

/** Shell overlays use the original projection; furnishings never change coordinate systems. */
export function RoomShellArt({ room, theme }: { room: Exclude<RoomId, "home">; theme: HomeState["theme"] }) {
  return <Svg width="100%" height="100%" viewBox="0 0 800 560" accessible={false}>
      <Defs>
        <Pattern id="math-lab" patternUnits="userSpaceOnUse" width={48} height={48}><Rect width={48} height={48} fill="#47655B"/><Path d="M0 0H48M0 0V48M24 0V48M0 24H48" stroke="#86A696" strokeWidth={.7}/><SvgText x={7} y={17} fontSize={9} fill="#CEDBC4">2</SvgText><SvgText x={31} y={40} fontSize={9} fill="#CEDBC4">5</SvgText></Pattern>
        <Pattern id="library" patternUnits="userSpaceOnUse" width={64} height={48}><Rect width={64} height={48} fill="#E7CFAD"/><Path d="M0 43H64" stroke="#A68164" strokeWidth={5}/>{[0,1,2,3,4].map(i=><G key={i}><Rect x={4+i*12} y={9+i%2*6} width={9} height={32-i%2*6} rx={1} fill={['#79516F','#6B9692','#DCA578'][i%3]}/><Path d={`M${6+i*12} 33h5`} stroke="#F5E6C8"/></G>)}</Pattern>
        <Pattern id="night-sky" patternUnits="userSpaceOnUse" width={128} height={96}><Rect width={128} height={96} fill="#414C70"/><Path d="M20 15v8m-4-4h8M90 63v8m-4-4h8M55 47v5m-2-2h4" stroke="#F5D99A" strokeWidth={1.5}/><Path d="M99 13Q80 30 104 36Q81 42 80 25Q80 12 99 13Z" fill="#FFF0BC"/></Pattern>
        <Pattern id="arcade-neon" patternUnits="userSpaceOnUse" width={104} height={88}><Rect width={104} height={88} fill="#565679"/><Path d="M12 18h24v17H12ZM68 51l13 20H55Z" fill="none" stroke="#A0CEC6" strokeWidth={3}/><Circle cx={72} cy={19} r={9} fill="none" stroke="#E3AFB8" strokeWidth={3}/><Path d="M15 64h18m-9-9v18" stroke="#E8C990" strokeWidth={3}/></Pattern>
        <Pattern id="island-breeze" patternUnits="userSpaceOnUse" width={16} height={16}><Rect width={16} height={16} fill="#D9C79B"/><Path d="M0 2h16M0 6h16M2 8v8M6 8v8M10 0v8M14 0v8M8 10h8M8 14h8" stroke="#AC956D" strokeWidth={1.5}/></Pattern>
        <Pattern id="game-room" patternUnits="userSpaceOnUse" width={96} height={96}><Rect width={96} height={96} fill="#E9DAB8"/><Path d="M0 0H48V48H0ZM48 48H96V96H48Z" fill="#81968B"/></Pattern>
      </Defs>
    <Ellipse cx={402} cy={528} rx={368} ry={22} fill="#D6D7BB" opacity={.5}/>
    <Path d="M34 82L145 28L758 71V330L145 291L34 374Z" fill={["math-lab", "library", "night-sky", "arcade-neon"].includes(theme.wallpaper) ? `url(#${theme.wallpaper})` : wallColors[theme.wallpaper]} stroke={ink} strokeWidth={3}/>
    <Path d="M34 82L145 28V291L34 374Z" fill="#D0C9AB" opacity={.55}/>
    {room==='treehouse' && !['math-lab','library','night-sky','arcade-neon'].includes(theme.wallpaper) && <Path d="M34 82L145 28L758 71V330L145 291L34 374Z" fill="#B78959" opacity={.48}/>}
    {room==='beach' && <G stroke="#B59C70" opacity={.45}>{Array.from({length:23},(_,n)=><G key={n}><Path d={`M${154+n*26} ${31+n*1.8}V${289+n*1.7}`} strokeWidth={5}/><Path d={`M${155+n*26} 92v6m0 55v6m0 55v6m0 55v6`} stroke="#806F50" strokeWidth={5}/></G>)}{[0,1,2,3,4].map(n=><Path key={n} d={`M148 ${78+n*48}L753 ${117+n*48}`} strokeWidth={2}/>)}</G>}
    <RoomWallFinish room={room}/>
    <Path d="M34 374L145 291L758 330L779 508L162 535Z" fill={["island-breeze", "game-room"].includes(theme.floor) ? `url(#${theme.floor})` : floorColors[theme.floor]} stroke={ink} strokeWidth={3}/>
    <Defs><ClipPath id="shell-floor"><Path d="M34 374L145 291L758 330L779 508L162 535Z"/></ClipPath></Defs>
    <G clipPath="url(#shell-floor)"><ShellFloorDetails room={room} patterned={["island-breeze","game-room"].includes(theme.floor)}/></G>
    <G stroke="#AE885F" strokeWidth={1.5} opacity={room==='treehouse'? .12 : .4}>{[0,1,2,3,4,5].map(n=><Path key={n} d={`M${53+n*20} ${359+n*29}L${762+n*3} ${351+n*31}`}/>)}{[0,1,2,3,4,5,6,7,8].map(n=><Path key={n} d={`M${151+n*68} ${294+n*4}L${170+n*67} ${535-n*3}`}/>)}</G>
    <G clipPath="url(#shell-floor)"><RoomFloorFinish room={room}/></G>
    <Path d="M146 279L755 318M42 363L144 283" fill="none" stroke={pale} strokeWidth={13}/><Path d="M145 290L759 330" stroke="#9E9275" strokeWidth={3}/>
    <ShellWallDetails room={room}/>
    <Path d="M22 80L143 6L775 56L758 76L145 40L34 98Z" fill={room==='beach'?'#C8AB71':'#C68061'} stroke={ink} strokeWidth={3}/><Path d="M145 6V40M154 20L752 61" stroke="#F4C99A" strokeWidth={5}/>
  </Svg>;
}
