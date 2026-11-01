import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IslandMapLabRoute from '../src/app/island-map-lab';

vi.mock('expo-router', () => ({ Redirect: ({ href }: { href: string }) => <span data-redirect={href}/> }));
vi.mock('../src/hub-lab/IslandMapLab', () => ({ default: () => <span>Private design lab</span> }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('design route distribution boundary', () => {
  it('redirects an ordinary production build to real Home', () => {
    vi.stubGlobal('__DEV__', false);
    vi.stubEnv('EXPO_PUBLIC_ISLAND_MAP_LAB', undefined);
    expect(renderToStaticMarkup(<IslandMapLabRoute/>)).toContain('data-redirect="/"');
  });
  it('allows an explicitly opted-in private web export', () => {
    vi.stubGlobal('__DEV__', false);
    vi.stubEnv('EXPO_PUBLIC_ISLAND_MAP_LAB', '1');
    expect(renderToStaticMarkup(<IslandMapLabRoute/>)).toContain('Private design lab');
  });
  it('allows development without changing the production default', () => {
    vi.stubGlobal('__DEV__', true);
    vi.stubEnv('EXPO_PUBLIC_ISLAND_MAP_LAB', undefined);
    expect(renderToStaticMarkup(<IslandMapLabRoute/>)).toContain('Private design lab');
  });
});
