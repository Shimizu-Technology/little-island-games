export type SoundInstrumentMode = "xylophone" | "drums" | "strings";
export type LoudnessLevel = "soft" | "medium" | "loud";
export type StringTension = "loose" | "normal" | "tight";
export type RhythmTrackId = "drum" | "bamboo" | "chime";

export interface SoundPad {
  id: string;
  label: string;
  sublabel: string;
  frequencyHz: number;
  color: string;
  accentColor: string;
  barHeightRatio: number;
  voice: "xylophone" | "drum" | "string";
}

export const XYLOPHONE_BARS: readonly SoundPad[] = [
  { id: "xylo-c4", label: "Do", sublabel: "262 Hz", frequencyHz: 262, color: "#E05A47", accentColor: "#9E2E20", barHeightRatio: 1.0, voice: "xylophone" },
  { id: "xylo-d4", label: "Re", sublabel: "294 Hz", frequencyHz: 294, color: "#EB8A3E", accentColor: "#9E5317", barHeightRatio: 0.92, voice: "xylophone" },
  { id: "xylo-e4", label: "Mi", sublabel: "330 Hz", frequencyHz: 330, color: "#E8B93A", accentColor: "#8F6D13", barHeightRatio: 0.84, voice: "xylophone" },
  { id: "xylo-g4", label: "Sol", sublabel: "392 Hz", frequencyHz: 392, color: "#4BA36E", accentColor: "#25663E", barHeightRatio: 0.76, voice: "xylophone" },
  { id: "xylo-a4", label: "La", sublabel: "440 Hz", frequencyHz: 440, color: "#2D8FA0", accentColor: "#185863", barHeightRatio: 0.68, voice: "xylophone" },
  { id: "xylo-c5", label: "High Do", sublabel: "523 Hz", frequencyHz: 523, color: "#7A63B8", accentColor: "#4B387D", barHeightRatio: 0.6, voice: "xylophone" },
];

export const ISLAND_DRUMS: readonly SoundPad[] = [
  { id: "drum-bass", label: "Deep Drum", sublabel: "98 Hz", frequencyHz: 98, color: "#A85D3B", accentColor: "#6B361E", barHeightRatio: 1.0, voice: "drum" },
  { id: "drum-slit", label: "Bamboo Tap", sublabel: "220 Hz", frequencyHz: 220, color: "#D19344", accentColor: "#82551C", barHeightRatio: 0.85, voice: "drum" },
  { id: "drum-coconut", label: "Coconut Clack", sublabel: "410 Hz", frequencyHz: 410, color: "#588B68", accentColor: "#2F573C", barHeightRatio: 0.72, voice: "drum" },
  { id: "drum-shaker", label: "Shell Chime", sublabel: "660 Hz", frequencyHz: 660, color: "#3B8899", accentColor: "#1D5663", barHeightRatio: 0.62, voice: "drum" },
];

export const PLUCK_STRINGS: readonly SoundPad[] = [
  { id: "str-long", label: "Longest String", sublabel: "Low Pitch", frequencyHz: 196, color: "#C86B43", accentColor: "#7F3B1E", barHeightRatio: 1.0, voice: "string" },
  { id: "str-mid-long", label: "Medium-Long", sublabel: "Warm Pitch", frequencyHz: 262, color: "#D69838", accentColor: "#865A16", barHeightRatio: 0.84, voice: "string" },
  { id: "str-mid-short", label: "Medium-Short", sublabel: "Bright Pitch", frequencyHz: 330, color: "#4D9468", accentColor: "#285D3D", barHeightRatio: 0.68, voice: "string" },
  { id: "str-short", label: "Shortest String", sublabel: "High Pitch", frequencyHz: 440, color: "#367E9A", accentColor: "#1C4D61", barHeightRatio: 0.54, voice: "string" },
];

export const LOUDNESS_AMPLITUDE: Record<LoudnessLevel, number> = {
  soft: 0.35,
  medium: 0.68,
  loud: 1.0,
};

export const TENSION_MULTIPLIER: Record<StringTension, number> = {
  loose: 0.82,
  normal: 1.0,
  tight: 1.24,
};

export interface RhythmTrackMeta {
  id: RhythmTrackId;
  label: string;
  frequencyHz: number;
  voice: "drum" | "xylophone";
  color: string;
}

export const RHYTHM_TRACKS: readonly RhythmTrackMeta[] = [
  { id: "drum", label: "Island Drum", frequencyHz: 110, voice: "drum", color: "#B75C49" },
  { id: "bamboo", label: "Bamboo Bar", frequencyHz: 330, voice: "xylophone", color: "#3B8C66" },
  { id: "chime", label: "High Chime", frequencyHz: 523, voice: "xylophone", color: "#2D8FA0" },
];

export interface SoundRhythmState {
  mode: SoundInstrumentMode;
  loudness: LoudnessLevel;
  tension: StringTension;
  activeFrequencyHz: number;
  activeLabel: string;
  activeVoice: "xylophone" | "drum" | "string";
  notesPlayed: number;
  playedLow: boolean;
  playedHigh: boolean;
  playedLoud: boolean;
  loopPlaying: boolean;
  tempoBpm: number;
  currentBeat: number;
  pattern: Record<RhythmTrackId, [boolean, boolean, boolean, boolean]>;
  challengeIndex: number;
}

export function createSoundRhythmState(): SoundRhythmState {
  return {
    mode: "xylophone",
    loudness: "medium",
    tension: "normal",
    activeFrequencyHz: 262,
    activeLabel: "Do",
    activeVoice: "xylophone",
    notesPlayed: 0,
    playedLow: false,
    playedHigh: false,
    playedLoud: false,
    loopPlaying: false,
    tempoBpm: 105,
    currentBeat: 0,
    pattern: {
      drum: [true, false, true, false],
      bamboo: [false, true, false, true],
      chime: [true, false, false, false],
    },
    challengeIndex: 0,
  };
}

export function effectiveFrequency(pad: SoundPad, tension: StringTension): number {
  if (pad.voice !== "string") return pad.frequencyHz;
  return Math.round(pad.frequencyHz * TENSION_MULTIPLIER[tension]);
}

export function waveMetrics(frequencyHz: number, loudness: LoudnessLevel) {
  const amplitude = LOUDNESS_AMPLITUDE[loudness];
  const cycles = Math.max(1.2, Math.min(7.5, frequencyHz / 82));
  const pitchCategory = frequencyHz < 220 ? "Low" : frequencyHz < 390 ? "Middle" : "High";
  const loudnessLabel = loudness === "soft" ? "Soft (short waves)" : loudness === "medium" ? "Medium waves" : "Loud (tall waves)";
  const discovery =
    pitchCategory === "High"
      ? `High pitch (${frequencyHz} Hz) squeezes ${Math.round(cycles)} waves close together!`
      : pitchCategory === "Low"
        ? `Low pitch (${frequencyHz} Hz) stretches slow, wide waves far apart!`
        : `Middle pitch (${frequencyHz} Hz) creates steady, balanced sound waves!`;
  return { amplitude, cycles, pitchCategory, loudnessLabel, discovery };
}

/** Deterministic SVG path string for the sound wave visualizer. */
export function buildWavePath(
  frequencyHz: number,
  loudness: LoudnessLevel,
  phase: number,
  width = 320,
  height = 120,
  samples = 64
): string {
  const { amplitude, cycles } = waveMetrics(frequencyHz, loudness);
  const midY = height / 2;
  const maxAmp = height * 0.4 * amplitude;
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * width;
    // Softly taper wave ends like a plucked string / gentle standing wave envelope.
    const envelope = Math.sin(t * Math.PI);
    const y = midY - Math.sin(t * cycles * Math.PI * 2 + phase) * maxAmp * (0.28 + 0.72 * envelope);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
}

export interface SoundChallenge {
  id: string;
  prompt: string;
  hint: string;
  check: (state: SoundRhythmState) => boolean;
}

export const SOUND_CHALLENGES: readonly SoundChallenge[] = [
  {
    id: "low-and-high",
    prompt: "Compare a Low sound and a High sound to see the wave stretch and squeeze!",
    hint: "Tap a low bar or deep drum, then tap High Do or the shortest string!",
    check: (state) => state.playedLow && state.playedHigh,
  },
  {
    id: "tall-loud-wave",
    prompt: "Make a super tall Loud sound wave!",
    hint: "Tap Loud, then tap any bamboo bar or drum pad!",
    check: (state) => state.playedLoud,
  },
  {
    id: "rhythm-groove",
    prompt: "Build your own 4-beat Island Rhythm and step or play it!",
    hint: "Turn on at least 4 beat dots and tap Step Beat or Play Loop!",
    check: (state) => {
      const totalOn = Object.values(state.pattern).flat().filter(Boolean).length;
      return totalOn >= 4 && (state.loopPlaying || state.currentBeat > 0);
    },
  },
];

export type SoundRhythmAction =
  | { type: "set-mode"; mode: SoundInstrumentMode }
  | { type: "set-loudness"; loudness: LoudnessLevel }
  | { type: "set-tension"; tension: StringTension }
  | { type: "play-pad"; pad: SoundPad }
  | { type: "toggle-beat"; track: RhythmTrackId; beat: number }
  | { type: "step-beat" }
  | { type: "toggle-loop" }
  | { type: "set-tempo"; bpm: number }
  | { type: "clear-pattern" }
  | { type: "next-challenge" }
  | { type: "reset" };

export function activeTracksOnBeat(pattern: SoundRhythmState["pattern"], beat: number): RhythmTrackMeta[] {
  const index = ((beat % 4) + 4) % 4;
  return RHYTHM_TRACKS.filter((track) => pattern[track.id][index]);
}

export function reduceSoundRhythm(state: SoundRhythmState, action: SoundRhythmAction): SoundRhythmState {
  switch (action.type) {
    case "set-mode":
      return { ...state, mode: action.mode };
    case "set-loudness":
      return { ...state, loudness: action.loudness };
    case "set-tension":
      return { ...state, tension: action.tension };
    case "play-pad": {
      const freq = effectiveFrequency(action.pad, state.tension);
      return {
        ...state,
        activeFrequencyHz: freq,
        activeLabel: action.pad.label,
        activeVoice: action.pad.voice,
        notesPlayed: state.notesPlayed + 1,
        playedLow: state.playedLow || freq <= 265,
        playedHigh: state.playedHigh || freq >= 400,
        playedLoud: state.playedLoud || state.loudness === "loud",
      };
    }
    case "toggle-beat": {
      const idx = Math.max(0, Math.min(3, action.beat));
      const row = [...state.pattern[action.track]] as [boolean, boolean, boolean, boolean];
      row[idx] = !row[idx];
      return { ...state, pattern: { ...state.pattern, [action.track]: row } };
    }
    case "step-beat": {
      const nextBeat = (state.currentBeat + 1) % 4;
      const hitTracks = activeTracksOnBeat(state.pattern, nextBeat);
      const topTrack = hitTracks[hitTracks.length - 1];
      return {
        ...state,
        currentBeat: nextBeat,
        activeFrequencyHz: topTrack ? topTrack.frequencyHz : state.activeFrequencyHz,
        activeLabel: topTrack ? `${topTrack.label} (Beat ${nextBeat + 1})` : `Beat ${nextBeat + 1}`,
        activeVoice: topTrack ? topTrack.voice : state.activeVoice,
      };
    }
    case "toggle-loop":
      return { ...state, loopPlaying: !state.loopPlaying };
    case "set-tempo":
      return { ...state, tempoBpm: Math.max(70, Math.min(140, Math.round(action.bpm))) };
    case "clear-pattern":
      return {
        ...state,
        loopPlaying: false,
        currentBeat: 0,
        pattern: {
          drum: [false, false, false, false],
          bamboo: [false, false, false, false],
          chime: [false, false, false, false],
        },
      };
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % SOUND_CHALLENGES.length };
    case "reset":
      return createSoundRhythmState();
  }
}
