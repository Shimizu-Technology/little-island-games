import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { artByBand, unpackDrawing } from '../scripts/puzzles/families/picture-grid';
import { freshPicture } from '../src/puzzles/picture-grid/checkpoint';
import type { NativeControls } from '../src/puzzles/picture-grid/nativeControls';
import { PlayScreenLoader, type PlayScreenImporter, type ReactNativeImporter } from '../src/puzzles/picture-grid/registration';

const native = { View: 'View', Text: 'Text', Pressable: 'Pressable' } as unknown as NativeControls;
const picture = unpackDrawing(artByBand.easy[0]).picture;
const props = { picture, draft: freshPicture(picture.size), dispatch() {}, active: true, width: 362 };
const Ready = () => React.createElement('Board', { testID: 'board-ready' });
let screen: ReactTestRenderer | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; vi.unstubAllGlobals(); });

it('catches an embedded-bundle screen import that throws synchronously, then retries', async () => {
  let attempts = 0;
  const loadScreen: PlayScreenImporter = () => {
    if (++attempts === 1) throw new Error('synchronous module initialization failure');
    return Promise.resolve(Ready);
  };
  await act(async () => { screen = create(<PlayScreenLoader {...props} loadScreen={loadScreen} loadRN={async () => native}/>); });
  expect(screen!.root.findAllByProps({ testID: 'picture-grid-load-error' })).toHaveLength(1);
  await act(async () => screen!.root.findByProps({ testID: 'picture-grid-retry' }).props.onPress());
  expect(attempts).toBe(2);
  expect(screen!.root.findAllByProps({ testID: 'board-ready' })).toHaveLength(1);
});

it('catches a synchronous native-controls import and retains error/retry UI when it recovers', async () => {
  let attempts = 0;
  const loadRN: ReactNativeImporter = () => {
    if (++attempts === 1) throw new Error('synchronous native initialization failure');
    return Promise.resolve(native);
  };
  await act(async () => { screen = create(<PlayScreenLoader {...props} loadScreen={() => { throw new Error('board unavailable'); }} loadRN={loadRN}/>); });
  expect(attempts).toBe(2);
  expect(screen!.root.findAllByProps({ testID: 'picture-grid-load-error' })).toHaveLength(1);
  expect(screen!.root.findAllByProps({ testID: 'picture-grid-retry' })).toHaveLength(1);
});
