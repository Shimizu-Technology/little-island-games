/** Optional v4 extension: absent is exactly the original sunny home. */
export const timesOfDay = ['day', 'sunset', 'night'] as const;
export const weatherKinds = ['clear', 'leaves', 'snow', 'rain', 'fireflies'] as const;
export type Atmosphere = { timeOfDay: typeof timesOfDay[number]; weather: typeof weatherKinds[number] };
export const defaultAtmosphere: Atmosphere = { timeOfDay: 'day', weather: 'clear' };
export function validAtmosphere(v: unknown): v is Atmosphere {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const a = v as Record<string, unknown>;
  return Object.keys(a).length === 2 && Object.hasOwn(a, 'timeOfDay') && Object.hasOwn(a, 'weather') &&
    timesOfDay.includes(a.timeOfDay as Atmosphere['timeOfDay']) && weatherKinds.includes(a.weather as Atmosphere['weather']);
}
export const compactAtmosphere = (a: Atmosphere | undefined): Atmosphere | undefined =>
  !a || a.timeOfDay === 'day' && a.weather === 'clear' ? undefined : a;
export const skyPalette = {
  day: ['#77C8D9', '#D4EEE0', '#FFE6AF'],
  sunset: ['#686C9E', '#EEA394', '#FFD18C'],
  night: ['#151F48', '#344668', '#697B88'],
} as const;
