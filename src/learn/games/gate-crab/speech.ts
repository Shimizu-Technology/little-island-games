import { COLORS, rowCodes, rowWords, shellOf, type RowLen, type ShellCode } from './rules';

/**
 * Staged speech keys for Gate Crab (`scripts/learn/o3-gate-crab.json`).
 * Spoken row reading uses the individual shell/row phrasing cleanly and always provides
 * full accessible text for VoiceOver even before audio recordings are generated in W5b.
 */
export const shellSpeechKey = (code: ShellCode): string => {
  const s = shellOf(code);
  return `gate-shell-${s.big ? 'big' : 'small'}-${COLORS[s.col]}`;
};

export const rowReadSpeechText = (len: RowLen, rowIdx: number, outcome?: boolean): string => {
  const words = rowWords(len, rowIdx);
  if (outcome === undefined) return `Row: ${words}.`;
  return `${outcome ? 'Pass' : 'Block'}: ${words}.`;
};

export const shellButtonLabel = (code: ShellCode): string => {
  const s = shellOf(code);
  return `${s.big ? 'Big' : 'Small'} ${COLORS[s.col]} shell`;
};

export const rowSlotDescription = (len: RowLen, rowIdx: number): string => {
  const codes = rowCodes(len, rowIdx);
  return codes.map((c, i) => `Slot ${i + 1}: ${shellButtonLabel(c)}`).join('. ');
};

export const GATE_SPEECH_KEYS = {
  intro: 'gate-intro',
  help: 'gate-help',
  coach: 'gate-coach',
  pass: 'gate-pass',
  block: 'gate-block',
  alreadyTested: 'gate-already-tested',
  quizReady: 'gate-quiz-ready',
  counterexample: 'gate-counterexample',
  solved: 'gate-solved',
  hintLook: 'gate-hint-look',
  hintThink: 'gate-hint-think',
  makerCover: 'gate-maker-cover',
  guesserCover: 'gate-guesser-cover',
  makerLocked: 'gate-maker-locked',
  readOn: 'gate-read-on',
  readOff: 'gate-read-off',
} as const;
