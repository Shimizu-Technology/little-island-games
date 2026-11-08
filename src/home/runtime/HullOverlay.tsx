import React, { useMemo } from "react";
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect } from "react-native-svg";
import { roomIds } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import { faceRadius, handMagnet } from "../scene/resolve";
import { prepareHits } from "./pick";
import type { HitShape, Scene } from "../scene/types";

function Shape({ shape, color }: { shape: HitShape; color: string }) {
  const paint = { fill: color, fillOpacity: 0.16, stroke: color, strokeWidth: 2 };
  if (shape.kind === "box") return <Rect x={shape.left} y={shape.top} width={shape.width} height={shape.height} {...paint} />;
  if (shape.kind === "ellipse") return <Ellipse cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} {...paint} />;
  if (shape.kind === "capsule")
    return <Line x1={shape.ax} y1={shape.ay} x2={shape.bx} y2={shape.by} stroke={color} strokeOpacity={0.45} strokeWidth={shape.r * 2} strokeLinecap="round" />;
  return <Polygon points={shape.points.join(" ")} {...paint} />;
}

/** Lab frame check: hit shapes, face zones and hand magnets drawn where the app actually tests them. */
export function HullOverlay({ scene, building, scale }: { scene: Scene; building: Building; scale: number }) {
  const hits = useMemo(() => prepareHits(scene), [scene]);
  return (
    <Svg pointerEvents="none" width={building.width} height={building.height} style={{ position: "absolute", left: 0, top: 0 }}>
      {roomIds.map((room, index) => {
        const origin = roomOrigin(index, building);
        return (
          <G key={room} transform={`translate(${origin.x} ${origin.y})`}>
            {hits[room].map((proxy, i) => (
              <Shape key={`${proxy.id}:${i}`} shape={proxy.shape} color={scene.entities[proxy.id]?.character ? "#2C6FD6" : "#2E9C5B"} />
            ))}
            {scene.rooms[room].targets.map((target) =>
              target.face ? (
                <G key={target.id}>
                  <Circle cx={target.face.x} cy={target.face.y} r={faceRadius(target.face.headRadius, scale)} fill="none" stroke="#E77C1E" strokeWidth={3} strokeDasharray="10 6" />
                  <Circle cx={target.contact.x} cy={target.contact.y} r={5} fill="#E77C1E" />
                </G>
              ) : target.kind === "hand" ? (
                <Circle key={target.id} cx={target.contact.x} cy={target.contact.y} r={handMagnet.minPt / scale} fill="none" stroke="#B23BC2" strokeWidth={2} strokeDasharray="6 5" />
              ) : null
            )}
          </G>
        );
      })}
    </Svg>
  );
}
