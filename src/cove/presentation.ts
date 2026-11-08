import type { ChallengeCard, ChallengeEntry } from '../challenge/types';
import type { ChallengeSession } from '../state/challenge';
import { gameInfo, infoFor, type CoveInfo, type Reader } from './catalog';
export type PuzzleDetails = { specifics: string; techniques: string[]; template: string; readers?: readonly Reader[] };
export type CovePresentation = {
  info: CoveInfo;
  details: (card: ChallengeCard) => PuzzleDetails;
  /** An adapter must certify its own allowed remix and validate its launch in the same codec. */
  remixes?: readonly { id: string; label: string; start: (session: ChallengeSession) => ChallengeSession }[];
};
const presentations = new Map<string, CovePresentation>();
/** Called by an adapter registration. It adds no game, ref, count, completion or approval. */
export function presentCove(entry: ChallengeEntry, presentation: CovePresentation): void {
  if (!entry.cove || presentations.has(entry.game) || !presentation.info.provenance || entry.puzzles.some(p => { const d = presentation.details(p); return !d.specifics.trim() || !d.template.trim() || !d.techniques.length; })) throw new Error('Cove presentation must describe every registered puzzle.');
  if (/(?:\bkenken\b|\bpicross\b|\bjumble\b|\bwordle\b|\bshanghai\b|\bbinairo\b|\btakuzu\b)/i.test(presentation.info.name)) throw new Error('Choose an original Cove name.');
  gameInfo[entry.game] = presentation.info;
  presentations.set(entry.game, presentation);
}
export const presentationFor = (entry: ChallengeEntry): CovePresentation => presentations.get(entry.game) ?? { info: infoFor(entry.game), details: card => ({ specifics: card.title, techniques: [], template: '' }) };
