import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { Palm } from "../hub/Terrain";

export const sceneColors: Record<string, string> = {
  ocean: "#A9D6D1",
  guam: "#D8DFB5",
  animals: "#D1DFAF",
  space: "#C7D2DE",
  weather: "#C2DFE3",
  body: "#F0D8C8",
  machines: "#E9D7AC",
  plants: "#D1DFAF",
  shore: "#C2DFE3",
};
/** Quiet edge scenery leaves the reviewed subject and its diagram marks unobstructed. */
export function SceneBackdrop({ category, sun = true, cloud = true }: { category: string; sun?: boolean; cloud?: boolean }) {
  const sea = category === "ocean";
  const green = category === "plants" || category === "animals" || category === "guam";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" accessible={false}>
      <Rect width={400} height={400} fill={sceneColors[category] ?? "#DCE9D8"} />
      {category === "space" ? (
        <>
          {[
            [22, 54],
            [78, 27],
            [340, 38],
            [375, 126],
            [31, 248],
            [321, 302],
            [94, 356],
            [370, 367],
          ].map(([x, y], i) => (
            <G key={i} fill="#47617C">
              <Circle cx={x} cy={y} r={i % 3 === 0 ? 3 : 1.7} />
              <Path d={`M${x - 5} ${y}h10M${x} ${y - 5}v10`} stroke="#47617C" strokeWidth={1} />
            </G>
          ))}
          <Path d="M0 382Q80 339 154 374T400 365V400H0Z" fill="#50647D" />
        </>
      ) : sea ? (
        <>
          <Path
            d="M0 58Q50 44 100 58T200 58T300 58T400 58M0 70Q50 56 100 70T200 70T300 70T400 70"
            fill="none"
            stroke="#EAF4DE"
            strokeWidth={3}
          />
          <Path d="M0 350Q100 326 195 359T400 348V400H0Z" fill="#EBD6A6" />
          <Path
            d="M15 390Q37 346 20 305M31 358l22-32M370 397Q348 348 374 315M365 355l-20-17"
            stroke="#689782"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          {[0, 1, 2].map((i) => (
            <Circle key={i} cx={35 + i * 8} cy={140 - i * 22} r={4 + i} stroke="#EAF4DE" strokeWidth={2} fill="none" />
          ))}

        </>
      ) : green ? (
        <>
          <Circle cx={349} cy={48} r={26} fill="#F0CF7C" />
          <Path d="M0 325Q82 274 179 333T400 308V400H0Z" fill="#A8C493" />
          <Path d="M0 373Q110 330 210 370T400 352V400H0Z" fill="#85AA7D" />
          <G transform="translate(36 341) scale(.8)">
            <Palm />
          </G>
          <Path
            d="M358 400V320m0 36q-39-6-27-31 30 4 27 31m0-12q35-14 28-35-29 4-28 35"
            fill="#6B9C73"
            stroke="#476E59"
            strokeWidth={2.5}
          />
        </>
      ) : category === "shore" ? (
        <>
          <Circle cx={349} cy={48} r={24} fill="#F0CF7C" />
          <Path d="M0 300Q100 292 200 300T400 298V400H0Z" fill="#93C9C8" />
          <Path d="M24 322q14-6 28 0M300 316q14-6 28 0" stroke="#EAF4DE" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M0 362Q100 340 205 360T400 352V400H0Z" fill="#EBD6A6" />
        </>
      ) : category === "weather" ? (
        <>
          {sun && <Circle cx={44} cy={49} r={24} fill="#F0CF7C" />}
          {cloud && <Path d="M268 42q-3-24 23-20 16-24 34-5 33-8 34 24Z" fill="#F9F5E4" stroke="#769B9A" strokeWidth={2} />}
          <Path d="M0 370 87 301 149 350 250 288 400 367V400H0Z" fill="#9EBB9D" />
          <Path d="m217 311 33-23 34 23-22-4-14 5-12-8Z" fill="#F7F2DE" />
        </>
      ) : (
        <>
          <Path d="M0 347H400V400H0Z" fill={category === "body" ? "#D9B89C" : "#BC9A69"} />
          <Path d="M0 347H400M0 359H400" stroke="#8E8D6E" strokeWidth={2} opacity={0.5} />
          {category === "machines" ? (
            <G stroke="#9A976E" strokeWidth={3} fill="none">
              <Path d="M27 0v88h46M360 0v100h-25" />
              <Circle cx={73} cy={88} r={9} />
              <Circle cx={335} cy={100} r={9} />
            </G>
          ) : (
            <G fill="#FFF4DA" opacity={0.7}>
              <Circle cx={32} cy={57} r={11} />
              <Circle cx={363} cy={99} r={17} />
              <Circle cx={344} cy={28} r={6} />
            </G>
          )}
        </>
      )}
    </Svg>
  );
}
