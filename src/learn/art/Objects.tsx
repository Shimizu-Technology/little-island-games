import React from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import type { ReadingScene } from "../kit/reading";
import { sceneLabel } from "../kit/reading";

export const objectNames = [
  "shop",
  "chip",
  "back",
  "cape",
  "tape",
  "cat",
  "dog",
  "fox",
  "pig",
  "hen",
  "crab",
  "fish",
  "turtle",
  "bird",
  "box",
  "bus",
  "hat",
  "mat",
  "cup",
  "sun",
  "moon",
  "bed",
  "rug",
  "mug",
  "pot",
  "mango",
  "shell",
  "boat",
  "ship",
  "net",
  "jet",
  "van",
  "tree",
  "rock",
  "hut",
  "dish",
  "bell",
  "frog",
  "duck",
  "cake",
  "kite",
  "bike",
  "rope",
  "coat",
  "sheep",
  "star",
  "car",
  "fork",
  "bug",
  "cub",
  "rat",
  "toad",
  "seal",
  "bee",
  "log",
  "tub",
  "pond",
  "sand",
  "ring",
  "nest",
  "road",
  "rain",
  "leaf",
  "seed",
  "boot",
  "jar",
  "rose",
  "person",
  "goat",
  "moth",
] as const;
export type ObjectName = (typeof objectNames)[number];
const ink = "#183F39";
const colors: Record<string, string> = {
  coral: "#D68A6B",
  red: "#C56D50",
  blue: "#5B9ABA",
  green: "#79AB80",
  gold: "#E1B251",
};
const animals = [
  "cat",
  "dog",
  "fox",
  "pig",
  "hen",
  "fish",
  "bird",
  "frog",
  "duck",
  "sheep",
  "bug",
  "cub",
  "rat",
  "toad",
  "seal",
  "bee",
  "goat",
  "moth",
];
/** Original flat SVG vocabulary. Coordinates are local to 0–100; callers can compose scenes. */
export function ObjectGlyph({
  name,
  color = "coral",
  x = 0,
  y = 0,
  size = 100,
}: {
  name: string;
  color?: string;
  x?: number;
  y?: number;
  size?: number;
}) {
  const fill = colors[color] ?? color;
  let shape: React.ReactNode;
  if (animals.includes(name)) {
    const wings = ["hen", "bird", "duck", "bee", "bug", "moth"].includes(name);
    const fish = name === "fish" || name === "seal";
    shape = (
      <>
        {name === "fish" ? (
          <Polygon points="17,50 3,30 3,74" fill={fill} />
        ) : name === "seal" ? (
          <Ellipse cx="18" cy="72" rx="15" ry="8" fill={fill} />
        ) : (
          <Path d="M22 60 Q3 38 12 32" fill="none" />
        )}
        {wings && (
          <>
            <Ellipse cx="38" cy="30" rx="15" ry="19" fill="#F9EDC9" />
            <Ellipse cx="62" cy="30" rx="15" ry="19" fill="#F9EDC9" />
          </>
        )}
        <Ellipse cx="47" cy="61" rx={name === "sheep" ? 34 : 29} ry="24" fill={name === "sheep" ? "#FCFAF4" : fill} />
        {!fish && (
          <>
            <Ellipse cx="29" cy="84" rx="11" ry="5" fill={fill} />
            <Ellipse cx="66" cy="84" rx="11" ry="5" fill={fill} />
          </>
        )}
        {["cat", "fox", "dog"].includes(name) && (
          <>
            <Polygon points="49,33 49,8 64,25" fill={fill} />
            <Polygon points="70,24 85,8 85,40" fill={fill} />
          </>
        )}
        {(name === "rat" || name === "cub") && (
          <>
            <Circle cx="50" cy="20" r="12" fill={fill} />
            <Circle cx="82" cy="20" r="12" fill={fill} />
          </>
        )}
        <Circle cx="66" cy="44" r="23" fill={fill} />
        {name === "fox" && (
          <>
            <Path d="M45 45 L65 53 L86 44 Q81 66 66 67 Q51 66 45 45 Z" fill="#FCFAF4" />
            <Path d="M19 50 Q-1 47 4 70 L20 76 Z" fill={fill} />
            <Path d="M4 62 L13 70 L8 73 L3 69 Z" fill="#FCFAF4" />
          </>
        )}
        {name === "cat" && <Path d="M48 48 L37 45 M48 53 L36 54 M82 48 L94 45 M82 53 L94 56" fill="none" />}
        {name === "seal" && (
          <>
            <Ellipse cx="35" cy="83" rx="15" ry="6" fill={fill} />
            <Ellipse cx="71" cy="81" rx="13" ry="7" fill={fill} />
            <Path d="M53 49 L42 45 M53 54 L41 55 M78 49 L91 45 M78 54 L92 55" fill="none" />
            <Ellipse cx="67" cy="47" rx="4" ry="3" fill={ink} />
          </>
        )}
        {name === "goat" && (
          <>
            <Path d="M54 22 Q40 2 52 5 M75 22 Q90 1 80 6" fill="none" />
            <Path d="M65 65 L69 78 L74 64" fill="#F9EDC9" />
          </>
        )}
        {name === "moth" && (
          <>
            <Circle cx="35" cy="30" r="6" fill="#E1B251" />
            <Circle cx="65" cy="30" r="6" fill="#E1B251" />
          </>
        )}
        {name === "toad" && (
          <>
            <Circle cx="32" cy="55" r="3" fill="#F9EDC9" />
            <Circle cx="43" cy="67" r="3" fill="#F9EDC9" />
            <Circle cx="26" cy="70" r="3" fill="#F9EDC9" />
          </>
        )}
        {name === "dog" && <Ellipse cx="85" cy="36" rx="8" ry="19" fill="#986C4E" />}
        {(name === "frog" || name === "toad") && (
          <>
            <Circle cx="54" cy="23" r="9" fill={fill} />
            <Circle cx="77" cy="23" r="9" fill={fill} />
          </>
        )}
        {name === "hen" && <Path d="M58 22 Q52 4 63 10 Q71 0 74 18" fill="#C56D50" />}
        {["bird", "hen"].includes(name) && <Path d="M84 42 L99 48 L84 54 Z" fill="#E1B251" />}
        {name === "duck" && <Path d="M83 43 Q99 40 99 48 Q98 56 83 53 Z" fill="#E1B251" />}
        {name === "pig" && (
          <>
            {/* Floppy ears, a round snout with nostrils and a curly tail: clearly not a cat. */}
            <Path d="M50 30 Q46 12 60 22 Q58 30 50 30 Z" fill={fill} />
            <Path d="M80 22 Q94 12 90 30 Q82 30 80 22 Z" fill={fill} />
            <Ellipse cx="77" cy="52" rx="12" ry="9" fill="#F7C6B2" />
            <Ellipse cx="73" cy="52" rx="2.2" ry="3" fill={ink} />
            <Ellipse cx="81" cy="52" rx="2.2" ry="3" fill={ink} />
            <Path d="M19 56 q-9 -3 -6 -10 q4 -5 7 0 q2 5 -5 6" fill="none" />
          </>
        )}
        {name === "bee" && (
          <>
            <Line x1="29" y1="43" x2="29" y2="79" />
            <Line x1="43" y1="40" x2="43" y2="83" />
          </>
        )}
        <Circle cx="61" cy="40" r="2.5" fill={ink} stroke="none" />
        <Circle cx="76" cy="40" r="2.5" fill={ink} stroke="none" />
        <Path d="M62 54 Q68 60 74 54" fill="none" />
      </>
    );
  } else
    switch (name) {
      case "turtle":
        shape = (
          <>
            <Ellipse cx="48" cy="83" rx="30" ry="6" fill="#79AB80" />
            <Ellipse cx="43" cy="57" rx="34" ry="27" fill="#79AB80" />
            <Path d="M43 32 L27 54 L43 76 L60 55 Z" fill="#E1B251" />
            <Circle cx="82" cy="61" r="15" fill="#93BB88" />
            <Circle cx="87" cy="57" r="2" fill={ink} />
          </>
        );
        break;
      case "crab":
        shape = (
          <>
            <Path d="M20 66 L5 77 M25 75 L16 90 M75 66 L95 77 M70 75 L82 90 M23 52 L12 33 M77 52 L88 33" />
            <Ellipse cx="50" cy="62" rx="32" ry="22" fill={fill} />
            <Path
              d="M12 36 Q-3 18 7 14 L16 25 L22 11 Q35 28 12 36 M88 36 Q66 28 78 11 L84 25 L93 14 Q104 18 88 36"
              fill={fill}
            />
            <Circle cx="39" cy="41" r="7" fill="#FCFAF4" />
            <Circle cx="61" cy="41" r="7" fill="#FCFAF4" />
            <Circle cx="39" cy="40" r="2" fill={ink} />
            <Circle cx="61" cy="40" r="2" fill={ink} />
            <Path d="M40 67 Q50 75 60 67" fill="none" />
          </>
        );
        break;
      case "boat":
      case "ship":
        shape = (
          <>
            <Path d="M7 64 L94 64 L77 88 L26 88 Z" fill={fill} />
            <Path d="M49 64 L49 10 L83 53 L49 53" fill="#FCFAF4" />
            {name === "ship" && <Rect x="17" y="48" width="24" height="16" rx="3" fill="#E1B251" />}
            <Path d="M5 94 Q25 85 45 94 T95 94" fill="none" stroke="#5B9ABA" />
          </>
        );
        break;
      case "shop":
        shape = (
          <>
            <Rect x="16" y="35" width="68" height="54" rx="3" fill="#E6D3AC" />
            <Rect x="26" y="51" width="26" height="24" fill="#D9EDF0" />
            <Rect x="61" y="53" width="16" height="36" fill="#B8875C" />
            <Path d="M11 37 L20 16 L80 16 L89 37 Z" fill={fill} />
            <Path
              d="M29 17 L26 37 M46 17 L45 37 M63 17 L65 37 M80 17 L85 37"
              fill="none"
              stroke="#FCFAF4"
              strokeWidth="7"
            />
            <Path d="M11 37 L89 37" />
          </>
        );
        break;
      case "chip":
        shape = (
          <>
            <Ellipse cx="50" cy="80" rx="42" ry="12" fill="#FCFAF4" />
            <Path d="M17 52 Q30 15 61 30 Q87 30 80 64 Q66 84 39 72 Q16 74 17 52 Z" fill="#E1B251" />
            <Path d="M28 50 Q47 33 68 44 M29 60 Q48 42 70 54" fill="none" stroke="#B8875C" />
          </>
        );
        break;
      case "back":
        shape = (
          <>
            <Circle cx="50" cy="23" r="17" fill="#B8875C" />
            <Path d="M29 50 Q50 34 71 50 L80 75 L63 75 L62 95 L38 95 L37 75 L20 75 Z" fill={fill} />
            <Path d="M50 48 L50 78" fill="none" />
            <Path d="M93 63 L67 63 M74 55 L66 63 L74 71" fill="none" stroke="#386C9A" strokeWidth="4" />
          </>
        );
        break;
      case "cape":
        shape = (
          <>
            <Path d="M35 16 Q50 27 65 16 L91 88 Q70 82 50 93 Q30 82 9 88 Z" fill={fill} />
            <Path d="M35 16 Q50 3 65 16 M50 23 L42 36 M50 23 L58 36" fill="none" />
            <Path d="M35 39 L27 77 M65 39 L73 77" fill="none" stroke="#FCFAF4" />
          </>
        );
        break;
      case "tape":
        shape = (
          <>
            <Circle cx="45" cy="49" r="34" fill="#E1B251" />
            <Circle cx="45" cy="49" r="19" fill="#FCFAF4" />
            <Path d="M65 21 Q88 37 78 61 L69 84 L93 84 L93 94 L55 94 L67 61" fill="#E6D3AC" />
          </>
        );
        break;
      case "box":
        shape = (
          <>
            <Rect x="12" y="27" width="76" height="62" rx="5" fill="#D7B482" />
            <Path d="M12 27 L29 11 L75 11 L88 27 M50 28 L50 88" fill="none" />
          </>
        );
        break;
      case "bus":
      case "van":
      case "car":
        shape = (
          <>
            <Rect x="8" y={name === "car" ? 43 : 24} width="84" height={name === "car" ? 33 : 52} rx="12" fill={fill} />
            <Rect x="20" y="31" width="24" height="23" rx="4" fill="#D9EDF0" />
            <Rect x="50" y="31" width="25" height="23" rx="4" fill="#D9EDF0" />
            <Circle cx="26" cy="79" r="10" fill={ink} />
            <Circle cx="76" cy="79" r="10" fill={ink} />
          </>
        );
        break;
      case "hat":
        shape = (
          <>
            <Ellipse cx="50" cy="73" rx="43" ry="11" fill={fill} />
            <Path d="M22 70 L31 21 L70 21 L78 70 Z" fill={fill} />
            <Path d="M27 52 L74 52" />
          </>
        );
        break;
      case "mat":
      case "rug":
      case "road":
        shape = (
          <>
            <Ellipse cx="50" cy="66" rx="44" ry="24" fill={name === "road" ? "#B5B8AD" : fill} />
            <Path d="M20 60 L78 60 M22 72 L75 72" stroke="#F9EDC9" />
          </>
        );
        break;
      case "cup":
      case "mug":
      case "pot":
      case "tub":
      case "jar":
        shape = (
          <>
            <Path d="M77 40 C108 23 103 78 76 65" fill="none" />
            <Path d="M17 27 L81 27 L75 83 Q49 96 24 83 Z" fill={fill} />
            <Ellipse cx="49" cy="27" rx="32" ry="9" fill="#F9EDC9" />
            {name === "pot" && <Path d="M11 19 L87 19 M40 11 L58 11" />}
          </>
        );
        break;
      case "sun":
      case "moon":
      case "ring":
        shape = (
          <>
            {name === "sun" && (
              <Path d="M50 2 L50 14 M50 86 L50 98 M2 50 L14 50 M86 50 L98 50 M15 15 L24 24 M76 76 L85 85 M15 85 L24 76 M76 24 L85 15" />
            )}
            <Circle cx="50" cy="50" r="32" fill="#E1B251" />
            {name === "moon" && <Circle cx="68" cy="32" r="27" fill="#E3EEF8" stroke="none" />}
            {name === "ring" && <Circle cx="50" cy="50" r="21" fill="#FCFAF4" />}
          </>
        );
        break;
      case "bed":
        shape = (
          <>
            <Rect x="10" y="50" width="82" height="29" rx="6" fill={fill} />
            <Rect x="14" y="35" width="28" height="23" rx="7" fill="#FCFAF4" />
            <Path d="M8 28 L8 94 M92 44 L92 94" />
          </>
        );
        break;
      case "rose":
        shape = (
          <>
            <Path d="M50 85 L50 37 M50 70 Q25 50 24 67 Q35 82 50 75 M50 61 Q75 43 78 59 Q68 75 50 70" fill="#79AB80" />
            <Circle cx="50" cy="29" r="23" fill="#C56D50" />
            <Path d="M39 21 Q62 8 65 30 Q59 47 41 39 Q30 29 47 23 Q59 23 55 33 Q47 39 44 31" fill="none" />
          </>
        );
        break;
      case "mango":
      case "leaf":
      case "seed":
        shape = (
          <>
            <Path d="M55 16 Q99 38 72 78 Q37 108 19 69 Q6 29 55 16Z" fill={name === "leaf" ? "#79AB80" : "#E1B251"} />
            <Path d="M50 18 Q54 3 74 5 Q73 23 50 18" fill="#79AB80" />
          </>
        );
        break;
      case "shell":
      case "dish":
      case "nest":
        shape = (
          <>
            <Path d="M10 60 Q8 8 50 16 Q94 7 90 60 L64 85 L36 85 Z" fill={name === "nest" ? "#D7B482" : "#F4B59A"} />
            <Path d="M50 80 L28 32 M50 80 L50 24 M50 80 L74 32" fill="none" />
          </>
        );
        break;
      case "net":
        shape = (
          <>
            <Circle cx="45" cy="38" r="31" fill="#D9EDF0" />
            <Path
              d="M22 18 L67 58 M14 36 L54 68 M30 10 L74 44 M22 58 L65 16 M14 40 L46 8 M38 67 L75 29 M66 65 L89 95"
              fill="none"
            />
          </>
        );
        break;
      case "jet":
        shape = (
          <Path
            d="M50 7 L59 43 L92 64 L92 73 L58 65 L56 84 L67 93 L33 93 L44 84 L42 65 L8 73 L8 64 L41 43 Z"
            fill={fill}
          />
        );
        break;
      case "tree":
        shape = (
          <>
            <Rect x="44" y="48" width="13" height="44" rx="3" fill="#B8875C" />
            <Circle cx="32" cy="37" r="25" fill="#79AB80" />
            <Circle cx="66" cy="35" r="27" fill="#79AB80" />
            <Circle cx="49" cy="22" r="19" fill="#79AB80" />
          </>
        );
        break;
      case "rock":
      case "sand":
      case "log":
      case "pond":
        shape = (
          <>
            <Path
              d="M8 74 L20 42 L43 31 L73 38 L92 75 L77 89 L25 88 Z"
              fill={name === "pond" ? "#91C6D3" : name === "sand" ? "#E6D3AC" : name === "log" ? "#B8875C" : "#B3BBAF"}
            />
            <Path d="M24 64 L45 54 L69 66" fill="none" />
          </>
        );
        break;
      case "hut":
        shape = (
          <>
            <Rect x="22" y="43" width="58" height="47" rx="3" fill="#E6D3AC" />
            <Path d="M8 47 L50 9 L93 47 Z" fill={fill} />
            <Rect x="42" y="61" width="19" height="29" fill="#B8875C" />
          </>
        );
        break;
      case "bell":
        shape = (
          <>
            <Path d="M19 73 Q30 66 29 37 Q50 -1 71 37 Q70 66 81 73 Z" fill="#E1B251" />
            <Circle cx="50" cy="81" r="9" fill="#E1B251" />
          </>
        );
        break;
      case "cake":
        shape = (
          <>
            <Rect x="15" y="39" width="70" height="48" rx="8" fill={fill} />
            <Path d="M15 45 Q23 68 32 47 Q41 68 50 47 Q59 68 68 47 Q77 68 85 45" fill="#FCFAF4" />
            <Path d="M50 39 L50 17" />
            <Path d="M50 17 Q35 6 50 1 Q64 7 50 17" fill="#E1B251" />
          </>
        );
        break;
      case "kite":
        shape = (
          <>
            <Path d="M50 5 L81 38 L50 74 L18 38 Z" fill={fill} />
            <Path d="M50 5 L50 74 M18 38 L81 38 M50 74 Q20 81 49 96" fill="none" />
          </>
        );
        break;
      case "bike":
        shape = (
          <>
            <Circle cx="25" cy="72" r="21" fill="none" />
            <Circle cx="78" cy="72" r="21" fill="none" />
            <Path
              d="M25 72 L42 36 L58 72 L25 72 L61 42 L78 72 M34 33 L48 33 M62 42 L67 21 L79 21"
              fill="none"
              stroke={fill}
              strokeWidth="5"
            />
          </>
        );
        break;
      case "rope":
        shape = (
          <Path
            d="M22 82 C92 102 94 9 50 20 C3 30 28 82 62 63 C91 40 37 27 41 52"
            fill="none"
            stroke="#B8875C"
            strokeWidth="8"
          />
        );
        break;
      case "coat":
        shape = (
          <>
            <Path
              d="M32 16 L15 29 L3 59 L21 65 L28 49 L25 91 L75 91 L72 49 L79 65 L97 59 L85 29 L68 16 L50 26 Z"
              fill={fill}
            />
            <Line x1="50" y1="26" x2="50" y2="91" />
          </>
        );
        break;
      case "star":
        shape = <Polygon points="50,5 63,34 96,38 71,59 79,92 50,75 21,92 29,59 4,38 37,34" fill="#E1B251" />;
        break;
      case "fork":
        shape = <Path d="M35 8 L35 37 Q50 58 65 37 L65 8 M50 8 L50 94" fill="none" strokeWidth="7" />;
        break;
      case "rain":
        shape = (
          <>
            <Ellipse cx="50" cy="30" rx="41" ry="22" fill="#91C6D3" />
            <Path d="M26 62 L19 81 M51 59 L44 78 M76 62 L69 81" stroke="#5B9ABA" strokeWidth="7" />
          </>
        );
        break;
      case "boot":
        shape = <Path d="M31 10 L66 10 L65 58 Q95 56 94 84 L29 89 Z" fill={fill} />;
        break;
      case "person":
        shape = (
          <>
            <Circle cx="50" cy="23" r="17" fill="#D7A27B" />
            <Path d="M29 50 Q50 34 71 50 L80 75 L63 75 L62 95 L38 95 L37 75 L20 75 Z" fill={fill} />
          </>
        );
        break;
      default:
        shape = (
          <>
            <Ellipse cx="50" cy="66" rx="38" ry="21" fill="#D7B482" />
            <Path d="M21 59 L77 59 M23 70 L74 70" />
          </>
        );
    }
  return (
    <G
      transform={`translate(${x} ${y}) scale(${size / 100})`}
      stroke={ink}
      strokeWidth="2.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {shape}
    </G>
  );
}
export function PictureObject({ name, size = 100, color = "coral" }: { name: string; size?: number; color?: string }) {
  return (
    <View accessible accessibilityLabel={name}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <ObjectGlyph name={name} color={color} />
      </Svg>
    </View>
  );
}
export function Scene({ scene, width = 180, height = 124 }: { scene: ReadingScene; width?: number; height?: number }) {
  const small = scene.size === "little",
    s = small ? 39 : 61;
  const objectY = scene.relation === "under" ? 0 : scene.relation === "on" ? 65 : 43;
  const subjectY = scene.relation === "on" ? 8 : scene.relation === "under" ? 62 : 42;
  return (
    <View accessible accessibilityLabel={sceneLabel(scene)}>
      <Svg width={width} height={height} viewBox="0 0 180 140">
        <Rect width="180" height="140" rx="16" fill="#FCFAF4" />
        <Ellipse cx="91" cy="124" rx="78" ry="9" fill="#E5EFE5" />
        <ObjectGlyph
          name={scene.object}
          x={scene.relation === "beside" ? 98 : 49}
          y={objectY}
          size={scene.relation === "under" ? 62 : 82}
          color="gold"
        />
        <ObjectGlyph
          name={scene.subject}
          x={scene.relation === "beside" ? 13 : 89 - s / 2}
          y={subjectY}
          size={s}
          color={scene.color}
        />
        {scene.relation === "in" && (
          <>
            <Path
              d="M52 87 L128 87 L123 119 L58 119 Z"
              fill={
                scene.object === "pond" || scene.object === "sea" || scene.object === "pool"
                  ? "#91C6D3"
                  : scene.object === "bed"
                    ? "#E1B251"
                    : "#D7B482"
              }
              stroke={ink}
              strokeWidth="2.5"
            />
            <Path d="M63 97 L117 97" stroke="#B8875C" strokeWidth="3" />
          </>
        )}
      </Svg>
    </View>
  );
}
