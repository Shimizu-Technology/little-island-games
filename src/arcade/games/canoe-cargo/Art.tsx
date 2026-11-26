import React, { memo, useId } from "react";
import { Image, View, Text } from "react-native";
import { illustrated, cargoArtFrame } from "./illustrated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { OutfitId } from "../../progress";
import { pieceCells, type CargoPiece, type CargoKind } from "./engine";
export const cargoPalette = { crate: ["#C88B4D", "#F7CD83"], coconut: ["#708F46", "#CFDA83"], fish: ["#618FAD", "#C7E4E3"], taro: ["#A17591", "#E3B4CB"] };
export const CargoTile = memo(function CargoTile({ kind, value = 0, stuck = false, size = 32 }: { kind: CargoKind; value?: number; stuck?: boolean; size?: number }) {
  const art = illustrated[kind];
  return <View testID={`cargo-tile-${kind}`} accessible={false} style={{ width: size, height: size }}>
    <Image source={art.source()} resizeMode="contain" fadeDuration={0} accessible={false} style={cargoArtFrame(art, size)}/>
    {!!value && <View style={{ position: "absolute", left: size * .2, top: size * .28, width: size * .6, height: size * .56, borderRadius: size, backgroundColor: "#FFFDF8", borderWidth: 1, borderColor: "#3D2B24", alignItems: "center", justifyContent: "center" }}><Text numberOfLines={1} style={{ color: "#3D2B24", fontSize: size * .42, lineHeight: size * .5, fontWeight: "900", textAlign: "center" }}>{value}</Text></View>}
    {stuck && <View testID="cargo-stuck" style={{ position: "absolute", right: 1, bottom: 1, width: size * .36, height: size * .42, borderRadius: 3, backgroundColor: "#FFFDF8", borderWidth: 1, borderColor: "#3D2B24", alignItems: "center", justifyContent: "center" }}><Svg width="90%" height="90%" viewBox="0 0 20 24"><Path d="M5 10V7a5 5 0 0110 0v3" fill="none" stroke="#3D2B24" strokeWidth={3}/><Rect x={2} y={10} width={16} height={12} rx={3} fill="#DFA751" stroke="#3D2B24" strokeWidth={2}/><Circle cx={10} cy={16} r={2} fill="#3D2B24"/></Svg></View>}
  </View>;
});
/** One exterior boundary for the whole bundle; no internal cell borders in this layer. */
export const CargoOutline = memo(function CargoOutline({ piece, cell, ghost = false }: { piece: CargoPiece; cell: number; ghost?: boolean }) {
  const cells = pieceCells(piece), has = (r: number, c: number) => cells.some(p => p[0] === r && p[1] === c);
  const d = cells.flatMap(([r, c]) => [
    !has(r - 1, c) ? `M${c * cell} ${r * cell}h${cell}` : "",
    !has(r, c + 1) ? `M${(c + 1) * cell} ${r * cell}v${cell}` : "",
    !has(r + 1, c) ? `M${c * cell} ${(r + 1) * cell}h${cell}` : "",
    !has(r, c - 1) ? `M${c * cell} ${r * cell}v${cell}` : "",
  ]).join(" ");
  return <Svg width={cell * 4} height={cell * 4} viewBox={`0 0 ${cell * 4} ${cell * 4}`} style={{ overflow: "visible" }} accessible={false}>{ghost && cells.map(([r, c]) => <Rect key={`${r}-${c}`} x={c * cell + 2} y={r * cell + 2} width={Math.max(0, cell - 4)} height={Math.max(0, cell - 4)} rx={3} fill="#E7E6B1" opacity={.18}/>)}<Path d={d} fill="none" stroke={ghost ? "#DCE9C7" : "#FFF3C6"} strokeWidth={ghost ? 1.8 : 2} strokeLinejoin="round" opacity={ghost ? .85 : .95} strokeDasharray={ghost ? "4 4" : undefined}/></Svg>;
});
export const CargoCaptain = memo(function CargoCaptain({ size = 120, outfit = "island", happy = false, dizzy = false }: { size?: number; outfit?: OutfitId; happy?: boolean; dizzy?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
    <Ellipse cx={80} cy={144} rx={49} ry={8} fill="#193C4B" opacity={.2}/>
    <Path d="M46 132L33 143H62L61 130M97 132L86 143H115L112 130" fill="#DFA751" stroke="#634831" strokeWidth={3}/>
    <Ellipse cx={79} cy={106} rx={39} ry={33} fill="#FBF1CF" stroke="#304553" strokeWidth={3}/>
    <Path d={happy ? "M49 99Q14 68 22 57Q38 62 61 84M103 94Q129 58 142 66Q138 90 111 112" : "M48 94Q26 100 38 126Q50 133 64 117M107 94Q131 105 115 130L96 117"} fill="#C4D6CF" stroke="#304553" strokeWidth={3}/>
    <Path d="M52 89L72 98L81 91L105 89L109 117Q80 133 49 116Z" fill={outfit === "explorer" ? "#899C67" : outfit === "starlight" ? "#635E9A" : "#327A82"}/><Path d="M58 91L72 104L79 94L87 104L100 91" fill="#F4BE68"/>
    <Circle cx={74} cy={114} r={2} fill="#F4BE68"/><Circle cx={88} cy={114} r={2} fill="#F4BE68"/><Path d="M53 78Q43 57 54 39Q64 24 81 29Q103 30 106 54Q109 77 91 88Q69 95 53 78Z" fill="#FFF5DA" stroke="#304553" strokeWidth={3}/>
    <Path d="M86 65Q100 60 116 67Q120 70 115 76L109 73Q100 83 88 80Z" fill="#E8B35C" stroke="#74502F" strokeWidth={3}/><Path d="M89 72Q103 72 115 69" stroke="#BF7A40" strokeWidth={2}/>
    {dizzy ? <Path d="M62 53L70 61M70 53L62 61M85 48L93 56M93 48L85 56" stroke="#304553" strokeWidth={3}/> : happy ? <Path d="M60 58Q65 51 70 58M84 53Q89 46 94 53" fill="none" stroke="#304553" strokeWidth={3} strokeLinecap="round"/> : <G><Ellipse cx={65} cy={56} rx={7} ry={9} fill="#FFFFFF"/><Ellipse cx={86} cy={54} rx={7} ry={9} fill="#FFFFFF"/><Circle cx={67} cy={57} r={4} fill="#304553"/><Circle cx={88} cy={55} r={4} fill="#304553"/><Circle cx={68} cy={55} r={1.4} fill="white"/><Circle cx={89} cy={53} r={1.4} fill="white"/></G>}
    <Ellipse cx={59} cy={70} rx={7} ry={4} fill="#E8AC87"/>
    {outfit === "sunhat" ? <G><Ellipse cx={76} cy={34} rx={39} ry={7} fill="#D3A151" stroke="#74502F" strokeWidth={2}/><Path d="M53 33Q51 6 76 10Q99 8 101 34Z" fill="#F6D786" stroke="#74502F" strokeWidth={2}/><Path d="M54 27H99" stroke="#CF7C54" strokeWidth={5}/></G> : outfit === "explorer" ? <G><Path d="M52 34Q50 12 74 13Q96 13 100 32Z" fill="#9DAA71" stroke="#304553" strokeWidth={2}/><Path d="M45 34H106" stroke="#304553" strokeWidth={4}/></G> : outfit === "starlight" ? <G fill="#FFE5A1" stroke="#AE7F42"><Path d="M76 2L82 17L99 19L87 29L90 45L76 37L61 45L64 29L52 19L69 17Z"/><Circle cx={119} cy={28} r={4}/><Circle cx={35} cy={49} r={3}/></G> : <G><Path d="M49 32L48 18Q73 3 100 17L102 32Z" fill="#29475A" stroke="#203643" strokeWidth={3}/><Path d="M49 32Q76 27 103 32Q97 44 78 42L54 39Z" fill="#304553"/><Path d="M53 29Q76 24 98 29" fill="none" stroke="#F0C36A" strokeWidth={3}/><Circle cx={76} cy={16} r={2.4} fill="none" stroke="#F0C36A" strokeWidth={1.7}/><Path d="M76 19V25M70 21Q70 28 76 26Q82 28 82 21M73 21H79" fill="none" stroke="#F0C36A" strokeWidth={1.7} strokeLinecap="round"/></G>}
  </Svg>;
});
export const CargoCanoe = memo(function CargoCanoe({ size = 100 }: { size?: number }) { return <Svg width={size} height={size * .5} viewBox="0 0 160 80" accessible={false}><Path d="M8 45Q76 71 151 42L132 66Q80 86 28 66Z" fill="#DFA751" stroke="#3D2B24" strokeWidth={4}/><Path d="M41 47V30H66V51M73 53V24H101V51M110 49V34H130V47" fill="#C4D582" stroke="#3D2B24" strokeWidth={3}/><Path d="M76 27V3L104 23Z" fill="#FFE2A0" stroke="#3D2B24" strokeWidth={2}/><Path d="M30 57L18 70M121 56L139 69" stroke="#3D2B24" strokeWidth={3}/><Path d="M10 69Q78 83 149 67" fill="none" stroke="#F7CD83" strokeWidth={6}/><Path d="M36 59Q81 73 133 55" fill="none" stroke="#FFF3C6" strokeWidth={2}/><Path d="M4 74Q35 65 64 74T128 74" stroke="#A5E4DE" fill="none" strokeWidth={3}/></Svg>; });
export function CargoScene({ world }: { world: string }) {
  const id = useId().replace(/:/g, ""), night = world === "w3", learn = world === "learn";
  return <Svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" accessible={false}><Defs><LinearGradient id={`cargoSky-${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={night ? "#172B52" : learn ? "#397F85" : "#72BFC3"}/><Stop offset="1" stopColor={night ? "#485784" : "#F4D39C"}/></LinearGradient></Defs><Rect width={600} height={800} fill={`url(#cargoSky-${id})`}/><Circle cx={480} cy={85} r={40} fill={night ? "#FFF0C2" : "#FFE5A4"}/>{night && [40, 95, 180, 275, 370, 540].map((x, i) => <Circle key={x} cx={x} cy={35 + i % 3 * 46} r={3} fill="#FFE7AF"/>)}<Path d="M-40 220Q80 110 190 210Q260 128 380 224L650 230V800H0Z" fill={night ? "#263F57" : "#4B8E7D"}/><Path d="M0 264Q160 228 300 269T600 258V800H0Z" fill={night ? "#244F6A" : "#258E96"}/>{[310, 400, 500, 620, 740].map((y, i) => <Path key={y} d={`M-60 ${y}Q75 ${y - 35} 210 ${y}T480 ${y}T750 ${y}`} stroke={night ? "#7794AC" : "#B5EEE0"} strokeWidth={i % 2 ? 4 : 2} opacity={.5} fill="none"/>)}<Path d="M0 185L38 169L60 185M525 183L549 168L573 183" stroke="#36576A" strokeWidth={4} fill="none"/><Path d="M0 790Q85 712 180 786M410 800Q516 713 600 780" fill="#E6C08B"/></Svg>;
}
