import React from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { DiscoveryLabId } from "./types";

const LAB_COVER_SVG: Record<DiscoveryLabId, string> = {
  "color-light-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="200" fill="#FCEBD6"/>
    <circle cx="58" cy="46" r="52" fill="#F9D5A7" opacity="0.65"/>
    <circle cx="308" cy="48" r="60" fill="#CFE9E4" opacity="0.75"/>
    <path d="M180 76L238 92L360 36L360 56L238 98Z" fill="#E85A4F" opacity="0.85"/>
    <path d="M238 98L360 56L360 76L238 104Z" fill="#F29E38" opacity="0.85"/>
    <path d="M238 104L360 76L360 96L238 110Z" fill="#F5D342" opacity="0.85"/>
    <path d="M238 110L360 96L360 116L238 116Z" fill="#4CA66B" opacity="0.85"/>
    <path d="M238 116L360 116L360 136L238 122Z" fill="#3B82C4" opacity="0.85"/>
    <path d="M238 122L360 136L360 154L238 128Z" fill="#7D5BA6" opacity="0.85"/>
    <polygon points="236,52 278,136 194,136" fill="#FFFDF8" fill-opacity="0.86" stroke="#3D2B24" stroke-width="3"/>
    <line x1="236" y1="58" x2="252" y2="130" stroke="#B8E0DE" stroke-width="3"/>
    <ellipse cx="112" cy="146" rx="64" ry="22" fill="#3D2B24" opacity="0.14"/>
    <path d="M52 104Q56 160 112 160Q168 160 172 104Z" fill="#FFFDF8" stroke="#3D2B24" stroke-width="3"/>
    <ellipse cx="112" cy="104" rx="60" ry="18" fill="#F28444" stroke="#3D2B24" stroke-width="3"/>
    <ellipse cx="96" cy="102" rx="20" ry="7" fill="#F7C948" opacity="0.85"/>
    <ellipse cx="132" cy="107" rx="16" ry="6" fill="#3B8AC4" opacity="0.75"/>
    <path d="M84 44C76 56 72 62 72 68a12 12 0 0 0 24 0c0-6-4-12-12-24Z" fill="#E53935" stroke="#3D2B24" stroke-width="2.5"/>
    <path d="M122 30C115 41 111 46 111 52a11 11 0 0 0 22 0c0-6-4-11-11-22Z" fill="#F7C927" stroke="#3D2B24" stroke-width="2.5"/>
    <path d="M156 48C149 58 146 63 146 68a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#1E78D8" stroke="#3D2B24" stroke-width="2.5"/>
  </svg>`,
  "sound-rhythm-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="200" fill="#DFF1EC"/>
    <circle cx="304" cy="44" r="34" fill="#F6D788"/>
    <path d="M0 64 Q 30 22 60 64 T 120 64 T 180 64 T 240 64 T 300 64 T 360 64" fill="none" stroke="#1E6B66" stroke-width="5" stroke-linecap="round"/>
    <path d="M0 64 Q 30 40 60 64 T 120 64 T 180 64 T 240 64 T 300 64 T 360 64" fill="none" stroke="#E06D53" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/>
    <rect x="34" y="142" width="220" height="14" rx="7" fill="#A67449" stroke="#3D2B24" stroke-width="2.5"/>
    <rect x="46" y="90" width="26" height="72" rx="10" fill="#E05A47" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="59" cy="100" r="3" fill="#FFFDF8"/>
    <rect x="80" y="98" width="26" height="64" rx="10" fill="#EB8A3E" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="93" cy="108" r="3" fill="#FFFDF8"/>
    <rect x="114" y="104" width="26" height="58" rx="10" fill="#E8B93A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="127" cy="114" r="3" fill="#FFFDF8"/>
    <rect x="148" y="110" width="26" height="52" rx="10" fill="#4BA36E" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="161" cy="120" r="3" fill="#FFFDF8"/>
    <rect x="182" y="116" width="26" height="46" rx="10" fill="#2D8FA0" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="195" cy="126" r="3" fill="#FFFDF8"/>
    <rect x="216" y="122" width="26" height="40" rx="10" fill="#7A63B8" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="229" cy="132" r="3" fill="#FFFDF8"/>
    <path d="M276 112L332 112L322 174L286 174Z" fill="#B56E46" stroke="#3D2B24" stroke-width="3"/>
    <ellipse cx="304" cy="112" rx="28" ry="10" fill="#F8E4BC" stroke="#3D2B24" stroke-width="3"/>
    <path d="M284 128L304 148L324 128" fill="none" stroke="#FFF3D4" stroke-width="3"/>
  </svg>`,
  "volcano-island-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="110" fill="#F9E7C8"/>
    <circle cx="62" cy="42" r="24" fill="#F2C864"/>
    <rect y="108" width="360" height="92" fill="#6CB8BE"/>
    <rect y="154" width="360" height="46" fill="#367E9A"/>
    <circle cx="166" cy="38" r="16" fill="#FFFDF8" opacity="0.9"/>
    <circle cx="188" cy="30" r="20" fill="#FFFDF8" opacity="0.9"/>
    <circle cx="210" cy="40" r="14" fill="#FFFDF8" opacity="0.9"/>
    <path d="M84 196L158 64L202 64L276 196Z" fill="#63534A" stroke="#3D2B24" stroke-width="3"/>
    <path d="M168 196L174 72L186 72L192 196Z" fill="#E85A34"/>
    <path d="M160 66Q180 54 200 66L194 86Q180 76 168 92Z" fill="#F59E2D"/>
    <path d="M64 152Q82 134 104 148Q114 140 124 154H64Z" fill="#E67A68" stroke="#3D2B24" stroke-width="2"/>
    <path d="M240 154Q258 134 278 148Q294 138 308 154H240Z" fill="#E6A94C" stroke="#3D2B24" stroke-width="2"/>
    <path d="M242 130Q252 104 264 88" fill="none" stroke="#8A5E3B" stroke-width="5" stroke-linecap="round"/>
    <path d="M264 88Q246 78 236 90M264 88Q278 74 292 86M264 88Q276 92 286 106" fill="none" stroke="#4D8C57" stroke-width="5" stroke-linecap="round"/>
    <path d="M0 112Q30 102 60 112T120 112T180 112T240 112T300 112T360 112" fill="none" stroke="#FFFDF8" stroke-width="4"/>
  </svg>`,
  "ramp-balance-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="200" fill="#FBF0D7"/>
    <rect y="156" width="360" height="44" fill="#E7D1A4"/>
    <polygon points="146,164 180,116 214,164" fill="#B75C49" stroke="#3D2B24" stroke-width="3"/>
    <g transform="rotate(-7 180 116)">
      <rect x="46" y="106" width="268" height="18" rx="9" fill="#D99B52" stroke="#3D2B24" stroke-width="3"/>
      <circle cx="88" cy="88" r="18" fill="#7D5236" stroke="#3D2B24" stroke-width="3"/>
      <circle cx="82" cy="82" r="2.5" fill="#3D2B24"/>
      <circle cx="92" cy="82" r="2.5" fill="#3D2B24"/>
      <ellipse cx="136" cy="86" rx="14" ry="20" fill="#EBAD34" stroke="#3D2B24" stroke-width="3"/>
      <path d="M136 66L128 54M136 66L136 52M136 66L144 54" stroke="#45824E" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="268" cy="92" rx="24" ry="14" fill="#508C63" stroke="#3D2B24" stroke-width="3"/>
      <circle cx="294" cy="88" r="7" fill="#6CA678" stroke="#3D2B24" stroke-width="2.5"/>
    </g>
    <path d="M250 54L334 54L334 26Z" fill="#CBEAF5" stroke="#2C7E9E" stroke-width="2.5"/>
    <circle cx="288" cy="38" r="9" fill="#E05A47" stroke="#3D2B24" stroke-width="2"/>
  </svg>`,
  "plant-growth-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="134" fill="#E5F1DF"/>
    <circle cx="64" cy="46" r="24" fill="#F5C953" stroke="#D19922" stroke-width="3"/>
    <path d="M256 44Q248 28 266 26Q276 14 294 24Q312 22 314 38Q314 50 294 50H264Z" fill="#B5D7E3" stroke="#3D2B24" stroke-width="2.5"/>
    <line x1="270" y1="58" x2="266" y2="70" stroke="#3B8AC4" stroke-width="3" stroke-linecap="round"/>
    <line x1="288" y1="58" x2="284" y2="70" stroke="#3B8AC4" stroke-width="3" stroke-linecap="round"/>
    <line x1="304" y1="58" x2="300" y2="70" stroke="#3B8AC4" stroke-width="3" stroke-linecap="round"/>
    <rect y="132" width="360" height="68" fill="#8F6344"/>
    <rect y="126" width="360" height="12" fill="#6EA363"/>
    <path d="M180 134Q172 158 152 178M180 134Q182 162 178 186M180 134Q194 156 212 176" fill="none" stroke="#E8CFA0" stroke-width="4" stroke-linecap="round"/>
    <path d="M180 132Q176 92 182 58" fill="none" stroke="#3D7A47" stroke-width="7" stroke-linecap="round"/>
    <path d="M179 102Q144 92 138 72Q166 74 179 102Z" fill="#5CA361" stroke="#3D2B24" stroke-width="2.5"/>
    <path d="M181 94Q216 84 222 64Q194 68 181 94Z" fill="#5CA361" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="182" cy="48" r="14" fill="#E5586A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="166" cy="56" r="13" fill="#E5586A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="198" cy="56" r="13" fill="#E5586A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="172" cy="70" r="12" fill="#E5586A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="192" cy="70" r="12" fill="#E5586A" stroke="#3D2B24" stroke-width="2.5"/>
    <circle cx="182" cy="58" r="7" fill="#F7C948" stroke="#3D2B24" stroke-width="2"/>
  </svg>`,
  "heartbeat-breath-lab": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    <rect width="360" height="200" fill="#FCECF0"/>
    <circle cx="284" cy="104" r="66" fill="#D9EFEA" opacity="0.9" stroke="#8AC2B8" stroke-width="3"/>
    <circle cx="284" cy="104" r="42" fill="#BCE3DC" opacity="0.85"/>
    <path d="M276 76Q252 78 250 112Q252 132 276 126Z" fill="#F2A4AE" stroke="#3D2B24" stroke-width="2.5"/>
    <path d="M292 76Q316 78 318 112Q316 132 292 126Z" fill="#F2A4AE" stroke="#3D2B24" stroke-width="2.5"/>
    <line x1="284" y1="62" x2="284" y2="92" stroke="#3D2B24" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="116" cy="104" r="58" fill="#F8D5DE"/>
    <path d="M116 146C64 114 68 68 96 68C108 68 114 78 116 84C118 78 124 68 136 68C164 68 168 114 116 146Z" fill="#D94E65" stroke="#3D2B24" stroke-width="3.5"/>
    <path d="M24 104H76L88 86L100 122L114 76L126 114L138 104H212" fill="none" stroke="#FFFDF8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
};

/**
 * Rich Warm Island Storybook SVG cover illustrations for the 6 Discovery Labs.
 * Rendered via SvgXml just like LibraryArt/tileArt for universal Web, iOS, Android, and test mock compatibility.
 */
export function LabCoverArt({ labId, testID }: { labId: DiscoveryLabId; testID?: string }) {
  return (
    <View testID={testID ?? `lab-cover-${labId}`} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <SvgXml xml={LAB_COVER_SVG[labId]} width="100%" height="100%" accessible={false} />
    </View>
  );
}
