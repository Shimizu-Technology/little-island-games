import { useCallback, useContext, useEffect, useLayoutEffect, useRef } from "react";
import * as RN from "react-native";
import * as Speech from "expo-speech";
import { AudioPreferences } from "../components/Audio";

function getPlatformOS(): string | undefined {
  try {
    return RN.Platform?.OS;
  } catch {
    return undefined;
  }
}

function getAppState(): typeof RN.AppState | undefined {
  try {
    return RN.AppState;
  } catch {
    return undefined;
  }
}

export type SpeakEvent =
  | {
      type: "speak";
      text: string;
      language: string;
      rate: number;
      pitch: number;
      volume: number;
      interrupt: boolean;
    }
  | { type: "stop" };

type VoiceListener = (event: SpeakEvent) => void;

const listeners = new Set<VoiceListener>();

const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_VOLUME = 0.75;

function clampVolume(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function isWebSpeechUnavailable(): boolean {
  if (getPlatformOS() !== "web") return false;
  if (typeof window === "undefined") return false;
  return (
    !("speechSynthesis" in window) ||
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === "undefined"
  );
}

function isAppForeground(): boolean {
  const state = getAppState()?.currentState;
  if (state != null && state !== "active") return false;
  if (getPlatformOS() === "web" && typeof document !== "undefined" && document.hidden) return false;
  return true;
}

/** Subscribe to spoken-voice events (used by tests and diagnostics). Returns an unsubscribe function. */
export function subscribeVoice(listener: VoiceListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Immediately silence any active spoken prompt or help utterance. Zero timers; safe on every platform. */
export function stopSpeaking(): void {
  try {
    if (!isWebSpeechUnavailable() && typeof Speech?.stop === "function") {
      void Promise.resolve(Speech.stop()).catch(() => {
        /* Unsupported or disposed native speech stop degrades silently; text remains visible. */
      });
    }
  } catch {
    /* Unsupported or blocked speech synthesis degrades silently; text remains visible. */
  }
  for (const listener of listeners) {
    try {
      listener({ type: "stop" });
    } catch {
      /* Ignore observer errors. */
    }
  }
}

export type SpeakOptions = {
  /** Learner sound/narration enabled setting. When false, speech is suppressed. */
  enabled?: boolean;
  /** Whether the board/screen is active and foregrounded. When false, speech is suppressed. */
  active?: boolean;
  /** BCP-47 language tag (default "en-US"). */
  language?: string;
  /** Gentle speech rate (default 0.94 for warm clarity). */
  rate?: number;
  /** Cheerful pitch (default 1.06). */
  pitch?: number;
  /** Narration volume in [0, 1] (default 0.75). Volume <= 0 suppresses speech. */
  volume?: number;
  /** Interrupt any in-flight utterance first (default true). */
  interrupt?: boolean;
};

/**
 * Speak a short, child-friendly prompt or help line via expo-speech (iOS AVSpeechSynthesizer,
 * Android TextToSpeech, and Web SpeechSynthesis).
 * Respects mute (`enabled`), foreground (`active`), and `volume` (> 0), interrupts stale speech
 * by default, uses zero timers, and returns `true` ONLY when `Speech.speak` was genuinely invoked.
 */
export function speakText(text: string, opts: SpeakOptions = {}): boolean {
  const clean = text.trim();
  const volume = clampVolume(opts.volume);
  if (!clean || opts.enabled === false || opts.active === false || volume <= 0) return false;
  if (isWebSpeechUnavailable() || typeof Speech?.speak !== "function") return false;

  const language = opts.language ?? DEFAULT_LANGUAGE;
  const rate = opts.rate ?? 0.94;
  const pitch = opts.pitch ?? 1.06;
  const interrupt = opts.interrupt !== false;

  if (interrupt) {
    try {
      if (typeof Speech?.stop === "function") {
        void Promise.resolve(Speech.stop()).catch(() => {
          /* Ignore cancel rejections on platforms without active speech. */
        });
      }
    } catch {
      /* Ignore cancel errors before speaking. */
    }
  }

  try {
    const result: unknown = Speech.speak(clean, {
      language,
      rate,
      pitch,
      volume,
    });
    if (result && typeof (result as { catch?: unknown }).catch === "function") {
      void (result as Promise<unknown>).catch(() => {
        /* All prompts remain visible on screen if speech rejects asynchronously. */
      });
    }
  } catch {
    /* Speech backend unavailable or failed: report false honestly; text stays visible. */
    return false;
  }

  for (const listener of listeners) {
    try {
      listener({ type: "speak", text: clean, language, rate, pitch, volume, interrupt });
    } catch {
      /* Ignore observer errors. */
    }
  }
  return true;
}

export const speak = speakText;

/**
 * Subscribes to native AppState backgrounding and web document visibility changes so active
 * speech is cancelled immediately even when board activity was already false (e.g. Help sheet open).
 */
export function useSpeechLifecycle() {
  const foreground = useRef<boolean>(isAppForeground());

  useEffect(() => {
    foreground.current = isAppForeground();
    const sub = getAppState()?.addEventListener?.("change", (state) => {
      const next = state === "active";
      foreground.current = next;
      if (!next) stopSpeaking();
    });
    const onVisibility = () => {
      const next = typeof document === "undefined" ? true : !document.hidden;
      foreground.current = next;
      if (!next) stopSpeaking();
    };
    const attachWeb =
      getPlatformOS() === "web" &&
      typeof document !== "undefined" &&
      typeof document.addEventListener === "function";
    if (attachWeb) {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      sub?.remove?.();
      if (attachWeb && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return foreground;
}

/**
 * Consumes AudioPreferences (`sound`, `narration`, `automaticSpeech`, `narrationVolume`, `epoch`).
 * Auto-speaks a task prompt once per `promptKey` ONLY when `automaticSpeech` is enabled,
 * keeps explicit replay/speak working on tap whenever narration is enabled with volume > 0,
 * and stops cleanly on mute, inactive, backgrounding, preference/epoch change, or unmount.
 */
export function useSpokenPrompt(
  text: string | null | undefined,
  promptKey: string,
  opts: {
    soundOn: boolean;
    active: boolean;
    autoSpeak?: boolean;
    language?: string;
    rate?: number;
    pitch?: number;
  },
) {
  const {
    soundOn,
    active,
    autoSpeak = true,
    language = DEFAULT_LANGUAGE,
    rate = 0.94,
    pitch = 1.06,
  } = opts;
  const prefs = useContext(AudioPreferences);
  const soundSetting = prefs.sound ?? true;
  const narration = prefs.narration ?? true;
  const automaticSpeech = prefs.automaticSpeech ?? false;
  const volume = clampVolume(prefs.narrationVolume);
  const epoch = prefs.epoch ?? 0;
  const enabled = soundOn && soundSetting && narration && volume > 0;

  const foreground = useSpeechLifecycle();
  const spokenKey = useRef<string | null>(null);
  const prevPrefs = useRef({ enabled, narration, automaticSpeech, volume, epoch });

  useLayoutEffect(() => {
    const prev = prevPrefs.current;
    if (
      prev.enabled !== enabled ||
      prev.narration !== narration ||
      prev.automaticSpeech !== automaticSpeech ||
      prev.volume !== volume ||
      prev.epoch !== epoch
    ) {
      prevPrefs.current = { enabled, narration, automaticSpeech, volume, epoch };
      stopSpeaking();
    }
  }, [enabled, narration, automaticSpeech, volume, epoch]);

  useEffect(() => {
    if (!enabled || !active || !foreground.current) {
      stopSpeaking();
      return;
    }
    if (!autoSpeak || !automaticSpeech || !text) return;
    if (spokenKey.current === promptKey) return;
    spokenKey.current = promptKey;
    speakText(text, { enabled, active, language, rate, pitch, volume, interrupt: true });
  }, [text, promptKey, enabled, active, autoSpeak, automaticSpeech, language, rate, pitch, volume, foreground]);

  useEffect(() => () => {
    stopSpeaking();
  }, []);

  const replay = useCallback(() => {
    if (!text || !enabled || !active || !foreground.current) return false;
    return speakText(text, { enabled, active, language, rate, pitch, volume, interrupt: true });
  }, [text, enabled, active, language, rate, pitch, volume, foreground]);

  const say = useCallback(
    (line: string, lineOpts?: { language?: string; rate?: number; pitch?: number; interrupt?: boolean }) => {
      if (!enabled || !active || !foreground.current) return false;
      return speakText(line, {
        enabled,
        active,
        language: lineOpts?.language ?? language,
        rate: lineOpts?.rate ?? rate,
        pitch: lineOpts?.pitch ?? pitch,
        volume,
        interrupt: lineOpts?.interrupt ?? true,
      });
    },
    [enabled, active, language, rate, pitch, volume, foreground],
  );

  return { replay, speak: say, stop: stopSpeaking, canSpeak: enabled && active };
}
