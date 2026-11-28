export type BodyActivityId = "sleeping" | "sitting" | "walking" | "running" | "calm-breath";
export type BreathPhaseId = "inhale" | "hold" | "exhale";

export interface BodyActivityMeta {
  id: BodyActivityId;
  label: string;
  bpm: number;
  breathsPerMin: number;
  oxygenSpeed: number;
  accentColor: string;
  tintColor: string;
  discovery: string;
}

export const BODY_ACTIVITIES: readonly BodyActivityMeta[] = [
  {
    id: "sleeping",
    label: "Sleeping",
    bpm: 62,
    breathsPerMin: 12,
    oxygenSpeed: 0.75,
    accentColor: "#3D6A99",
    tintColor: "#E5EFF9",
    discovery: "While you sleep, your muscles rest peacefully, so your heart beats slow and steady!",
  },
  {
    id: "sitting",
    label: "Sitting",
    bpm: 78,
    breathsPerMin: 16,
    oxygenSpeed: 1.0,
    accentColor: "#2C7E76",
    tintColor: "#E2F2EF",
    discovery: "Sitting quietly uses gentle energy — your heart and lungs cruise at a comfy pace!",
  },
  {
    id: "walking",
    label: "Walking",
    bpm: 102,
    breathsPerMin: 22,
    oxygenSpeed: 1.5,
    accentColor: "#C07B29",
    tintColor: "#FCF2DF",
    discovery: "Walking wakes up your leg muscles, so your lungs breathe deeper and your heart speeds up!",
  },
  {
    id: "running",
    label: "Running",
    bpm: 148,
    breathsPerMin: 34,
    oxygenSpeed: 2.6,
    accentColor: "#C84B55",
    tintColor: "#FDEAEF",
    discovery: "Running muscles burn lots of energy and need fast oxygen delivery — thump-thump-thump!",
  },
  {
    id: "calm-breath",
    label: "Deep Calm Breath",
    bpm: 66,
    breathsPerMin: 6,
    oxygenSpeed: 0.85,
    accentColor: "#488261",
    tintColor: "#E6F3EA",
    discovery: "Slow, deep belly breaths tell your brain and heart: you are safe, cozy, and calm!",
  },
];

export const ACTIVITY_BY_ID: Readonly<Record<BodyActivityId, BodyActivityMeta>> = {
  sleeping: BODY_ACTIVITIES[0],
  sitting: BODY_ACTIVITIES[1],
  walking: BODY_ACTIVITIES[2],
  running: BODY_ACTIVITIES[3],
  "calm-breath": BODY_ACTIVITIES[4],
};

export interface BreathPhaseInfo {
  id: BreathPhaseId;
  label: string;
  cue: string;
  durationMs: number;
  bubbleScale: number;
}

export const BREATH_PHASES: readonly BreathPhaseInfo[] = [
  { id: "inhale", label: "Breathe In", cue: "Smell a warm island flower… fill your belly slowly!", durationMs: 3600, bubbleScale: 1.0 },
  { id: "hold", label: "Hold Gently", cue: "Pause softly like floating on a calm lagoon…", durationMs: 2200, bubbleScale: 1.0 },
  { id: "exhale", label: "Breathe Out", cue: "Blow out gently like a soft ocean breeze…", durationMs: 4200, bubbleScale: 0.45 },
];

export interface HeartbeatBreathState {
  activity: BodyActivityId;
  visitedActivities: BodyActivityId[];
  breathPhaseIndex: number;
  calmBreathsCompleted: number;
  autoBubble: boolean;
  challengeIndex: number;
}

export function createHeartbeatBreathState(): HeartbeatBreathState {
  return {
    activity: "sitting",
    visitedActivities: ["sitting"],
    breathPhaseIndex: 0,
    calmBreathsCompleted: 0,
    autoBubble: false,
    challengeIndex: 0,
  };
}

export function effectiveBpm(state: HeartbeatBreathState): number {
  const base = ACTIVITY_BY_ID[state.activity].bpm;
  if (state.activity === "calm-breath") {
    return Math.max(58, base - Math.min(6, state.calmBreathsCompleted * 2));
  }
  return base;
}

export interface HeartbeatChallenge {
  id: string;
  prompt: string;
  hint: string;
  check: (state: HeartbeatBreathState) => boolean;
}

export const HEARTBEAT_CHALLENGES: readonly HeartbeatChallenge[] = [
  {
    id: "compare-sleep-run",
    prompt: "Compare Sleeping and Running to see how much faster your heart pumps!",
    hint: "Tap Sleeping, watch the BPM, then tap Running!",
    check: (state) => state.visitedActivities.includes("sleeping") && state.visitedActivities.includes("running"),
  },
  {
    id: "calm-three-breaths",
    prompt: "Take 2 slow Calm Breaths using the Calm Breath Bubble!",
    hint: "Tap Next Breath Step (or Follow Calm Bubble) through Breathe In → Hold → Breathe Out twice!",
    check: (state) => state.calmBreathsCompleted >= 2,
  },
];

export type HeartbeatBreathAction =
  | { type: "set-activity"; activity: BodyActivityId }
  | { type: "next-breath-phase" }
  | { type: "toggle-auto-bubble" }
  | { type: "next-challenge" }
  | { type: "reset" };

export function reduceHeartbeatBreath(
  state: HeartbeatBreathState,
  action: HeartbeatBreathAction
): HeartbeatBreathState {
  switch (action.type) {
    case "set-activity": {
      const visitedActivities = state.visitedActivities.includes(action.activity)
        ? state.visitedActivities
        : [...state.visitedActivities, action.activity];
      return {
        ...state,
        activity: action.activity,
        visitedActivities,
      };
    }
    case "next-breath-phase": {
      const nextIndex = (state.breathPhaseIndex + 1) % BREATH_PHASES.length;
      const completedCycle = state.breathPhaseIndex === BREATH_PHASES.length - 1;
      return {
        ...state,
        breathPhaseIndex: nextIndex,
        calmBreathsCompleted: state.calmBreathsCompleted + (completedCycle ? 1 : 0),
      };
    }
    case "toggle-auto-bubble":
      return { ...state, autoBubble: !state.autoBubble };
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % HEARTBEAT_CHALLENGES.length };
    case "reset":
      return createHeartbeatBreathState();
  }
}
