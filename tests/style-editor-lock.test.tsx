/** A locked item's explanation must never cost a child the grid, at any text size. */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editorLayout, MIN_GRID } from '../src/personalization/editorLayout';
const screen = vi.hoisted(() => ({ width: 320, height: 568 }));
vi.mock('react-native', () => {
  const host = (name: string) => { const C = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => { React.useImperativeHandle(ref, () => ({ scrollTo: () => {} })); return React.createElement(name, props, props.children as React.ReactNode); }); C.displayName = name; return C; };
  return { Platform: { OS: 'ios' }, View: host('View'), ScrollView: host('ScrollView'), Text: host('Text'), useWindowDimensions: () => screen };
});
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Path: 'path', Rect: 'rect' }));
vi.mock('../src/islander', () => ({ Islander: () => null, presentationPresets: { boy: {}, girl: {}, me: {} } }));
vi.mock('../src/components/Icon', () => ({ Icon: () => null }));
vi.mock('../src/components/ui', () => ({ C: {}, Copy: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Copy', props, children), Heading: ({ children }: { children?: React.ReactNode }) => React.createElement('Heading', null, children), PressableScale: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Tab', props, children) }));
vi.mock('../src/personalization/StyleGrid', () => ({ StyleGrid: () => React.createElement('Grid') }));
const { StyleEditor } = await import('../src/personalization/StyleEditor');
const { styleCatalog } = await import('../src/personalization/catalog');
const { defaultLook } = await import('../src/islander/look');
const locked = styleCatalog.find(i => i.category === 'outfit' && i.value === 'comet-gown')!;
let root: TestRenderer.ReactTestRenderer | undefined;
afterEach(() => { act(() => root?.unmount()); root = undefined; });
const byTest = (id: string) => root!.root.findAll(n => typeof n.type === 'string' && n.props.testID === id)[0];
const inside = (outer: ReactTestInstance, id: string) => outer.findAll(n => n.props.testID === id).length > 0;
const layout = (id: string, height: number, y = 0) => { const node = byTest(id); act(() => node.props.onLayout({ nativeEvent: { layout: { height, y, x: 0, width: 300 } } })); };
function open(size: { width: number; height: number }) {
  Object.assign(screen, size);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  act(() => { root = TestRenderer.create(<StyleEditor look={defaultLook} equipped={defaultLook} earned={[]} unseen={[]} onChange={() => {}} initialTab="outfit" initialItem={locked}/>); });
}
describe('locked item explanation', () => {
  it.each([[320, 568], [375, 667], [568, 320], [844, 390], [820, 1180]])('sits inside the scroller at %d×%d', (width, height) => {
    open({ width, height }); layout('style-editor', 400); layout('style-tabs', 70);
    expect(inside(byTest('style-scroll'), 'style-lock-rule')).toBe(true);
  });
  it('stays in view while short and scrolls away when long', () => {
    open({ width: 375, height: 667 }); layout('style-editor', 520); layout('style-tabs', 90); layout('style-scroll', 220);
    layout('style-lock-rule', 70);
    expect(byTest('style-scroll').props.stickyHeaderIndices).toEqual([0]);
    layout('style-lock-rule', 200);
    expect(byTest('style-scroll').props.stickyHeaderIndices).toBeUndefined();
  });
  it('gives up pinning when the room cannot hold preview, tabs and grid: one scroller holds everything', () => {
    open({ width: 320, height: 568 }); layout('style-editor', 230); layout('style-tabs', 90);
    const scroller = byTest('style-scroll');
    for (const id of ['style-preview', 'style-tabs', 'style-lock-rule']) expect(inside(scroller, id)).toBe(true);
    expect(scroller.props.style.minHeight).toBe(0);
  });
  it('keeps the preview outside the scroller when it fits', () => {
    open({ width: 375, height: 667 }); layout('style-editor', 520); layout('style-tabs', 90);
    expect(inside(byTest('style-scroll'), 'style-preview')).toBe(false);
    expect(inside(byTest('style-scroll'), 'style-tabs')).toBe(false);
  });
  it('caps tab labels so large text cannot take the grid’s room', () => {
    open({ width: 375, height: 667 });
    const labels = byTest('style-tabs').findAll(n => (n.type as unknown) === 'Tab').flatMap(tab => tab.findAll(n => (n.type as unknown) === 'Copy'));
    expect(labels.length).toBeGreaterThan(5);
    for (const label of labels) expect(label.props.maxFontSizeMultiplier).toBe(1.3);
  });
});
describe('editorLayout', () => {
  const cases = [[320, 568, false], [375, 667, false], [390, 844, false], [568, 320, true], [667, 375, true], [844, 390, true], [820, 1180, true]] as const;
  it('never asks for more than the room while pinned', () => {
    for (const [width, height, side] of cases) for (let room = 40; room <= Math.min(height, 1000); room += 7) for (const tabs of [60, 76, 90, 130]) {
      const { previewSize, pinned } = editorLayout({ room, tabs, side, landscape: width > height && height < 550, height });
      expect(previewSize).toBeGreaterThanOrEqual(92);
      if (!pinned) continue;
      if (side) { expect(previewSize + 24).toBeLessThanOrEqual(room); expect(tabs + 8 + MIN_GRID).toBeLessThanOrEqual(room); }
      else expect(previewSize + 24 + tabs + 16 + MIN_GRID).toBeLessThanOrEqual(room);
    }
  });
  it('keeps today’s sizes where there is room', () => {
    expect(editorLayout({ room: 600, tabs: 90, side: false, landscape: false, height: 844 })).toEqual({ previewSize: 205, pinned: true });
    expect(editorLayout({ room: 0, tabs: 0, side: false, landscape: false, height: 844 })).toEqual({ previewSize: 205, pinned: true });
  });
});
