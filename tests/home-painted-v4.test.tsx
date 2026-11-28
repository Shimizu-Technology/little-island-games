import React from 'react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { illustratedRooms, illustratedProps } from '../src/home/art/illustrated';
import { StageRoom } from '../src/home/art/Stage';
import { roomDefaultTheme } from '../src/home/art/roomDefaults';
import { cozyFocusCamera, cozyRoomScale, fitCamera, zoomCamera } from '../src/home/runtime/CameraController';
import { buildingLayout, roomOrigin } from '../src/home/camera';
import { tapExpression } from '../src/home/runtime/delight';
vi.mock('../src/home/art/AtmosphereLighting', () => ({ AtmosphereLighting: () => null }));
vi.mock('../src/home/runtime/WeatherOverlay', () => ({ WeatherOverlay: () => null }));
vi.mock('react-native', () => ({View:'div', Image:'image'}));
vi.mock('react-native-svg', () => Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Pattern','LinearGradient','Stop'].map(k => [k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('../src/badges/BadgeArt', () => ({BadgeGlyph:()=>null}));
const hashes = {"assets/home/rooms/beach.webp": "dc96bd11f33a803380f319958a2d8946654c2a11f0389c505ca2284687ff71e8", "assets/home/rooms/home.webp": "3470f8cd6c132f935bcc5ca34ad7b915a5ee091c0a7e09311b21f0a32fd47efc", "assets/home/rooms/kitchen.webp": "04328aef306e416f9736fcb774b71eea7d9677d75482a5a59c45b63ba91e0f27", "assets/home/rooms/treehouse.webp": "bd52b4ab1199f6fe747acd7ff7c4eecd5448ea1d4801122458cf90098a8b8a42", "assets/home/props/bathtub.webp": "0aa844aa9f0310741024bed9d49fec34fb94f4ae506242c80298edac32d0afee", "assets/home/props/bed.webp": "e08c5758326e9baa2e570975dae4ddb20fa66bd62b2cf8df0de55b451cd06082", "assets/home/props/bookcase.webp": "49f4dca3991051d39056496583c9d5eba2373359944128debaf28416a6a4c760", "assets/home/props/coconut-drink.webp": "3fc80c16ad773dbfe516e94cf42c7cf48a5329040f2bcb1c29f24ab939d3d961", "assets/home/props/crab.webp": "b86df683efedc68145f1179229564220cd264478df61f8e58681a6bf445c9c6d", "assets/home/props/cupcake.webp": "85452bf72984736276c7d2031e874b4f6c435bd9a032dde23de9cef601cde1c1", "assets/home/props/fridge-closed.webp": "0bd721ec11a1273916d2a5226908c3ca3f441414080b35fb66cbfb557150f553", "assets/home/props/fridge-open.webp": "e0eed9c20e5d7847b2643677824dc4b9acddc9f9c0bd1c4e95b5eedbe27f5911", "assets/home/props/lamp.webp": "0c910d9a7f5467b54ab14bd3cb1a146e045895052bdeac7da6b2e993cc148f22", "assets/home/props/monstera.webp": "373bc620f242271b21c3ead88efa0c8a05c63079fdc9b59de477776dde902a04", "assets/home/props/radio.webp": "89740f79f96e5d762de7a2b30431f5ae6ce3a94ce1d2a07dc6945fe0436bc768", "assets/home/props/sink-counter.webp": "5cc4949c74799b05e5acb0c55e11e5da6485a4227ae7a18a1d62978977200bdd", "assets/home/props/sofa.webp": "8f006c46a90c984f28184d68ff49ce27f7d9d751cd47ea7cfac644ac1e27f92f", "assets/home/props/stove.webp": "0f5d1521616985b0ddc767725fbc4f6623de36337caf87516ee2b934342afe38", "assets/home/props/teddy.webp": "c0e100be99bc53a715d59dbbcfc4443c2968b80b1a61750dfc6a507e591fe99e", "assets/home/props/tv.webp": "b97501a30921a3911bcf99e54c78be26fb7082ecc6caa7f01f9c18149e634181"};
describe('painted Home integration', () => {
  it('ships all twenty verified images without re-encoding and lazy Metro-safe asset thunks', () => {
    expect(Object.keys(illustratedRooms)).toHaveLength(7);
    expect(Object.keys(illustratedProps)).toHaveLength(33);
    for (const [path, expected] of Object.entries(hashes)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(expected);
    }
    for (const [id, source] of Object.entries(illustratedRooms)) expect(source()).toBe(`assets/${["tumon-beach", "chamorro-village", "cocos-island"].includes(id) ? "art/home/places" : "home/rooms"}/${id}.webp`);
    for (const [id, source] of Object.entries(illustratedProps)) expect(source()).toBe(`${['beach-blanket','surfboard','swim-ring','sandcastle','snorkel-set','treasure-chest-open','treasure-chest-closed','sea-turtle','outrigger-canoe','bbq-grill','shaved-ice'].includes(id) ? 'assets/art/home/places' : ['christmas-tree','gift-box','hot-cocoa','pumpkin-pie','fiesta-platter','autumn-wreath'].includes(id) ? 'assets/art/home/seasonal' : 'assets/home/props'}/${id}.webp`);
  });
  it('keeps a first-frame vector fallback and changes only non-default wall/floor washes', () => {
    for (const room of ['home','kitchen','treehouse','beach'] as const) {
      const defaults=render(<StageRoom room={room} theme={roomDefaultTheme[room]}/>);
      expect(defaults).toContain(`assets/home/rooms/${room}.webp`);
      expect(defaults).toContain('viewBox="0 0 800 560"');
      expect(defaults).not.toContain('data-theme=');
      const themed=render(<StageRoom room={room} theme={{wallpaper:'night',floor:'rose'}}/>);
      expect(themed).toContain('data-theme="wall"');
      expect(themed).toContain('data-theme="floor" y="352"');
    }
  });
  it('fills the phone with a cozy room and keeps overview and room navigation available', () => {
    const view={width:390,height:650}, building=buildingLayout(4);
    const scale=cozyRoomScale(view);
    expect(scale*560).toBeGreaterThanOrEqual(view.height);
    expect(800*scale).toBeGreaterThan(view.width*2);
    for(let i=0;i<4;i++) {
      const c=cozyFocusCamera(i,view,building), o=roomOrigin(i,building);
      expect((o.x+400)*c.a+c.tx).toBeCloseTo(view.width/2);
    }
    expect(fitCamera(view,building).a).toBeLessThan(scale);
    expect(cozyRoomScale({width:844,height:254})).toBeCloseTo(844/800);
    const wide={width:844,height:254}, c=cozyFocusCamera(0,wide,building);
    expect(c.a*800).toBeGreaterThanOrEqual(wide.width);
    expect(zoomCamera(c,1.3,wide.width/2,wide.height/2,wide,building).a).toBeGreaterThan(c.a);
    // The standing friend's floor contact remains in the landscape play window.
    const o=roomOrigin(0,building);
    expect((o.y+501)*c.a+c.ty).toBeLessThan(wide.height);
  });
  it('cycles all six transient expressions and wraps without save state', () => {
    expect(Array.from({length:7},(_,n)=>tapExpression(n))).toEqual(['happy','proud','surprised','cheer','yum','sleepy','happy']);
  });
});
