import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { elapseRound, pauseRound, type WordSession } from './session';
export interface WordScreenProps {
  session: WordSession | null;
  onSave: (next: WordSession, previous: WordSession | null) => boolean | void;
  onBack: () => void;
  onActionFocus?: () => void;
  onFeedback?: (event: 'word' | 'finish' | 'tap') => void;
  active?: boolean;
  sound?: boolean;
  width?: number;
  beforeNewRound?: (start: () => void) => void;
}
/** UI state is immediate; every accepted mutation uses the store's round/revision/restore guard. */
export function useWordRound({ session, onSave, active = true, onFeedback, sound = true, onActionFocus }: WordScreenProps) {
  const [round, setRound] = useState<WordSession | null>(() => session ? pauseRound(session) : null);
  const live = useRef(round), save = useRef(onSave), last = useRef(0), feedback = useRef({ onFeedback, sound, onActionFocus });
  useEffect(() => { save.current = onSave; feedback.current = { onFeedback, sound, onActionFocus }; }, [onSave, onFeedback, sound, onActionFocus]);
  const change = useCallback((next: WordSession) => {
    const previous = live.current;
    if (next === previous || save.current(next, previous) === false) return false;
    if (!previous || next.id !== previous.id || next.remainingMs !== previous.remainingMs || (next.phase === 'playing' && previous.phase !== 'playing')) last.current = Date.now();
    live.current = next; setRound(next);
    if (!previous || next.phase !== previous.phase || next.id !== previous.id) feedback.current.onActionFocus?.();
    return true;
  }, []);
  // A restored running round opens behind a privacy/resume card, with its remaining time preserved.
  useEffect(() => {
    if (session && live.current && session !== live.current) save.current(live.current, session);
    // Only the mount snapshot: backup replacement remounts the activity using the store epoch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pause = useCallback(() => {
    const current = live.current;
    if (current?.phase === 'playing') change(pauseRound(elapseRound(current, Date.now() - last.current)));
  }, [change]);
  useEffect(() => { if (!active) pause(); }, [active, pause]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    const visibility = () => { if (document.hidden) pause(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
    return () => { sub.remove(); if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility); };
  }, [pause]);
  useEffect(() => {
    if (!active || round?.phase !== 'playing' || round.mode === 'chill') return;
    const timer = setInterval(() => {
      const current = live.current;
      if (!current || current.phase !== 'playing') return;
      const elapsed = Date.now() - last.current;
      if (elapsed >= 1000) {
        const next = elapseRound(current, elapsed);
        if (change(next) && next.phase !== 'playing' && feedback.current.sound) feedback.current.onFeedback?.('finish');
      }
    }, 200);
    return () => clearInterval(timer);
  }, [active, round?.phase, round?.mode, change]);
  return { round, change, live, pause };
}
