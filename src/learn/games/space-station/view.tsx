import React, { useMemo } from "react";
import type { BoardProps } from "../../types";
import { BoardSpaceProvider } from "../../BoardSpace";
import { SCHOOL_BOARD_MIN } from "../../boardGeometry";
import { InquiryBoard } from "../../inquiry/InquiryBoard";
import type { InquiryState } from "../../inquiry/engine";
import type { ScienceState } from "../weather-watch/model";
import { ScienceBoard, ScienceArt } from "../weather-watch/ScienceBoard";
import { isInquiry, type StationState } from "./engine";
import { investigations } from "./investigations";
import { StationScene, stationLegend } from "./Scene";

const theme = { ink: "#3D2B24", accent: "#1E6B66", card: "#FFFDF8", line: "#E8D8BE", chosen: "#DFF2EC" };

/** Fresh rounds are K6 inquiry rounds. A saved version-1 round keeps its shared science board and legacy layout (K8). */
export function Board(props: BoardProps<StationState>) {
  const state = props.session.state, inquiry = isInquiry(state);
  const qs = useMemo(() => (inquiry ? investigations(state.level, state.seed) : []), [inquiry, state.level, state.seed]);
  if (!inquiry)
    return <BoardSpaceProvider space={null} geometryEnabled={false}><ScienceBoard {...(props as BoardProps<ScienceState>)} game="space-station" /></BoardSpaceProvider>;
  return <InquiryBoard {...(props as BoardProps<InquiryState>)} qs={qs} Scene={StationScene} legend={stationLegend}
    board="space-station" floor={SCHOOL_BOARD_MIN["space-station"]} skill="sci.space-station" theme={theme} />;
}
export function Art({ size }: { size: number }) {
  return <ScienceArt game="space-station" size={size} />;
}
