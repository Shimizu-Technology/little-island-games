import React, { memo, useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Image, View } from "react-native";
import { PosePath, type ArtPose } from "../ArtPose";
import type { SharedValue } from "react-native-reanimated";
import { illustrated, palmActorLayout, type PalmActor } from "../games/palm-patrol/illustrated";
import { beachIllustrated, beachStillFrame, type BeachActor } from "../games/beach-ball/illustrated";
import type { OutfitId } from "../progress";
import type { WorldId } from "../types";
export const AmbientFriend = memo(function AmbientFriend({ night = false }: { night?: boolean }) {
  return (
    <Svg width={44} height={32} viewBox="0 0 44 32" accessible={false}>
      {night ? (
        <G>
          <Circle cx={22} cy={16} r={13} fill="#FFF0A0" opacity={0.1} />
          <Circle cx={22} cy={16} r={6} fill="#FFF1A8" />
          <Ellipse cx={17} cy={9} rx={5} ry={3} fill="#B8EEDE" />
          <Ellipse cx={27} cy={9} rx={5} ry={3} fill="#B8EEDE" />
        </G>
      ) : (
        <Path
          d="M3 20Q12 4 22 17Q32 4 41 20Q30 12 22 22Q14 12 3 20"
          fill="#FFF6D7"
          stroke="#467E8E"
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
});
export const palettes = {
  w1: ["#086D86", "#4FC7BF", "#FFE1A0"],
  w2: ["#3762A1", "#9BCFDF", "#F6C585"],
  w3: ["#192D68", "#8A7FC8", "#F0B98C"],
  w4: ["#37665D", "#91BC9D", "#DDCA8B"],
  w5: ["#564770", "#BA9AC3", "#E7B6AA"],
  w6: ["#A16153", "#E6AC85", "#FFE1A0"],
  learn: ["#247A67", "#A8D9AB", "#FFE7A0"],
} satisfies Record<WorldId, [string, string, string]>;
const star = "M0-9L3-3L10-2L5 3L6 10L0 7L-6 10L-5 3L-10-2L-3-3Z";
function Outfit({ outfit }: { outfit: OutfitId }) {
  return outfit === "sunhat" ? (
    <G stroke="#603E29" strokeWidth={3}>
      <Ellipse cx={50} cy={29} rx={33} ry={6} fill="#FFF0A6" />
      <Path d="M29 26Q30 3 50 7Q70 5 72 26Z" fill="#FFD06C" />
      <Path d="M30 22H70" stroke="#F27F6C" strokeWidth={6} />
    </G>
  ) : outfit === "explorer" ? (
    <G fill="#BAF5ED" stroke="#245B68" strokeWidth={3}>
      <Rect x={21} y={37} width={58} height={20} rx={8} />
      <Path d="M80 44H88V17" fill="none" stroke="#F59A5D" strokeWidth={6} />
    </G>
  ) : outfit === "starlight" ? (
    <G fill="#FFE67D" stroke="#7E572F" strokeWidth={1}>
      <Path d={star} transform="translate(30 20)" />
      <Path d={star} transform="translate(70 15) scale(.7)" />
      <Path d={star} transform="translate(88 30) scale(.5)" />
    </G>
  ) : (
    <Path d="M25 28Q48 6 76 28L55 28Q58 7 37 11L45 28Z" fill="#BCE25E" stroke="#245E41" strokeWidth={3} />
  );
}
export const ActionHero = memo(function ActionHero({
  palm,
  size = 110,
  outfit = "island",
  happy = false,
  poses,
}: {
  palm: boolean;
  size?: number;
  outfit?: OutfitId;
  happy?: boolean;
  poses?: SharedValue<ArtPose[]>;
}) {
  const id = useId().replace(/:/g, "");
  if (palm) return <PalmStill kind="launcher" size={size} outfit={outfit} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Defs>
        <LinearGradient id={`action-hero-${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFAE77" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={50} cy={91} rx={33} ry={5} fill="#194C5A" opacity={0.2} />
      <Path d="M35 83L29 91H19M65 83L71 91H81" stroke="#23596E" strokeWidth={7} strokeLinecap="round"/>
      <Circle
        cx={50}
        cy={56}
        r={34}
        fill={`url(#action-hero-${id})`}
        stroke="#23596E"
        strokeWidth={4}
      />
      <G>
        <Path d="M50 23Q26 48 50 89Q59 65 50 23" fill="#F77E70" />
        <Path d="M50 23Q78 44 81 68Q56 63 50 23" fill="#5CCCBF" />
        <Path d="M50 23Q27 30 18 54Q34 44 50 23" fill="#F7CE5D" />
      </G>
      <PosePath poses={poses} index={57} paths={[
        "M23 60L11 54M77 60L87 43L76 34",
        "M23 60L12 54M77 60L72 39L50 24.36",
        "M23 60L10 54M77 60L89 48L87 30",
      ]} stroke="#23596E" strokeWidth={7} strokeLinecap="round" fill="none"/>
      <Circle cx={38} cy={54} r={5} fill="#FFFDF0" />
      <Circle cx={64} cy={54} r={5} fill="#FFFDF0" />
      <Circle cx={39} cy={55} r={2.8} fill="#253E46" />
      <Circle cx={63} cy={55} r={2.8} fill="#253E46" /><Circle cx={39.8} cy={54} r={.9} fill="white"/><Circle cx={63.8} cy={54} r={.9} fill="white"/>
      <Path
        d={happy ? "M38 65Q51 86 65 65Z" : "M42 66Q51 75 60 66"}
        fill={happy ? "#713C3A" : "none"}
        stroke="#653D34"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Ellipse cx={30} cy={64} rx={6} ry={3} fill="#F59F7F" />
      <Ellipse cx={72} cy={64} rx={6} ry={3} fill="#F59F7F" />
      {outfit === "island" ? <G stroke="#23596E" strokeWidth={2.5}><Path d="M24 30Q48 18 75 30L76 37Q50 29 24 37Z" fill="#F58070"/><Path d="M48 33Q68 26 83 36Q67 43 48 39Z" fill="#FFE4A2"/></G> : <Outfit outfit={outfit} />}
    </Svg>
  );
});
export const PalmIllustration = memo(function PalmIllustration({
  kind,
  frame,
  outfit = "island",
  flash = false,
}: {
  kind: PalmActor;
  frame: ReturnType<typeof palmActorLayout>["image"];
  outfit?: OutfitId;
  flash?: boolean;
}) {
  const badgeSize = frame.width * 0.24;
  return (
    <>
      <Image
        testID={flash ? "palm-boss-flash-image" : `palm-${kind}-image`}
        source={illustrated[kind].source()}
        resizeMode="contain"
        accessible={false}
        fadeDuration={0}
        style={flash ? { ...frame, tintColor: "#FFE8AF" } : frame}
      />
      {kind === "launcher" && outfit !== "island" && (
        <Svg
          testID={`palm-outfit-${outfit}`}
          width={badgeSize}
          height={badgeSize}
          viewBox="10 0 85 64"
          style={{ position: "absolute", left: frame.left + frame.width * 0.55, top: frame.top + frame.height * 0.53 }}
          accessible={false}
        >
          <Outfit outfit={outfit} />
        </Svg>
      )}
    </>
  );
});

function PalmStill({ kind, size, outfit }: { kind: PalmActor; size: number; outfit?: OutfitId }) {
  const { image, padding } = palmActorLayout(kind, size);
  return (
    <View style={{ width: size, height: size }}>
      <PalmIllustration kind={kind} outfit={outfit} frame={{ ...image, left: image.left - padding.left, top: image.top - padding.top }} />
    </View>
  );
}
export const BeetleArt = memo(function BeetleArt({ size }: { size: number }) {
  return <PalmStill kind="beetle" size={size} />;
});
export const HuskArt = memo(function HuskArt({ size }: { size: number }) {
  return <PalmStill kind="coconut" size={size} />;
});
export const PalmSpark = memo(function PalmSpark({ size, star }: { size: number; star: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessible={false}>
      {star
        ? <Path d="M6 0.5Q6.8 5.2 11.5 6Q6.8 6.8 6 11.5Q5.2 6.8 0.5 6Q5.2 5.2 6 0.5Z" fill="#FFF6D2" stroke="#D59438" strokeWidth={0.7} />
        : <Circle cx={6} cy={6} r={3.25} fill="#FFE8A2" />}
    </Svg>
  );
});
export const BeachIllustration = memo(function BeachIllustration({
  kind,
  frame,
  testID,
}: {
  kind: BeachActor;
  frame: { position: "absolute"; left: number; top: number; width: number; height: number };
  testID?: string;
}) {
  return (
    <Image
      testID={testID ?? `beach-${kind}-image`}
      source={beachIllustrated[kind].source()}
      resizeMode="contain"
      accessible={false}
      fadeDuration={0}
      style={frame}
    />
  );
});

function BeachStill({ kind, size }: { kind: BeachActor; size: number }) {
  const frame = beachStillFrame(kind, size, size);
  return (
    <View style={{ width: size, height: size }}>
      <BeachIllustration kind={kind} frame={frame} />
    </View>
  );
}

export const BeachSpark = memo(function BeachSpark({ size, kind }: { size: number; kind: "star" | "drop" | "coral" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" accessible={false}>
      {kind === "star" ? (
        <Path
          d="M7 0.8Q7.9 6.1 13.2 7Q7.9 7.9 7 13.2Q6.1 7.9 0.8 7Q6.1 6.1 7 0.8Z"
          fill="#FFF7D1"
          stroke="#D48A34"
          strokeWidth={0.85}
        />
      ) : kind === "drop" ? (
        <Path
          d="M7 1.2C9.8 4.8 11.4 6.9 11.4 9A4.4 4.4 0 0 1 2.6 9C2.6 6.9 4.2 4.8 7 1.2Z"
          fill="#D8FBF3"
          stroke="#267D8A"
          strokeWidth={0.9}
        />
      ) : (
        <Circle cx={7} cy={7} r={3.6} fill="#FF9F7A" stroke="#6E3B28" strokeWidth={0.9} />
      )}
    </Svg>
  );
});

export const BeachWallSplash = memo(function BeachWallSplash({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={12} cy={12} r={8.5} fill="#FFF5C4" opacity={0.34} />
      <Path
        d="M12 1.8V6.2M12 17.8V22.2M1.8 12H6.2M17.8 12H22.2M4.8 4.8L7.9 7.9M16.1 16.1L19.2 19.2M4.8 19.2L7.9 16.1M16.1 7.9L19.2 4.8"
        stroke="#FFF7D6"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M12 5.2Q13 11 18.8 12Q13 13 12 18.8Q11 13 5.2 12Q11 11 12 5.2Z"
        fill="#FFE38A"
        stroke="#A45E2A"
        strokeWidth={0.8}
      />
    </Svg>
  );
});

export const BallArt = memo(function BallArt({ size }: { size: number; outline?: number }) {
  return <BeachStill kind="ball" size={size} />;
});

export const TurtleArt = memo(function TurtleArt({ size }: { size: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Defs>
        <LinearGradient id={`turtle-shell-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#63C7A6" />
          <Stop offset="1" stopColor="#2B7D6E" />
        </LinearGradient>
        <LinearGradient id={`turtle-scute-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E4F4B5" />
          <Stop offset="1" stopColor="#9ED28E" />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={52} r={43} fill="none" stroke="#E2FAF4" strokeWidth={2.2} opacity={0.55} />
      <Ellipse cx={50} cy={56} rx={36} ry={34} fill="#1E525A" opacity={0.18} />
      <G fill="#9AD497" stroke="#4D301E" strokeWidth={3} strokeLinejoin="round">
        <Ellipse cx={50} cy={17} rx={12.5} ry={14} />
        <Path d="M29 40Q3 24 10 53L27 58M71 40Q97 24 90 53L73 58M31 69L19 90L40 80M69 69L81 90L60 80" />
        <Circle cx={50} cy={50} r={34} fill={`url(#turtle-shell-${id})`} />
        <Path d="M50 28L69 45L61 70H39L31 45Z" fill={`url(#turtle-scute-${id})`} stroke="#386853" strokeWidth={2.4} />
      </G>
      <Path d="M31 32Q46 20 66 30" fill="none" stroke="#E9FFF4" strokeWidth={3.4} strokeLinecap="round" opacity={0.85} />
      <Path d="M50 28V16.5M31 45L18 42M69 45L82 42M39 70L30 78M61 70L70 78" stroke="#386853" strokeWidth={2} opacity={0.65} />
      <Path d="M41.5 14.5Q44.5 17 47.5 15.5M52.5 15.5Q55.5 17 58.5 14.5" stroke="#4D301E" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Circle cx={40} cy={19} r={2.2} fill="#F49A83" opacity={0.75} />
      <Circle cx={60} cy={19} r={2.2} fill="#F49A83" opacity={0.75} />
      <Path d="M77 9H89L77 22H89" fill="none" stroke="#FFF6D2" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});
function Palm({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d="M0 100Q19 39 1 0" stroke="#75472E" strokeWidth={15} fill="none" />
      <Path d="M-1 84L13 87M2 65L16 67M4 44L16 47" stroke="#D69E65" strokeWidth={5} />
      <Path
        d="M0 0Q-48-40-70 1Q-37-8 0 0M0 0Q34-48 67-13Q35-18 0 0M0 0Q-45-8-47 37Q-21 13 0 0M0 0Q46-13 52 29Q25 7 0 0M0 0Q-7-40 18-49Q9-17 0 0"
        fill="#4CAB73"
        stroke="#21674E"
        strokeWidth={2}
      />
      <Circle cx={-6} cy={7} r={9} fill="#C68A4E" />
      <Circle cx={10} cy={7} r={8} fill="#B57542" />
    </G>
  );
}
const groveSkies = {
  w1: ["#83BFC0", "#F9E7AC"],
  w2: ["#7BADBA", "#F8D7A0"],
  w3: ["#878BB6", "#F2CCA2"],
  w4: ["#82AF9A", "#F8E2A1"],
  w5: ["#9E9DB7", "#F4D3AD"],
  w6: ["#DCAF94", "#FFE8AD"],
  learn: ["#8DBF9F", "#F8EAB4"],
} satisfies Record<WorldId, [string, string]>;

function PalmGrove({ width, height, world, id }: { width: number; height: number; world: WorldId; id: string }) {
  const [sky, horizon] = groveSkies[world];
  return (
    <Svg width={width} height={height} viewBox="0 0 360 600" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute" }} accessible={false}>
      <Defs>
        <LinearGradient id={`palm-sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky} />
          <Stop offset=".68" stopColor={horizon} />
        </LinearGradient>
        <LinearGradient id={`palm-sand-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FBE3A5" />
          <Stop offset="1" stopColor="#D8A46A" />
        </LinearGradient>
      </Defs>
      <Rect width={360} height={600} fill={`url(#palm-sky-${id})`} />
      {world === "w3" && [22, 75, 135, 202, 330].map((x, i) => (
        <Path key={x} d={star} fill="#FFF2CB" opacity={0.55 + (i % 3) * 0.18} transform={`translate(${x} ${42 + (i % 3) * 35}) scale(.35)`} />
      ))}
      <G fill="#FFF5C5">
        <Circle cx={285} cy={115} r={78} opacity={0.12} />
        <Circle cx={285} cy={115} r={57} opacity={0.23} />
        <Circle cx={285} cy={115} r={34} opacity={0.9} />
        <Path d="M241 126L71 445L130 447L275 132ZM297 134L268 448L306 447L319 129Z" opacity={0.16} />
      </G>
      <Path d="M0 192C53 212 76 169 133 196S245 225 360 185V471H0Z" fill="#C7DABB" opacity={0.55} />
      <Path d="M0 272Q71 233 141 258T273 252Q324 233 360 260V467H0Z" fill="#A9CCAC" opacity={0.66} />
      <Path d="M0 345Q68 300 133 340Q201 355 274 314Q315 302 360 318V466H0Z" fill="#84B49C" opacity={0.55} />
      <G opacity={0.24}>
        <Palm x={12} y={295} scale={0.74} />
        <Palm x={53} y={337} scale={0.47} />
        <Palm x={348} y={260} scale={0.88} />
        <Palm x={317} y={335} scale={0.55} />
      </G>
      <Path d="M0 404Q94 366 174 393T360 380V485H0Z" fill="#8FB984" />
      <Path d="M0 446Q98 421 181 444T360 429V600H0Z" fill={`url(#palm-sand-${id})`} />
      <Path d="M0 447Q94 422 175 444T360 430" stroke="#FFF2BD" strokeWidth={4} fill="none" opacity={0.68} />
      <Path d="M0 507Q72 481 143 514L71 517L0 550ZM360 492Q315 507 279 555L360 528Z" fill="#986E50" opacity={0.12} />
      <Palm x={-8} y={422} scale={0.83} />
      <Palm x={361} y={409} scale={0.87} />
      <Palm x={33} y={573} scale={0.47} />
      <Palm x={330} y={581} scale={0.42} />
      <Path d="M15 545Q58 535 87 541M277 557Q311 548 349 549M113 580Q174 563 236 575" stroke="#956745" strokeWidth={1.8} strokeLinecap="round" opacity={0.3} fill="none" />
      {[42, 93, 138, 248, 294, 336].map((x, i) => (
        <Ellipse key={x} cx={x} cy={589 - (i % 3) * 21} rx={3 + i % 2} ry={1.6} fill="#B28359" opacity={0.55} />
      ))}
    </Svg>
  );
}

const beachPalettes = {
  w1: { sky: ["#45A8C5", "#9EE4DE", "#FFF0BE"], water: ["#2596AA", "#6BD5C9"], sand: ["#FDE8AE", "#E1AB6B"], hill: "#8EC6B5" },
  w2: { sky: ["#518EC4", "#AADEE8", "#FDE4B6"], water: ["#2E86AE", "#75C5D2"], sand: ["#FCE2A4", "#DDA668"], hill: "#8CBAC4" },
  w3: { sky: ["#2D3F7B", "#817CBE", "#F2C397"], water: ["#275380", "#629EB5"], sand: ["#F4D79F", "#CE9E6B"], hill: "#6F79A7" },
  w4: { sky: ["#43897E", "#9ED4BA", "#FAF0BC"], water: ["#29867F", "#72CBB5"], sand: ["#F8E4A5", "#DAAC6C"], hill: "#7EB9A2" },
  w5: { sky: ["#675486", "#C39EC9", "#F8CEB8"], water: ["#496E94", "#89B3C1"], sand: ["#F7DAB0", "#D6A172"], hill: "#8D7EA6" },
  w6: { sky: ["#B16857", "#ECAE82", "#FFE6AB"], water: ["#348795", "#76C0B7"], sand: ["#FDE5A7", "#DC9D60"], hill: "#B88C7B" },
  learn: { sky: ["#389E8E", "#A7E0BC", "#FFF0BC"], water: ["#289B98", "#74D4BF"], sand: ["#FDEAB0", "#DFAD6E"], hill: "#80C4A9" },
} satisfies Record<WorldId, { sky: [string, string, string]; water: [string, string]; sand: [string, string]; hill: string }>;

function BeachCove({
  width,
  height,
  world,
  id,
  court = false,
}: {
  width: number;
  height: number;
  world: WorldId;
  id: string;
  court?: boolean;
}) {
  const c = beachPalettes[world];
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 360 600"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute" }}
      accessible={false}
    >
      <Defs>
        <LinearGradient id={`beach-sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.sky[0]} />
          <Stop offset=".42" stopColor={c.sky[1]} />
          <Stop offset="1" stopColor={c.sky[2]} />
        </LinearGradient>
        <LinearGradient id={`beach-water-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.water[0]} />
          <Stop offset="1" stopColor={c.water[1]} />
        </LinearGradient>
        <LinearGradient id={`beach-sand-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.sand[0]} />
          <Stop offset="1" stopColor={c.sand[1]} />
        </LinearGradient>
      </Defs>
      <Rect width={360} height={600} fill={`url(#beach-sky-${id})`} />
      {world === "w3" &&
        [28, 84, 146, 212, 326].map((x, i) => (
          <Path key={x} d={star} fill="#FFF2CB" opacity={0.6 + (i % 3) * 0.16} transform={`translate(${x} ${36 + (i % 3) * 28}) scale(.36)`} />
        ))}
      {/* Warm tropical sun / moon halo and soft diagonal sunbeams */}
      <G fill="#FFF6C9">
        <Circle cx={288} cy={88} r={74} opacity={0.14} />
        <Circle cx={288} cy={88} r={52} opacity={0.24} />
        <Circle cx={288} cy={88} r={30} opacity={0.92} />
        <Path d="M248 96L86 356L138 356L278 104ZM298 104L260 356L302 356L320 100Z" opacity={0.11} />
      </G>
      {/* Soft storybook clouds */}
      <G fill="#FFF9E6" opacity={world === "w3" ? 0.34 : 0.62}>
        <Path d="M36 96Q44 82 60 86Q72 72 90 82Q104 80 110 96Z" />
        <Path d="M168 68Q176 57 188 61Q198 51 212 60Q222 59 226 68Z" opacity={0.78} />
      </G>
      {/* Distant coastal headlands */}
      <Path d="M0 162Q64 128 134 156Q204 176 286 140Q328 124 360 144V210H0Z" fill={c.hill} opacity={0.5} />
      {/* Sparkling turquoise lagoon */}
      <Path d="M0 164Q88 150 180 164T360 158V290H0Z" fill={`url(#beach-water-${id})`} opacity={0.86} />
      <Path d="M0 184Q80 172 168 186T360 180" fill="none" stroke="#E0FCF4" strokeWidth={2.4} opacity={0.55} />
      <Path d="M0 206Q92 194 184 208T360 202" fill="none" stroke="#D3F8EE" strokeWidth={2} opacity={0.42} />
      {/* Crisp sunlit water glints */}
      <G fill="#FFF9DC" opacity={0.72}>
        <Rect x={48} y={176} width={22} height={3} rx={1.5} />
        <Rect x={144} y={192} width={28} height={3} rx={1.5} />
        <Rect x={246} y={173} width={26} height={3} rx={1.5} />
        <Rect x={274} y={196} width={18} height={2.5} rx={1.2} />
        <Path d="M96 184Q97.5 188.5 102 190Q97.5 191.5 96 196Q94.5 191.5 90 190Q94.5 188.5 96 184Z" />
        <Path d="M222 179Q223.2 182.8 227 184Q223.2 185.2 222 189Q220.8 185.2 217 184Q220.8 182.8 222 179Z" />
      </G>
      {/* Scalloped lagoon foam and sunlit golden sand cove */}
      <Path d="M0 226Q92 206 182 226T360 216V600H0Z" fill="#C9EDE1" opacity={0.78} />
      <Path d="M0 236Q96 218 186 238T360 226V600H0Z" fill={`url(#beach-sand-${id})`} />
      <Path d="M0 234Q96 216 186 236T360 224" fill="none" stroke="#FFF9E6" strokeWidth={6} opacity={0.82} />
      {court && (
        <>
          {/* Subtle warm sand court wash for crisp ball & paddle figure-ground contrast */}
          <Rect x={14} y={36} width={332} height={528} rx={36} fill="#FFF7DE" opacity={0.22} />
          <Path d="M22 300H338" stroke="#8A613B" strokeWidth={2.5} strokeDasharray="8 10" opacity={0.22} />
          <Path d="M22 299H338" stroke="#FFF9DF" strokeWidth={2.2} strokeDasharray="8 10" opacity={0.78} />
          <Circle cx={180} cy={300} r={56} fill="none" stroke="#8A613B" strokeWidth={2.4} opacity={0.18} />
          <Circle cx={180} cy={299} r={56} fill="none" stroke="#FFF9DF" strokeWidth={2.2} opacity={0.72} />
          {/* Rails mark the engine's exact ball-centre reflection planes (x = 12, x = 348). End lines stay open. */}
          <Path d="M12 0V600M348 0V600" stroke="#5A3925" opacity={0.32} strokeWidth={4} />
          <Path d="M12 0V600M348 0V600" stroke="#FFF6D8" opacity={0.92} strokeWidth={2.2} />
          <Path d="M12 0H348M12 600H348" stroke="#CFF6E8" opacity={0.58} strokeWidth={3} strokeDasharray="2 10" />
          <Path d="M172 16L180 8L188 16M172 584L180 592L188 584" stroke="#FFF7D6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
      {/* Warm sunlit coastal palm framing */}
      <Path d="M0 442Q46 432 76 456L0 472ZM360 156Q318 166 296 196L360 184Z" fill="#7D5435" opacity={0.12} />
      <Palm x={-10} y={388} scale={0.62} />
      <Palm x={370} y={108} scale={0.6} />
      {/* Subtle coastal shell, starfish, and sand pebble motifs along outer margins */}
      <G opacity={0.65}>
        <Path d="M28 552Q34 542 40 552Q34 557 28 552Z" fill="#FFF2D6" stroke="#8B5A38" strokeWidth={1.1} />
        <Path d="M322 558L325 552L328 558L334 559L329 563L330 569L325 566L320 569L321 563L316 559Z" fill="#F59B78" stroke="#7A422B" strokeWidth={0.9} />
        <Path d="M324 252Q331 243 338 252Q331 257 324 252Z" fill="#FBE5B8" stroke="#8B5A38" strokeWidth={1} />
      </G>
      {[28, 76, 142, 218, 294, 334].map((x, i) => (
        <G key={x} opacity={0.42}>
          <Ellipse cx={x} cy={574 - (i % 3) * 34} rx={3.2} ry={1.6} fill="#966A43" />
          <Circle cx={x + 7} cy={580 - (i % 3) * 34} r={1.5} fill="#FFF5D8" />
        </G>
      ))}
      <Path
        d="M34 118Q40 111 46 118Q52 111 58 118M114 78Q120 71 126 78Q132 71 138 78"
        fill="none"
        stroke="#FFF8DF"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.72}
      />
    </Svg>
  );
}

export const Scene = memo(function Scene({
  palm,
  world = "w1",
  width,
  height,
  court = false,
}: {
  palm: boolean;
  world?: WorldId;
  width: number;
  height: number;
  court?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  if (palm) return <PalmGrove width={width} height={height} world={world} id={id} />;
  return <BeachCove width={width} height={height} world={world} id={id} court={court} />;
});
export function ChestArt({ size = 150, open = false }: { size?: number; open?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" accessible={false}>
      <Defs>
        <LinearGradient id={`action-chest-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#DA9A4D" />
          <Stop offset="1" stopColor="#9C5638" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={70} cy={122} rx={54} ry={8} fill="#6D4A30" opacity={0.15} />
      {open && (
        <G fill="#FFDD67">
          {[0, 1, 2, 3, 4].map((i) => (
            <Path key={i} d={star} transform={`translate(${16 + i * 27} ${30 - (i % 2) * 12}) scale(.7)`} />
          ))}
        </G>
      )}
      <Rect
        x={20}
        y={65}
        width={100}
        height={54}
        rx={10}
        fill={`url(#action-chest-${id})`}
        stroke="#613D2C"
        strokeWidth={4}
      />
      <Path
        d={open ? "M20 62L28 25Q72 4 112 25L120 62Z" : "M20 68V53Q20 25 70 25Q120 25 120 53V68Z"}
        fill="#CC8542"
        stroke="#613D2C"
        strokeWidth={4}
      />
      <Path d="M35 44V116M105 44V116M20 70H120" stroke="#F9CC66" strokeWidth={9} />
      <Rect x={58} y={63} width={24} height={28} rx={5} fill="#FFE092" stroke="#8B5E30" strokeWidth={3} />
      <Path d={star} transform="translate(70 76) scale(.6)" fill="#B56F33" />
    </Svg>
  );
}

export const NetArt = memo(function NetArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Path d="M14 38Q50 92 86 38Q74 96 50 94Q26 96 14 38Z" fill="#D1F4DF66" stroke="#F9E5A8" strokeWidth={3} />
      <Path
        d="M20 50L70 83M31 65L57 91M80 50L30 83M69 65L43 91M36 49L64 83M64 49L36 83"
        fill="none"
        stroke="#FFEDC8"
        strokeWidth={2}
      />
      <Ellipse cx={50} cy={38} rx={37} ry={12} fill="none" stroke="#8B6941" strokeWidth={4} />
    </Svg>
  );
});
