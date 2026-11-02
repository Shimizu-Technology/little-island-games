import { FOOD_CHAIN, LabState, WATER_ACTIONS, WaterPlace, isDay } from "../explore/activities";
import { WorldId } from "../explore/content";
import { newExploreProgress, validExploreProgress } from "../explore/progress";

export const waterLabels: Record<WaterPlace, string> = {
  ocean: "Ocean", vapor: "Vapor", cloud: "Cloud", rain: "Rain", ground: "Groundwater", ice: "Ice",
};

/** Labels already used by Explore's day/night model, including both daylight edges. */
export function skyLabel(turn: number): string {
  return turn === 2 || turn === 6
    ? "The dot is at the edge of daylight"
    : isDay(turn) ? "The dot has daytime" : "The dot has nighttime";
}

export type ObservationWorld = Extract<WorldId, "oceans" | "weather" | "space">;
export type ExhibitObservation = { version: 1; world: ObservationWorld; state: LabState };
export const canObserve = (world: WorldId): world is ObservationWorld =>
  world === "oceans" || world === "weather" || world === "space";

/** Reuse the Store's admission rules instead of implementing a second lab validator. */
function validState(world: ObservationWorld, state: unknown): state is LabState {
  const progress = newExploreProgress();
  return validExploreProgress({ ...progress, labs: { ...progress.labs, [world]: state } });
}

function identity({ world, state }: ExhibitObservation): string {
  return JSON.stringify([world, world === "space" ? state.turn : world === "oceans" ? state.chain : state.journey]);
}

function copyState(state: LabState): LabState {
  return {
    turn: state.turn, chain: [...state.chain], habitat: state.habitat,
    ...(state.habitatFeedback === undefined ? {} : { habitatFeedback: state.habitatFeedback }),
    matched: [...state.matched], water: state.water, journey: [...state.journey],
    expedition: state.expedition, visited: [...state.visited], message: state.message,
  };
}

/** Memory-only comparison slots. Reject invalid input, clone it, and retain at most two distinct observations.
 * No session is restored or mutated, and these observations never write to Store.
 */
export function keepObservation(previous: unknown, world: WorldId, state: unknown): ExhibitObservation[] {
  const kept: ExhibitObservation[] = [];
  if (Array.isArray(previous)) for (const entry of previous.slice(-2)) {
    if (!entry || typeof entry !== "object" || entry.version !== 1 || !canObserve(entry.world) || !validState(entry.world, entry.state)) continue;
    const observation = entry as ExhibitObservation;
    if (!kept.some((item) => identity(item) === identity(observation))) kept.push(observation);
  }
  if (canObserve(world) && validState(world, state)) {
    const next: ExhibitObservation = { version: 1, world, state };
    if (!kept.some((item) => identity(item) === identity(next))) kept.push(next);
  }
  return kept.slice(-2).map((entry) => ({ version: 1, world: entry.world, state: copyState(entry.state) }));
}

export function observationLabel({ world, state }: ExhibitObservation): string {
  if (world === "space") return `${state.turn + 1} / 8 · ${skyLabel(state.turn)}`;
  if (world === "weather") return state.journey.map((place) => waterLabels[place]).join(" → ");
  return state.chain.length ? state.chain.join(" → ") : `0 / ${FOOD_CHAIN.length} links`;
}

/** A highlighted destination is always derived from the real engine's available transitions. */
export function waterDestinations(place: WaterPlace): WaterPlace[] {
  return WATER_ACTIONS[place].map((choice) => choice.next);
}
