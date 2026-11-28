export type SynthVoice = "xylophone" | "drum" | "string" | "chime";

export type NativeSampleKey =
  | "shell-0"
  | "shell-1"
  | "shell-2"
  | "shell-3"
  | "shell-4"
  | "shell-5"
  | "drum-thump"
  | "drum-tap"
  | "drum-snap"
  | "drum-coral";

export interface NativeTonePlan {
  sampleKey: NativeSampleKey;
  playbackRate: number;
}

type WebAudioContextCtor = new () => {
  state: string;
  currentTime: number;
  destination: unknown;
  resume?: () => Promise<void>;
  suspend?: () => Promise<void>;
  close?: () => Promise<void>;
  createOscillator: () => {
    type: string;
    frequency: {
      setValueAtTime: (value: number, time: number) => void;
      exponentialRampToValueAtTime: (value: number, time: number) => void;
    };
    connect: (target: unknown) => void;
    start: (time?: number) => void;
    stop: (time?: number) => void;
  };
  createGain: () => {
    gain: {
      setValueAtTime: (value: number, time: number) => void;
      linearRampToValueAtTime: (value: number, time: number) => void;
      exponentialRampToValueAtTime: (value: number, time: number) => void;
    };
    connect: (target: unknown) => void;
  };
};

export type NativeTonePlayer = {
  volume: number;
  playbackRate?: number;
  shouldCorrectPitch?: boolean;
  setPlaybackRate?: (rate: number) => void;
  seekTo: (seconds: number) => Promise<void>;
  play: () => void;
  pause: () => void;
  remove: () => void;
};

export interface LabSoundPlayer {
  playTone: (frequencyHz: number, voice: SynthVoice, loudness?: number) => boolean;
  stop: () => void;
  dispose: () => void;
}

const MELODIC_ANCHORS: readonly { sampleKey: NativeSampleKey; baseHz: number }[] = [
  { sampleKey: "shell-0", baseHz: 262 },
  { sampleKey: "shell-1", baseHz: 294 },
  { sampleKey: "shell-2", baseHz: 330 },
  { sampleKey: "shell-3", baseHz: 392 },
  { sampleKey: "shell-4", baseHz: 440 },
  { sampleKey: "shell-5", baseHz: 523 },
];

const DRUM_ANCHORS: readonly { sampleKey: NativeSampleKey; baseHz: number; maxHz: number }[] = [
  { sampleKey: "drum-thump", baseHz: 110, maxHz: 165 },
  { sampleKey: "drum-tap", baseHz: 220, maxHz: 320 },
  { sampleKey: "drum-snap", baseHz: 410, maxHz: 520 },
  { sampleKey: "drum-coral", baseHz: 660, maxHz: Infinity },
];

function clampRate(rate: number): number {
  return Math.round(Math.max(0.5, Math.min(2.0, rate)) * 1000) / 1000;
}

/**
 * Pure, deterministic native sample + playbackRate selector so every xylophone bar,
 * every island drum pad, and every plucked string length/tension plays a distinct audible pitch.
 */
export function resolveNativeTonePlan(frequencyHz: number, voice: SynthVoice): NativeTonePlan {
  const safeHz = Math.max(55, Math.min(1800, frequencyHz));
  if (voice === "drum") {
    const drum = DRUM_ANCHORS.find((entry) => safeHz <= entry.maxHz) ?? DRUM_ANCHORS[DRUM_ANCHORS.length - 1];
    return {
      sampleKey: drum.sampleKey,
      playbackRate: clampRate(safeHz / drum.baseHz),
    };
  }

  let closest = MELODIC_ANCHORS[0];
  let bestDistance = Math.abs(safeHz - closest.baseHz);
  for (const anchor of MELODIC_ANCHORS) {
    const dist = Math.abs(safeHz - anchor.baseHz);
    if (dist < bestDistance) {
      bestDistance = dist;
      closest = anchor;
    }
  }
  return {
    sampleKey: closest.sampleKey,
    playbackRate: clampRate(safeHz / closest.baseHz),
  };
}

function loadNativeSampleSource(key: NativeSampleKey): number {
  switch (key) {
    case "shell-0":
      return require("../../../assets/arcade/shell-0.wav");
    case "shell-1":
      return require("../../../assets/arcade/shell-1.wav");
    case "shell-2":
      return require("../../../assets/arcade/shell-2.wav");
    case "shell-3":
      return require("../../../assets/arcade/shell-3.wav");
    case "shell-4":
      return require("../../../assets/arcade/shell-4.wav");
    case "shell-5":
      return require("../../../assets/arcade/shell-5.wav");
    case "drum-thump":
      return require("../../../assets/arcade/lagoon-sfx/thump.wav");
    case "drum-tap":
      return require("../../../assets/audio/tap.wav");
    case "drum-snap":
      return require("../../../assets/arcade/lagoon-sfx/snap.wav");
    case "drum-coral":
      return require("../../../assets/arcade/coral.wav");
  }
}

const ALL_NATIVE_KEYS: readonly NativeSampleKey[] = [
  ...MELODIC_ANCHORS.map((a) => a.sampleKey),
  ...DRUM_ANCHORS.map((a) => a.sampleKey),
];

function getWebAudioCtor(): WebAudioContextCtor | null {
  if (typeof globalThis === "undefined") return null;
  const host = globalThis as unknown as {
    AudioContext?: WebAudioContextCtor;
    webkitAudioContext?: WebAudioContextCtor;
  };
  return host.AudioContext ?? host.webkitAudioContext ?? null;
}

function isBrowserOrNodeRuntime(): boolean {
  const hasDom = typeof document !== "undefined";
  const isNode = typeof process !== "undefined" && !!process.versions?.node;
  return hasDom || isNode;
}

/**
 * Offline instrument sound player:
 * - On Web (browsers with Web Audio API), synthesizes warm bamboo xylophone, island drum,
 *   and plucked ukulele/string timbres at the exact requested pitch & loudness.
 * - On native iOS/Android, preloads 10 distinct offline WAV samples via expo-audio and applies
 *   uncorrected playbackRate pitch shifting (`shouldCorrectPitch = false`) so every xylophone
 *   note, island drum pad, and string length/tension produces a measurably distinct pitch.
 * - In Vitest/headless environments or when muted, degrades cleanly to a silent no-op.
 */
export function createLabSoundPlayer(customNativeFactory?: (key: NativeSampleKey) => NativeTonePlayer): LabSoundPlayer {
  let webCtx: InstanceType<WebAudioContextCtor> | null = null;
  let nativePlayers: Map<NativeSampleKey, NativeTonePlayer> | null = null;
  let nativeFailed = false;

  const ensureNative = () => {
    if (nativePlayers || nativeFailed) return;
    if (!customNativeFactory && isBrowserOrNodeRuntime()) return;
    try {
      const map = new Map<NativeSampleKey, NativeTonePlayer>();
      if (customNativeFactory) {
        for (const key of ALL_NATIVE_KEYS) {
          map.set(key, customNativeFactory(key));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only fallback so pure Node tests never load expo-audio
        const expoAudio = require("expo-audio") as { createAudioPlayer?: (src: number) => NativeTonePlayer };
        if (typeof expoAudio?.createAudioPlayer !== "function") {
          nativeFailed = true;
          return;
        }
        for (const key of ALL_NATIVE_KEYS) {
          map.set(key, expoAudio.createAudioPlayer(loadNativeSampleSource(key)));
        }
      }
      nativePlayers = map;
    } catch {
      nativeFailed = true;
    }
  };

  return {
    playTone(frequencyHz, voice, loudness = 0.7) {
      const clampedGain = Math.max(0.12, Math.min(0.85, loudness * 0.55));
      const WebCtor = customNativeFactory ? null : getWebAudioCtor();
      if (WebCtor) {
        try {
          if (!webCtx) webCtx = new WebCtor();
          if (webCtx.state === "suspended" && typeof webCtx.resume === "function") {
            void webCtx.resume().catch(() => {});
          }
          const now = webCtx.currentTime;
          const osc = webCtx.createOscillator();
          const gain = webCtx.createGain();
          const safeFreq = Math.max(55, Math.min(1800, frequencyHz));

          if (voice === "drum") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(safeFreq * 1.45, now);
            osc.frequency.exponentialRampToValueAtTime(Math.max(45, safeFreq * 0.65), now + 0.18);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(clampedGain, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(webCtx.destination);
            osc.start(now);
            osc.stop(now + 0.26);
          } else if (voice === "string") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(safeFreq, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(clampedGain * 0.9, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
            osc.connect(gain);
            gain.connect(webCtx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
          } else {
            osc.type = voice === "chime" ? "sine" : "triangle";
            osc.frequency.setValueAtTime(safeFreq, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(clampedGain, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
            osc.connect(gain);
            gain.connect(webCtx.destination);
            osc.start(now);
            osc.stop(now + 0.36);
          }
          return true;
        } catch {
          return false;
        }
      }

      ensureNative();
      if (!nativePlayers || nativePlayers.size === 0) return false;
      const plan = resolveNativeTonePlan(frequencyHz, voice);
      const player = nativePlayers.get(plan.sampleKey);
      if (!player) return false;
      try {
        player.volume = Math.max(0.2, Math.min(1, loudness));
        player.shouldCorrectPitch = false;
        if (typeof player.setPlaybackRate === "function") {
          player.setPlaybackRate(plan.playbackRate);
        } else {
          player.playbackRate = plan.playbackRate;
        }
        void player.seekTo(0).catch(() => {});
        player.play();
        return true;
      } catch {
        return false;
      }
    },

    stop() {
      if (webCtx && webCtx.state === "running" && typeof webCtx.suspend === "function") {
        void webCtx.suspend().catch(() => {});
      }
      if (nativePlayers) {
        for (const player of nativePlayers.values()) {
          try {
            player.pause();
          } catch {
            /* Already paused/disposed. */
          }
        }
      }
    },

    dispose() {
      if (webCtx && typeof webCtx.close === "function") {
        void webCtx.close().catch(() => {});
      }
      webCtx = null;
      if (nativePlayers) {
        for (const player of nativePlayers.values()) {
          try {
            player.pause();
            player.remove();
          } catch {
            /* Already disposed. */
          }
        }
        nativePlayers.clear();
        nativePlayers = null;
      }
    },
  };
}
