import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayfieldProps } from '../src/learn/games/slip-tide/field';
import { ChallengeBoard } from '../src/learn/games/slip-tide/challengeBoard';
import { puzzles, type Action, type State } from '../src/learn/games/slip-tide/challenge';
import { dirs, gridOf, slideOn, type Dir } from '../src/learn/games/slip-tide/rules';

let field: PlayfieldProps;
vi.mock('../src/learn/games/slip-tide/field', () => ({ Playfield: (props: PlayfieldProps) => { field = props; return null; } }));

const puzzle = puzzles[0].descriptor.puzzle;
const state = (actions: number): State => ({ puzzle, crabs: [...puzzle.crabs], moves: '', resets: 0, undos: 0, stack: [], actions });
const open = dirs.filter(d => slideOn(gridOf(puzzle), puzzle.crabs, d) !== puzzle.crabs);
const board = (dispatch: (a: Action) => void, actions: number) => <ChallengeBoard state={state(actions)} dispatch={dispatch} active width={340} />;

describe('Challenge board action queue', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('resends an action the frame ignored while a save was in flight', () => {
    const dispatch = vi.fn<(a: Action) => void>();
    let root!: ReturnType<typeof create>;
    act(() => { root = create(board(dispatch, 0)); });
    act(() => { expect(field.onMove(open[0] as Dir, false)).toBe(true); });
    expect(dispatch).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(400); });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenLastCalledWith(open[0]);
    act(() => { root.update(board(dispatch, 1)); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(dispatch).toHaveBeenCalledTimes(2);
    act(() => { root.unmount(); });
  });
  it('holds the next action until the frame has accepted the one before', () => {
    const dispatch = vi.fn<(a: Action) => void>();
    let root!: ReturnType<typeof create>;
    act(() => { root = create(board(dispatch, 0)); });
    act(() => { field.onHelp(); });
    act(() => { field.onMove(open[0] as Dir, true); });
    expect(dispatch.mock.calls.map(c => c[0])).toEqual(['help']);
    act(() => { root.update(board(dispatch, 1)); });
    expect(dispatch.mock.calls.map(c => c[0])).toEqual(['help', open[0]]);
    act(() => { root.unmount(); });
  });
  it('refuses a swipe that moves nothing when no action is in flight', () => {
    const blocked = dirs.find(d => slideOn(gridOf(puzzle), puzzle.crabs, d) === puzzle.crabs);
    const dispatch = vi.fn<(a: Action) => void>();
    let root!: ReturnType<typeof create>;
    act(() => { root = create(board(dispatch, 0)); });
    if (blocked !== undefined) act(() => { expect(field.onMove(blocked, false)).toBe(false); });
    expect(dispatch).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
  });
  it('stops at the action limit with a calm note instead of failing a save', () => {
    const dispatch = vi.fn<(a: Action) => void>();
    let root!: ReturnType<typeof create>;
    act(() => { root = create(board(dispatch, 500)); });
    act(() => { expect(field.onMove(open[0] as Dir, false)).toBe(false); });
    expect(field.notice).toContain('Another puzzle');
    act(() => { root.unmount(); });
  });
});
