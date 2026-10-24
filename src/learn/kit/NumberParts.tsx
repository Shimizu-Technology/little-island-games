import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect, Line, G } from "react-native-svg";
import { Button, C, Copy, PressableScale } from "../../components/ui";
import { COINS, pathRows, type Pieces } from "./numbers";

export function Turtle({ size = 40, coral = false }: { size?: number; coral?: boolean }) {
  const color = coral ? C.coral : C.teal;
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70" accessible={false}>
      <Ellipse cx="33" cy="14" rx="12" ry="8" fill={color} />
      <Ellipse cx="33" cy="56" rx="12" ry="8" fill={color} />
      <Ellipse cx="67" cy="14" rx="12" ry="8" fill={color} />
      <Ellipse cx="67" cy="56" rx="12" ry="8" fill={color} />
      <Ellipse cx="84" cy="35" rx="14" ry="12" fill={color} />
      <Path d="M14 31L2 35 14 39" fill={color} />
      <Ellipse cx="46" cy="35" rx="33" ry="26" fill={coral ? "#E8A87F" : "#84B9A2"} stroke={color} strokeWidth="4" />
      <Path
        d="M32 21L53 18 65 33 55 49 33 48 24 33Z M32 21L23 13 M53 18L62 12 M65 33L78 32 M55 49L63 57 M33 48L24 57 M24 33L14 33"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
      <Circle cx="90" cy="31" r="2.8" fill={C.ink} />
    </Svg>
  );
}
export function Tide({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70" accessible={false}>
      <Path
        d="M2 42Q12 18 34 31Q40 0 65 12Q90 25 67 43Q96 30 98 61H2Z"
        fill="#84B9C9"
        stroke={C.blue}
        strokeWidth="4"
      />
      <Path d="M15 51Q30 35 45 50T78 50" fill="none" stroke={C.cream} strokeWidth="4" />
    </Svg>
  );
}
export function Shell({ size = 30, value }: { size?: number; value?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" accessible={false}>
      <Path
        d="M30 53C22 47 3 32 7 18Q12 3 22 10Q30 0 38 10Q51 3 54 18C58 33 39 49 30 53Z"
        fill="#F3D296"
        stroke="#9A6A1F"
        strokeWidth="2"
      />
      <Path d="M30 49L16 17M30 49L30 12M30 49L45 17" stroke="#B88C48" strokeWidth="2" fill="none" />
      {value !== undefined && (
        <G>
          <Circle cx="30" cy="29" r="13" fill="#FCFAF4" />
        </G>
      )}
    </Svg>
  );
}
export function Mango({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Path d="M28 8C8 3 2 20 10 32C18 44 36 30 34 18Z" fill="#E1B251" stroke="#9A6A1F" strokeWidth="2" />
      <Path d="M25 10Q26 0 36 4Q34 12 25 10" fill={C.teal} />
    </Svg>
  );
}
export function Crate({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 100 70" accessible={false}>
      {Array.from({ length: 10 }, (_, i) => (
        <Circle key={i} cx={14 + (i % 5) * 18} cy={13 + Math.floor(i / 5) * 22} r="8" fill={C.gold} stroke="#9A6A1F" />
      ))}
      <Path d="M3 30L97 30 92 66 8 66Z" fill="#C99362" stroke="#81512E" strokeWidth="3" />
      <Path d="M8 43H94M8 55H92M25 30V65M74 30V65" stroke="#81512E" strokeWidth="3" />
    </Svg>
  );
}
export function MarketArt({ size = 160, customer = 0 }: { size?: number; customer?: number }) {
  const skin = ["#9B603D", "#C78B62", "#6C4331", "#DEA87F"][customer % 4];
  return (
    <Svg width={size} height={size * 0.52} viewBox="0 0 240 125" accessible={false}>
      <Path d="M8 38L30 9H157L180 38Z" fill={C.coral} />
      <Path d="M28 10L18 38M65 10L60 38M104 10L106 38M143 10L153 38" stroke="#F6D2A6" strokeWidth="18" />
      <Path d="M22 38V119M166 38V119" stroke="#986842" strokeWidth="6" />
      <Rect x="14" y="83" width="159" height="36" rx="5" fill="#D4A878" />
      <Path d="M18 97H169" stroke="#986842" strokeWidth="3" />
      {[40, 70, 100, 130].map((x) => (
        <Ellipse key={x} cx={x} cy="77" rx="12" ry="10" fill={C.gold} />
      ))}
      <Path d="M183 117V91Q207 69 231 91V117" fill={customer % 2 ? C.teal : C.blue} />
      <Circle cx="207" cy="61" r="22" fill={skin} />
      <Path d="M185 56Q181 22 207 29Q235 27 230 58L220 43Q203 51 190 42Z" fill="#3B3029" />
      <Circle cx="199" cy="62" r="2" fill={C.ink} />
      <Circle cx="216" cy="62" r="2" fill={C.ink} />
      <Path d="M201 74Q208 79 215 73" stroke={C.ink} strokeWidth="2" fill="none" />
    </Svg>
  );
}
export function Dice({ values, spinner = false }: { values: number[]; spinner?: boolean }) {
  return (
    <View
      style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
      accessibilityLabel={spinner ? `Spinner: ${values[0] ?? "1, 2, 3"}` : `Dice: ${values.join(" and ") || "ready"}`}
    >
      <View style={{ flexDirection: "row", gap: 5 }}>
        {(values.length ? values : [0]).map((n, i) => (
          <View
            key={i}
            style={{
              width: 36,
              height: 36,
              borderRadius: spinner ? 20 : 9,
              borderWidth: 2,
              borderColor: C.ink,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.cream,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.ink }}>{n || "?"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
export function NumberStone({
  n,
  positions,
  onPress,
  disabled,
  marked,
  current,
  tide,
}: {
  n: number;
  positions?: [number, number];
  onPress: () => void;
  disabled?: boolean;
  marked?: string;
  current?: boolean;
  tide?: boolean;
}) {
  const occupants = positions?.map((p, i) => (p === n ? i : -1)).filter((i) => i >= 0) ?? [];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Stone ${n}${marked ? `, ${marked}` : ""}${occupants.length ? ", turtle here" : ""}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        flex: 1,
        borderRadius: 15,
        backgroundColor: current ? "#C8E5D5" : C.cream,
        borderWidth: 2,
        borderColor: current ? C.teal : "#8CB6B1",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "800", color: C.ink }}>{n}</Text>
      {occupants.length > 0 && (
        <View style={{ position: "absolute", right: -2, bottom: -4, flexDirection: "row" }}>
          {occupants.map((i) =>
            tide && i === 1 ? <Tide key={i} size={22} /> : <Turtle key={i} size={22} coral={i === 1} />
          )}
        </View>
      )}
      {marked && (
        <Text style={{ position: "absolute", top: -3, right: 1, fontSize: 10, fontWeight: "900", color: "#73511E" }}>
          {marked}
        </Text>
      )}
    </PressableScale>
  );
}
export function NumberPath({
  first,
  last,
  width,
  positions,
  onStone,
  disabled,
  marks,
  tide,
}: {
  first: number;
  last: number;
  width: number;
  positions: [number, number];
  onStone: (n: number) => void;
  disabled?: boolean;
  marks: Record<number, string>;
  tide?: boolean;
}) {
  const columns = width >= 520 ? 10 : 5;
  const rows = pathRows(first, last, columns);
  return (
    <View
      style={{ gap: 4 }}
      accessibilityLabel={`Numbered reef path, ${first} to ${last}. Follow the numbers along each row.`}
    >
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 4 }}>
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 21, left: 10, right: 10, height: 3, backgroundColor: "#7FAFA7" }}
          />
          {i < rows.length - 1 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 22,
                height: 48,
                width: 3,
                backgroundColor: "#7FAFA7",
                ...(i % 2 === 0 ? { right: 22 } : { left: 22 }),
              }}
            />
          )}
          {row.map((n) => (
            <NumberStone
              key={n}
              n={n}
              positions={positions}
              tide={tide}
              current={positions.includes(n)}
              marked={marks[n]}
              disabled={disabled}
              onPress={() => onStone(n)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
function Adjuster({
  label,
  count,
  art,
  onMinus,
  onPlus,
  disabledMinus,
  disabledPlus,
}: {
  label: string;
  count: number;
  art: React.ReactNode;
  onMinus: () => void;
  onPlus: () => void;
  disabledMinus: boolean;
  disabledPlus: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        backgroundColor: "#FFF9ED",
        borderRadius: 14,
        padding: 5,
      }}
    >
      <Button compact quiet label={`Take away one ${label}`} onPress={onMinus} disabled={disabledMinus}>
        −
      </Button>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
        {art}
        <Copy style={{ fontSize: 15, fontWeight: "800" }}>
          {count}{" "}
          {count === 1
            ? label
            : label === "crate of ten"
            ? "crates of ten"
            : label === "loose mango"
            ? "loose mangoes"
            : `${label}s`}
        </Copy>
      </View>
      <Button compact label={`Add one ${label}`} onPress={onPlus} disabled={disabledPlus}>
        +
      </Button>
    </View>
  );
}
export function NumberPieces({
  pieces,
  total,
  max,
  money,
  disabled = false,
  adjust,
}: {
  pieces: Pieces;
  total: number;
  max: number;
  money: boolean;
  disabled?: boolean;
  adjust: (part: "tens" | "ones" | 0 | 1 | 2 | 3, delta: 1 | -1) => void;
}) {
  const [coin, setCoin] = useState<0 | 1 | 2 | 3>(0);
  if (money)
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {COINS.map((value, i) => (
            <PressableScale
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Select ${value} shell coin, ${pieces.coins[i]} in tray`}
              accessibilityState={{ selected: i === coin, disabled }}
              disabled={disabled}
              onPress={() => setCoin(i as typeof coin)}
              style={{
                flex: 1,
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: i === coin ? C.teal : C.line,
                backgroundColor: C.cream,
                borderRadius: 12,
              }}
            >
              <Shell size={27} />
              <Text style={{ color: C.ink, fontWeight: "800" }}>
                {value} × {pieces.coins[i]}
              </Text>
            </PressableScale>
          ))}
        </View>
        <Adjuster
          label={`${COINS[coin]}-shell coin`}
          count={pieces.coins[coin]}
          art={<Shell size={28} />}
          onMinus={() => adjust(coin, -1)}
          onPlus={() => adjust(coin, 1)}
          disabledMinus={disabled || pieces.coins[coin] === 0}
          disabledPlus={disabled || total + COINS[coin] > max}
        />
      </View>
    );
  return (
    <View style={{ gap: 5 }}>
      <Adjuster
        label="crate of ten"
        count={pieces.tens}
        art={<Crate size={42} />}
        onMinus={() => adjust("tens", -1)}
        onPlus={() => adjust("tens", 1)}
        disabledMinus={disabled || pieces.tens === 0}
        disabledPlus={disabled || total + 10 > max}
      />
      <Adjuster
        label="loose mango"
        count={pieces.ones}
        art={<Mango size={27} />}
        onMinus={() => adjust("ones", -1)}
        onPlus={() => adjust("ones", 1)}
        disabledMinus={disabled || pieces.ones === 0}
        disabledPlus={disabled || total + 1 > max}
      />
    </View>
  );
}
export function Basket({
  pieces,
  total,
  target,
  money,
}: {
  pieces: Pieces;
  total: number;
  target: number;
  money: boolean;
}) {
  const offset = total - target;
  return (
    <View
      accessibilityLabel={`Basket total ${total}. ${
        offset === 0 ? "The amount is ready" : offset < 0 ? "Needs more" : "Too many"
      }`}
      style={{ alignItems: "center", backgroundColor: C.cream, borderRadius: 14, padding: 7, gap: 2 }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        {money ? <Shell size={36} /> : <Crate size={48} />}
        <Text style={{ fontSize: 30, fontWeight: "900", color: C.ink }}>{total}</Text>
        <Copy style={{ fontSize: 13 }}>{money ? "shells" : `${pieces.tens} tens + ${pieces.ones} ones`}</Copy>
      </View>
      {!money && (
        <View
          accessibilityLabel={`Packed ${pieces.tens} crates and ${pieces.ones} loose mangoes`}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            justifyContent: "center",
            maxWidth: 260,
            minHeight: 18,
          }}
        >
          {Array.from({ length: pieces.tens }, (_, i) => (
            <Crate key={`t${i}`} size={22} />
          ))}
          {Array.from({ length: Math.min(10, pieces.ones) }, (_, i) => (
            <Mango key={`u${i}`} size={15} />
          ))}
          {pieces.ones > 10 && <Copy style={{ fontSize: 12 }}>+{pieces.ones - 10} ones</Copy>}
        </View>
      )}
      <Copy style={{ fontSize: 13, color: offset > 0 ? C.error : C.ink }}>
        {offset === 0 ? "The amount is ready." : offset < 0 ? "Needs more · add pieces" : "Too many · take pieces out"}
      </Copy>
      <Svg width={150} height={12} viewBox="0 0 150 12" accessible={false}>
        <Line x1="20" x2="130" y1={offset > 0 ? 3 : 9} y2={offset < 0 ? 3 : 9} stroke={C.coral} strokeWidth="3" />
        <Path d="M70 12L75 3 80 12" fill={C.teal} />
      </Svg>
    </View>
  );
}
