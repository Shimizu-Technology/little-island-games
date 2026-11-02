import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Palm } from "../hub/Terrain";
import { Motif } from "../explore/ExploreArt";
/** Original static scenes in the hub's ink, lagoon, sand and leaf palette. */
export function LibraryArt({ kind = "turtle", dive = false }: { kind?: string; dive?: boolean }) {
  const night = kind === "moon" || kind === "stars";
  const ocean = kind === "turtle" || kind === "coral";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice" accessible={false}>
      <Rect
        width={360}
        height={220}
        fill={night ? "#CED2E4" : ocean ? "#DDEFE7" : kind === "heart" ? "#F0DBCE" : "#E4EACB"}
      />
      <Circle cx={295} cy={42} r={24} fill={night ? "#FFF4C7" : "#F3D78D"} />
      <Path
        d={
          ocean
            ? "M0 87Q40 77 80 87T160 87T240 87T320 87T400 87V220H0Z"
            : "M0 168Q60 128 126 163T255 154T380 170V220H0Z"
        }
        fill={night ? "#A9B9CD" : ocean ? "#A6D5CB" : "#BCCEA4"}
      />
      <Path
        d={ocean ? "M0 92Q40 82 80 92T160 92T240 92T320 92T400 92" : "M0 197Q85 167 170 193T360 184V220H0Z"}
        fill={ocean ? "none" : night ? "#8CA4B7" : "#9EBD9D"}
        stroke={ocean ? "#FFF8E7" : "none"}
        strokeWidth={5}
      />
      {kind === "turtle" ? (
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
      ) : (
        <G transform="translate(104 22) scale(1.28)">
          {kind === "heart" ? (
            <Path
              d="M60 106C-4 68 3 22 34 26Q52 26 60 43Q75 17 94 31C128 54 101 85 60 106Z"
              fill="#D38F78"
              stroke="#354E49"
              strokeWidth={2.5}
            />
          ) : kind === "gear" ? (
            <G stroke="#354E49" strokeWidth={3}>
              <Circle cx={60} cy={65} r={34} fill="#E6C47E" />
              <Circle cx={60} cy={65} r={13} fill="#FFF6DD" />
              {[0, 45, 90, 135].map((angle) => (
                <Path key={angle} d="M60 20v12M60 98v12" rotation={angle} origin="60,65" />
              ))}
            </G>
          ) : (
            <Motif name={kind === "cloud" ? "rain" : kind === "plant" ? "seagrass" : kind} />
          )}
        </G>
      )}
      {!night && (
        <Path
          d="M24 218Q37 176 27 160M33 196L45 179M307 219Q295 189 311 166M309 191L325 178"
          fill="none"
          stroke="#689F8C"
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}
      {!night && !ocean && kind !== "heart" && kind !== "gear" && (
        <G transform="translate(29 192) scale(.5)">
          <Palm />
        </G>
      )}
      {ocean && (
        <G stroke="#9B6C56" strokeWidth={3.5} strokeLinecap="round" fill="none">
          <Path d="M25 220v-28m0 16-10-8v-9m10 10 10-8v-9M320 220v-24m0 12-9-7m9 0 10-8" />
        </G>
      )}
      {night &&
        [
          [24, 35],
          [70, 70],
          [319, 118],
          [253, 29],
        ].map(([x, y], i) => <Path key={i} d={`M${x - 4} ${y}h8M${x} ${y - 4}v8`} stroke="#FFF4C7" strokeWidth={2} />)}
      <Ellipse cx={172} cy={204} rx={84} ry={6} fill="#6EAA9A" opacity={0.25} />
    </Svg>
  );
}
