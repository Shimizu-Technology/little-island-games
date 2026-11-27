import { Status, C, Button } from "../../board/WarmUI";


import React, { useState } from "react";
import { View } from "react-native";

import { MazeState, directions, mazeDone, mazeMove, mazeRoute } from "../../games/maze";

import { Controls, IconButton } from "../../components/ui";

import { Icon } from "../../components/Icon";

import { Symbol } from "../../components/Art";
import { type Props, Cell, BoardArea, BoardLayout } from "./shared";
export function MazeBoard({ state: s, commit, width, sound }: Props<MazeState>) {
  const [hint, setHint] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const done = mazeDone(s),
    current = s.path[s.path.length - 1],
    cellSize = Math.floor(Math.min(width, 470) / s.size),
    size = cellSize * s.size;
  function move(i: number, directional = false) {
    const next = mazeMove(s, i);
    const adjacent = Math.abs(Math.floor(i / s.size) - Math.floor(current / s.size)) + Math.abs(i % s.size - current % s.size) === 1;
    setBlocked(next === s && !done && (directional || adjacent));
    if (next !== s) {
      setHint(null);
      commit(next);
      sound("tap");
    }
  }
  return (
    <BoardLayout>
      <Status
        title={done ? "You found your island!" : "Where will your path go?"}
        detail={
          done ? "A whole little adventure, one step at a time." : blocked ? "A wall is here. Try another opening; your path is safe." : "Find your way from the boat to the flag."
        }
        success={done}
      />
      <BoardArea>
        <View style={{ alignSelf: "center", width: size, backgroundColor: C.paper }}>
          {Array.from({ length: s.size }, (_, r) => (
            <View key={r} style={{ width: size, height: cellSize, flexDirection: "row" }}>
              {s.walls.slice(r * s.size, (r + 1) * s.size).map((wall, c) => {
                const i = r * s.size + c;
                const here = current === i,
                  visited = s.path.includes(i);
                return (
                  <Cell
                    key={i}
                    label={`Maze row ${Math.floor(i / s.size) + 1}, column ${(i % s.size) + 1}${here ? ", you are here" : ""}${i === s.walls.length - 1 ? ", finish flag" : ""}`}
                    disabled={done}
                    onPress={() => move(i)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderTopWidth: wall & 1 ? 2 : 0,
                      borderRightWidth: wall & 2 ? 2 : 0,
                      borderBottomWidth: wall & 4 ? 2 : 0,
                      borderLeftWidth: wall & 8 ? 2 : 0,
                      borderColor: C.teal,
                      backgroundColor: hint === i ? "#F4D88D" : visited ? "#E9F0DB" : C.paper,
                    }}
                  >
                    {here ? (
                      <Symbol name="boat" size={cellSize * 0.8} />
                    ) : i === s.walls.length - 1 ? (
                      <Icon name="flag" size={cellSize * 0.6} color={C.coral} />
                    ) : visited ? (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#95B7A0" }} />
                    ) : null}
                  </Cell>
                );
              })}
            </View>
          ))}
        </View>
      </BoardArea>
      <View style={{ alignItems: "center", marginTop: 12, gap: 8 }}>
        <IconButton
          icon="up"
          size={48}
          disabled={done}
          label="Move up"
          onPress={() => move(current - s.size, true)}
        />
        <View style={{ flexDirection: "row", gap: 9 }}>
          {[3, 2, 1].map((d) => (
            <IconButton
              key={d}
              icon={d === 3 ? "left" : d === 2 ? "down" : "right"}
              size={48}
              disabled={done}
              label={`Move ${directions[d].name.toLowerCase()}`}
              onPress={() => move(current + directions[d].dr * s.size + directions[d].dc, true)}
            />
          ))}
        </View>
      </View>
      <Controls>
        <Button quiet disabled={done} onPress={() => setHint(mazeRoute(s)[1] ?? null)}>
          Show the next step
        </Button>
        <Button
          quiet
          disabled={s.path.length < 2}
          onPress={() => commit({ ...s, path: s.path.slice(0, -1) })}
        >
          Go back a step
        </Button>
      </Controls>
    </BoardLayout>
  );
}
