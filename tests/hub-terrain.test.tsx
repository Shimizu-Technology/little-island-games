import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { Terrain } from '../src/hub/Terrain';
vi.mock('react-native', () => ({ View: 'div', Image: 'img' }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', G: 'g', Path: 'path' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('switches painted orientation over the persistent vector fallback without an image fade', async () => {
 let screen!: ReactTestRenderer;
 await act(() => { screen = create(<Terrain width={390} height={710}/>); });
 const check = (orientation: string) => {
  const image = screen.root.findByType('img');
  expect(image.props.source).toBe(`assets/art/map/island-${orientation}.webp`);
  expect(image.props.resizeMode).toBe('cover');
  expect(image.props.fadeDuration).toBe(0);
  expect(image.props.accessible).toBe(false);
  expect(screen.root.findAllByType('svg')).toHaveLength(1);
 };
 check('portrait');
 await act(() => screen.update(<Terrain width={844} height={590}/>));
 check('landscape');
 await act(() => screen.unmount());
});
