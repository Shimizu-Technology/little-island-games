import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgramEditor } from '../src/learn/program/ProgramEditor';
import { emptyProgram, type Program } from '../src/learn/program/model';
import { encodeProgram } from '../src/learn/program/codec';
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'scroll', useWindowDimensions: () => ({ fontScale: 3.12 }), PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', cream: '#FCFAF4', paper: '#FFF', line: '#DBE3DA' } }));
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const label = (b: { props: Record<string, unknown>; children: unknown[] }) => b.props.accessibilityLabel ?? b.children.filter(c => typeof c === 'string' || typeof c === 'number').join('');
const press = async (name: string) => act(async () => { const button = tree!.root.findAllByType('button').find(b => label(b) === name); expect(button, name).toBeDefined(); expect(button!.props.disabled).not.toBe(true); button!.props.onPress(); });
async function mount(accept = true) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); const heard = vi.fn(), changed = vi.fn();
  function Harness() { const [p, set] = useState<Program>(emptyProgram()); return <ProgramEditor program={p} cards={[{ code: 1, name: 'Right', icon: <span>→</span>, speech: 'crab-commands-card-right' }, { code: 0, name: 'Up', icon: <span>↑</span>, speech: 'crab-commands-card-up' }]} disabled={false} hear={heard} condition="rock ahead" onChange={next => { changed(encodeProgram(next)); if (accept) set(next); return accept; }} />; }
  await act(async () => { tree = create(<Harness />); }); return { heard, changed };
}

it('K7 pre-reader tap journey places a repeat, nests cards, undoes/redoes, and edits the nested card at AX5', async () => {
  const { heard, changed } = await mount();
  await press('↻ Repeat ×2'); await press('Add Right block');
  expect(changed.mock.lastCall![0]).toEqual([1, [[2, 2, [[0, 1]]]], []]);
  expect(heard).toHaveBeenCalledWith('crab-commands-card-right');
  await press('Undo block edit'); expect(changed.mock.lastCall![0]).toEqual([1, [[2, 2, []]], []]);
  await press('Redo block edit'); expect(changed.mock.lastCall![0]).toEqual([1, [[2, 2, [[0, 1]]]], []]);
  await press('Block 1, inside 1: Right. Tap to change; drag sideways to move.'); await press('Replace with Up block');
  expect(changed.mock.lastCall![0]).toEqual([1, [[2, 2, [[0, 0]]]], []]);
  const paragraphs = tree!.root.findAllByType('p');
  expect(paragraphs.every(p => p.props.maxFontSizeMultiplier <= 1.5)).toBe(true);
  const targets = tree!.root.findAllByType('button').filter(b => b.props.style?.minHeight);
  expect(targets.every(b => b.props.style.minHeight >= 44)).toBe(true);
});

it('K7 refused edits retain the accepted tree and do not enter undo history', async () => {
  const { changed } = await mount(false); await press('↻ Repeat ×2');
  expect(changed).toHaveBeenCalledOnce();
  expect(tree!.root.findAllByType('p').map(p => p.children.join('')).join(' ')).toContain('Your plan is kept.');
  const undo = tree!.root.findAllByType('button').find(b => label(b) === 'Undo block edit'); expect(undo?.props.disabled).toBe(true);
});
