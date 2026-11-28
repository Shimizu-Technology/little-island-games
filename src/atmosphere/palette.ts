import { defaultAtmosphere, skyPalette, type Atmosphere } from '../home/atmosphere';
export { defaultAtmosphere, type Atmosphere };
export const isNightAtmosphere = (a: Atmosphere) => a.timeOfDay === 'night';
export const atmosphereSkyPalette = (a: Atmosphere) => skyPalette[a.timeOfDay];
export const atmosphereOverlayTint = (a: Atmosphere) => a.timeOfDay === 'night' ? '#17224C80' : a.timeOfDay === 'sunset' ? '#F29B6738' : 'transparent';
/** Pale paper preserves existing dark header text at AA contrast. */
export const atmosphereHeaderAccent = (a: Atmosphere) => a.timeOfDay === 'night' ? '#E4E6F2' : a.timeOfDay === 'sunset' ? '#FFE6CF' : undefined;
export const atmosphereFlightPalette = (a: Atmosphere) => ({
  sky: atmosphereSkyPalette(a),
  chrome: a.timeOfDay === 'night' ? '#202D52' : a.timeOfDay === 'sunset' ? '#F3BE96' : '#A9DCD3',
  ink: a.timeOfDay === 'night' ? '#FFF8E8' : '#173D3A',
  muted: a.timeOfDay === 'night' ? '#E2E8F6' : a.timeOfDay === 'sunset' ? '#36544D' : '#47645D',
});
