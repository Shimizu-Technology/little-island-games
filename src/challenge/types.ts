import type { ReactNode } from 'react';
import type { Bank, ChallengeProgress, ChallengeSession, Dare, PuzzleRef, SaveCatalog, SessionCodec, Terminal } from '../state/challenge';
export type { Registry } from './registry.generated';
export type ChallengePath = 'deep-water' | 'endless';
export type Source =
  | { kind: 'school'; game: string; level: 1|2|3|4|5; puzzle: string }
  | { kind: 'deep-water'; collection: number; puzzle: number }
  | { kind: 'endless'; bank: number; puzzle: number }
  | { kind: 'play'; game: string; content: string; rules: number };
export type Metric = 'cards'|'steps'|'placements'|'loads'|'turns';
export type DareRule =
  | { kind: 'par'; metric: Metric; max: number }
  | { kind: 'clean' }
  | { kind: 'plan'; max: 1|2|3 }
  | { kind: 'blind' }
  | { kind: 'whole' }
  | { kind: 'two-ways' }
  | { kind: 'pick-up'; objective: string }
  | { kind: 'own-read' }
  | { kind: 'edits'; max: number };
export type AwardRule = { rule: DareRule; help: Dare['help'] };
export type RegisteredDare = { slot: number; id: string; label: string; retired?: boolean; rule: DareRule; help: Dare['help'] };
export type Puzzle<D> = {
  ref: PuzzleRef; source: Source; path: ChallengePath; tier: 1|2|3|4|5|6; title: string;
  retired?: boolean; descriptor: D; dares: readonly RegisteredDare[];
  /** A/B award bits use the same replay evidence as permanent dare marks. */
  awards: readonly [AwardRule | null, AwardRule | null];
  par?: { metric: Metric; lower: number; upper: number };
};
export type LaunchOptions = { supportOff: boolean; ownRead: boolean };
export type ReplayPayload<P,A> = { version: 1; initial: P; options: LaunchOptions; firstSolutions: string[]; actions: A[] };
export type ReplayEvent = 'edit'|'run'|'check'|'help'|'read-aloud'|'reset';
export type EngineInspection = { solved: boolean; metrics: Partial<Record<Metric, number>>; edits: number; solution: string | null; objectives: string[]; dareEligible?: boolean };
export type Evidence = EngineInspection & LaunchOptions & { helpUsed: boolean; heard: boolean; failed: boolean; runs: number; checks: number; resets: number; firstSolutions: readonly string[] };
export type ReplayEngine<D,P,A,S> = {
  validInitial: (value: unknown, descriptor: D) => value is P;
  initial: (descriptor: D) => P;
  create: (descriptor: D, initial: P, options: LaunchOptions) => S;
  validAction: (value: unknown) => value is A;
  step: (state: S, action: A, descriptor: D) => { state: S; event: ReplayEvent; correct?: boolean } | null;
  inspect: (state: S, descriptor: D) => EngineInspection;
  /** Optional evidence carried from an earlier attempt of the same puzzle, merged into runs and failed. */
  prior?: (initial: P) => { runs: number; failed: boolean } | null;
};
export type ChallengeViewProps<S,A> = {
  state: S; dispatch: (action: A) => void; active: boolean; width: number;
  /** Optional in standalone renders. Includes owner, epoch, puzzle and accepted revision. */
  sessionKey?: string;
  onFresh?: () => void;
  commit?: (action: A, expectedKey: string) => Promise<{ key: string; state: S } | null>;
  /** Animated boards report when a run's playback has finished, so the frame can show the result. */
  onSettled?: () => void;
  /** Frame chrome placed inside a pinned board's own scrolling controls. */
  header?: ReactNode; footer?: ReactNode;
};
export type ChallengeRenderHost = {
  onFresh?: () => void;
  key: string;
  commit: (action: unknown, expectedKey: string) => Promise<{ key: string; session: ChallengeSession } | null>;
  onSettled?: () => void;
  header?: ReactNode; footer?: ReactNode;
};
export type CompletionFacts = { helpUsed: boolean; failed: boolean };
export type ChallengeCard = Omit<Puzzle<unknown>, 'descriptor'|'awards'>;
/** Erasure happens only after a typed registration validates its own payload. No action bags. */
export type ChallengeEntry = {
  game: string; codec: string; cove: boolean; animatedRuns?: boolean; restart?: (session: ChallengeSession, id: string, progress: ChallengeProgress) => ChallengeSession;
  /** True when a rejected move was refused because the attempt's log is full, so restart is the way on. */
  full?: (session: ChallengeSession) => boolean;
  /** Game-specific line in the dare picker about how help affects dare marks. */
  dareHelp?: string;
  contextFor: (ref: PuzzleRef) => string; puzzles: readonly ChallengeCard[]; catalog: SaveCatalog;
  start: (puzzle: PuzzleRef, owner: string, id: string, progress: ChallengeProgress, options: LaunchOptions, dares: number[]) => ChallengeSession;
  move: (session: ChallengeSession, action: unknown) => ChallengeSession | null;
  render: (session: ChallengeSession, dispatch: (action: unknown) => void, active: boolean, width: number, host?: ChallengeRenderHost) => ReactNode;
  /** Specific praise supplied by the real engine's game, never speed-based. */
  completionText?: (ref: PuzzleRef, result: Terminal, facts: CompletionFacts | null) => string;
  /** Praise facts re-derived from the accepted replay, never persisted or inferred from Terminal. */
  completionFacts?: (session: ChallengeSession) => CompletionFacts | null;
  /** The frame supplies Help unless the board declares its own help UI. */
  helpUI?: 'board';
  controls: { help: () => unknown; reset: () => unknown };
};
export type TypedRegistration<P,A,S> = ChallengeEntry & { readonly types?: { Payload: P; Action: A; State: S } };
export type CodecRegistration = { bank: Bank; codec: SessionCodec; terminal: Terminal | null };
