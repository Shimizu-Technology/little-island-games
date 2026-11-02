import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import Home from '../src/app/index';
import School from '../src/app/school';
import Everything from '../src/app/everything';
vi.mock('../src/hub/HubScreen', () => ({ default: () => <span>Living Island</span> }));
vi.mock('../src/hub/SchoolScreen', () => ({ default: () => <span>Six subjects</span> }));
vi.mock('../src/hub/EverythingScreen', () => ({ default: () => <span>All places and games</span> }));
describe('real hub routes replace the opt-in design study', () => {
 it('uses the shared native hub as the ordinary home', () => expect(renderToStaticMarkup(<Home/>)).toContain('Living Island'));
 it('provides real School and Everything destinations', () => {
  expect(renderToStaticMarkup(<School/>)).toContain('Six subjects');
  expect(renderToStaticMarkup(<Everything/>)).toContain('All places and games');
 });
 it('removes the prototype route and private parallel implementation', () => {
  expect(existsSync('src/app/island-map-lab.tsx')).toBe(false);
  expect(existsSync('src/hub-lab')).toBe(false);
 });
});
