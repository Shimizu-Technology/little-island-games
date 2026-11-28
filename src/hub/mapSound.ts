import { useCallback, useEffect, useRef } from 'react';
import type { HomeSound } from '../home/runtime/homeSound';

type MapSound = Extract<HomeSound, 'splash' | 'shell' | 'rustle'>;
type Voice = { play(): void; seekTo(seconds: number): unknown; pause(): void; remove(): void };

/* eslint-disable @typescript-eslint/no-require-imports -- lazy native audio and static asset requires keep tests lightweight. */
function mapSoundSource(sound: MapSound): number {
  switch (sound) {
    case 'splash': return require('../../assets/home/splash.wav');
    case 'shell': return require('../../assets/home/shell.wav');
    case 'rustle': return require('../../assets/home/rustle.wav');
  }
}
function createVoice(sound: MapSound): Voice | undefined {
  try {
    const audio = require('expo-audio') as typeof import('expo-audio');
    const player = audio.createAudioPlayer(mapSoundSource(sound));
    player.volume = 0.75;
    return player;
  } catch {
    return undefined;
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** Lightweight lazy map sound player; follows the app sound/effects switch and foreground state. */
export function useMapFeedback(live: boolean): (sound: HomeSound) => void {
  const voices = useRef<Partial<Record<MapSound, Voice>>>({});
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
    if (!live) {
      for (const v of Object.values(voices.current)) {
        try { v?.pause(); } catch { /* Released. */ }
      }
    }
  }, [live]);
  useEffect(() => () => {
    for (const v of Object.values(voices.current)) {
      try { v?.remove(); } catch { /* Released. */ }
    }
    voices.current = {};
  }, []);
  return useCallback((sound: HomeSound) => {
    if (!liveRef.current) return;
    if (sound !== 'splash' && sound !== 'shell' && sound !== 'rustle') return;
    const voice = (voices.current[sound] ??= createVoice(sound));
    if (!voice) return;
    try {
      void voice.seekTo(0);
      voice.play();
    } catch {
      /* Stay silent when native audio is unavailable. */
    }
  }, []);
}
