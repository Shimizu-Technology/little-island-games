import { ExploreProgress, validExploreProgress } from "../explore/progress";
import { GameId, GameState, gameIds } from "../games";
import { checkersResult } from "../games/checkers";
import { ticOutcome, lines } from "../games/tic";
import { memorySymbols } from "../games/memory";
import { WordRecords, validWordRecords } from "./wordRecords";
import { Activities, ActivityId, activityIds, validActivities, validActivityRecords } from "./activities";
import type { RaceRecords } from "../racer/engine";
import { normalizeExploreFavorites, topicById } from "../explore/content";
export type Settings = { sound: boolean; help: boolean };
export type Save = {
  version: 1;
  settings: Settings;
  sessions: Partial<Record<GameId, GameState>>;
  recent: GameId | null;
  wordRecords?: WordRecords;
  activities?: Activities;
  recentActivity?: ActivityId | null;
  raceRecords?: RaceRecords;
  explore?: { favorites: string[]; progress?: ExploreProgress };
};
export const emptySave = (): Save => ({
  version: 1,
  settings: { sound: true, help: true },
  sessions: {},
  recent: null,
});
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const nums = (v: unknown, min: number, max: number, limit: number): v is number[] =>
  Array.isArray(v) && v.length <= limit && v.every((n) => int(n, min, max));
const unique = (v: unknown[]) => new Set(v).size === v.length;
const strings = (v: unknown, max: number, count: number): v is string[] =>
  Array.isArray(v) && v.length <= count && v.every((n) => typeof n === "string" && n.length <= max);
function validPosition(v: unknown): boolean {
  if (
    !obj(v) ||
    !nums(v.board, -2, 2, 64) ||
    v.board.length !== 64 ||
    ![1, -1].includes(v.turn as number) ||
    !int(v.quiet, 0, 80) ||
    !obj(v.repetitions) ||
    Object.keys(v.repetitions).length > 1000 ||
    !Object.entries(v.repetitions).every(([k, n]) => k.length <= 200 && int(n, 1, 3)) ||
    ![null, "red", "blue", "draw"].includes(v.outcome as null)
  )
    return false;
  if (
    v.board.some((p, i) => p !== 0 && (Math.floor(i / 8) + (i % 8)) % 2 !== 1) ||
    v.board.filter((p) => p > 0).length > 12 ||
    v.board.filter((p) => p < 0).length > 12
  )
    return false;
  // Engine's terminal truth must agree with imported outcomes.
  return checkersResult(v as unknown as Parameters<typeof checkersResult>[0]) === v.outcome;
}
function validBoard(v: unknown): v is ("X" | "O" | null)[] {
  if (!Array.isArray(v) || v.length !== 9 || !v.every((m) => m === null || m === "X" || m === "O")) return false;
  const x = v.filter((m) => m === "X").length,
    o = v.filter((m) => m === "O").length;
  if (x !== o && x !== o + 1) return false;
  const xWins = lines.some((line) => line.every((i) => v[i] === "X")),
    oWins = lines.some((line) => line.every((i) => v[i] === "O"));
  return !(xWins && oWins) && (!xWins || x === o + 1) && (!oWins || x === o);
}
export function validSession(v: unknown): v is GameState {
  if (
    !obj(v) ||
    !gameIds.includes(v.game as GameId) ||
    typeof v.id !== "string" ||
    v.id.length > 100 ||
    !obj(v.options) ||
    !["easy", "medium", "hard"].includes(v.options.difficulty as string) ||
    !["solo", "together"].includes(v.options.mode as string) ||
    typeof v.options.computerFirst !== "boolean" ||
    (v.options.checkersRules !== undefined && !["friendly", "classic"].includes(v.options.checkersRules as string)) ||
    (v.options.wordRules !== undefined && !["practice", "challenge"].includes(v.options.wordRules as string))
  )
    return false;
  switch (v.game) {
    case "tic-tac-toe": {
      if (
        !validBoard(v.board) ||
        !["X", "O"].includes(v.human as string) ||
        !Array.isArray(v.history) ||
        v.history.length > 9 ||
        !v.history.every(validBoard) ||
        v.history.length !== v.board.filter(Boolean).length
      )
        return false;
      const states = [...v.history, v.board] as ("X" | "O" | null)[][];
      return states.every((b, j) => {
        if (!j) return b.every((m) => m === null);
        const previous = states[j - 1],
          changed = b.flatMap((m, i) => (m !== previous[i] ? [i] : []));
        return (
          !ticOutcome(previous) &&
          changed.length === 1 &&
          previous[changed[0]] === null &&
          b[changed[0]] === (j % 2 === 1 ? "X" : "O")
        );
      });
    }
    case "word-rescue": {
      const valid =
        typeof v.word === "string" &&
        /^[A-Z]{2,12}$/.test(v.word) &&
        typeof v.clue === "string" &&
        v.clue.length <= 300 &&
        typeof v.category === "string" &&
        v.category.length <= 50 &&
        strings(v.guessed, 1, 26) &&
        unique(v.guessed) &&
        v.guessed.every((l) => /^[A-Z]$/.test(l)) &&
        int(v.hints, 0, 12) &&
        typeof v.custom === "boolean" &&
        strings(v.seen, 12, 60);
      if (!valid) return false;
      const word = v.word as string,
        guessed = v.guessed as string[];
      const found = [...new Set(word)].filter((letter) => guessed.includes(letter)).length;
      const wrong = guessed.filter((letter) => !word.includes(letter)).length;
      return (
        (v.hints as number) <= found &&
        (v.options.wordRules !== "challenge" ||
          ((v.hints as number) <= 1 && wrong <= 6 && !(wrong === 6 && found === new Set(word).size)))
      );
    }
    case "memory": {
      if (
        !strings(v.cards, 20, 24) ||
        ![12, 16, 24].includes(v.cards.length) ||
        !nums(v.matched, 0, v.cards.length - 1, 24) ||
        !unique(v.matched) ||
        v.matched.length % 2 !== 0 ||
        !nums(v.open, 0, v.cards.length - 1, 2) ||
        !unique(v.open) ||
        v.open.some((i) => (v.matched as number[]).includes(i)) ||
        !int(v.turns, 0, 100000) ||
        ![0, 1].includes(v.player as number) ||
        !nums(v.scores, 0, 12, 2) ||
        v.scores.length !== 2
      )
        return false;
      const counts = v.cards.reduce<Record<string, number>>((a, c) => ({ ...a, [c]: (a[c] ?? 0) + 1 }), {});
      const matchedCounts = v.matched.reduce<Record<string, number>>(
        (a, i) => ({ ...a, [(v.cards as string[])[i]]: (a[(v.cards as string[])[i]] ?? 0) + 1 }),
        {}
      );
      const expectedCards = v.options.difficulty === "easy" ? 12 : v.options.difficulty === "medium" ? 16 : 24;
      return (
        v.cards.length === expectedCards &&
        v.cards.every((c) => memorySymbols.includes(c)) &&
        Object.values(counts).every((n) => n === 2) &&
        Object.values(matchedCounts).every((n) => n === 2) &&
        v.scores[0] + v.scores[1] === v.matched.length / 2 &&
        v.turns >= v.matched.length / 2 &&
        (v.open.length < 2 || v.cards[v.open[0]] !== v.cards[v.open[1]])
      );
    }
    case "checkers":
      return (
        validPosition(v.position) &&
        Array.isArray(v.history) &&
        v.history.length <= 160 &&
        v.history.every(validPosition) &&
        (v.lesson === null || int(v.lesson, 0, 3)) &&
        (v.lesson === null
          ? v.lessonBackup === null
          : obj(v.lessonBackup) &&
            validPosition(v.lessonBackup.position) &&
            Array.isArray(v.lessonBackup.history) &&
            v.lessonBackup.history.length <= 160 &&
            v.lessonBackup.history.every(validPosition))
      );
    case "maze": {
      if (
        ![5, 7, 9].includes(v.size as number) ||
        !nums(v.walls, 0, 15, 81) ||
        v.walls.length !== (v.size as number) ** 2 ||
        !nums(v.path, 0, v.walls.length - 1, 10000) ||
        !v.path.length ||
        v.path[0] !== 0 ||
        !int(v.seed, 0, 0xffffffff)
      )
        return false;
      const size = v.size as number,
        walls = v.walls;
      for (let i = 0; i < walls.length; i++) {
        const r = Math.floor(i / size),
          c = i % size,
          w = walls[i];
        if (
          (r === 0 && !(w & 1)) ||
          (c === 0 && !(w & 8)) ||
          (r === size - 1 && !(w & 4)) ||
          (c === size - 1 && !(w & 2))
        )
          return false;
        if (
          (c < size - 1 && !!(w & 2) !== !!(walls[i + 1] & 8)) ||
          (r < size - 1 && !!(w & 4) !== !!(walls[i + size] & 1))
        )
          return false;
      }
      const visited = new Set([0]),
        queue = [0];
      while (queue.length) {
        const cell = queue.pop()!;
        for (const [bit, delta] of [
          [1, -size],
          [2, 1],
          [4, size],
          [8, -1],
        ])
          if (!(walls[cell] & bit) && !visited.has(cell + delta)) {
            visited.add(cell + delta);
            queue.push(cell + delta);
          }
      }
      return (
        visited.size === walls.length &&
        v.path.every((cell, j) => {
          if (!j) return true;
          const prev = (v.path as number[])[j - 1],
            dr = Math.floor(cell / size) - Math.floor(prev / size),
            dc = (cell % size) - (prev % size);
          const bit =
            dr === -1 && dc === 0
              ? 1
              : dr === 1 && dc === 0
                ? 4
                : dc === 1 && dr === 0
                  ? 2
                  : dc === -1 && dr === 0
                    ? 8
                    : 0;
          return !!bit && !(walls[prev] & bit);
        })
      );
    }
    case "numbers": {
      const expectedMax = v.options.difficulty === "easy" ? 6 : v.options.difficulty === "medium" ? 9 : 12;
      if (v.maxNumber !== undefined && v.maxNumber !== expectedMax) return false;
      const max = (v.maxNumber ?? (v.options.difficulty === "easy" ? 6 : 9)) as number,
        count = v.options.difficulty === "easy" ? 1 : 2;
      const valid = (x: unknown) =>
        obj(x) &&
        nums(x.available, 1, max, max) &&
        unique(x.available) &&
        nums(x.dice, 1, 6, count) &&
        [0, count].includes(x.dice.length) &&
        int(x.seed, 0, 0xffffffff) &&
        int(x.turns, 0, max);
      return (
        valid(v) &&
        nums(v.selected, 1, max, max) &&
        unique(v.selected) &&
        v.selected.every((n) => (v.available as number[]).includes(n)) &&
        ((v.dice as number[]).length > 0 || v.selected.length === 0) &&
        Array.isArray(v.history) &&
        v.history.length === v.turns &&
        v.history.every(valid)
      );
    }
    default:
      return false;
  }
}
export function parseSave(raw: string): Save {
  if (raw.length > 2_000_000) throw new Error("This backup is too large.");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error("This save is not readable JSON. Your original has been kept.");
  }
  if (!obj(v) || v.version !== 1)
    throw new Error("This save uses an unsupported version. Your original has been kept.");
  if (
    !obj(v.settings) ||
    typeof v.settings.sound !== "boolean" ||
    typeof v.settings.help !== "boolean" ||
    !obj(v.sessions) ||
    Object.keys(v.sessions).some((k) => !gameIds.includes(k as GameId)) ||
    !Object.entries(v.sessions).every(([k, s]) => validSession(s) && s.game === k) ||
    (v.recent !== null && !gameIds.includes(v.recent as GameId)) ||
    (v.wordRecords !== undefined && !validWordRecords(v.wordRecords)) ||
    (v.activities !== undefined && !validActivities(v.activities)) ||
    (v.recentActivity !== undefined &&
      v.recentActivity !== null &&
      !activityIds.includes(v.recentActivity as ActivityId)) ||
    (v.raceRecords !== undefined && !validActivityRecords(v.raceRecords)) ||
    (v.explore !== undefined &&
      (!obj(v.explore) ||
        !Array.isArray(v.explore.favorites) ||
        v.explore.favorites.length > 50 ||
        !v.explore.favorites.every((id: unknown) => typeof id === "string" && !!topicById(id)) ||
        normalizeExploreFavorites(v.explore.favorites).length !== v.explore.favorites.length ||
        (v.explore.progress !== undefined && !validExploreProgress(v.explore.progress))))
  )
    throw new Error("Some saved game data is invalid. Your original has been kept.");
  return v as unknown as Save;
}
