import React from "react";
import Svg, { Circle, G, Line, Path, Rect, Text as SText } from "react-native-svg";
import { font } from "../../../components/ui";
import { describeSetup, type Investigation, type Observation } from "../../inquiry/engine";
import { EarthGlobe, MoonDisc, SkySun } from "../weather-watch/Illustrations";
import { eclipseAt, masses, newtons, planetSize, planets, seasonAt, sky, skyAt, tilts, weight, worlds } from "./model";

const ink = "#254B4B", gold = "#E9B84D", night = "#263D59", soft = "#DCE5D9";
export const VIEW = { width: 360, height: 210 };
const worldGround = ["#81B8A2", "#B6BDBB", "#CC8C6B", "#CBAD87"];

/**
 * The model drawn for one investigation. Before a test it shows the setup only: the result (night shading, the Moon's
 * face, a weight, a shadow) appears once the model has run. `label` sizes SVG text so it reads at the School floor.
 */
export function StationScene({ q, settings, seen, height, label }: { q: Investigation; settings: readonly number[]; seen: Observation | null; height: number; label: number }) {
  const at = (i: number) => settings[i] ?? q.start[i];
  // `room` is the width a label may use. At the largest text a reading shrinks to fit its box; the same reading is
  // also printed below the drawing in text that scales.
  const text = (s: string, x: number, y: number, size = label, fill = ink, room = 340) => (
    <SText x={x} y={y} textAnchor="middle" fontFamily={font ?? "Arial"} fontSize={Math.min(size, room / (s.length * 0.6))} fontWeight="800" fill={fill}>{s}</SText>
  );
  const unknown = (x: number, y: number) => <G><Circle cx={x} cy={y} r={label * 1.1} fill="#FFF9E9" stroke={ink} strokeDasharray="3 3" />{text("?", x, y + label * 0.36)}</G>;
  let body: React.ReactNode = null;
  const topic = q.key.split("-")[0];
  if (topic === "day") {
    const turn = at(0), angle = Math.PI + (turn * Math.PI) / 2;
    body = <>
      <SkySun x={46} y={100} r={24} />
      {[75, 100, 125].map((y) => <Line key={y} x1={86} y1={y} x2={160} y2={y} stroke={gold} strokeWidth={3} strokeLinecap="round" />)}
      <EarthGlobe x={240} y={100} r={62} night={!!seen} />
      <Circle cx={240 + Math.cos(angle) * 62} cy={100 + Math.sin(angle) * 62} r={9} fill="#F3B181" stroke={ink} strokeWidth={2.5} />
      {seen && <G><Rect x={150} y={176} width={180} height={32} rx={16} fill={ink} />{text(`Island: ${sky[skyAt(turn)].toLowerCase()}`, 240, 198, label, "#FFF9E9", 170)}</G>}
    </>;
  } else if (topic === "moon") {
    const spot = at(0), cx = 165, cy = 105, rx = 88, ry = 72;
    body = <>
      <SkySun x={26} y={105} r={16} />
      <Path d={`M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`} stroke="#4D85A1" strokeDasharray="1 6" strokeLinecap="round" fill="none" />
      <EarthGlobe x={cx} y={cy} r={20} />
      {Array.from({ length: 8 }, (_, i) => {
        const b = (i * Math.PI) / 4, x = cx - Math.cos(b) * rx, y = cy + Math.sin(b) * ry;
        return <G key={i}>
          <Circle cx={x} cy={y} r={i === spot ? 11 : 4} fill={i === spot ? "#DAE4D9" : "#9AAFB9"} stroke={i === spot ? ink : "none"} strokeWidth={2} />
          {i === spot && <Path d={`M${x} ${y - 11}A11 11 0 0 0 ${x} ${y + 11}Z`} fill="#FFF6CF" />}
          {text(String(i + 1), cx - Math.cos(b) * (rx + label * 1.1), cy + Math.sin(b) * (ry + label * 1.1) + label * 0.35, label * 0.85)}
        </G>;
      })}
      {seen ? <MoonDisc x={312} y={95} r={34} phase={spot} /> : unknown(312, 95)}
      {text("From Earth", 312, 160, label * 0.85, ink, 92)}
    </>;
  } else if (topic === "planets") {
    const pair = q.controls.length === 2;
    const shown = pair ? [at(0), at(1)] : [2, planets.indexOf(q.controls[0].options[at(0)])];
    const biggest = Math.max(...shown.map((p) => planetSize[p])), scale = 62 / biggest;
    body = <>
      {shown.map((p, i) => {
        const x = i === 0 ? 100 : 260, r = Math.max(2, planetSize[p] * scale), revealed = seen || (!pair && i === 0);
        return <G key={i}>
          {revealed ? <Circle cx={x} cy={95} r={r} fill={["#AA9D8A", "#D5A266", "#649CA9", "#C27D58", "#C9A57A", "#DCC994", "#8CCAC9", "#6E8FBF"][p]} stroke={ink} strokeWidth={1.5} /> : unknown(x, 95)}
          {text(planets[p], x, 186, label, ink, 150)}
        </G>;
      })}
    </>;
  } else if (topic === "gravity") {
    const scale = (x: number, ground: string, mass: number, reading: string | null, caption: string) => <G key={x}>
      <Rect x={x - 70} y={150} width={140} height={44} rx={10} fill={ground} />
      <Rect x={x - 40} y={86} width={80} height={46} rx={8} fill={gold} stroke={ink} strokeWidth={1.5} />
      {text(`${mass} kg`, x, 109 + label * 0.35, label, ink, 74)}
      <Rect x={x - 46} y={132} width={92} height={18} rx={5} fill="#F8F5E6" stroke={ink} />
      {reading === null ? unknown(x, 50) : <G><Rect x={x - 66} y={30} width={132} height={40} rx={9} fill="#FFF9E9" stroke={ink} />{text(reading, x, 57, label, ink, 124)}</G>}
      {text(caption, x, 186, label * 0.9, "#FFFCF1", 132)}
    </G>;
    if (q.key === "gravity-a" || q.key === "gravity-b") {
      const [m, w] = [masses[at(0)], at(1)];
      body = scale(180, worldGround[w], m, seen ? newtons(weight(m, w)) : null, worlds[w]);
    } else if (q.key === "gravity-c") {
      const [m, w] = [masses[at(0)], at(1)];
      body = <>{scale(92, "#6E6A8F", m, q.given ?? null, "Mystery world")}{scale(268, worldGround[w], m, seen ? newtons(weight(m, w)) : null, worlds[w])}</>;
    } else {
      const m = masses[at(0)], a = at(1), b = at(2);
      body = <>{scale(92, worldGround[a], m, seen ? newtons(weight(m, a)) : null, worlds[a])}{scale(268, worldGround[b], m, seen ? newtons(weight(m, b)) : null, worlds[b])}</>;
    }
  } else if (topic === "light") {
    const au = Number(q.controls[0].options[at(0)].split(" ")[0]), step = 270 / 10, x = 70 + au * step;
    body = <>
      <SkySun x={40} y={100} r={20} />
      <Line x1={66} y1={100} x2={x - 10} y2={100} stroke={gold} strokeWidth={4} strokeDasharray="7 5" />
      {Array.from({ length: 11 }, (_, i) => <Line key={i} x1={70 + i * step} y1={118} x2={70 + i * step} y2={i % 5 === 0 ? 130 : 124} stroke={ink} />)}
      <Rect x={x - 9} y={90} width={18} height={20} rx={4} fill="#C9D3D6" stroke={ink} strokeWidth={1.5} />
      {text(`${au} AU`, x, 82, label)}
      {seen ? text(q.outcomes[seen.outcome], 205, 160, label) : unknown(205, 160)}
    </>;
  } else if (topic === "tilt") {
    const t = at(0), lean = at(1), deg = tilts[t] * (lean === 0 ? -1 : 1);
    const season = seen ? seasonAt(t, lean) : null;
    body = <>
      <SkySun x={46} y={100} r={22} />
      {[78, 100, 122].map((y) => <Line key={y} x1={84} y1={y} x2={170} y2={y} stroke={gold} strokeWidth={3} />)}
      <EarthGlobe x={250} y={100} r={56} />
      <G rotation={deg} origin="250,100">
        <Line x1={250} y1={24} x2={250} y2={176} stroke={ink} strokeWidth={4} />
        {text("N", 250, 18, label)}
        {season !== null && <Path d="M194 100A56 56 0 0 1 306 100Z" fill={season === 0 ? gold : season === 1 ? night : soft} opacity={0.45} />}
      </G>
      {text(`${tilts[t]}°`, 326, 190, label, ink, 60)}
    </>;
  } else {
    const place = at(0), orbit = at(1), result = seen ? eclipseAt(place, orbit) : null;
    const earthX = place === 0 ? 290 : 200, moonX = place === 0 ? 190 : place === 1 ? 300 : 200, moonY = place === 2 ? 168 : orbit === 1 ? 62 : 100;
    body = <>
      <SkySun x={40} y={100} r={22} />
      <Line x1={70} y1={100} x2={345} y2={100} stroke={gold} strokeDasharray="2 6" strokeWidth={2} />
      {result === 0 && <Path d={`M${moonX} 92L${earthX - 26} 82L${earthX - 26} 118L${moonX} 108Z`} fill={night} opacity={0.4} />}
      {result === 1 && <Path d={`M${earthX} 82L${moonX} 88L${moonX} 112L${earthX} 118Z`} fill={night} opacity={0.4} />}
      <EarthGlobe x={earthX} y={100} r={26} />
      <MoonDisc x={moonX} y={moonY} r={11} phase={result === 1 ? 0 : 4} />
      {text(orbit === 1 ? "Orbit tilted" : "Orbit lined up", 205, 196, label * 0.9)}
      {result !== null && text(["Solar eclipse", "Lunar eclipse", "No eclipse"][result], 205, 30, label)}
      {result === null && unknown(205, 30)}
    </>;
  }
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} accessible accessibilityLabel={describeSetup(q, settings, seen)}>
      <Rect width={VIEW.width} height={VIEW.height} rx={18} fill="#1F3550" opacity={0.06} />
      {body}
    </Svg>
  );
}

