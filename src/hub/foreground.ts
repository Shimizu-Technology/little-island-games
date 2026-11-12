import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/** Anything but a known away state counts as on screen; iOS can report "unknown" at launch. */
const onScreen = (state: string | null | undefined) => state !== 'background' && state !== 'inactive';
const pageVisible = () => typeof document === 'undefined' || !document.hidden;

/** Whether the app is in front: not backgrounded or inactive, and on the web, the page is visible. */
export function useAppForeground(): boolean {
 const [foreground, setForeground] = useState(() => Platform.OS === 'web' ? pageVisible() : onScreen(AppState.currentState));
 useEffect(() => {
  const subscription = AppState.addEventListener('change', state => setForeground(onScreen(state)));
  const web = Platform.OS === 'web' && typeof document !== 'undefined';
  const visibility = () => setForeground(pageVisible());
  if (web) document.addEventListener('visibilitychange', visibility);
  return () => {
   subscription.remove();
   if (web) document.removeEventListener('visibilitychange', visibility);
  };
 }, []);
 return foreground;
}
