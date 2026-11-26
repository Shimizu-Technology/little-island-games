import React from "react";
import { Image, View } from "react-native";
import { illustratedRooms } from "./illustrated";
import { roomDefaultTheme } from "./roomDefaults";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, Rect, Stop } from "react-native-svg";
import type { HomeState } from "../model";
import type { RoomId } from "../catalogMore";
import { BadgeGlyph } from "../../badges/BadgeArt";
import { tracks, type BadgeId } from "../../badges/engine";
import { RoomTrim } from "./RoomFinish";
import { CottageFascia } from "./ShellDetails";

export const ink = "#4A3328";
export const wood = "#C88E5B";
export const ivory = "#FFF7E6";
const wallColors: Record<HomeState["theme"]["wallpaper"], string> = {cream:"#F5E6C8",lagoon:"#C5DED3",night:"#A5ADC9",peach:"#F1CEC0","math-lab":"#B6CABE",library:"#E7CFAD","night-sky":"#B5BDD3","arcade-neon":"#C9C5DA"};
const floorColors: Record<HomeState["theme"]["floor"], string> = {sand:"#EBD7B2",honey:"#DDAE7D",seafoam:"#AACDC1",rose:"#DCB9AA","island-breeze":"#D9C79B","game-room":"#BCCBC0"};
type Room = RoomId;

function Window({ room, prefix }: { room: Room; prefix: string }) {
  const round = room === "treehouse";
  const veranda = room === "beach";
  const [x, y, w, h] = round ? [296, 77, 208, 208] : room === "home" ? [112, 86, 200, 205] : [245, 75, 310, 210];
  const pane = <Rect x={x} y={y} width={w} height={h} rx={round ? 104 : 20}/>;
  return <G pointerEvents="none">
    <Defs>
      <ClipPath id={prefix + "-pane"}>{pane}</ClipPath>
      <LinearGradient id={prefix + "-lagoon"} x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#71CBE0"/><Stop offset=".57" stopColor="#F5F1C5"/>
        <Stop offset=".59" stopColor="#77D6C6"/><Stop offset="1" stopColor="#299EAB"/>
      </LinearGradient>
    </Defs>
    <Rect x={x-7} y={y-5} width={w+14} height={h+18} rx={round ? 107 : 23} fill={ink} opacity={.23}/>
    <G clipPath={`url(#${prefix}-pane)`}>
      <Rect x={x} y={y} width={w} height={h} fill={`url(#${prefix}-lagoon)`}/>
      <G transform={`translate(${x} ${y}) scale(${w/200} ${h/200})`}>
        <Circle cx={146} cy={56} r={35} fill="#FFF4C3" opacity={.5}/>
        <Circle cx={146} cy={56} r={23} fill="#FFF5CC"/>
        <Path d="M10 73q8-12 22-10q9-22 27-14q12-11 26 6q18-3 23 14q-37 13-98 4ZM105 94q10-9 19-8q14-22 30-5q17-7 29 9q7 0 13 7q-43 8-91-3Z" fill="#FFF9E7"/>
        <Path d="M0 126v-13Q31 88 62 109q27-8 49 12q51-16 89 1Z" fill="#76BCA1"/>
        <Path d="M0 127v-15q31-11 59 13l34 3ZM140 128q28-18 60-12v13Z" fill="#4F9D85"/>
        <Path d="M167 123q-5-19 4-39m0 0q-14-13-24-3q9-1 24 3q7-14 21-8q-12 2-21 8q14-5 21 10q-10-7-21-10q-12 1-17 13" stroke="#377E70" fill="none" strokeWidth={3} strokeLinecap="round"/>
        <Path d="M7 142q24-6 48 0m56-9h26m22 15h24m-160 14h22m31-9q20-4 44 0m-10 21h40m9 11h21m-129 0h24" stroke="#FFF8D9" strokeWidth={2} fill="none" strokeLinecap="round" opacity={.75}/>
      </G>
      <Path d={`M${x+w/2} ${y}v${h}M${x} ${y+h*.57}h${w}`} stroke={wood} strokeWidth={9}/>
      <Path d={`M${x+w/2-2} ${y}v${h}M${x} ${y+h*.57-2}h${w}`} stroke="#F5CA96" strokeWidth={2}/>
    </G>
    <Rect x={x} y={y} width={w} height={h} rx={round ? 104 : 20} fill="none" stroke={wood} strokeWidth={13}/>
    <Rect x={x-6} y={y-6} width={w+12} height={h+12} rx={round ? 110 : 26} fill="none" stroke={ink} strokeWidth={2}/>
    {!round && <><Rect x={x-15} y={y+h+3} width={w+30} height={13} rx={5} fill={wood} stroke={ink} strokeWidth={2}/>
      <Path d={`M${x-8} ${y+h+6}h${w+16}`} stroke="#FFD8A2" strokeWidth={3}/></>}
    {!round && !veranda && <G fill={room === "home" ? "#E99383" : ivory} stroke={ink} strokeWidth={2}>
      <Path d={`M${x-14} ${y-10}h51q-2 58-35 111q7 28 25 52l-43 7q10-74 2-170Zm${w+26} 0h-51q2 58 35 111q-7 28-25 52l43 7q-10-74-2-170Z`}/>
      <Path d={`M${x-13} ${y+92}l19 8M${x+w-8} ${y+100}l19-8`} stroke="#AB764C" strokeWidth={6}/>
    </G>}
  </G>;
}

/** One jar or book on a painted shelf. HC-01: in the live room each is its own touchable piece. */
export function ShelfThing({ x, y, n, kitchen = false }: { x: number; y: number; n: number; kitchen?: boolean }) {
  return kitchen ?
    <G stroke={ink} strokeWidth={2}><Ellipse cx={x+32+n*42} cy={y+61} rx={16} ry={5} fill={ivory}/><Rect x={x+17+n*42} y={y+28+n%2*8} width={30} height={32-n%2*8} rx={4} fill={["#B9D9CF","#E8B4A3","#EBCB8F","#AFC6D2"][n]}/><Path d={`M${x+22+n*42} ${y+37+n%2*8}h20`} stroke={ivory}/></G> :
    <G stroke={ink} strokeWidth={2}><Rect x={x+15+n*43} y={y+25+n%2*8} width={25} height={40-n%2*8} rx={3} fill={["#8BB7AC","#E8A899","#E9C77F","#9BA6C5"][n]}/><Path d={`M${x+20+n*43} ${y+34+n%2*8}h14m-14 20h14`} stroke={ivory} strokeWidth={2}/></G>;
}
function Shelf({ x, y, kitchen = false, live = false }: { x: number; y: number; kitchen?: boolean; live?: boolean }) {
  return <G stroke={ink} strokeWidth={2}>
    <Rect x={x} y={y+66} width={195} height={12} rx={4} fill={wood}/>
    {!live && [0,1,2,3].map(n => <ShelfThing key={n} x={x} y={y} n={n} kitchen={kitchen}/>)}
    <Path d={`M${x+15} ${y+78}v12m165-12v12`} stroke={wood} strokeWidth={5}/>
  </G>;
}

export function Plant({ x, y }: { x: number; y: number }) {
  return <G stroke={ink} strokeWidth={2}>
    <Path d={`M${x-26} ${y}h52l-9 45h-34Z`} fill="#D9A482"/>
    <Path d={`M${x} ${y}v-100m0 55q-28-35-44-34m44 10q27-38 45-38`} stroke="#638D6C" strokeWidth={6} fill="none"/>
    {[-36,-19,0,19,37].map((dx,n)=><Ellipse key={dx} cx={x+dx} cy={y-82-(n%2)*23} rx={22} ry={11} transform={`rotate(${dx<0?-25:25} ${x+dx} ${y-82-(n%2)*23})`} fill={n%2?"#85AF78":"#6E9E77"}/>)}
    <Path d={`M${x-18} ${y+11}h36`} stroke={ivory} opacity={.8}/>
  </G>;
}

/**
 * HC-01: painted things that read as objects answer a touch. Each is drawn here in room units,
 * so the still picture and the live room are the same art; the live room lifts each one into
 * its own small layer (runtime/SetPieces) so it can hop, tilt or swing. Everything else stays
 * painted set dressing.
 */
export type PieceKind = "jar" | "toy" | "book" | "pan" | "plant" | "lantern" | "sink";
export type StagePiece = { id: string; kind: PieceKind; hit: { left: number; top: number; width: number; height: number };
  pivot: { x: number; y: number }; draw: () => React.ReactElement | null };
const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });
function plantPiece(id: string, x: number, y: number): StagePiece {
  return { id, kind: "plant", hit: box(x - 44, y - 108, 88, 153), pivot: { x, y: y + 45 }, draw: () => <Plant x={x} y={y}/> };
}
function shelfPieces(prefix: string, x: number, y: number, kitchen = false): StagePiece[] {
  return [0, 1, 2, 3].map((n) => kitchen
    ? { id: `${prefix}-jar-${n}`, kind: "jar" as const, hit: box(x + 16 + n * 42, y + 28 + (n % 2) * 8, 32, 38 - (n % 2) * 8),
        pivot: { x: x + 32 + n * 42, y: y + 66 }, draw: () => <ShelfThing x={x} y={y} n={n} kitchen/> }
    : { id: `${prefix}-book-${n}`, kind: "book" as const, hit: box(x + 15 + n * 43, y + 25 + (n % 2) * 8, 25, 40 - (n % 2) * 8),
        pivot: { x: x + 27.5 + n * 43, y: y + 65 }, draw: () => <ShelfThing x={x} y={y} n={n}/> });
}
function lanternPiece(id: string, x: number, string = x): StagePiece {
  return { id, kind: "lantern", hit: box(x - 12, 120, 42, 60), pivot: { x: string, y: 0 }, draw: () => <G>
    <Path d={`M${string} 0v128`} stroke="#987451" strokeWidth={5}/><Path d={`M${x - 11} 127h33l-4 48h-25Z`} fill="#E7C688" stroke={ink} strokeWidth={3}/>
    <Circle cx={x + 5} cy={153} r={10} fill="#FFF2BC"/></G> };
}
export const stagePieces: Record<Room, readonly StagePiece[]> = {
  home: [
    ...shelfPieces("home-shelf", 516, 224),
    plantPiece("home-plant", 732, 303),
    { id: "home-box-0", kind: "toy", hit: box(393, 217, 19, 33), pivot: { x: 402.5, y: 250 },
      draw: () => <Rect x={393} y={217} width={19} height={33} rx={2} fill="#83B5AB" stroke={ink}/> },
    { id: "home-box-1", kind: "toy", hit: box(419, 227, 17, 23), pivot: { x: 427.5, y: 250 },
      draw: () => <Rect x={419} y={227} width={17} height={23} rx={2} fill="#E9B397" stroke={ink}/> },
    { id: "home-bear", kind: "toy", hit: box(448, 220, 33, 30), pivot: { x: 464, y: 250 },
      draw: () => <G><Circle cx={464} cy={236} r={14} fill="#E9C588" stroke={ink}/><Circle cx={455} cy={227} r={7} fill="#E9C588"/><Circle cx={473} cy={227} r={7} fill="#E9C588"/></G> },
  ],
  kitchen: [
    ...shelfPieces("kitchen-left", 31, 111, true),
    ...shelfPieces("kitchen-right", 563, 110, true),
    ...[286, 318, 495, 527].map((x, n): StagePiece => ({ id: `kitchen-jar-${n}`, kind: "jar", hit: box(x, 258 + (n % 2) * 9, 19, 27 - (n % 2) * 9),
      pivot: { x: x + 9.5, y: 285 }, draw: () => <G><Rect x={x} y={258+n%2*9} width={19} height={27-n%2*9} rx={3} fill={n%2?"#E9BA9C":"#B6D2C5"} stroke={ink}/><Path d={`M${x+4} 268h11`} stroke={ivory}/></G> })),
    ...[610, 666, 720].map((x, n): StagePiece => {
      const rx = n === 1 ? 24 : 18, ry = n === 1 ? 16 : 12;
      return { id: `kitchen-pan-${n}`, kind: "pan", hit: box(x - rx, 229, rx * 2, 43 + ry), pivot: { x, y: 229 },
        draw: () => <G><Path d={`M${x} 229v28`} stroke={ink} strokeWidth={3}/><Ellipse cx={x} cy={272} rx={rx} ry={ry} fill="#B6BDB4" stroke={ink} strokeWidth={3}/></G> };
    }),
    // The painted sink stays painted; a touch runs its water for a moment.
    { id: "kitchen-sink", kind: "sink", hit: box(356, 268, 86, 64), pivot: { x: 400, y: 285 },
      draw: () => <G><Path d="M400 285V316" stroke="#8FD3DD" strokeWidth={5}/><Path d="M388 318q-8-5-13-1m26 0q9-5 14-1" fill="none" stroke="#D8F4ED" strokeWidth={3}/></G> },
  ],
  treehouse: [
    plantPiece("treehouse-plant", 558, 280),
    ...shelfPieces("treehouse-shelf", 100, 148),
    lanternPiece("treehouse-lantern-0", 212),
    lanternPiece("treehouse-lantern-1", 587, 588),
    { id: "treehouse-basket", kind: "lantern", hit: box(625, 105, 115, 70), pivot: { x: 682, y: 0 }, draw: () => <G>
      <Path d="M647 0v110m71-110v110" stroke="#9B7F5B" strokeWidth={5}/><Path d="M625 110h115l-18 62h-79Z" fill="#E9C383" stroke={ink} strokeWidth={3}/>
      <Ellipse cx={682} cy={164} rx={42} ry={11} fill="#FFE3A9"/></G> },
  ],
  beach: [plantPiece("beach-plant", 715, 314)],
};
const drawn = (room: Room, prefix: string) => stagePieces[room].filter((p) => p.id.startsWith(prefix) && p.kind !== "sink")
  .map((p) => <G key={p.id}>{p.draw()}</G>);

function VectorRoom({ room, theme, badges = [], live = false }: { room: Room; theme: HomeState["theme"]; badges?: readonly BadgeId[]; onBadgePress?: (id: BadgeId) => void;
  /** HC-01: the live room draws its touchable pieces in their own layer. */
  live?: boolean }) {
  const tree = room === "treehouse", kitchen = room === "kitchen", beach = room === "beach";
  const prefix = `${room}-stage-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const paint = (name: string) => `url(#${prefix}-${name})`;
  const wall = wallColors[theme.wallpaper], floor = floorColors[theme.floor];
  return <Svg width="100%" height="100%" viewBox="0 0 800 560" accessible={false}>
    <Defs>
      <LinearGradient id={prefix + "-wall"} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#FFF3D3"/><Stop offset=".44" stopColor={wall}/><Stop offset="1" stopColor={wall}/></LinearGradient>
      <LinearGradient id={prefix + "-floor"} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={floor}/><Stop offset=".66" stopColor="#FFE8B2"/><Stop offset="1" stopColor={floor}/></LinearGradient>
      <Pattern id={prefix + "-wall-lines"} width={tree?88:beach?24:52} height={tree?31:beach?70:52} patternUnits="userSpaceOnUse"><Path d={tree?"M0 30H88M21 4q24-4 43 1":beach?"M3 0V70M17 0V70":"M2 0V52"} stroke={tree?"#8C6849":beach?"#B89C75":"#FFFFFF"} strokeWidth={tree?3:2} opacity={.28} fill="none"/></Pattern>
      <Pattern id={prefix + "-floor-lines"} width={kitchen?50:100} height={kitchen?50:46} patternUnits="userSpaceOnUse"><Path d={kitchen?"M0 0H50M0 0V50":"M0 0H100M50 0V23M0 23H100M0 23V46M7 11q15-4 29 0m24 22q13-4 30 0"} stroke={kitchen?"#8EB4A8":"#8F6E53"} opacity={.35} fill="none" strokeWidth={2}/></Pattern>
      {(["math-lab","library","night-sky","arcade-neon"] as const).map((name,n)=><Pattern key={name} id={prefix + "-" + name} width={64} height={64} patternUnits="userSpaceOnUse"><Path d={n===1?"M4 53h56M10 18v35m12-28v28m14-38v38m12-31v31":"M0 0h64M0 0v64M32 0v64"} stroke={n===2?"#FFF0C5":"#77978D"} strokeWidth={2} opacity={.45}/></Pattern>)}
      {(["island-breeze","game-room"] as const).map(name=><Pattern key={name} id={prefix + "-" + name} width={48} height={48} patternUnits="userSpaceOnUse"><Path d="M0 0h48M0 0v48M24 0v48" stroke="#8D9C83" strokeWidth={2}/></Pattern>)}
    </Defs>
    <Rect width={800} height={352} fill={paint("wall")}/>
    <Rect width={800} height={352} fill={theme.wallpaper in {"math-lab":1,library:1,"night-sky":1,"arcade-neon":1}?paint(theme.wallpaper):"none"}/>
    <Rect width={800} height={352} fill={paint("wall-lines")}/>
    {kitchen && <><Rect y={244} width={800} height={108} fill="#D9E5D9"/>{Array.from({length:20},(_,n)=><Path key={n} d={`M${n*42} 244v108`} stroke="#A5C6B7" strokeWidth={2}/>)}{[272,300,328].map(y=><Path key={y} d={`M0 ${y}h800`} stroke="#A5C6B7" strokeWidth={2}/>)}</>}
    {tree && <G>{Array.from({length:9},(_,n)=><Path key={n} d={`M0 ${n*39}h800`} stroke="#956D4D" opacity={.42} strokeWidth={4}/>)}</G>}
    <Path d="M0 352H800V560H0Z" fill={paint("floor")} stroke={ink} strokeWidth={3}/>
    <Rect y={352} width={800} height={208} fill={theme.floor === "island-breeze" || theme.floor === "game-room"?paint(theme.floor):"none"}/>
    <Rect y={352} width={800} height={208} fill={paint("floor-lines")}/>
    <RoomTrim room={room} prefix={prefix}/>
    <CottageFascia room={room}/>
    <Path d="M0 351H800" stroke={ivory} strokeWidth={13}/>
    <Path d="M0 360H800" stroke={wood} strokeWidth={6}/>
    <Path d="M240 360L60 560M560 360L740 560" stroke="#9A795C" strokeWidth={2} opacity={.18}/>
    <Path d="M340 355L465 355L570 545L260 545Z" fill={beach?"#FFF4D9":"#FFF3DF"} opacity={.17}/>
    {room==="home" && <>
      <Window room={room} prefix={prefix}/>
      <Path d="M18 50Q190 100 395 55" stroke={wood} strokeWidth={3} fill="none"/>
      {[54,103,151,200,249,298,345].map((x,n)=><G key={x}><Path d={`M${x} ${65+n%2*6}v13`} stroke={wood} strokeWidth={2}/><Circle cx={x} cy={80+n%2*6} r={6} fill={n%2?"#F4D391":"#F6C7B6"} stroke={ink} strokeWidth={1}/></G>)}
      <Shelf x={516} y={224} live/>{!live && drawn("home", "home-shelf")}{!live && drawn("home", "home-plant")}
      <Rect x={524} y={26} width={178} height={172} rx={11} fill="#B88562" stroke={ink} strokeWidth={3}/>
      <Rect x={531} y={33} width={164} height={158} rx={7} fill="#E9CC9E"/>
      {tracks.flatMap((track,row)=>([1,2,3,4] as const).map((tier,col)=>{
        const id: BadgeId = `${track}-${tier}`, earned = badges.includes(id);
        return <G key={id} transform={`translate(${536+col*39} ${37+row*22})`} accessible={false}>
          <Rect width={34} height={22} rx={4} fill={earned?"#FFF3D4":"#CFAE88"} stroke="#B28D66" strokeWidth={1}/>
          <G transform="translate(4 0) scale(.25)"><BadgeGlyph id={id} earned={earned}/></G>
        </G>;
      }))}
      <Rect x={412} y={118} width={83} height={96} rx={5} fill="#C7956F" stroke={ink} strokeWidth={3}/><Path d="M422 196l21-33 16 18 11-27 16 42Z" fill="#85B5A5"/><Circle cx={470} cy={143} r={9} fill="#F4CF86"/>
      <Path d="M386 254h113" stroke={wood} strokeWidth={11}/><Path d="M396 249h92" stroke={ivory} strokeWidth={3}/>{!live && drawn("home", "home-b")}
      <Path d="M34 98h55v73H34Z" fill="#EAC29F" stroke={ink} strokeWidth={3}/><Path d="M45 110h33v49H45Z" fill="#F7EAD1"/><Path d="M46 151l13-22 18 23" fill="#EAA993"/>
      <Circle cx={772} cy={130} r={16} fill="#F6D995"/><Path d="M772 146v47" stroke={wood} strokeWidth={5}/>
    </>}
    {kitchen && <>
      <Window room={room} prefix={prefix}/><Shelf x={31} y={111} kitchen live/>{!live && drawn("kitchen", "kitchen-left")}<Shelf x={563} y={110} kitchen live/>{!live && drawn("kitchen", "kitchen-right")}
      <Path d="M240 291h321" stroke={wood} strokeWidth={11}/><Path d="M251 285h299" stroke={ivory} strokeWidth={3}/>
      {!live && drawn("kitchen", "kitchen-jar")}
      <Path d="M593 225h160" stroke={wood} strokeWidth={8}/>{!live && drawn("kitchen", "kitchen-pan")}
      <Rect x={282} y={310} width={235} height={34} rx={6} fill="#D2A47D" stroke={ink} strokeWidth={3}/><Ellipse cx={398} cy={322} rx={42} ry={9} fill="#B4D0D0"/><Path d="M419 319v-31q0-15-19-14v11" fill="none" stroke={ink} strokeWidth={5}/>
      <Rect x={584} y={42} width={160} height={46} rx={5} fill="#DEB18B" stroke={ink} strokeWidth={3}/>
    </>}
    {tree && <>
      <Window room={room} prefix={prefix}/><Path d="M70 0v330M730 0v330" stroke="#8C6849" strokeWidth={24}/><Path d="M69 0v330M729 0v330" stroke="#D4AD79" strokeWidth={10}/>
      <Path d="M535 0q-32 105-8 196M579 0q-28 124-7 219" fill="none" stroke="#6F9A6C" strokeWidth={8}/>
      {!live && drawn("treehouse", "treehouse-plant")}<Shelf x={100} y={148} live/>{!live && drawn("treehouse", "treehouse-shelf")}
      {!live && drawn("treehouse", "treehouse-lantern")}
      {!live && drawn("treehouse", "treehouse-basket")}
    </>}
    {beach && <>
      <Window room={room} prefix={prefix}/><Path d="M228 62v225m345-225v225" stroke={wood} strokeWidth={15}/>
      <Path d="M240 50q157 48 320 0" stroke={wood} strokeWidth={3} fill="none"/>{[270,315,360,405,450,495,540].map((x,n)=><G key={x}><Path d={`M${x} ${58+Math.sin(n/6*Math.PI)*17}v17`} stroke={wood} strokeWidth={2}/><Path d={`M${x-8} ${78+Math.sin(n/6*Math.PI)*17}q8-18 16 0q-8 12-16 0`} fill={n%2?"#F5D0AC":"#F8EDD4"} stroke={ink}/></G>)}
      <Path d="M226 90l-86 62v139l88-40ZM573 90l88 63v138l-88-40Z" fill="#D5AB79" stroke={ink} strokeWidth={3}/>
      {[0,1,2,3,4,5].map(n => <Path key={n} d={`M148 ${161+n*18}l69-41m365 0l70 41`} stroke="#FFF0CC" strokeWidth={4}/>)}
      <Path d="M91 96h45v210H91Z" fill="#7BB6B0" stroke={ink} strokeWidth={3}/><Path d="M154 79h46v228h-46Z" fill="#E8B58D" stroke={ink} strokeWidth={3}/><Path d="M99 170h96M108 99v198m70-209v209" stroke={ivory} strokeWidth={4}/>
      <Path d="M75 311h160" stroke={wood} strokeWidth={13}/>{!live && drawn("beach", "beach-plant")}
      <Path d="M589 81q78 15 146 0" fill="none" stroke={wood} strokeWidth={3}/>{[605,634,665,695,723].map((x,n)=><G key={x}><Path d={`M${x} 88v22`} stroke={wood}/><Path d={`M${x-8} 111q8-20 16 0q-8 10-16 0`} fill={n%2?"#F3C9AD":"#FFF0D7"} stroke={ink}/></G>)}
    </>}
    {room==="home" && <G stroke={ink} strokeWidth={2}><Rect x={8} y={276} width={155} height={70} rx={7} fill="#D6AA80"/><Path d="M16 305h140M55 305v36m56-36v36" stroke="#8B725B" strokeWidth={3}/><Rect x={23} y={285} width={22} height={19} rx={3} fill="#80B1A5"/><Circle cx={79} cy={295} r={11} fill="#F0C98D"/><Path d="M122 285l17 18h-34Z" fill="#E99E94"/></G>}
    {kitchen && <G stroke={ink} strokeWidth={2}><Rect x={0} y={296} width={202} height={52} rx={6} fill="#C89E78"/><Rect x={6} y={302} width={91} height={43} rx={3} fill="#E7C7A1"/><Rect x={104} y={302} width={91} height={43} rx={3} fill="#E7C7A1"/><Circle cx={84} cy={325} r={3} fill={wood}/><Circle cx={118} cy={325} r={3} fill={wood}/><Path d="M0 296h202" stroke={ivory} strokeWidth={7}/><Rect x={640} y={302} width={160} height={46} rx={5} fill="#C89E78"/><Path d="M650 314h140m-140 20h140" stroke="#F1D4B0"/></G>}
    {tree && <G stroke={ink} strokeWidth={2}><Path d="M0 293h173v55H0Z" fill="#B98A5F"/><Path d="M11 304h151m-151 30h151M62 304v30m53-30v30" stroke="#E7BE88" strokeWidth={3}/><Rect x={14} y={271} width={31} height={21} rx={4} fill="#E7C18C"/><Rect x={52} y={275} width={26} height={17} rx={4} fill="#8CB3A0"/><Path d="M646 300h154v48H646Z" fill="#B98A5F"/><Path d="M655 311h136m-136 26h136" stroke="#E7BE88" strokeWidth={3}/></G>}
    {beach && <G stroke={ink} strokeWidth={2}><Path d="M0 314h170v34H0Z" fill="#CDAF83"/><Path d="M0 312h170" stroke={ivory} strokeWidth={6}/><Path d="M631 316h169v32H631Z" fill="#CDAF83"/><Path d="M640 320q12-12 24 0l-4 22h-16Zm45 0q12-12 24 0l-4 22h-16Zm45 0q12-12 24 0l-4 22h-16Z" fill="#E9CE9C"/><Path d="M640 330h114" stroke="#AD8C61" strokeWidth={2}/></G>}
  </Svg>;
}

/** 960×672 and 800×560 share an exact aspect ratio: the painted baseboard stays at y=352. */
export function StageRoom({ room, theme, badges = [], onBadgePress, live = false }: {
  room: Room; theme: HomeState['theme']; badges?: readonly BadgeId[]; onBadgePress?: (id: BadgeId) => void; live?: boolean;
}) {
  const defaults = roomDefaultTheme[room];
  const [paintedRoom, setPaintedRoom] = React.useState<Room>();
  return <View style={{ width: '100%', height: '100%' }} accessible={false}>
    {paintedRoom !== room && <VectorRoom room={room} theme={theme} badges={badges} live={live}/>}
    <Image testID={`painted-room-${room}`} source={illustratedRooms[room]()} onLoad={() => setPaintedRoom(room)} onError={() => setPaintedRoom(undefined)} resizeMode="cover" fadeDuration={0}
      accessible={false} style={{ position: 'absolute', width: '100%', height: '100%' }}/>
    <Svg width="100%" height="100%" viewBox="0 0 800 560" style={{ position: 'absolute' }} accessible={false}>
      {theme.wallpaper !== defaults.wallpaper && <Rect data-theme="wall" width={800} height={352} fill={wallColors[theme.wallpaper]} opacity={.28}/>}
      {theme.floor !== defaults.floor && <Rect data-theme="floor" y={352} width={800} height={208} fill={floorColors[theme.floor]} opacity={.3}/>}
      {room === 'home' && <G>
        <Rect x={524} y={26} width={178} height={172} rx={11} fill="#B88562" stroke={ink} strokeWidth={3}/>
        <Rect x={531} y={33} width={164} height={158} rx={7} fill="#E9CC9E"/>
        {tracks.flatMap((track, row) => ([1,2,3,4] as const).map((tier, col) => {
          const id: BadgeId = `${track}-${tier}`, earned = badges.includes(id);
          return <G key={id} onPress={onBadgePress ? () => onBadgePress(id) : undefined} transform={`translate(${536+col*39} ${37+row*22})`}>
            <Rect width={34} height={22} rx={4} fill={earned ? '#FFF3D4' : '#CFAE88'} stroke="#B28D66"/>
            <G transform="translate(4 0) scale(.25)"><BadgeGlyph id={id} earned={earned}/></G>
          </G>;
        }))}
      </G>}
    </Svg>
  </View>;
}
