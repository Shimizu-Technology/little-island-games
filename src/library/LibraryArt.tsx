import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Motif } from "../explore/ExploreArt";
/** Original static vectors; no external media, filters, timers or moving backgrounds. */
export function LibraryArt({ kind = "turtle", dive = false }: { kind?: string; dive?: boolean }) {
  if (!["turtle", "heart", "gear"].includes(kind))
    return (
      <Svg width="100%" height="100%" viewBox="0 0 120 110" accessible={false}>
        <Motif name={kind === "cloud" ? "rain" : kind === "plant" ? "seagrass" : kind} />
      </Svg>
    );
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 220" accessible={false}>
      <Rect width={360} height={220} rx={28} fill="#DDEFE7" />
      <Circle cx={295} cy={42} r={24} fill="#F3D78D" />
      <Path d="M0 87Q40 77 80 87T160 87T240 87T320 87T400 87V220H0Z" fill="#A6D5CB" />
      <Path d="M0 92Q40 82 80 92T160 92T240 92T320 92T400 92" fill="none" stroke="#FFF8E7" strokeWidth={5} />
      {kind === "heart" ? (
        <Path
          d="M180 164C115 123 117 69 153 72Q174 72 180 91Q196 64 218 78C258 104 225 143 180 164Z"
          fill="#D58A77"
          stroke="#354E49"
          strokeWidth={3}
        />
      ) : kind === "gear" ? (
        <G stroke="#354E49" strokeWidth={5}>
          <Circle cx={180} cy={114} r={47} fill="#E6C47E" />
          <Circle cx={180} cy={114} r={18} fill="#FFF6DD" />
          {[0, 45, 90, 135].map((a) => (
            <Path key={a} d="M180 50V65M180 163V178" rotation={a} origin="180,114" />
          ))}
        </G>
      ) : (
        <G transform={`translate(0 ${dive ? 45 : 0})`} stroke="#354E49" strokeWidth={3} strokeLinejoin="round">
          <Path d="M114 127Q67 137 64 165Q88 165 135 145M192 133Q217 160 246 162Q244 136 212 119" fill="#6D9B7A" />
          <Path d="M108 121Q64 110 60 102Q86 91 120 102" fill="#77A785" />
          <Path d="M198 110Q238 85 251 77Q268 72 278 83Q283 94 272 101L228 133" fill="#84AB7F" />
          <Ellipse cx={158} cy={116} rx={65} ry={42} fill="#7F9E66" />
          <Path
            d="M158 77L184 96L184 124L156 150L129 130L128 101ZM96 115L128 101M184 96L210 98M184 124L215 131M129 130L114 146"
            fill="none"
            stroke="#D5D6A0"
          />
          <Circle cx={268} cy={85} r={2.5} fill="#354E49" stroke="none" />
        </G>
      )}
      <Path
        d="M24 218Q37 176 27 160M33 196L45 179M307 219Q295 189 311 166M309 191L325 178"
        fill="none"
        stroke="#689F8C"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Ellipse cx={172} cy={204} rx={84} ry={6} fill="#6EAA9A" opacity={0.25} />
    </Svg>
  );
}
