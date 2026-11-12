import React from "react";
import { View } from "react-native";
import type { DropProposal } from "../scene/proposal";
import type { SceneEntity, Target } from "../scene/types";
import { capabilityOf } from "../world";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";

/**
 * HM-17: a tray choice is a picture of what will happen. The destination is drawn with the
 * chosen thing already there, in the pose the drop engine resolved: sitting in the chair,
 * lying in the bed, in a friend's hand, at a friend's mouth or on the table. No symbols.
 */
export type PosePlan = {
  owner: SceneEntity;
  subject: SceneEntity;
  /** Subject contact relative to the owner's contact, in room units. */
  dx: number;
  dy: number;
  /** Whether the owner has a front piece (a blanket, a tub rim) drawn over the subject. */
  front: boolean;
  /** Bounding box of both pieces, relative to the owner's contact. */
  box: { left: number; top: number; width: number; height: number };
};
export function posePlan(owner: SceneEntity, subject: SceneEntity, target: Target, proposal: DropProposal): PosePlan {
  const posed: SceneEntity = subject.character
    ? { ...subject, base: proposal.base, facing: proposal.facing, action: null, children: [] }
    : { ...subject, children: [] };
  const at = target.kind === "hand" || (target.kind === "mouth" && proposal.consume === "drink")
    ? target.projectedContact ?? target.contact : target.contact;
  const dx = at.x - owner.contact.x, dy = at.y - owner.contact.y;
  const of = artFrame(owner), sf = artFrame(posed);
  const left = Math.min(of.left, dx + sf.left), top = Math.min(of.top, dy + sf.top);
  const right = Math.max(of.left + of.width, dx + sf.left + sf.width), bottom = Math.max(of.top + of.height, dy + sf.top + sf.height);
  const front = !!owner.item && !!capabilityOf(owner.item.item).sockets?.length && target.kind === "socket";
  return { owner, subject: posed, dx, dy, front, box: { left, top, width: right - left, height: bottom - top } };
}
export function PosePicture({ plan, size, renderCharacter }: { plan: PosePlan; size: number; renderCharacter?: CharacterRender }) {
  const { owner, subject, dx, dy, box } = plan;
  const scale = Math.min(size / box.width, size / box.height);
  const of = artFrame(owner), sf = artFrame(subject);
  const place = (x: number, y: number) => ({ position: "absolute" as const, left: x - box.left, top: y - box.top });
  return (
    <View pointerEvents="none" accessible={false} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: box.width * scale, height: box.height * scale }}>
        <View style={{ width: box.width, height: box.height, transform: [{ scale }], transformOrigin: "left top" }}>
          <View style={place(of.left, of.top)}>
            <EntityArt entity={owner} reduced renderCharacter={renderCharacter}
              faceOverride={owner.character ? "anticipate" : undefined} />
          </View>
          <View style={place(dx + sf.left, dy + sf.top)}>
            <EntityArt entity={subject} reduced renderCharacter={renderCharacter} />
          </View>
          {plan.front && (
            <View style={place(of.left, of.top)}>
              <EntityArt entity={owner} front reduced renderCharacter={renderCharacter} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
/**
 * HM-17: where the tray goes so it never covers the selected thing. Window coordinates.
 * Returns how far to move the tray up from its resting place (0 or negative).
 * Tries its resting place, then just above the thing, then the top of the play area.
 */
export function trayLift(tray: { top: number; height: number }, thing: { top: number; bottom: number }, canvasTop: number): number {
  "worklet";
  const gap = 8;
  const clear = (top: number) => top + tray.height + gap <= thing.top || top >= thing.bottom + gap;
  if (clear(tray.top)) return 0;
  const above = thing.top - gap - tray.height;
  if (above >= canvasTop + 4) return above - tray.top;
  const highest = canvasTop + 4;
  if (clear(highest)) return Math.min(0, highest - tray.top);
  // A thing taller than the play area: the least covered of the two.
  const overlap = (top: number) => Math.max(0, Math.min(top + tray.height, thing.bottom) - Math.max(top, thing.top));
  return overlap(highest) < overlap(tray.top) ? Math.min(0, highest - tray.top) : 0;
}
