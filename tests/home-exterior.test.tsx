import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { BuildingArt, BuildingTrim, TerraceArt } from '../src/home/BuildingArt';
import { buildingLayout } from '../src/home/camera';
vi.mock('react-native-svg',()=>Object.fromEntries(Object.entries({default:'svg',Path:'path',Rect:'rect',Circle:'circle',G:'g',Defs:'defs',LinearGradient:'linearGradient',Stop:'stop',Ellipse:'ellipse'}).map(([name,tag])=>[name,({children,accessible:_a,...props}:Record<string,unknown>)=>React.createElement(tag,props,children as React.ReactNode)])));
describe('cottage exterior',()=>{
 it('keeps gradient references distinct across mounted houses',()=>{
  const html=renderToStaticMarkup(<><BuildingArt building={buildingLayout(4)}/><BuildingArt building={buildingLayout(4)}/></>);
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  expect(ids).toHaveLength(4);expect(new Set(ids).size).toBe(4);
  for(const id of ids){expect(id).toMatch(/^building-[a-zA-Z0-9_-]+$/);expect(html).toContain(`url(#${id})`);}
 });
 it('renders warm timber and trim for both house arrangements',()=>{
  for(const wide of [false,true]){
   const b=buildingLayout(4,wide);
   const html=renderToStaticMarkup(<><BuildingArt building={b}/><BuildingTrim building={b}/><TerraceArt/></>);
   expect(html).toContain('#4A3328');expect(html).toContain('#C88E5B');expect(html).not.toMatch(/#597466|#6D6751|#756E54/);
  }
 });
 it('keeps the decorative sky outside the camera and out of hit testing',()=>{
  const source=readFileSync('src/home/runtime/SceneView.tsx','utf8');
  const sky=source.indexOf('<SkyArt />'),camera=source.indexOf('testID={Platform.OS === "web" ? "house-camera"');
  expect(sky).toBeGreaterThan(0);expect(sky).toBeLessThan(camera);
  expect(source).toContain('pointerEvents="none" style={StyleSheet.absoluteFill}><SkyArt />');
 });
});
