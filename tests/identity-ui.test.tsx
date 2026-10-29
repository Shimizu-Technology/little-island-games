import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { StyleGrid } from '../src/personalization/StyleGrid';
import { styleCatalog } from '../src/personalization/catalog';
import { defaultLook } from '../src/islander/look';
vi.mock('react-native-svg', () => ({ default: ({ children }: { children?: React.ReactNode }) => <svg>{children}</svg>, Path: () => <path/>, Rect: () => <rect/> }));
vi.mock('react-native', () => ({ View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../src/islander', () => ({ Islander: () => <svg aria-label="Islander preview"/> }));
vi.mock('../src/components/ui', () => ({ C: {}, Copy: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>, PressableScale: ({ children, accessibilityLabel, accessibilityState }: { children?: React.ReactNode; accessibilityLabel?: string; accessibilityState?: { selected?: boolean } }) => <button aria-label={accessibilityLabel} aria-pressed={accessibilityState?.selected}>{children}</button> }));
it('renders an inspectable locked fixture with its earning explanation and New badge', () => {
  const fixture = styleCatalog.map(i => i.id === 'hat:cap' ? { ...i, starter: false, lockedReason: 'Finish a reading round.' } : i);
  const markup = renderToStaticMarkup(<StyleGrid category="hat" look={{ ...defaultLook, hat: 'cap' }} equipped={defaultLook} earned={[]} unseen={['hat:cap']} catalog={fixture} onChoose={() => {}}/>);
  expect(markup).toContain('Finish a reading round.'); expect(markup).toContain('Locked'); expect(markup).toContain('New'); expect(markup).toContain('Previewing'); expect(markup).toContain('Wearing');
  // Locked items remain inspectable/previewable rather than disabled mystery tiles.
  expect(markup).not.toContain('disabled');
});
