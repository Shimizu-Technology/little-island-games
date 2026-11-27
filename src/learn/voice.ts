import { useCallback, useEffect, useRef } from "react";

export type SpeakEvent =
  | { type: "speak"; text: string; rate: number; pitch: number; interrupt: boolean }
  | { type: "stop" };

type VoiceListener = (event: SpeakEvent) => void;

const listeners = new Set<VoiceListener>();

type SpeechSynthesisLike = {
  cancel?: () => void;
  speak?: (utterance: unknown) => void;
};

function getSpeechSynthesis(): SpeechSynthesisLike | null {
  const g = globalThis as unknown as {
    speechSynthesis?: SpeechSynthesisLike;
    window?: { speechSynthesis?: SpeechSynthesisLike };
  };
  return g.speechSynthesis ?? g.window?.speechSynthesis ?? null;
}

type UtteranceCtor = new (text: string) => {
  lang?: string;
  rate?: number;
  pitch?: number;
};

function getUtteranceCtor(): UtteranceCtor | null {
  const g = globalThis as unknown as {
    SpeechSynthesisUtterance?: UtteranceCtor;
    window?: { SpeechSynthesisUtterance?: UtteranceCtor };
  };
  return g.SpeechSynthesisUtterance ?? g.window?.SpeechSynthesisUtterance ?? null;
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
    getSpeechSynthesis()?.cancel?.();
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
  /** Gentle speech rate (default 0.94 for warm clarity). */
  rate?: number;
  /** Cheerful pitch (default 1.06). */
  pitch?: number;
  /** Interrupt any in-flight utterance first (default true). */
  interrupt?: boolean;
};

/**
 * Speak a short, child-friendly prompt or help line cleanly.
 * Respects mute (`enabled`) and foreground (`active`), interrupts stale speech by default,
 * uses zero timers, and degrades safely when speech synthesis is unavailable.
 */
export function speakText(text: string, opts: SpeakOptions = {}): boolean {
  const clean = text.trim();
  if (!clean || opts.enabled === false || opts.active === false) return false;
  const rate = opts.rate ?? 0.94;
  const pitch = opts.pitch ?? 1.06;
  const interrupt = opts.interrupt !== false;
  const synth = getSpeechSynthesis();
  const Ctor = getUtteranceCtor();
  if (interrupt) {
    try {
      synth?.cancel?.();
    } catch {
      /* Ignore cancel errors on platforms without speech synthesis. */
    }
  }
  if (synth?.speak && Ctor) {
    try {
      const utterance = new Ctor(clean);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = pitch;
      synth.speak(utterance);
    } catch {
      /* All prompts remain visible on screen if autoplay or speech synthesis rejects. */
    }
  }
  for (const listener of listeners) {
    try {
      listener({ type: "speak", text: clean, rate, pitch, interrupt });
    } catch {
      /* Ignore observer errors. */
    }
  }
  return true;
}

export const speak = speakText;

/**
 * Auto-speaks a task prompt once per `promptKey` when `soundOn && active`,
 * stops cleanly on mute/inactive/unmount, and exposes replay/speak/stop helpers.
 */
export function useSpokenPrompt(
  text: string | null | undefined,
  promptKey: string,
  opts: {
    soundOn: boolean;
    active: boolean;
    autoSpeak?: boolean;
    rate?: number;
    pitch?: number;
  },
) {
  const { soundOn, active, autoSpeak = true, rate = 0.94, pitch = 1.06 } = opts;
  const spokenKey = useRef<string | null>(null);

  useEffect(() => {
    if (!soundOn || !active) {
      stopSpeaking();
      return;
    }
    if (!autoSpeak || !text) return;
    if (spokenKey.current === promptKey) return;
    spokenKey.current = promptKey;
    speakText(text, { enabled: soundOn, active, rate, pitch, interrupt: true });
  }, [text, promptKey, soundOn, active, autoSpeak, rate, pitch]);

  useEffect(() => () => {
    stopSpeaking();
  }, []);

  const replay = useCallback(() => {
    if (!text || !soundOn || !active) return false;
    return speakText(text, { enabled: soundOn, active, rate, pitch, interrupt: true });
  }, [text, soundOn, active, rate, pitch]);

  const say = useCallback(
    (line: string, lineOpts?: { rate?: number; pitch?: number; interrupt?: boolean }) => {
      if (!soundOn || !active) return false;
      return speakText(line, {
        enabled: soundOn,
        active,
        rate: lineOpts?.rate ?? rate,
        pitch: lineOpts?.pitch ?? pitch,
        interrupt: lineOpts?.interrupt ?? true,
      });
    },
    [soundOn, active, rate, pitch],
  );

  return { replay, speak: say, stop: stopSpeaking };
}
