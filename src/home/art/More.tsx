/**
 * Little Island 2.1 contract: art for catalogMore items and extra room shells.
 * Owned by the art slice. Same props as ItemArt plus `tint`.
 * RoomShellArt must use the SAME 800×560 viewBox, floor polygon, floor grid and wall band as RoomArt
 * (see geometry.ts) so placement, depth and seats work unchanged in every room.
 */
import React from "react";
import Svg, { Rect } from "react-native-svg";
import type { HomeState } from "../model";
import type { TintId, RoomId } from "../catalogMore";

export function MoreItemArt({ id, size = 120, mirrored = false, rotation = 0, active = false, muted = false, tint = "original" }: {
  id: string; size?: number; mirrored?: boolean; rotation?: 0 | 90 | 180 | 270; active?: boolean; muted?: boolean; tint?: TintId;
}) {
  void id; void mirrored; void rotation; void active; void muted; void tint;
  return <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}><Rect x={20} y={50} width={80} height={40} rx={10} fill="#E9B8A6" stroke="#47655B" strokeWidth={2.5} /></Svg>;
}

/** Room shell for rooms other than "home" (which keeps RoomArt). Placeholder until the art slice lands. */
export function RoomShellArt({ room, theme }: { room: Exclude<RoomId, "home">; theme: HomeState["theme"] }) {
  void room; void theme;
  return null;
}
