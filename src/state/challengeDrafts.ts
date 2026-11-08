import { assertContentLive, prepareSessionContent, contentUnavailable, type ContentOptions } from './sessionContent';
import { progressBytes, rememberProgressBytes, challengeLimit, openProgress, creditProgress, saveCatalog, validChallengeProgress, validChallengeSession, type ChallengeProgress, type ChallengeSession } from './challenge';
import { asciiId, exactKeys, jsonBytes, plain, uint } from './saveBits';
import { projectProfile, syncProfile } from './profiles';
import type { Save } from './validation';
import type { StorageAdapter } from './storage';
export type DraftRow = { version: 1; base: string; session: ChallengeSession };
export type ChallengeExpected = { epoch: number; owner: string; game: string; id: string | null; revision: number | null; replace?: { game:string; id:string; revision:number } };
let serial = 0;
export const newSaveRevision = () => `save-${Date.now().toString(36).padStart(9,'0')}-${(++serial).toString(36).padStart(8,'0')}-${Math.random().toString(36).slice(2,10).padEnd(8,'0')}`;
export const draftKey = (row: DraftRow) => `draft:${JSON.stringify([row.base,row.session.owner,row.session.game])}`;
export function parseDraft(raw: string, catalog = saveCatalog): DraftRow {
  if (raw.length > 5000) throw new Error('Draft row is too large.');
  const v: unknown = JSON.parse(raw);
  if (!plain(v) || !exactKeys(v,['version','base','session']) || v.version !== 1 || !asciiId(v.base) || !plain(v.session) || !asciiId(v.session.owner,40) || !validChallengeSession(v.session,v.session.owner,catalog,v.session.owner.startsWith('cove-')) || v.session.result !== null || v.session.credited) throw new Error('Invalid draft. The original has been kept.');
  return v as DraftRow;
}
export function progressFor(save: Save, owner: string): ChallengeProgress | undefined {
  if (owner === (save.learning?.active ?? 'family')) return save.challenge ?? save.profiles?.people[owner]?.challenge;
  return save.profiles?.people[owner]?.challenge ?? save.cove?.people[owner]?.challenge;
}
export function putProgress(save: Save, owner: string, challenge: ChallengeProgress): Save {
  if (save.profiles && Object.hasOwn(save.profiles.people,owner)) {
    const next = { ...save, profiles:{ ...save.profiles, people:{ ...save.profiles.people, [owner]:{ ...save.profiles.people[owner], challenge } } } };
    return owner === (save.learning?.active ?? 'family') ? { ...next, challenge } : next;
  }
  if (save.cove && Object.hasOwn(save.cove.people,owner)) return { ...save, cove:{ ...save.cove, people:{ ...save.cove.people,[owner]:{ ...save.cove.people[owner], challenge } } } };
  return save;
}
export const selectedOwner = (save: Save) => save.cove?.active ?? save.learning?.active ?? 'family';
function eligiblePartner(save: Save, session: ChallengeSession, catalog = saveCatalog): boolean {
  if (session.partner === null) return true;
  return !!progressFor(save,session.partner) && (!Object.hasOwn(save.cove?.people ?? {},session.partner) || !!catalog.banks.get(session.puzzle.bank)?.cove);
}
export type ChallengeRefusal = 'full-save' | 'session-budget' | 'learner-ceiling' | 'paused-full' | 'stale';
export const refusalMessage: Record<ChallengeRefusal,string> = {
  'full-save': 'This save has reached its limit. Your saved work is kept. Ask a grown-up to export it, then manage paused games or people.',
  'session-budget': 'This paused game has reached its save limit. Your saved work is kept. Ask a grown-up to export it before starting another attempt.',
  'learner-ceiling': 'This person has reached their save limit. Their saved work is kept. Ask a grown-up to export it, then manage their paused games.',
  'paused-full': 'All paused spaces are in use. Continue a saved puzzle, export a backup, or choose one to replace.',
  stale: 'This round or person has changed. Reopen the current paused game to continue.',
};
/** All runtime entry points check owner and epoch as well as round identity/revision. */
export function challengeTransition(save: Save, session: ChallengeSession, expected: ChallengeExpected, epoch: number, catalog = saveCatalog, refused?: (reason:ChallengeRefusal)=>void): Save {
  if (expected.epoch !== epoch || expected.owner !== session.owner || expected.game !== session.game || selectedOwner(save) !== expected.owner || !validChallengeSession(session,expected.owner,catalog,expected.owner.startsWith('cove-'))) return save;
  const progress = progressFor(save,expected.owner); if (!progress) return save;
  const before = progress.paused.find(s => s.game === session.game);
  if ((before?.id ?? null) !== expected.id || (before?.revision ?? null) !== expected.revision) return save;
  if (!before || before.id !== session.id) {
    if (!eligiblePartner(save,session,catalog)) return save;
    if (!catalog.codecs.get(session.codec)!.canStart(session) || before && !before.credited && !expected.replace || session.ordinal !== progress.nextOrdinal || session.revision !== 0 || session.credited || session.result !== null || !uint(progress.nextOrdinal,2147483646)) return save;
    const replacement=expected.replace;
    if(replacement && !progress.paused.some(s=>s.game===replacement.game&&s.id===replacement.id&&s.revision===replacement.revision))return save;
    const paused=progress.paused.filter(s=>!s.credited && s.game!==replacement?.game);
    if(paused.length >= (session.owner.startsWith('cove-')?4:8)){refused?.('paused-full');return save;}
    // Store commits this candidate and folds replaced rows atomically; failure keeps the old envelope.
    const next = { ...openProgress(progress,session.puzzle,catalog), nextOrdinal:progress.nextOrdinal + 1, paused:[...paused,session].sort((a,b) => a.game < b.game ? -1 : a.game > b.game ? 1 : 0) };
    if (progressBytes(next) > challengeLimit(session.owner.startsWith('cove-'))) { refused?.('learner-ceiling'); return save; }
    return validChallengeProgress(next,session.owner,catalog,session.owner.startsWith('cove-')) ? putProgress(save,session.owner,next) : save;
  }
  if (!catalog.codecs.get(session.codec)!.extends(before,session) || before.credited || before.result !== null || session.ordinal !== before.ordinal || session.revision !== before.revision + 1 || session.codec !== before.codec || JSON.stringify(session.puzzle) !== JSON.stringify(before.puzzle) || JSON.stringify(session.selectedDares) !== JSON.stringify(before.selectedDares) || session.partner !== before.partner && !(before.partner === null && session.partner !== null && session.result !== null && eligiblePartner(save,session,catalog)) || session.credited) return save;
  const next = { ...progress, paused:progress.paused.map(s => s.game === session.game ? session : s) };
  // The loaded record is already valid; a move changes exactly one session.
  const bytes=progressBytes(progress)+jsonBytes(session)-jsonBytes(before);
  rememberProgressBytes(next,bytes);
  if (bytes > challengeLimit(session.owner.startsWith('cove-'))) { refused?.('learner-ceiling'); return save; }
  return putProgress(save,session.owner,next);
}
/** An engine-verified terminal result credits both surviving people in one candidate. */
export function finishChallenge(save: Save, session: ChallengeSession, expected: ChallengeExpected, epoch: number, catalog = saveCatalog, refused?: (reason:ChallengeRefusal)=>void): Save {
  if (session.result === null) return save;
  let next = challengeTransition(save,session,expected,epoch,catalog,refused); if (next === save) return save;
  const recipients = [...new Set([session.owner,...(session.partner ? [session.partner] : [])])];
  for (const owner of recipients) {
    const before = progressFor(next,owner); if (!before) continue;
    const cove = !!next.cove && Object.hasOwn(next.cove.people,owner);
    const credited = creditProgress(before,session.puzzle,session.result,catalog,cove);
    if (owner === session.owner) credited.paused = credited.paused.filter(s => s.id !== session.id);
    if (!validChallengeProgress(credited,owner,catalog,cove)) { if (owner === session.owner) { if (progressBytes(credited) > challengeLimit(cove)) refused?.('learner-ceiling'); return save; } continue; }
    next = putProgress(next,owner,credited);
  }
  return next;
}
/** Replay rows only onto their exact base, owner and existing ordinal; never create work from an orphan. */
export async function recoverChallengeDrafts(save: Save, adapter: StorageAdapter, catalog = saveCatalog, options: ContentOptions = {}): Promise<Save> {
  let next = syncProfile(save);
  const preserve = (raw: string) => adapter.quarantineDraft ? adapter.quarantineDraft(raw) : adapter.preserve(raw);
  for (const raw of await adapter.readDrafts?.() ?? []) {
    assertContentLive(options);
    let row: DraftRow;
    // Do not read content for orphaned/stale rows. At most the accepted envelope's 56 refs load.
    try {
      if(raw.length>5000)throw new Error('Draft row is too large.');
      const v:unknown=JSON.parse(raw);
      if(!plain(v)||!plain(v.session)||typeof v.session.owner!=='string')throw new Error('Invalid draft.');
      const session=v.session, progress=progressFor(next,session.owner as string), old=progress?.paused.find(s=>s.game===session.game);
      if(v.base!==save.saveRevision || !old || old.id!==v.session.id || old.ordinal!==v.session.ordinal || JSON.stringify(old.puzzle)!==JSON.stringify(v.session.puzzle))throw new Error('Orphan draft.');
    } catch {await preserve(raw);continue;}
    try { if(raw.length<=5000)await prepareSessionContent(JSON.parse(raw),catalog,options); assertContentLive(options); row = parseDraft(raw,catalog); } catch(error) { if(contentUnavailable(error))throw error; await preserve(raw); continue; }
    const progress = progressFor(next,row.session.owner), old = progress?.paused.find(s => s.game === row.session.game);
    if (row.base !== save.saveRevision || !old || old.id !== row.session.id || old.ordinal !== row.session.ordinal || old.credited || old.result !== null || old.codec !== row.session.codec || JSON.stringify(old.puzzle) !== JSON.stringify(row.session.puzzle) || JSON.stringify(old.selectedDares) !== JSON.stringify(row.session.selectedDares) || old.partner !== row.session.partner) { await preserve(raw); continue; }
    if (row.session.revision <= old.revision) { if (row.session.revision !== old.revision || JSON.stringify(row.session) !== JSON.stringify(old)) await preserve(raw); continue; }
    if (!catalog.codecs.get(row.session.codec)!.extends(old,row.session)) { await preserve(raw); continue; }
    const challenge = { ...progress!, paused:progress!.paused.map(s => s.game === row.session.game ? row.session : s) };
    if (!validChallengeProgress(challenge,row.session.owner,catalog,row.session.owner.startsWith('cove-'))) { await preserve(raw); continue; }
    next = putProgress(next,row.session.owner,challenge);
  }
  assertContentLive(options);
  return projectProfile(next);
}
/** Incremental admission: row bytes replace its slot, without encoding the full envelope. */
export function draftGrowth(before: ChallengeSession, after: ChallengeSession) { return jsonBytes(after) - jsonBytes(before); }

export function envelopeWrite(save: Save): import('./storage').EnvelopeWrite {
  const canonical = syncProfile(save);
  return { revision:save.saveRevision ?? '', folded:[...Object.values(canonical.profiles?.people ?? {}),...Object.values(canonical.cove?.people ?? {})].flatMap(p => p.challenge?.paused ?? []).map(({owner,game,id,ordinal,revision}) => ({owner,game,id,ordinal,revision})) };
}
export function isFolded(raw: string, metadata?: import('./storage').EnvelopeWrite): boolean {
  try {
    // No whole-envelope parse: compare only the small durable row's identity and revision.
    const {session} = JSON.parse(raw) as DraftRow;
    return !!metadata?.folded.some(s => s.owner === session.owner && s.game === session.game && s.id === session.id && s.ordinal === session.ordinal && s.revision >= session.revision);
  } catch { return false; }
}

export function challengeAttempt(save:Save,session:ChallengeSession,expected:ChallengeExpected,epoch:number): {save:Save;refusal:ChallengeRefusal|null} {
  let refusal:ChallengeRefusal='stale';
  if (jsonBytes(session) > 4096) return {save,refusal:'session-budget'};
  const next=session.result === null ? challengeTransition(save,session,expected,epoch,saveCatalog,r=>{refusal=r;}) : finishChallenge(save,session,expected,epoch,saveCatalog,r=>{refusal=r;});
  return {save:next,refusal:next === save ? refusal : null};
}
