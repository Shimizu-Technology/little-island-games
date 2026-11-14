import React from "react";
import { View } from "react-native";
import { Text } from "../../../components/Text";
import { C, Copy } from "../../../components/ui";
import { Blocks } from "../../../math/kit/ui/Blocks";
import { Bridge } from "../../../math/kit/ui/Bridge";
import { TenFrame } from "../../../math/kit/ui/TenFrame";
import type { Picture } from "./picture";

export type WorkspaceProps = {
  pic: Picture;
  width: number;
  /** Fill step: touching shell k of group `side` asks to move k shells. */
  onPick?: (side: 0 | 1, k: number) => void;
  /** Take-away fill step: touching shell k of the ones asks to take k away. */
  onPickOnes?: (k: number) => void;
  onTradeMake?: () => void;
  onTradeOpen?: () => void;
  hidePicture?: boolean;
};

const frameCell = (width: number, frames: number) => Math.max(24, Math.min(46, Math.floor((width - 28) / (frames > 1 ? 11.6 : 5.8))));

/** Draws the Picture. Pure presentation: every number on it came from picture.ts. */
export function Workspace({ pic, width, onPick, onPickOnes, onTradeMake, onTradeOpen, hidePicture }: WorkspaceProps) {
  const w = Math.min(width, 520);
  if (hidePicture) return <Copy style={{ color: C.ink, textAlign: "center" }}>Picture hidden. Think it through, then use the number pad.</Copy>;
  const total = pic.frames ? pic.frames.gold + pic.frames.blue + pic.frames.ghost : 0;
  const nFrames = Math.max(1, Math.ceil(total / 10));
  const cell = pic.pair ? frameCell(w, 2) : frameCell(w, nFrames);
  return <View style={{ alignItems: "center", gap: 8 }}>
    {pic.pair && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <TenFrame cell={cell} filled={pic.pair.a} label={`First group: ${pic.pair.a} shells${pic.pair.fullA ? ", a full ten" : ""}`} onPick={onPick ? (k) => onPick(1, k) : undefined} />
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 20, fontWeight: "900", color: C.ink }}>{pic.pair.a}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 26, fontWeight: "900", color: C.ink }}>+</Text>
      <View style={{ alignItems: "center", gap: 4 }}>
        <TenFrame cell={cell} filled={0} second={pic.pair.b} tone="blue" label={`Second group: ${pic.pair.b} shells${pic.pair.fullB ? ", a full ten" : ""}`} onPick={onPick ? (k) => onPick(0, k) : undefined} />
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 20, fontWeight: "900", color: C.ink }}>{pic.pair.b}</Text>
      </View>
    </View>}
    {pic.frames && <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      {Array.from({ length: nFrames }, (_, k) => {
        const off = k * 10, part = (n: number, before: number) => Math.max(0, Math.min(10, before + n - off) - Math.max(0, before - off));
        const G = pic.frames!.gold, S = pic.frames!.struck;
        const gold = Math.max(0, Math.min(10, G - off)), blue = part(pic.frames!.blue, G), ghost = part(pic.frames!.ghost, G + pic.frames!.blue);
        // The struck shells are the last ones of the gold run; this frame holds the part of that run that falls inside it.
        const struckInFrame = Math.max(0, Math.min(G, off + gold) - Math.max(G - S, off));
        // The ones frame is the last one that holds any gold shell: that is where take-away shells are chosen.
        const lastGold = Math.ceil(G / 10) - 1;
        return <TenFrame key={k} cell={cell} filled={gold} second={blue} ghost={ghost} struck={struckInFrame} label={`Frame ${k + 1}: ${gold + blue} shells${ghost ? `, ${ghost} waiting` : ""}${struckInFrame ? `, ${struckInFrame} taken away` : ""}`}
          onPick={onPickOnes && k === lastGold && pic.frames!.gold % 10 !== 0 ? onPickOnes : undefined} />;
      })}
    </View>}
    {pic.blocks && <Blocks unit={Math.max(10, Math.min(18, Math.floor((w - 60) / (pic.blocks.tens + 7))))} tens={pic.blocks.tens} ones={pic.blocks.ones} ghostOnes={pic.blocks.ghostOnes}
      struckOnes={pic.blocks.struckOnes} struckTens={pic.blocks.struckTens} onTradeMake={onTradeMake} onTradeOpen={onTradeOpen}
      label={`${pic.blocks.tens} tens and ${pic.blocks.ones} ones`} />}
    {pic.line && <Bridge width={Math.min(w, 380)} start={pic.line.start} hops={pic.line.hops} ten={pic.line.ten} lo={pic.line.lo} hi={pic.line.hi}
      made={pic.line.made} label={`Number line. Start ${pic.line.start}, then ${pic.line.hops.join(", then ")}.`} />}
    {pic.caption ? <Copy style={{ color: C.ink, fontSize: 15, fontWeight: "700", textAlign: "center" }}>{pic.caption}</Copy> : null}
  </View>;
}
