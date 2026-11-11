/**
 * AR-00 boundary table. Every value is read from the real level descriptors or the
 * real engine's runtime curve functions, never retyped. Reaction and spawn metrics are the
 * engine's runtime values, at the start of a level and at its hardest point in play (the
 * progress extremum), so an engine-only change shows up here. A metric "eases" when the next
 * level in a chain is easier on it than the level before. Each easing must be named in
 * restBeats.ts, either as a deliberate rest beat or with a stated reason and owner row, and
 * each note is bound to the largest easing that was reviewed.
 */
import { reefLevels } from "./games/reef-builder/engine";
import { createSong, noteDuration, songLevels, songResult, songStep, songTransition, type SongState } from "./games/shell-song/engine";
import { createRail, railLevels, railTick } from "./games/rail-parade/engine";
import { createCrab, crabLanes, crabLevels, crabPace } from "./games/crab-crossing/engine";
import { createPalm, palmDiveInterval, palmLevels, palmMarchSpeed } from "./games/palm-patrol/engine";
import { beachLevels, beachStartSpeed, createBeach, paddleWidth } from "./games/beach-ball/engine";
import { createFlight, flightGap, flightSpeed } from "./games/fruit-bat-flight/engine";
import { createRun, runSpeed } from "./games/lagoon-run/engine";
import { flightLevels, runLevels } from "./games/scrolling/content";
import { cargoCadence, cargoGravity, cargoLevels, createCargo } from "./games/canoe-cargo/engine";
import { arcadeIds, type ArcadeId, type LevelId } from "./types";

/** "up": a larger value is harder. "down": a smaller value is harder. */
export type Direction = "up" | "down";
/** `param` groups a runtime parameter's start and peak columns: one note covers both. */
export type MetricSpec = { id: string; label: string; harder: Direction; kind: "workload" | "reaction" | "spawn" | "memory" | "hazard"; unit?: string; param?: string };
export type LevelRow = { level: LevelId; values: Record<string, number | null> };
export type HelperRow = { level: LevelId; metric: string; off: number; on: number; harder: Direction };
export type GameTable = { game: ArcadeId; metrics: readonly MetricSpec[]; rows: readonly LevelRow[]; helper: readonly HelperRow[] };
export type Easing = { game: ArcadeId; chain: "worlds" | "learn"; from: LevelId; level: LevelId; metric: string; param: string; before: number; after: number; boundary: boolean };

const round = (n: number) => Number(n.toFixed(4));
const ordinary = (id: string) => !id.startsWith("learn-");
/** A runtime parameter read at a level's start and at its hardest point in play. */
const runtime = (id: string, label: string, harder: Direction, kind: MetricSpec["kind"], unit?: string): MetricSpec[] => [
  { id, label: `${label} at start`, harder, kind, unit, param: id },
  { id: `${id}Peak`, label: `${label} at its hardest`, harder, kind, unit, param: id },
];
/** Easing as a percentage of the earlier level's value. */
export const easedBy = (e: Pick<Easing, "before" | "after">) => Math.abs(e.after - e.before) / Math.abs(e.before) * 100;

/** Plays a perfect Shell Song round on the real engine and counts independent recall units and note lengths. */
export function songUnits(level: (typeof songLevels)[number]): { longestShown: number; longestUnits: number; firstNoteMs: number; fastestNoteMs: number } {
  let s: SongState = createSong(level, 42, false), steps = 0, longestShown = 0, longestUnits = 0, fastestNoteMs = Infinity;
  const firstNoteMs = noteDuration(s);
  while (!songResult(s) && steps++ < 4000) {
    if (s.phase === "watch") { fastestNoteMs = Math.min(fastestNoteMs, noteDuration(s)); s = songStep(s, { type: "tick" }, 1 / 30); continue; }
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
  return { longestShown, longestUnits, firstNoteMs, fastestNoteMs };
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
        ...runtime("noteMs", "Note length", "down", "reaction", "ms"),
      ],
      rows: songLevels.map(l => {
        const play = songUnits(l);
        return { level: l.id, values: { shells: l.shells, units: play.longestUnits, phrases: l.rounds, noteMs: play.firstNoteMs, noteMsPeak: play.fastestNoteMs } };
      }),
      helper: songLevels.map(l => ({ level: l.id, metric: "noteMs", off: noteDuration(createSong(l, 42, false)), on: noteDuration(createSong(l, 42, true)), harder: "down" as const })),
    };
    case "rail-parade": return {
      game, metrics: [
        ...runtime("tick", "Step time", "down", "reaction", "s"),
        { id: "food", label: "Food to collect", harder: "up", kind: "workload" },
        { id: "hedges", label: "Hedge cells", harder: "up", kind: "hazard" },
        { id: "snake", label: "Moving snake span", harder: "up", kind: "hazard" },
      ],
      rows: railLevels.map(l => {
        // The step quickens as the parade collects food; the last stop is its hardest point.
        const s = createRail(l, 42, false);
        return { level: l.id, values: { tick: round(railTick(s)), tickPeak: round(railTick({ ...s, collected: l.target })), food: l.target, hedges: l.hedges.length, snake: l.snakeSpan } };
      }),
      helper: railLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "tick", off: round(railTick(createRail(l, 42, false))), on: round(railTick(createRail(l, 42, true))), harder: "down" as const })),
    };
    case "crab-crossing": {
      return {
        game, metrics: [
          ...runtime("speed", "Fastest lane speed", "up", "reaction", "tiles/s"),
          { id: "burrows", label: "Burrows", harder: "up", kind: "workload" },
          { id: "lanes", label: "Moving lanes", harder: "up", kind: "hazard" },
          ...runtime("period", "Shortest lane period", "down", "spawn", "s"),
        ],
        rows: crabLevels.map(l => {
          if (!ordinary(l.id)) return { level: l.id, values: { speed: null, speedPeak: null, burrows: null, lanes: null, period: null, periodPeak: null } };
          // Lanes move by travel, which runs at crabPace; the pace peaks on the last burrow's final hop.
          const s = createCrab(l, 42, false), last = { ...s, crossed: l.target - 1, furthest: 0 }, moving = crabLanes(s).filter(v => v.speed !== 0);
          const fastest = Math.max(...moving.map(v => Math.abs(v.speed))), period = Math.min(...moving.map(v => v.spacing / Math.abs(v.speed)));
          return { level: l.id, values: { speed: round(fastest * crabPace(s)), speedPeak: round(fastest * crabPace(last)), burrows: l.target, lanes: moving.length, period: round(period / crabPace(s)), periodPeak: round(period / crabPace(last)) } };
        }),
        helper: crabLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "pace", off: round(crabPace(createCrab(l, 42, false))), on: round(crabPace(createCrab(l, 42, true))), harder: "up" as const })),
      };
    }
    case "palm-patrol": return {
      game, metrics: [
        ...runtime("speed", "March speed", "up", "reaction", "px/s"),
        { id: "workload", label: "Nominal beetles (count × waves × relays)", harder: "up", kind: "workload" },
        ...runtime("dive", "Dive interval", "down", "spawn", "s"),
        { id: "facts", label: "Facts", harder: "up", kind: "workload" },
      ],
      rows: palmLevels.map(l => {
        if (!ordinary(l.id)) return { level: l.id, values: { speed: null, speedPeak: null, workload: null, dive: null, divePeak: null, facts: l.facts } };
        // The march speeds up as beetles are caught and as a wave goes on: one beetle left, 22 seconds in.
        const s = createPalm(l, 42, false), late = { ...s, beetles: s.beetles.map((b, i) => i ? { ...b, caught: 1 } : b), waveTime: 22 }, dive = (v: number) => v > 0 ? round(v) : null;
        return { level: l.id, values: { speed: round(palmMarchSpeed(s)), speedPeak: round(palmMarchSpeed(late)), workload: l.count * l.waves * l.relays, dive: dive(palmDiveInterval(s)), divePeak: dive(palmDiveInterval(late)), facts: null } };
      }),
      helper: palmLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "march", off: round(palmMarchSpeed(createPalm(l, 42, false))), on: round(palmMarchSpeed(createPalm(l, 42, true))), harder: "up" as const })),
    };
    case "beach-ball": return {
      game, metrics: [
        ...runtime("serve", "Serve speed", "up", "reaction", "px/s"),
        { id: "points", label: "Points to win", harder: "up", kind: "workload" },
        { id: "balls", label: "Balls", harder: "up", kind: "hazard" },
        { id: "wind", label: "Wind", harder: "up", kind: "hazard" },
        { id: "spin", label: "Edge spin", harder: "up", kind: "hazard" },
      ],
      rows: beachLevels.map(l => {
        // Serves speed up with the points played; the last serve before match point is the fastest.
        const s = createBeach(l, 42, false);
        return { level: l.id, values: { serve: round(beachStartSpeed(s)), servePeak: round(beachStartSpeed({ ...s, points: [l.target - 1, l.target - 1] })), points: l.target * l.countBy, balls: l.balls, wind: l.wind, spin: l.spin } };
      }),
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
        ...runtime("speed", "Flight speed", "up", "reaction"),
        ...runtime("gap", "Opening", "down", "hazard"),
        { id: "gates", label: "Palms to pass", harder: "up", kind: "workload" },
        ...runtime("interval", "Gate interval", "down", "spawn", "s"),
      ],
      rows: flightLevels.map(l => {
        // Speed rises with palms passed and, from World 6, sways; the sway peaks at time π/4.8.
        // From World 5 the opening sways too; it is narrowest at time 3π/4.
        const s = createFlight(l, 42, false), fast = flightSpeed({ ...s, passed: l.target, time: Math.PI / 4.8 });
        return { level: l.id, values: { speed: round(flightSpeed(s)), speedPeak: round(fast), gap: round(flightGap(s)), gapPeak: round(flightGap({ ...s, time: Math.PI * 3 / 4 })), gates: l.target, interval: round(l.spacing / flightSpeed(s)), intervalPeak: round(l.spacing / fast) } };
      }),
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
        ...runtime("speed", "Run speed", "up", "reaction"),
        { id: "markers", label: "Markers to pass", harder: "up", kind: "workload" },
        ...runtime("interval", "Row interval", "down", "spawn", "s"),
      ],
      rows: runLevels.map(l => {
        // Speed rises with markers passed; the finish line is the fastest point.
        const s = createRun(l, 42, false), fast = runSpeed({ ...s, passed: l.target });
        return { level: l.id, values: { speed: round(runSpeed(s)), speedPeak: round(fast), markers: l.target, interval: round(l.spacing / runSpeed(s)), intervalPeak: round(l.spacing / fast) } };
      }),
      helper: runLevels.map(l => ({ level: l.id, metric: "speed", off: round(runSpeed(createRun(l, 42, false))), on: round(runSpeed(createRun(l, 42, true))), harder: "up" as const })),
    };
    case "canoe-cargo": return {
      game, metrics: [
        ...runtime("fall", "Fall time per row", "down", "reaction", "s"),
        { id: "canoes", label: "Canoes to send", harder: "up", kind: "workload" },
        { id: "junk", label: "Opening junk rows", harder: "up", kind: "hazard" },
        ...runtime("garbage", "Garbage every N loads", "down", "spawn"),
        { id: "sum", label: "Learn target sum", harder: "up", kind: "workload" },
      ],
      rows: cargoLevels.map(l => {
        if (!ordinary(l.id)) return { level: l.id, values: { fall: null, fallPeak: null, canoes: l.target, junk: l.opening, garbage: null, garbagePeak: null, sum: l.targetSum } };
        // Gravity quickens with canoes sent; garbage tightens from halfway. The last canoe is the hardest point.
        const s = createCargo(l, 42, false), late = { ...s, canoes: l.target }, garbage = (v: number) => v || null;
        return { level: l.id, values: { fall: round(cargoGravity(s)), fallPeak: round(cargoGravity(late)), canoes: l.target, junk: l.opening, garbage: garbage(cargoCadence(s)), garbagePeak: garbage(cargoCadence(late)), sum: null } };
      }),
      helper: cargoLevels.filter(l => ordinary(l.id)).map(l => ({ level: l.id, metric: "fall", off: round(cargoGravity(createCargo(l, 42, false))), on: round(cargoGravity(createCargo(l, 42, true))), harder: "down" as const })),
    };
  }
}

let cached: readonly GameTable[] | null = null;
/** Builds the tables fresh from the engines. Tests use it after mutating an engine function. */
export const buildBoundaryTables = (): readonly GameTable[] => arcadeIds.map(table);
export const boundaryTables = (): readonly GameTable[] => cached ??= buildBoundaryTables();

/** Ordinary worlds form one chain, W1-1 … W6-8. The Learn world is its own chain. */
export function easings(tables = boundaryTables()): Easing[] {
  const out: Easing[] = [];
  for (const t of tables) for (const chain of ["worlds", "learn"] as const) {
    const rows = t.rows.filter(r => (chain === "learn") !== ordinary(r.level));
    for (let i = 1; i < rows.length; i++) for (const m of t.metrics) {
      const before = rows[i - 1].values[m.id], after = rows[i].values[m.id];
      if (before == null || after == null) continue;
      const eased = m.harder === "up" ? after < before - 1e-9 : after > before + 1e-9;
      if (eased) out.push({ game: t.game, chain, from: rows[i - 1].level, level: rows[i].level, metric: m.id, param: m.param ?? m.id, before, after, boundary: rows[i - 1].level.split("-")[0] !== rows[i].level.split("-")[0] });
    }
  }
  return out;
}

export type RestBeat = { teaches: string; reason: string };
/**
 * Either a deliberate rest beat or a known easing with a stated reason and the ledger row that owns it.
 * `metric` names a parameter: one note covers its start and peak columns. `upTo` is the largest
 * easing that was reviewed, as a percentage of the earlier level's value. A bigger drop needs a fresh review.
 */
export type EasingNote =
  | { game: ArcadeId; level: LevelId; metric: string; upTo: number; restBeat: RestBeat }
  | { game: ArcadeId; level: LevelId; metric: string; upTo: number; reason: string; owner: string };

export function boundaryIssues(notes: readonly EasingNote[], tables = boundaryTables()): string[] {
  const issues: string[] = [], found = easings(tables), key = (n: { game: string; level: string; metric: string; param?: string }) => `${n.game} ${n.level} ${n.param ?? n.metric}`;
  const byKey = new Map<string, EasingNote>();
  for (const n of notes) {
    if (byKey.has(key(n))) issues.push(`Duplicate note: ${key(n)}`);
    byKey.set(key(n), n);
    const text = "restBeat" in n ? [n.restBeat.teaches, n.restBeat.reason] : [n.reason, n.owner];
    if (text.some(s => typeof s !== "string" || s.trim().length < 3)) issues.push(`Note without a stated reason: ${key(n)}`);
    if (!("restBeat" in n) && !/^[A-Z]{2,3}-\d{2}[a-z]?$/.test(n.owner)) issues.push(`Note owner must be a ledger row: ${key(n)}`);
    if (typeof n.upTo !== "number" || !(n.upTo > 0 && n.upTo <= 100)) issues.push(`Note without a reviewed bound: ${key(n)}`);
  }
  for (const e of found) {
    const n = byKey.get(key(e));
    if (!n) issues.push(`Unexplained easing: ${e.game} ${e.from} → ${e.level} ${e.metric} ${e.before} → ${e.after}`);
    else if (easedBy(e) > n.upTo + 1e-6) issues.push(`Easing larger than reviewed: ${e.game} ${e.from} → ${e.level} ${e.metric} ${e.before} → ${e.after} eases ${Number(easedBy(e).toFixed(1))}%, reviewed up to ${n.upTo}%`);
  }
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
    "Each game lists every ordinary level (W1-1 to W6-8, one chain) and the Learn world (its own chain). Reaction and spawn values come from the engine's runtime functions, at the start of a level and at its hardest point in play. ↓ marks a value that is easier than the level before it. Every ↓ is named below, either as a rest beat that teaches something or as a known easing with a reason and the ledger row that owns it, and each note states the largest easing that was reviewed. An unnamed easing, an easing larger than its review, a stale note or a Helper value that is harder than Helper off fails `npm test`.",
    "",
  ];
  for (const t of tables) {
    lines.push(`## ${t.game}`, "", `| Level | ${t.metrics.map(m => `${m.label}${m.unit ? ` (${m.unit})` : ""} ${m.harder === "up" ? "▲" : "▼"}`).join(" | ")} |`, `|---|${t.metrics.map(() => "---:").join("|")}|`);
    for (const r of t.rows) lines.push(`| ${r.level} | ${t.metrics.map(m => `${fmt(r.values[m.id])}${found.some(e => e.game === t.game && e.level === r.level && e.metric === m.id) ? " ↓" : ""}`).join(" | ")} |`);
    const own = found.filter(e => e.game === t.game);
    lines.push("", own.length ? "**Easings**" : "No easings.", "");
    for (const e of own) {
      const n = notes.find(n => n.game === e.game && n.level === e.level && n.metric === e.param);
      lines.push(`- ${e.from} → ${e.level}, ${t.metrics.find(m => m.id === e.metric)!.label}: ${e.before} → ${e.after}. ${!n ? "**UNEXPLAINED**" : "restBeat" in n ? `Rest beat, teaches ${n.restBeat.teaches}. ${n.restBeat.reason}` : `${n.reason} (owner ${n.owner})`}${n ? ` Reviewed up to ${n.upTo}%.` : ""}`);
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
