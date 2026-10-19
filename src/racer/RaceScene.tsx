import React, { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { raceCourse } from "./courses";
import { obstaclePosition, RaceSession } from "./engine";
const UNIT = 38;
type Node = G<unknown>;
function move(node: Node | null, x: number, y: number, sy = 1) {
  if (!node) return;
  if (Platform.OS === "web")
    node.setNativeProps({ style: { transform: `matrix(1 0 0 ${sy} ${x} ${y})` } } as unknown as Parameters<
      Node["setNativeProps"]
    >[0]);
  else node.setNativeProps({ matrix: [1, 0, 0, sy, x, y] });
}
export type RaceSceneHandle = { draw: (session: RaceSession) => void };
/** Static world is memoized. Only camera, runner and obstacle SVG transforms change per frame. */
export const RaceScene = memo(
  forwardRef<RaceSceneHandle, { initial: RaceSession; width: number; height: number; reducedMotion: boolean }>(
    function RaceScene({ initial, width: frameWidth, height: frameHeight }, ref) {
      // Preserve full jump headroom when a short landscape viewport scales the world down.
      const scale = Math.min(1, frameHeight / 255),
        width = frameWidth / scale,
        height = frameHeight / scale;
      const camera = useRef<Node | null>(null),
        actors = useRef<(Node | null)[]>([]),
        hazards = useRef<(Node | null)[]>([]);
      const course = raceCourse(initial.course),
        ground = height * 0.69;
      const draw = (s: RaceSession) => {
        const cx = Math.max(0, Math.min(course.length * UNIT - width * 0.7, s.runners[0].x * UNIT - width * 0.26));
        move(camera.current, -cx, 0);
        for (const [i, r] of s.runners.entries())
          move(actors.current[i], r.x * UNIT, ground - r.y * UNIT - (i ? 5 + i * 3 : 0));
        for (const [i, o] of course.obstacles.entries()) {
          const p = obstaclePosition(o, s.tick);
          // No cosmetic spin/bob; mechanical movement remains truthful with reduced motion.
          move(hazards.current[i], p.x * UNIT, ground - o.y * UNIT, o.kind === "gate" ? p.height / o.height : 1);
        }
      };
      useImperativeHandle(ref, () => ({ draw }));
      React.useLayoutEffect(() => {
        draw(initial);
      });
      return (
        <View
          accessible={false}
          style={{
            overflow: "hidden",
            borderRadius: 22,
            borderWidth: 2,
            borderColor: "#246858",
            backgroundColor: course.sky,
          }}
        >
          <Svg width="100%" height={frameHeight} viewBox={`0 0 ${width} ${height}`} accessible={false}>
            <Rect width={width} height={height} fill={course.sky} />
            <Circle cx={width * 0.83} cy={height * 0.18} r={24} fill="#F6D784" />
            <Path
              d={`M-20 ${ground - 30} Q${width * 0.15} ${ground - 115} ${width * 0.38} ${ground - 30} T${width + 30} ${ground - 20} L${width + 30} ${height} H-20Z`}
              fill="#A3CFC2"
              opacity={0.42}
            />
            <Rect y={ground + 18} width={width} height={height} fill="#7ABBB8" />
            {[0.1, 0.35, 0.6, 0.88].map((v, i) => (
              <Path
                key={i}
                d={`M${v * width} ${ground + 42 + (i % 2) * 17} q15 -5 30 0 t30 0`}
                stroke="#BCE1D8"
                strokeWidth={3}
                fill="none"
              />
            ))}
            <G ref={camera}>
              {course.platforms.map((p, i) => {
                const x = p.from * UNIT,
                  y = ground - p.y * UNIT,
                  w = (p.to - p.from) * UNIT;
                return (
                  <G key={i}>
                    <Rect x={x} y={y} width={w} height={height + 100} fill={course.edge} />
                    <Polygon
                      points={`${x},${y} ${x + 10},${y - 12} ${x + w + 10},${y - 12} ${x + w},${y}`}
                      fill={course.land}
                    />
                    <Rect x={x} y={y} width={w} height={8} fill={course.land} />
                    {Array.from({ length: Math.ceil(w / 48) }, (_, n) => (
                      <Path
                        key={n}
                        d={`M${x + n * 48 + 10} ${y + 28} l8 3 m12 18 l6 -2`}
                        stroke={course.land}
                        opacity={0.35}
                        strokeWidth={2}
                      />
                    ))}
                    {p.belt &&
                      Array.from({ length: Math.floor(w / 35) }, (_, n) => (
                        <Path
                          key={`b${n}`}
                          d={`M${x + 15 + n * 35} ${y - 5} l${p.belt! > 0 ? 7 : -7} -3 l${p.belt! > 0 ? -7 : 7} -3`}
                          stroke="#5E654E"
                          fill="none"
                          strokeWidth={2}
                        />
                      ))}
                  </G>
                );
              })}
              {course.checkpoints.map((x, i) => {
                const p = course.platforms.find((p) => x >= p.from && x <= p.to)!;
                const y = ground - p.y * UNIT;
                return (
                  <G key={x}>
                    <Line x1={x * UNIT} y1={y} x2={x * UNIT} y2={y - 54} stroke="#426D60" strokeWidth={3} />
                    <Path d={`M${x * UNIT} ${y - 54} l26 5 l-26 12Z`} fill="#FFF7DC" />
                    <SvgText x={x * UNIT + 6} y={y - 42} fontSize={11} fontWeight="bold" fill="#246858">
                      {i + 1}
                    </SvgText>
                  </G>
                );
              })}
              {course.obstacles.map((o, i) => (
                <G
                  ref={(n) => {
                    hazards.current[i] = n as unknown as Node;
                  }}
                  key={i}
                >
                  {o.kind === "roller" ? (
                    <G>
                      <Circle
                        cy={(-o.height * UNIT) / 2}
                        r={(o.width * UNIT) / 2}
                        fill="#B9744D"
                        stroke="#F7D397"
                        strokeWidth={3}
                      />
                      <Circle cy={(-o.height * UNIT) / 2} r={4} fill="#754B3D" />
                      <Path
                        d={`M-7 ${(-o.height * UNIT) / 2 - 7} l14 14 M7 ${(-o.height * UNIT) / 2 - 7} l-14 14`}
                        stroke="#DCAC6E"
                        strokeWidth={2}
                      />
                    </G>
                  ) : (
                    <G>
                      <Rect
                        x={(-o.width * UNIT) / 2}
                        y={-o.height * UNIT}
                        width={o.width * UNIT}
                        height={o.height * UNIT}
                        rx={4}
                        fill={o.kind === "gate" ? "#E0B353" : "#CB775B"}
                        stroke="#FFF0CF"
                        strokeWidth={2}
                      />
                      <Path
                        d={`M${(-o.width * UNIT) / 2 + 5} ${-o.height * UNIT + 5} v${o.height * UNIT - 10}`}
                        stroke="#FFFFFF"
                        opacity={0.5}
                        strokeWidth={3}
                      />
                    </G>
                  )}
                </G>
              ))}
              <G transform={`translate(${course.length * UNIT},${ground})`}>
                <Line y2={-78} stroke="#214D44" strokeWidth={4} />
                <Rect y={-78} width={44} height={28} rx={3} fill="#FFF9E6" />
                {[0, 1, 2, 3].map((n) => (
                  <Rect key={n} x={n * 11} y={-78 + (n % 2) * 14} width={11} height={14} fill="#246858" />
                ))}
                <SvgText x={-12} y={-88} fontSize={11} fontWeight="bold" fill="#214D44">
                  FINISH
                </SvgText>
              </G>
              {[...initial.runners.keys()].reverse().map((i) => (
                <G
                  key={i}
                  ref={(n) => {
                    actors.current[i] = n as unknown as Node;
                  }}
                >
                  <Ellipse cy={2} rx={10} ry={4} fill="#214D44" opacity={0.18} />
                  <Rect
                    x={-7}
                    y={-27}
                    width={14}
                    height={20}
                    rx={7}
                    fill={["#246858", "#C57753", "#4A82A3", "#9A719E"][i]}
                    stroke="#FFF8E8"
                    strokeWidth={1.5}
                  />
                  <Circle
                    cy={-30}
                    r={9}
                    fill={["#246858", "#C57753", "#4A82A3", "#9A719E"][i]}
                    stroke="#FFF8E8"
                    strokeWidth={1.5}
                  />
                  <Circle cx={4} cy={-31} r={1.7} fill="#FFF8E8" />
                  <Path d="M-4 -7 l-2 7 M4 -7 l2 7" stroke="#214D44" strokeWidth={4} strokeLinecap="round" />
                  {i === 0 && <Path d="M-5 -46 l5 6 l5 -6Z" fill="#E3B151" />}
                  <SvgText y={-52} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#214D44">
                    {i === 0 ? "YOU" : initial.runners[i].name}
                  </SvgText>
                </G>
              ))}
            </G>
          </Svg>
        </View>
      );
    }
  )
);
