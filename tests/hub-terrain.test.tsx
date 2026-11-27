import React from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { Terrain } from '../src/hub/Terrain';
vi.mock('react-native', () => ({ View: 'div', Image: 'img' }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', G: 'g', Path: 'path' }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function webpSize(file: string): [number, number] {
 const buf = readFileSync(file);
 const tag = buf.toString('latin1', 12, 16);
 if (tag === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
 if (tag === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
 if (tag === 'VP8L') {
  const bits = buf.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
 }
 throw new Error(`Unsupported WebP chunk ${tag} in ${file}`);
}

it('switches painted orientation over the persistent Guam vector fallback without an image fade', async () => {
 let screen!: ReactTestRenderer;
 await act(() => { screen = create(<Terrain width={390} height={710}/>); });
 const check = (orientation: string) => {
  const image = screen.root.findByType('img');
  expect(image.props.testID).toBe('painted-island-terrain');
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

it('bundles the stylized Guam portrait (720×1280) and landscape (1280×720) WebP backdrops', () => {
 expect(webpSize('assets/art/map/island-portrait.webp')).toEqual([720, 1280]);
 expect(webpSize('assets/art/map/island-landscape.webp')).toEqual([1280, 720]);
});
