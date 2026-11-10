/**
 * AR-00 boundary table. Every value is read from the real level descriptors or the
 * real engine's runtime curve functions, never retyped. A metric "eases" when the next
 * level in a chain is easier on it than the level before. Each easing must be named in
 * restBeats.ts, either as a deliberate rest beat or with a stated reason and owner row.
 */
import { reefLevels } from "./games/reef-builder/engine";
import { createSong, noteDuration, songLevels, songResult, songStep, songTransition, type SongState } from "./games/shell-song/engine";
import { createRail, railLevels, railTick } from "./games/rail-parade/engine";
import { createCrab, crabLanes, crabLevels, crabPace } from "./games/crab-crossing/engine";
import { createPalm, palmLevels, palmMarchSpeed } from "./games/palm-patrol/engine";
import { beachLevels, beachStartSpeed, createBeach, paddleWidth } from "./games/beach-ball/engine";
import { createFlight, flightGap, flightSpeed } from "./games/fruit-bat-flight/engine";
import { createRun, runSpeed } from "./games/lagoon-run/engine";
import { flightLevels, runLevels } from "./games/scrolling/content";
import { cargoGravity, cargoLevels, createCargo } from "./games/canoe-cargo/engine";
import { arcadeIds, type ArcadeId, type LevelId } from "./types";

/** "up": a larger value is harder. "down": a smaller value is harder. */
export type Direction = "up" | "down";
export type MetricSpec = { id: string; label: string; harder: Direction; kind: "workload" | "reaction" | "spawn" | "memory" | "hazard"; unit?: string };
export type LevelRow = { level: LevelId; values: Record<string, number | null> };
export type HelperRow = { level: LevelId; metric: string; off: number; on: number; harder: Direction };
export type GameTable = { game: ArcadeId; metrics: readonly MetricSpec[]; rows: readonly LevelRow[]; helper: readonly HelperRow[] };
export type Easing = { game: ArcadeId; chain: "worlds" | "learn"; from: LevelId; level: LevelId; metric: string; before: number; after: number; boundary: boolean };

const round = (n: number) => Number(n.toFixed(4));
const ordinary = (id: string) => !id.startsWith("learn-");

/** Plays a perfect Shell Song round on the real engine and counts independent recall units. */
export function songUnits(level: (typeof songLevels)[number]): { longestShown: number; longestUnits: number } {
  let s: SongState = createSong(level, 42, false), steps = 0, longestShown = 0, longestUnits = 0;
  while (!songResult(s) && steps++ < 4000) {
    if (s.phase === "watch") { s = songStep(s, { type: "tick" }, 1 / 30); continue; }
    if (s.phase === "picture") { s = songTransition(s, { type: "picture", word: level.word! }); continue; }
    if (s.phase === "repeat") {
      if (s.cursor === 0) {
        // Paired notes repeat the same shell; a pair is one thing to remember.
        const units = level.twist === "twins" ? s.pattern.length / 2 : s.pattern.length;
        longestShown = Math.max(longestShown, s.pattern.length); longestUnits = Math.max(longestUnits, units);
      }
      s = songTransition(s, { type: "shell", index: s.pattern[s.cursor] });
      continue;
    }
    throw new Error(`Unexpected Shell Song phase ${s.phase}`);
  }
  if (!songResult(s)?.cleared) throw new Error(`Shell Song ${level.id} perfect replay did not clear`);
  return { longestShown, longestUnits };
}

function table(game: ArcadeId): GameTable {
  switch (game) {
    case "reef-builder": return {
      game, metrics: [
        { id: "lines", label: "Lines to clear", harder: "up", kind: "workload" },
        { id: "shapes", label: "Shape pool", harder: "up", kind: "hazard" },
        { id: "rocks", label: "Rocks", harder: "up", kind: "hazard" },
      ],
      rows: reefLevels.map(l => ({ level: l.id, values: { lines: l.target, shapes: l.complexity, rocks: l.rocks.length } })),
      helper: [],
    };
    case "shell-song": return {
      game, metrics: [
        { id: "shells", label: "Shells", harder: "up", kind: "hazard" },
        { id: "units", label: "Longest phrase, independent units", harder: "up", kind: "memory" },
        { id: "phrases", label: "Phrases", harder: "up", kind: "workload" },
        { id: "noteMs", label: "Note length", harder: "down", kind: "reaction", unit: "ms" },
      ],
      rows: songLevels.map(l => ({ level: l.id, values: { shells: l.shells, units: songUnits(l).longestUnits, phrases: l.rounds, noteMs: l.noteMs } })),
      helper: songLevels.map(l => ({ level: l.id, metric: "noteMs", off: noteDuration(createSong(l, 42, false)), on: noteDuration(createSong(l, 42, true)), harder: "down" as const })),
    };
    case "rail-parade": return {
      game, metrics: [
        { id: "tick", label: "Step time", harder: "down", kind: "reaction", unit: "s" },
        { id: "food", label: "Food to collect", harder: "up", kind: "workload" },
        { id: "hedges", label: "Hedge cells", harder: "up", kind: "hazard" },
        { id: "snake", label: "Moving snake span", harder: "up", kind: "hazard" },
      ],
      rows: railLevels.map(l => ({ level: l.id, values: { tick: round(l.tick), food: l.target, hedges: l.hedges.length, snake: l.snakeSpan } })),
      helper: railLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "tick", off: round(railTick(createRail(l, 42, false))), on: round(railTick(createRail(l, 42, true))), harder: "down" as const })),
    };
    case "crab-crossing": {
      const lanes = (l: (typeof crabLevels)[number]) => crabLanes(createCrab(l, 42, false));
      return {
        game, metrics: [
          { id: "speed", label: "Lane speed", harder: "up", kind: "reaction", unit: "tiles/s" },
          { id: "burrows", label: "Burrows", harder: "up", kind: "workload" },
          { id: "lanes", label: "Moving lanes", harder: "up", kind: "hazard" },
          { id: "period", label: "Shortest lane period", harder: "down", kind: "spawn", unit: "s" },
        ],
        rows: crabLevels.map(l => {
          const moving = lanes(l).filter(v => v.speed !== 0);
          return { level: l.id, values: ordinary(l.id) ? { speed: round(l.speed), burrows: l.target, lanes: moving.length, period: round(Math.min(...moving.map(v => v.spacing / Math.abs(v.speed)))) } : { speed: null, burrows: null, lanes: null, period: null } };
        }),
        helper: crabLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "pace", off: round(crabPace(createCrab(l, 42, false))), on: round(crabPace(createCrab(l, 42, true))), harder: "up" as const })),
      };
    }
    case "palm-patrol": return {
      game, metrics: [
        { id: "speed", label: "March speed", harder: "up", kind: "reaction", unit: "px/s" },
        { id: "workload", label: "Nominal beetles (count × waves × relays)", harder: "up", kind: "workload" },
        { id: "dive", label: "Dive interval", harder: "down", kind: "spawn", unit: "s" },
        { id: "facts", label: "Facts", harder: "up", kind: "workload" },
      ],
      rows: palmLevels.map(l => ({ level: l.id, values: ordinary(l.id) ? { speed: round(l.speed), workload: l.count * l.waves * l.relays, dive: l.diveEvery > 0 ? round(l.diveEvery) : null, facts: null } : { speed: null, workload: null, dive: null, facts: l.facts } })),
      helper: palmLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "march", off: round(palmMarchSpeed(createPalm(l, 42, false))), on: round(palmMarchSpeed(createPalm(l, 42, true))), harder: "up" as const })),
    };
    case "beach-ball": return {
      game, metrics: [
        { id: "serve", label: "Serve speed", harder: "up", kind: "reaction", unit: "px/s" },
        { id: "points", label: "Points to win", harder: "up", kind: "workload" },
        { id: "balls", label: "Balls", harder: "up", kind: "hazard" },
        { id: "wind", label: "Wind", harder: "up", kind: "hazard" },
        { id: "spin", label: "Edge spin", harder: "up", kind: "hazard" },
      ],
      rows: beachLevels.map(l => ({ level: l.id, values: { serve: l.speed, points: l.target * l.countBy, balls: l.balls, wind: l.wind, spin: l.spin } })),
      helper: beachLevels.flatMap(l => {
        const off = createBeach(l, 42, false), on = createBeach(l, 42, true);
        return [
          { level: l.id, metric: "serve", off: round(beachStartSpeed(off)), on: round(beachStartSpeed(on)), harder: "up" as const },
          { level: l.id, metric: "paddle", off: paddleWidth(off), on: paddleWidth(on), harder: "down" as const },
        ];
      }),
    };
    case "fruit-bat-flight": return {
      game, metrics: [
        { id: "speed", label: "Flight speed", harder: "up", kind: "reaction" },
        { id: "gap", label: "Opening", harder: "down", kind: "hazard" },
        { id: "gates", label: "Palms to pass", harder: "up", kind: "workload" },
        { id: "interval", label: "Gate interval at start", harder: "down", kind: "spawn", unit: "s" },
      ],
      rows: flightLevels.map(l => ({ level: l.id, values: { speed: round(l.speed), gap: round(l.gap), gates: l.target, interval: round(l.spacing / flightSpeed(createFlight(l, 42, false))) } })),
      helper: flightLevels.flatMap(l => {
        const off = createFlight(l, 42, false), on = createFlight(l, 42, true);
        return [
          { level: l.id, metric: "speed", off: round(flightSpeed(off)), on: round(flightSpeed(on)), harder: "up" as const },
          { level: l.id, metric: "gap", off: round(flightGap(off)), on: round(flightGap(on)), harder: "down" as const },
        ];
      }),
    };
    case "lagoon-run": return {
      game, metrics: [
        { id: "speed", label: "Run speed", harder: "up", kind: "reaction" },
        { id: "markers", label: "Markers to pass", harder: "up", kind: "workload" },
        { id: "interval", label: "Row interval at start", harder: "down", kind: "spawn", unit: "s" },
      ],
      rows: runLevels.map(l => ({ level: l.id, values: { speed: round(l.speed), markers: l.target, interval: round(l.spacing / runSpeed(createRun(l, 42, false))) } })),
      helper: runLevels.map(l => ({ level: l.id, metric: "speed", off: round(runSpeed(createRun(l, 42, false))), on: round(runSpeed(createRun(l, 42, true))), harder: "up" as const })),
    };
    case "canoe-cargo": return {
      game, metrics: [
        { id: "fall", label: "Fall time per row", harder: "down", kind: "reaction", unit: "s" },
        { id: "canoes", label: "Canoes to send", harder: "up", kind: "workload" },
        { id: "junk", label: "Opening junk rows", harder: "up", kind: "hazard" },
        { id: "garbage", label: "Garbage every N loads", harder: "down", kind: "spawn" },
        { id: "sum", label: "Learn target sum", harder: "up", kind: "workload" },
      ],
      rows: cargoLevels.map(l => ({ level: l.id, values: ordinary(l.id) ? { fall: l.fall, canoes: l.target, junk: l.opening, garbage: l.garbageEvery || null, sum: null } : { fall: null, canoes: l.target, junk: l.opening, garbage: null, sum: l.targetSum } })),
      helper: cargoLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "fall", off: round(cargoGravity(createCargo(l, 42, false))), on: round(cargoGravity(createCargo(l, 42, true))), harder: "down" as const })),
    };
  }
}

let cached: readonly GameTable[] | null = null;
export const boundaryTables = (): readonly GameTable[] => cached ??= arcadeIds.map(table);

/** Ordinary worlds form one chain, W1-1 … W6-8. The Learn world is its own chain. */
export function easings(tables = boundaryTables()): Easing[] {
  const out: Easing[] = [];
  for (const t of tables) for (const chain of ["worlds", "learn"] as const) {
    const rows = t.rows.filter(r => (chain === "learn") !== ordinary(r.level));
    for (let i = 1; i < rows.length; i++) for (const m of t.metrics) {
      const before = rows[i - 1].values[m.id], after = rows[i].values[m.id];
      if (before == null || after == null) continue;
      const eased = m.harder === "up" ? after < before - 1e-9 : after > before + 1e-9;
      if (eased) out.push({ game: t.game, chain, from: rows[i - 1].level, level: rows[i].level, metric: m.id, before, after, boundary: rows[i - 1].level.split("-")[0] !== rows[i].level.split("-")[0] });
    }
  }
  return out;
}

export type RestBeat = { teaches: string; reason: string };
/** Either a deliberate rest beat or a known easing with a stated reason and the ledger row that owns it. */
export type EasingNote =
  | { game: ArcadeId; level: LevelId; metric: string; restBeat: RestBeat }
  | { game: ArcadeId; level: LevelId; metric: string; reason: string; owner: string };

export function boundaryIssues(notes: readonly EasingNote[], tables = boundaryTables()): string[] {
  const issues: string[] = [], found = easings(tables), key = (n: { game: string; level: string; metric: string }) => `${n.game} ${n.level} ${n.metric}`;
  const byKey = new Map<string, EasingNote>();
  for (const n of notes) {
    if (byKey.has(key(n))) issues.push(`Duplicate note: ${key(n)}`);
    byKey.set(key(n), n);
    const text = "restBeat" in n ? [n.restBeat.teaches, n.restBeat.reason] : [n.reason, n.owner];
    if (text.some(s => typeof s !== "string" || s.trim().length < 3)) issues.push(`Note without a stated reason: ${key(n)}`);
    if (!("restBeat" in n) && !/^[A-Z]{2,3}-\d{2}[a-z]?$/.test(n.owner)) issues.push(`Note owner must be a ledger row: ${key(n)}`);
  }
  for (const e of found) if (!byKey.has(key(e))) issues.push(`Unexplained easing: ${e.game} ${e.from} → ${e.level} ${e.metric} ${e.before} → ${e.after}`);
  for (const n of notes) if (!found.some(e => key(e) === key(n))) issues.push(`Stale note, no easing here any more: ${key(n)}`);
  // A rest beat eases one parameter. Further easings at the same step need their own owned reason.
  const beats = notes.filter(n => "restBeat" in n);
  for (const n of beats) if (beats.filter(b => b.game === n.game && b.level === n.level).length > 1) issues.push(`More than one rest beat at ${n.game} ${n.level}`);
  for (const t of tables) for (const h of t.helper) {
    const harder = h.harder === "up" ? h.on > h.off + 1e-9 : h.on < h.off - 1e-9;
    if (harder) issues.push(`Helper makes ${t.game} ${h.level} ${h.metric} harder: ${h.off} → ${h.on}`);
  }
  return issues;
}

const fmt = (v: number | null) => v == null ? "—" : String(v);
/** Generated Markdown. tests/arcade-boundaries.test.ts fails when the committed copy is stale. */
export function boundaryMarkdown(notes: readonly EasingNote[], tables = boundaryTables()): string {
  const found = easings(tables), lines = [
    "# Arcade boundary table",
    "",
    "Generated by `npm run arcade:boundaries` from the real level descriptors and engine curve functions (AR-00). Do not edit by hand.",
    "",
    "Each game lists every ordinary level (W1-1 to W6-8, one chain) and the Learn world (its own chain). ↓ marks a value that is easier than the level before it. Every ↓ is named below, either as a rest beat that teaches something or as a known easing with a reason and the ledger row that owns it. An unnamed easing, a stale note or a Helper value that is harder than Helper off fails `npm test`.",
    "",
  ];
  for (const t of tables) {
    lines.push(`## ${t.game}`, "", `| Level | ${t.metrics.map(m => `${m.label}${m.unit ? ` (${m.unit})` : ""} ${m.harder === "up" ? "▲" : "▼"}`).join(" | ")} |`, `|---|${t.metrics.map(() => "---:").join("|")}|`);
    for (const r of t.rows) lines.push(`| ${r.level} | ${t.metrics.map(m => `${fmt(r.values[m.id])}${found.some(e => e.game === t.game && e.level === r.level && e.metric === m.id) ? " ↓" : ""}`).join(" | ")} |`);
    const own = found.filter(e => e.game === t.game);
    lines.push("", own.length ? "**Easings**" : "No easings.", "");
    for (const e of own) {
      const n = notes.find(n => n.game === e.game && n.level === e.level && n.metric === e.metric);
      lines.push(`- ${e.from} → ${e.level}, ${t.metrics.find(m => m.id === e.metric)!.label}: ${e.before} → ${e.after}. ${!n ? "**UNEXPLAINED**" : "restBeat" in n ? `Rest beat, teaches ${n.restBeat.teaches}. ${n.restBeat.reason}` : `${n.reason} (owner ${n.owner})`}`);
    }
    const helperMetrics = [...new Set(t.helper.map(h => h.metric))];
    if (helperMetrics.length) {
      lines.push("", `Helper (runtime start value, off → on): ${helperMetrics.map(id => {
        const ratios = t.helper.filter(h => h.metric === id).map(h => h.on / h.off).filter(Number.isFinite), lo = Number(Math.min(...ratios).toFixed(2)), hi = Number(Math.max(...ratios).toFixed(2));
        return `${id} ×${lo}${lo === hi ? "" : `–${hi}`}`;
      }).join(", ")}.`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
