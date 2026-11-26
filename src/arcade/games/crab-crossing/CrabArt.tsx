import React, { memo } from "react";
import { Image, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { waterLane, type Lane } from "./engine";
import { crabActorFrame, illustrated } from "./illustrated";
import { safeLaneScenery, type CoastPropKind } from "./scenery";

/** Scenery is painted into the lane only. The engine owns every walkable cell. */
function CoastProp({ kind, x, y, scale = 1 }: { kind: CoastPropKind; x: number; y: number; scale?: number }) {
  return <G transform={`translate(${x} ${y}) scale(${scale})`}>
    <Ellipse cx={0} cy={0} rx={35} ry={9} fill="#244E50" opacity={0.28}/>
    {kind === "palm" ? <G>
      <Path d="M-7-3L-3-52L6-58L8-3Z" fill="#865A3F"/><Path d="M-3-52L6-58L8-3H1Z" fill="#C2915A"/>
      <Path d="M3-66L-38-74L-46-61L-9-54Z M3-68L-24-91L-8-94L10-72Z M4-69L24-93L42-84L14-57Z M7-67L47-69L43-54L5-57Z M-1-64L-37-51L-23-43L11-62Z" fill="#205F52"/>
      <Path d="M3-66L-38-74L-17-68L-9-54Z M4-69L24-93L29-78L14-57Z M7-67L47-69L28-62L5-57Z" fill="#65B56E"/>
      <Circle cx={1} cy={-60} r={5} fill="#B98555"/><Circle cx={9} cy={-57} r={4} fill="#D6A46A"/>
    </G> : kind === "rock" ? <G>
      <Path d="M-32-4L-25-24L-8-33L19-27L31-11L24 1H-24Z" fill="#667A84"/>
      <Path d="M-32-4L-25-24L-8-33L19-27L7-12L-4-6Z" fill="#A8B7AB"/>
      <Path d="M19-27L31-11L24 1H-4L7-12Z" fill="#536C77"/>
    </G> : kind === "flowers" ? <G>
      <Path d="M-33-3L-26-25L-10-18L0-31L13-19L27-27L35-4Z" fill="#398A61"/>
      <Path d="M-33-3L-26-25L-10-18L0-31L13-19L27-27L35-4Z" fill="#62AF70" opacity={0.55}/>
      {[-23,-11,3,17,29].map((dx, i) => <G key={dx}><Circle cx={dx} cy={-17 - i % 2 * 7} r={6} fill={i % 2 ? "#F6B6A0" : "#FFE19A"}/><Circle cx={dx} cy={-17 - i % 2 * 7} r={2} fill="#E5796B"/></G>)}
    </G> : kind === "umbrella" ? <G>
      <Path d="M0-3V-62" stroke="#845B48" strokeWidth={6}/>
      <Path d="M-39-53L-24-76L0-85L26-76L42-53L22-57L0-52L-21-58Z" fill="#E67F70"/>
      <Path d="M0-85L26-76L42-53L22-57L0-52Z" fill="#F4C476"/>
      <Path d="M-39-53L-24-76L0-85L0-52L-21-58Z" fill="#F2A995"/>
    </G> : <G>
      <Path d="M-28-4V-42L0-60L29-43V-4Z" fill="#C69062"/>
      <Path d="M0-60L29-43V-4H0Z" fill="#A96F4F"/>
      <Path d="M-38-38L-8-69H17L39-38L30-32L0-53L-28-31Z" fill="#408967"/>
      <Path d="M-8-69H17L39-38H9Z" fill="#7BB774"/>
      <Rect x={-7} y={-28} width={14} height={24} rx={3} fill="#6B4C42"/>
    </G>}
  </G>;
}

/** Faceted coast tiles share the same nine-column grid as the collision engine. */
export const CrabLane = memo(function CrabLane({ row, lane, learning, width, height }: {
  row: number; lane?: Lane; learning: boolean; width: number; height: number;
}) {
  const terrainRow = Math.min(row, 10);
  const water = learning ? row > 0 && row < 10 : !!lane && waterLane(lane);
  const road = !!lane && !water;
  const grass = terrainRow === 0 || row > 10;
  const boardwalk = !water && terrainRow === 5;
  const top = road ? "#59616E" : water ? "#33B9BC" : boardwalk ? "#D7A570" : grass ? "#79B866" : "#F2CB86";
  const front = road ? "#394956" : water ? "#218D9E" : boardwalk ? "#9B6C4B" : grass ? "#4F8D59" : "#C8935D";
  return <Svg width={width} height={height} viewBox="0 0 900 100" preserveAspectRatio="none" accessible={false}>
    <Rect width={900} height={100} fill={front} />
    <Path d="M0 0H900V66L870 91H0Z" fill={top} />
    <Path d="M0 66H900L870 91H0Z" fill={front} />
    <Path d="M900 0V66L870 91V24Z" fill="#263E4C" opacity={0.16} />
    <Path d="M0 0H900V9H0Z" fill={road ? "#80868B" : water ? "#8DE4D9" : boardwalk ? "#F4CF92" : grass ? "#B3DC81" : "#FFE5A9"} opacity={0.72} />
    {boardwalk ? <G>
      {Array.from({ length: 10 }, (_, i) => <G key={i}><Path d={`M${i * 96} 12V75`} stroke="#865B43" strokeWidth={5} opacity={0.7} /><Path d={`M${i * 96 + 7} 18V64`} stroke="#F4CD88" strokeWidth={3} opacity={0.75} /></G>)}
      <Path d="M0 65H900" stroke="#F1C886" strokeWidth={7} opacity={0.7} />
    </G> : road ? <G>
      {Array.from({ length: 6 }, (_, i) => <Path key={i} d={`M${i * 165 + 30} 42h84l-10 7h-84Z`} fill="#FFF0CE" opacity={0.9} />)}
      <Path d="M0 70H900" stroke="#C9AB8C" strokeWidth={3} opacity={0.48} />
    </G> : water ? <G>
      {Array.from({ length: 10 }, (_, i) => <G key={i}>
        <Path d={`M${(i * 137 + row * 61) % 920} ${18 + i % 3 * 18}h42l-10 5h-42Z`} fill="#E1FBE0" opacity={0.68} />
        <Rect x={(i * 191 + row * 37) % 900} y={68 + i % 2 * 11} width={12} height={3} fill="#AFEDE0" />
      </G>)}
    </G> : <G>
      {Array.from({ length: 13 }, (_, i) => <Rect key={i} x={(i * 143 + row * 47) % 900} y={19 + i % 4 * 14} width={i % 3 === 0 ? 17 : 9} height={i % 3 === 0 ? 7 : 4} fill={grass ? "#4E9A60" : "#CD9D61"} opacity={0.58} />)}
    </G>}
    {safeLaneScenery(row, lane).map(([kind, x, y, scale], i) => <CoastProp key={i} kind={kind} x={x} y={y} scale={scale}/>)}
  </Svg>;
});

/** Floating actors sit over a continuous deck or wake so their usable width stays readable. */
export const CrabVehicle = memo(function CrabVehicle({ kind, width, height, left = false }: {
  kind: Lane["kind"]; width: number; height: number; left?: boolean;
}) {
  const art = illustrated[kind === "pickup" ? "car" : kind];
  const water = kind === "log" || kind === "turtle" || kind === "canoe" || kind === "island";
  const bottom = height * 0.9;
  const frame = crabActorFrame(art, width, height, bottom, left);
  const inkWidth = frame.width * art.ink[2] / art.pixels[0];
  const deckColor = kind === "island" ? "#ECD294" : kind === "turtle" ? "#86BE8A" : "#91D8BD";
  return (
    <View pointerEvents="none" style={{ width, height }}>
      <View style={{
        position: "absolute", left: width * (water ? 0 : 0.04), top: bottom - height * 0.09,
        width: width * (water ? 1 : 0.92), height: height * 0.16, borderRadius: height,
        backgroundColor: water ? "#1E59685C" : "#192C3E5C",
      }}/>
      {water && <View style={{ position: "absolute", left: 0, top: bottom - height * 0.28, width, height: height * 0.34 }}>
        <Svg width={width} height={height * 0.34} viewBox="0 0 100 28" preserveAspectRatio="none" accessible={false}>
          <Ellipse cx={50} cy={15} rx={50} ry={11} fill={deckColor} opacity={inkWidth < width * 0.8 ? 0.82 : 0.48}/>
          <Path d="M2 16Q7 8 25 6M71 7Q91 8 98 15M5 20Q17 25 34 25M69 25Q87 25 96 20"
            fill="none" stroke="#D8F5D8" strokeWidth={1.5} strokeLinecap="round" opacity={0.72}/>
        </Svg>
      </View>}
      <Image accessible={false} fadeDuration={0} source={art.source()} resizeMode="contain" style={frame}/>
    </View>
  );
});
