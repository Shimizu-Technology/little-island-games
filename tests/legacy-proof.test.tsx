import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { Islander } from '../src/islander/rig/Islander';
import { Islander as Legacy } from './fixtures/LegacyIslander';
import { frontPoses,backPoses } from '../src/islander/rig/poses';
import { defaultLook,outfits,hairStyles,hats } from '../src/islander/look';
vi.mock('react-native-svg',()=>({default:'svg',G:'g',Path:'path',Circle:'circle',Ellipse:'ellipse',Rect:'rect'}));
it('preserves original art exactly for old saved looks',()=>{
for(const outfit of outfits.slice(0,7)) for(const hairStyle of hairStyles.slice(0,4)) for(const pose of [...frontPoses,...backPoses]) {
 const look={...defaultLook,outfit,hairStyle};
 expect(renderToStaticMarkup(<Islander look={look} pose={pose} view={pose.view}/>),`${outfit} ${hairStyle} ${pose.id}`).toBe(renderToStaticMarkup(<Legacy look={look} pose={pose} view={pose.view}/>));
}
for(const hat of hats) for(const pose of [...frontPoses,...backPoses]) expect(renderToStaticMarkup(<Islander look={{...defaultLook,hat}} pose={pose} view={pose.view}/>)).toBe(renderToStaticMarkup(<Legacy look={{...defaultLook,hat}} pose={pose} view={pose.view}/>));
});
