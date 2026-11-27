import React, { useEffect, useState, type ComponentType } from 'react';
import type { ChallengeCard, PackedBand, RegisteredDare, TypedRegistration } from '../../challenge/types';
import type { PackedOpen } from '../../cove/catalog';
import { validChallengeSession, type ChallengeProgress, type ChallengeSession, type Dare, type PuzzleRef, type SaveCatalog, type SessionCodec, type Terminal } from '../../state/challenge';
import type { PackedBank } from '../../state/bankFacts';
import { prepareSessionContent, sessionHash } from '../../state/sessionContent';
import { asciiId, hashId, uint, unpack } from '../../state/saveBits';
import type { FamilyManifest } from '../bank';
import { bankLoader } from '../catalog';
import { BankError, type BankLoader } from '../loader';
import { answerHash, pictureGridAdapter } from './adapter';
import type { PictureBoardProps } from './Board';
import { PICTURE_SAVE_BYTES, decodePicture, editPicture, encodePicture, freshPicture, validPictureEvent, type PictureDraft, type PictureEvent, type PictureSave } from './checkpoint';
import { PICTURE_GRID, pictureBands, solved, type PictureBand, type PictureGrid } from './engine';
import { pictureHint } from './help';
import { loadNativeControls, type NativeControls } from './nativeControls';

export type PictureBank = { slot: number; first: number; count: number; packHash: string; band: PictureBand['id']; rules: number; retired?: boolean };
type PictureDare = { slot: number; bank: number; puzzle: number; id: string; label: string };
export type Payload = PictureSave;
export type Action = PictureEvent;
export type State = { picture: PictureGrid; draft: PictureDraft; band: PictureBand };
export const pictureGridCodec = 'picture-grid-1';
export type PlayScreenImporter = () => Promise<ComponentType<PictureBoardProps>>;
export type ReactNativeImporter = () => Promise<NativeControls>;
// The native view stays out of the Node registry/catalog tools until rendered.
const defaultLoadPlayScreen: PlayScreenImporter = () => import('./PlayScreen').then(m => m.PlayScreen);
const defaultLoadReactNative: ReactNativeImporter = loadNativeControls;
// Cache only resolved modules (never rejected promises) so Try again genuinely retries a failed dynamic import.
const loadedScreens = new WeakMap<PlayScreenImporter, ComponentType<PictureBoardProps>>();
const loadedReactNative = new WeakMap<ReactNativeImporter, NativeControls>();
const pendingReactNative = new WeakMap<ReactNativeImporter, Promise<NativeControls>>();

function loadReactNative(importer: ReactNativeImporter): Promise<NativeControls> {
  const cached = loadedReactNative.get(importer);
  if (cached) return Promise.resolve(cached);
  const pending = pendingReactNative.get(importer);
  if (pending) return pending;
  // Expo's embedded-bundle import runtime can throw before returning a Promise.
  const next = Promise.resolve().then(importer).then(
    m => {
      loadedReactNative.set(importer, m);
      pendingReactNative.delete(importer);
      return m;
    },
    error => {
      pendingReactNative.delete(importer);
      throw error;
    },
  );
  pendingReactNative.set(importer, next);
  return next;
}

const MAX_RN_RETRIES = 2;

export function PlayScreenLoader({
  loadScreen = defaultLoadPlayScreen,
  loadRN = defaultLoadReactNative,
  ...props
}: PictureBoardProps & { loadScreen?: PlayScreenImporter; loadRN?: ReactNativeImporter }) {
  const [loadedRn, setLoadedRn] = useState<NativeControls | null>(() => loadedReactNative.get(loadRN) ?? null);
  const [rnRetry, setRnRetry] = useState(0);
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; attempt: number }>(() => ({
    status: loadedScreens.has(loadScreen) ? 'ready' : 'loading',
    attempt: 0,
  }));

  useEffect(() => {
    if (loadedReactNative.has(loadRN)) return;
    let cancelled = false;
    void loadReactNative(loadRN).then(
      m => {
        if (!cancelled) setLoadedRn(m);
      },
      () => {
        // Rejection cleared from pendingReactNative; retry bounded times so a late rejection after loadScreen failed still recovers.
        if (!cancelled) setRnRetry(count => (count < MAX_RN_RETRIES ? count + 1 : count));
      },
    );
    return () => { cancelled = true; };
  }, [loadRN, state.status, state.attempt, rnRetry]);

  useEffect(() => {
    if (loadedScreens.has(loadScreen)) return;
    let cancelled = false;
    void Promise.resolve().then(loadScreen).then(
      Loaded => {
        loadedScreens.set(loadScreen, Loaded);
        if (!cancelled) setState(current => ({ ...current, status: 'ready' }));
      },
      () => {
        if (!cancelled) setState(current => ({ ...current, status: 'error' }));
      },
    );
    return () => { cancelled = true; };
  }, [loadScreen, state.attempt]);

  const Ready = loadedScreens.get(loadScreen);
  if (Ready) return React.createElement(Ready, props);
  const rn = loadedReactNative.get(loadRN) ?? loadedRn;
  if (!rn) return null;
  if (state.status === 'error') {
    return React.createElement(
      rn.View,
      {
        testID: 'picture-grid-load-error',
        accessibilityRole: 'alert',
        style: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, minHeight: 160 },
      },
      React.createElement(rn.Text, { style: { color: '#173A36', fontSize: 17, fontWeight: '800', textAlign: 'center' } }, 'Picture Grid could not load.'),
      React.createElement(rn.Text, { style: { color: '#173A36', fontSize: 15, textAlign: 'center' } }, 'Your saved work is kept. Try again, or go back to Puzzles.'),
      React.createElement(
        rn.Pressable,
        {
          testID: 'picture-grid-retry',
          accessibilityRole: 'button',
          accessibilityLabel: 'Try again',
          onPress: () => setState(current => ({ status: 'loading', attempt: current.attempt + 1 })),
          style: { minWidth: 44, minHeight: 48, borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F28270' },
        },
        React.createElement(rn.Text, { style: { color: '#173A36', fontSize: 15, fontWeight: '700' } }, 'Try again'),
      ),
    );
  }
  return React.createElement(
    rn.View,
    {
      testID: 'picture-grid-loading',
      accessible: true,
      accessibilityRole: 'progressbar',
      accessibilityLabel: 'Loading Picture Grid…',
      accessibilityLiveRegion: 'polite',
      style: { alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 160 },
    },
    React.createElement(rn.Text, { style: { color: '#173A36', fontSize: 16, fontWeight: '700', textAlign: 'center' } }, 'Loading Picture Grid…'),
  );
}

export function pictureGridBankFacts(manifest: FamilyManifest): PictureBank[] {
  if (manifest.family !== PICTURE_GRID || manifest.engine !== PICTURE_GRID) throw new Error('Expected a Picture Grid manifest.');
  return manifest.packs.map(([slot, first, count, , packHash, index, rules]) => {
    const band = pictureBands.find(entry => entry.id === manifest.bands[index]);
    if (!band) throw new Error('Unknown Picture Grid difficulty.');
    return { slot, first, count, packHash, band: band.id, rules, retired: manifest.retired.includes(slot) };
  });
}

/** Bind once the lead has baked and registered the immutable banks. Authored names stay off cards until solved. */
export function definePictureGrid(
  facts: readonly PictureBank[],
  { loader = bankLoader, cleanDares = [], loadScreen = defaultLoadPlayScreen, loadRN = defaultLoadReactNative }: {
    loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>;
    cleanDares?: readonly PictureDare[];
    loadScreen?: PlayScreenImporter;
    loadRN?: ReactNativeImporter;
  } = {},
): TypedRegistration<Payload, Action, State> {
  const banks = new Map<number, PackedBank>();
  const labels = new Map<number, PictureBand>();
  const retired = new Set<number>();
  const bands: PackedBand[] = facts.flatMap(fact => {
    const band = pictureBands.find(b => b.id === fact.band);
    if (!band || !uint(fact.slot, 139) || fact.slot < 110 || banks.has(fact.slot) || !uint(fact.first, 2147483647 - fact.count)
        || !uint(fact.count, 1024) || !fact.count || !hashId(fact.packHash) || fact.rules !== pictureGridAdapter.rules) {
      throw new Error('Invalid Picture Grid bank facts.');
    }
    const { slot, count, first, rules, packHash } = fact;
    labels.set(slot, band);
    banks.set(slot, { slot, count, first, rules, packHash, engine: PICTURE_GRID, family: PICTURE_GRID, awards: 0, cove: true });
    if (fact.retired) retired.add(slot);
    return fact.retired ? [] : [{ kind: 'band', bank: slot, tier: band.tier, path: 'endless', title: band.title, count }];
  });
  const dares = new Map<number, Dare>();
  const cardDares = new Map<string, RegisteredDare[]>();
  const rowKey = (slot: number, index: number) => `${slot}:${index}`;
  for (const { slot, bank, puzzle, id, label } of cleanDares) {
    const definition = banks.get(bank);
    if (!definition || !uint(puzzle, definition.count - 1) || !uint(slot, 1799) || slot < 1700 || dares.has(slot) || !asciiId(id) || !label.trim()) {
      throw new Error('Invalid Picture Grid dare.');
    }
    dares.set(slot, { bank, puzzle, kind: 'clean', help: 'independent' });
    const row = rowKey(bank, puzzle);
    cardDares.set(row, [...cardDares.get(row) ?? [], { slot, id, label, retired: retired.has(bank), rule: { kind: 'clean' }, help: 'independent' }]);
  }
  const key = (ref: PuzzleRef) => `${ref.bank}:${ref.puzzle}:${ref.hash}`;
  const resident = new Map<string, PictureGrid>();
  const view = (session: ChallengeSession): State | null => {
    const picture = resident.get(key(session.puzzle)), band = labels.get(session.puzzle.bank);
    const draft = picture && decodePicture(session.payload, picture.size);
    if (!picture || !band || !draft || draft.showingHint && (solved(picture, draft.marks) || !pictureHint(picture, draft.marks))) return null;
    return { picture, draft, band };
  };
  const terminal = (session: ChallengeSession, state: State): Terminal | null => {
    const { picture, draft } = state;
    if (!solved(picture, draft.marks)) return null;
    const event = session.partner ? 'together' : draft.helps ? 'helped' : 'independent';
    return { event, awards: 0, dares: event === 'independent' ? session.selectedDares : [], cost: null, solution: answerHash(draft.marks) };
  };
  const codec: SessionCodec = {
    game: PICTURE_GRID, cove: true, budget: { wrapper: 696, draft: PICTURE_SAVE_BYTES, undo: 0, audit: 0 },
    validate: session => !!view(session),
    evaluate: session => { const state = view(session); return state ? terminal(session, state) : null; },
    canStart: session => {
      const state = view(session);
      return !!state && session.result === null && state.draft.edits === 0 && state.draft.helps === 0 && state.draft.resets === 0;
    },
    extends: (previous, next) => {
      const before = decodePicture(previous.payload), after = decodePicture(next.payload, before?.size);
      return !!before && !!after && after.edits >= before.edits && after.helps >= before.helps && after.resets >= before.resets;
    },
  };
  const contextFor = (ref: PuzzleRef) => `picture-grid-${labels.get(ref.bank)?.tier ?? 1}`;
  const catalog: SaveCatalog = { banks, codecs: new Map([[pictureGridCodec, codec]]), dares,
    contexts: new Set([...labels.values()].map(b => `picture-grid-${b.tier}`)) };

  const open = async (slot: number, index: number, expected?: PuzzleRef): Promise<PuzzleRef> => {
    const bank = banks.get(slot);
    if (!bank || !uint(index, bank.count - 1)) throw new BankError('unknown', 'That picture is unavailable.');
    if (expected && (expected.engine !== PICTURE_GRID || expected.rules !== bank.rules)) throw new BankError('malformed', 'That picture needs a different set of rules.');
    const transport = loader();
    const descriptor = await transport.entry(pictureGridAdapter, PICTURE_GRID, bank.first + index);
    const { ref, payload } = descriptor;
    const band = labels.get(slot)!;
    if (ref.bank !== slot || ref.puzzle !== index || ref.engine !== PICTURE_GRID || ref.rules !== bank.rules || (expected && ref.hash !== expected.hash)
      || descriptor.band !== band.id || !(band.sizes as readonly number[]).includes(payload.size)) {
      throw new BankError('hash-mismatch', 'That picture does not match its saved fingerprint.');
    }
    await prepareSessionContent({ puzzle: ref }, catalog, { loader: transport });
    if (sessionHash(bank, index, catalog) !== ref.hash) throw new BankError('hash-mismatch', 'That picture does not match its bank.');
    resident.delete(key(ref));
    resident.set(key(ref), payload);
    if (resident.size > 16) resident.delete(resident.keys().next().value!);
    return ref;
  };

  function pick(slot: number, progress: ChallengeProgress, skip: ReadonlySet<number>, avoid?: PuzzleRef) {
    const bank = banks.get(slot);
    if (!bank || retired.has(slot)) throw new BankError('unknown', 'That picture bank is unavailable.');
    const last = progress.recent.findLast(row => row[0] === slot)?.[1] ?? -1;
    const states = unpack(progress.banks.find(row => row[0] === slot)?.[1], bank.count, 3) ?? [];
    const order = Array.from({ length: bank.count }, (_, i) => (last + 1 + i) % bank.count);
    const visible = order.filter(i => !skip.has(i));
    const choices = visible.length ? visible : order;
    const other = choices.filter(i => avoid?.bank !== slot || i !== avoid.puzzle);
    const pool = other.length ? other : choices;
    return pool.find(i => !states[i]) ?? pool.find(i => states[i] === 1) ?? pool[0];
  }
  const card = (ref: PuzzleRef): ChallengeCard | undefined => {
    const band = labels.get(ref.bank), bank = banks.get(ref.bank);
    if (!bank || !band || ref.engine !== PICTURE_GRID || ref.rules !== bank.rules || !uint(ref.puzzle, bank.count - 1)) return undefined;
    return { ref, path: 'endless', source: { kind: 'endless', bank: ref.bank, puzzle: ref.puzzle }, tier: band.tier,
      title: `Picture Grid · ${band.title} ${ref.puzzle + 1}`, retired: retired.has(ref.bank), dares: cardDares.get(rowKey(ref.bank, ref.puzzle)) ?? [] };
  };
  const packed: NonNullable<TypedRegistration<Payload, Action, State>['packed']> & PackedOpen = {
    bands, open, card,
    prepare: async ref => { await open(ref.bank, ref.puzzle, ref); },
    choose: (slot, progress, avoid) => open(slot, pick(slot, progress, new Set(), avoid)),
    chooseVisible: (slot, progress, skip, avoid) => open(slot, pick(slot, progress, skip, avoid)),
    describe: slot => {
      const band = labels.get(slot);
      return band ? { size: band.sizes.map(size => `${size}×${size}`).join(' / '), summary: '' } : undefined;
    },
    hiddenRows: async (slot, hidden) => {
      const bank = banks.get(slot), indices = new Set<number>();
      if (!bank || !hidden.length) return indices;
      const wanted = new Set(hidden), transport = loader();
      for (let i = 0; i < bank.count; i++) if (wanted.has(await transport.savedHash(bank, i))) indices.add(i);
      return indices;
    },
  };

  return {
    game: PICTURE_GRID, codec: pictureGridCodec, cove: true, helpUI: 'board', backLabel: 'Back to Puzzles', packed, catalog, contextFor, puzzles: [],
    controls: { help: () => ({ type: 'hint' }), reset: () => ({ type: 'reset' }) },
    completionFacts: session => { const state = view(session); return state ? { helpUsed: state.draft.helps > 0, failed: false } : null; },
    start: (ref, owner, id, progress, _options, selectedDares) => {
      const picture = resident.get(key(ref));
      if (!picture || retired.has(ref.bank)) throw new Error('That picture is unavailable.');
      const session: ChallengeSession = { version: 1, owner, game: PICTURE_GRID, id, ordinal: progress.nextOrdinal, revision: 0, puzzle: ref,
        codec: pictureGridCodec, payload: encodePicture(freshPicture(picture.size)), selectedDares: [...selectedDares], partner: null, result: null, credited: false };
      if (!validChallengeSession(session, owner, catalog, owner.startsWith('cove-'))) throw new Error('Could not start Picture Grid.');
      return session;
    },
    move: (session, action) => {
      if (session.result || session.credited || !uint(session.revision, 2147483646)
          || !validChallengeSession(session, session.owner, catalog, session.owner.startsWith('cove-'))) return null;
      const state = view(session);
      if (!state || !validPictureEvent(action, state.picture.size)) return null;
      const draft = editPicture(state.draft, action, state.picture);
      if (draft === state.draft) return null;
      return { ...session, revision: session.revision + 1, payload: encodePicture(draft), result: terminal(session, { ...state, draft }) };
    },
    render: (session, dispatch, active, width, host) => {
      const state = view(session);
      if (!state) return null;
      return <PlayScreenLoader key={`${session.owner}:${session.id}:${session.ordinal}:${session.puzzle.hash}`}
        loadScreen={loadScreen} loadRN={loadRN} {...state} dispatch={dispatch} active={active} width={width} onNext={host?.onFresh} />;
    },
  };
}
