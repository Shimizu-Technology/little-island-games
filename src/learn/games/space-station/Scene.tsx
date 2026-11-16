import React from "react";
import Svg, { Circle, G, Line, Path, Rect, Text as SText } from "react-native-svg";
import { font } from "../../../components/ui";
import { describeSetup, type Investigation, type Observation } from "../../inquiry/engine";
import { EarthGlobe, MoonDisc, SkySun } from "../weather-watch/Illustrations";
import { eclipseAt, eclipses, moonPaths, moonPlaces, newtons, planetSize, planets, seasonAt, seasons, sky, skyAt, tilts, weight, worlds } from "./model";

const ink = "#254B4B", gold = "#E9B84D", night = "#263D59", soft = "#DCE5D9";
export const VIEW = { width: 360, height: 210 };
const worldGround = ["#81B8A2", "#B6BDBB", "#CC8C6B", "#CBAD87"];
const planetColour = ["#AA9D8A", "#D5A266", "#649CA9", "#C27D58", "#C9A57A", "#DCC994", "#8CCAC9", "#6E8FBF"];

/** Reads a control's shown option as the model's value, whatever order the options are shown in. */
function reader(q: Investigation, settings: readonly number[]) {
  const label = (i: number) => q.controls[i].options[settings[i] ?? q.start[i]];
  return {
    label,
    world: (i: number) => worlds.indexOf(label(i) as (typeof worlds)[number]),
    mass: (i: number) => Number(label(i)),
    place: (i: number) => moonPlaces.indexOf(label(i) as (typeof moonPlaces)[number]),
    path: (i: number) => moonPaths.indexOf(label(i) as (typeof moonPaths)[number]),
    planet: (i: number) => planets.indexOf(label(i) as (typeof planets)[number]),
  };
}

/**
 * The model drawn for one investigation. Before a test it shows the setup only: the result (night shading, the Moon's
 * face, a weight, a shadow) appears once the model has run. Every SVG label is drawn at `label`, which the board sets
 * so it reads at the School floor (13 pt, 19.5 pt at AX); labels are short and placed where they fit at that size.
 * Longer words go in `stationLegend`, printed below the drawing in text that scales and wraps.
 */
export function StationScene({ q, settings, seen, height, label }: { q: Investigation; settings: readonly number[]; seen: Observation | null; height: number; label: number }) {
  const at = (i: number) => settings[i] ?? q.start[i], read = reader(q, settings);
  const text = (s: string, x: number, y: number, fill = ink) => (
    <SText x={x} y={y} textAnchor="middle" fontFamily={font ?? "Arial"} fontSize={label} fontWeight="800" fill={fill}>{s}</SText>
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
    </>;
  } else if (topic === "moon") {
    const spot = at(0), cx = 160, cy = 105, rx = 100, ry = 88;
    body = <>
      <SkySun x={24} y={105} r={14} />
      <Path d={`M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`} stroke="#4D85A1" strokeDasharray="1 6" strokeLinecap="round" fill="none" />
      <EarthGlobe x={cx} y={cy} r={16} />
      {Array.from({ length: 8 }, (_, i) => {
        const b = (i * Math.PI) / 4, x = cx - Math.cos(b) * rx, y = cy + Math.sin(b) * ry;
        return <G key={i}>
          <Circle cx={x} cy={y} r={i === spot ? 11 : 4} fill={i === spot ? "#DAE4D9" : "#9AAFB9"} stroke={i === spot ? ink : "none"} strokeWidth={2} />
          {i === spot && <Path d={`M${x} ${y - 11}A11 11 0 0 0 ${x} ${y + 11}Z`} fill="#FFF6CF" />}
          {/* Numbers sit inside the orbit, between each spot and Earth, so none clips or meets the Sun. */}
          {text(String(i + 1), cx - Math.cos(b) * (rx - label * 1.05), cy + Math.sin(b) * (ry - label * 1.05) + label * 0.35)}
        </G>;
      })}
      {seen ? <MoonDisc x={318} y={100} r={30} phase={spot} /> : unknown(318, 100)}
    </>;
  } else if (topic === "planets") {
    const pair = q.controls.length === 2;
    const shown = pair ? [read.planet(0), read.planet(1)] : [2, read.planet(0)];
    // Until Test the hidden planet does not set the scale: Earth keeps the same size whatever is chosen.
    const scale = seen ? 62 / Math.max(...shown.map((p) => planetSize[p])) : 30 / planetSize[2];
    body = <>
      {shown.map((p, i) => {
        const x = i === 0 ? 100 : 260, revealed = seen || (!pair && i === 0);
        return <G key={i}>
          {revealed ? <Circle cx={x} cy={95} r={Math.max(2, planetSize[p] * scale)} fill={planetColour[p]} stroke={ink} strokeWidth={1.5} /> : unknown(x, 95)}
          {text(planets[p], x, 192)}
        </G>;
      })}
    </>;
  } else if (topic === "gravity") {
    const scale = (x: number, ground: string, mass: number, reading: string | null, caption: string) => <G key={x}>
      <Rect x={x - 72} y={150} width={144} height={44} rx={10} fill={ground} />
      <Rect x={x - 50} y={86} width={100} height={46} rx={8} fill={gold} stroke={ink} strokeWidth={1.5} />
      {text(`${mass} kg`, x, 109 + label * 0.35)}
      <Rect x={x - 46} y={132} width={92} height={18} rx={5} fill="#F8F5E6" stroke={ink} />
      {reading === null ? unknown(x, 50) : <G><Rect x={x - 76} y={30} width={152} height={40} rx={9} fill="#FFF9E9" stroke={ink} />{text(reading, x, 50 + label * 0.36)}</G>}
      {text(caption, x, 172 + label * 0.36, "#FFFCF1")}
    </G>;
    if (q.key === "gravity-a" || q.key === "gravity-b") {
      const m = read.mass(0), w = read.world(1);
      body = scale(180, worldGround[w], m, seen ? newtons(weight(m, w)) : null, worlds[w]);
    } else if (q.key === "gravity-c") {
      const m = read.mass(0), w = read.world(1);
      body = <>{scale(92, "#6E6A8F", m, q.given ?? null, "Mystery")}{scale(268, worldGround[w], m, seen ? newtons(weight(m, w)) : null, worlds[w])}</>;
    } else {
      const m = read.mass(0), a = read.world(1), b = read.world(2);
      body = <>{scale(92, worldGround[a], m, seen ? newtons(weight(m, a)) : null, worlds[a])}{scale(268, worldGround[b], m, seen ? newtons(weight(m, b)) : null, worlds[b])}</>;
    }
  } else if (topic === "light") {
    const au = Number(read.label(0).split(" ")[0]), step = 270 / 10, x = 70 + au * step;
    body = <>
      <SkySun x={40} y={100} r={20} />
      <Line x1={66} y1={100} x2={x - 10} y2={100} stroke={gold} strokeWidth={4} strokeDasharray="7 5" />
      {Array.from({ length: 11 }, (_, i) => <Line key={i} x1={70 + i * step} y1={118} x2={70 + i * step} y2={i % 5 === 0 ? 130 : 124} stroke={ink} />)}
      <Rect x={x - 9} y={90} width={18} height={20} rx={4} fill="#C9D3D6" stroke={ink} strokeWidth={1.5} />
      {text(`${au} AU`, x, 80)}
      {seen ? text(q.outcomes[seen.outcome].replace("minutes", "min"), 205, 170) : unknown(205, 165)}
    </>;
  } else if (topic === "tilt") {
    const t = at(0), lean = at(1), deg = tilts[t] * (lean === 0 ? -1 : 1);
    const season = seen ? seasonAt(t, lean) : null;
    body = <>
      <SkySun x={46} y={100} r={22} />
      {[78, 100, 122].map((y) => <Line key={y} x1={84} y1={y} x2={170} y2={y} stroke={gold} strokeWidth={3} />)}
      <EarthGlobe x={250} y={100} r={56} />
      <G rotation={deg} origin="250,100">
        <Line x1={250} y1={36} x2={250} y2={164} stroke={ink} strokeWidth={4} />
        {text("N", 250, 30)}
        {season !== null && <Path d="M194 100A56 56 0 0 1 306 100Z" fill={season === 0 ? gold : season === 1 ? night : soft} opacity={0.45} />}
      </G>
      {text(`${tilts[t]}°`, 322, 196)}
    </>;
  } else {
    // The Moon's path is always drawn tilted. "Crosses the line" puts the Moon on the Sun–Earth line where its path
    // crosses it; "Passes above or below" puts it above the line this month.
    const place = read.place(0), path = read.path(1), result = seen ? eclipseAt(place, path) : null;
    const earthX = place === 0 ? 290 : 200, moonX = place === 0 ? 190 : place === 1 ? 300 : 200;
    const moonY = place === 2 ? 158 : path === 1 ? 64 : 100;
    body = <>
      <SkySun x={40} y={100} r={22} />
      <Line x1={70} y1={100} x2={345} y2={100} stroke={gold} strokeDasharray="2 6" strokeWidth={2} />
      {place !== 2 && <Line x1={moonX - 46} y1={moonY + 14} x2={moonX + 46} y2={moonY - 14} stroke="#8E9FB6" strokeDasharray="5 4" strokeWidth={2} />}
      {result === 0 && <Path d={`M${moonX} 92L${earthX - 26} 82L${earthX - 26} 118L${moonX} 108Z`} fill={night} opacity={0.4} />}
      {result === 1 && <Path d={`M${earthX} 82L${moonX} 88L${moonX} 112L${earthX} 118Z`} fill={night} opacity={0.4} />}
      <EarthGlobe x={earthX} y={100} r={26} />
      <MoonDisc x={moonX} y={moonY} r={11} phase={result === 1 ? 0 : 4} />
      {result !== null ? text(eclipses[result], 205, 34) : unknown(60, 168)}
    </>;
  }
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} accessible accessibilityLabel={describeSetup(q, settings, seen)}>
      <Rect width={VIEW.width} height={VIEW.height} rx={18} fill="#1F3550" opacity={0.06} />
      {body}
    </Svg>
  );
}

/** Words that would not fit inside the drawing at the label floor. They name only what the drawing already shows. */
export function stationLegend({ q, settings, seen }: { q: Investigation; settings: readonly number[]; seen: Observation | null }): string[] {
  const read = reader(q, settings), topic = q.key.split("-")[0];
  if (topic === "day") return seen ? [`Island: ${sky[skyAt(settings[0] ?? q.start[0])].toLowerCase()}`] : [];
  if (topic === "moon") return ["Right: the view from Earth"];
  if (q.key === "gravity-c") return ["Left: the mystery world"];
  if (topic === "tilt") return seen ? [`North: ${seasons[seasonAt(settings[0] ?? q.start[0], settings[1] ?? q.start[1])].replace("Northern ", "").toLowerCase()}`] : [];
  if (topic === "eclipse") return [read.place(0) === 2 ? "Moon off to the side" : `Path ${read.path(1) === 1 ? "passes above the line" : "crosses the line here"}`];
  return [];
}
