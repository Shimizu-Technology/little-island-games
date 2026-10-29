import type { Pose } from './model';
/** Adapt the room's two semantic poses to the shared rig's stable pose IDs. */
export const homeCharacterPose = (pose: Pose) => pose === 'sit' ? 'sit-relaxed' : 'idle';
