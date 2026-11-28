export type SynthVoice = "xylophone" | "drum" | "string" | "chime";

type WebAudioContextCtor = new () => {
  state: string;
  currentTime: number;
  destination: unknown;
  resume?: () => Promise<void>;
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

type NativeTonePlayer = {
  volume: number;
  seekTo: (seconds: number) => Promise<void>;
  play: () => void;
  pause: () => void;
  remove: () => void;
};

export interface LabSoundPlayer {
  playTone: (frequencyHz: number, voice: SynthVoice, loudness?: number) => boolean;
  dispose: () => void;
}

function loadNativeShellSources(): number[] {
  return [
    require("../../../assets/arcade/shell-0.wav"),
    require("../../../assets/arcade/shell-1.wav"),
    require("../../../assets/arcade/shell-2.wav"),
    require("../../../assets/arcade/shell-3.wav"),
    require("../../../assets/arcade/shell-4.wav"),
    require("../../../assets/arcade/shell-5.wav"),
  ];
}

function loadNativeTapSource(): number {
  return require("../../../assets/audio/tap.wav");
}

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
 * - On native iOS/Android, preloads bundled offline WAV tones via expo-audio so kids get
 *   immediate zero-latency sound in the car without network access.
 * - In Vitest/headless environments or when muted, degrades cleanly to a silent no-op.
 */
export function createLabSoundPlayer(): LabSoundPlayer {
  let webCtx: InstanceType<WebAudioContextCtor> | null = null;
  let nativeTones: NativeTonePlayer[] | null = null;
  let nativeTap: NativeTonePlayer | null = null;
  let nativeFailed = false;

  const ensureNative = () => {
    if (nativeTones || nativeFailed || isBrowserOrNodeRuntime()) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only fallback so pure Node tests never load expo-audio
      const expoAudio = require("expo-audio") as { createAudioPlayer?: (src: number) => NativeTonePlayer };
      if (typeof expoAudio?.createAudioPlayer !== "function") {
        nativeFailed = true;
        return;
      }
      nativeTones = loadNativeShellSources().map((src) => expoAudio.createAudioPlayer!(src));
      nativeTap = expoAudio.createAudioPlayer(loadNativeTapSource());
    } catch {
      nativeFailed = true;
    }
  };

  return {
    playTone(frequencyHz, voice, loudness = 0.7) {
      const clampedGain = Math.max(0.12, Math.min(0.85, loudness * 0.55));
      const WebCtor = getWebAudioCtor();
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
      if (!nativeTones || !nativeTones.length) return false;
      try {
        const player =
          voice === "drum" && nativeTap
            ? nativeTap
            : nativeTones[
                Math.max(
                  0,
                  Math.min(nativeTones.length - 1, Math.round(((frequencyHz - 180) / 360) * (nativeTones.length - 1)))
                )
              ];
        player.volume = Math.max(0.2, Math.min(1, loudness));
        void player.seekTo(0).catch(() => {});
        player.play();
        return true;
      } catch {
        return false;
      }
    },

    dispose() {
      if (webCtx && typeof webCtx.close === "function") {
        void webCtx.close().catch(() => {});
      }
      webCtx = null;
      if (nativeTones) {
        for (const p of nativeTones) {
          try {
            p.pause();
            p.remove();
          } catch {
            /* Already disposed. */
          }
        }
        nativeTones = null;
      }
      if (nativeTap) {
        try {
          nativeTap.pause();
          nativeTap.remove();
        } catch {
          /* Already disposed. */
        }
        nativeTap = null;
      }
    },
  };
}
