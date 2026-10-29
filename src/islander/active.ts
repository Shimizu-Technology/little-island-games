import { defaultLook, type IslanderLook } from './look';
/** Single integration point for the active learner; persistence is wired at merge. */
export function useActiveIslanderLook(): IslanderLook {
  return defaultLook;
}
