import type { Pose } from './model';
import { characterPose } from '../islander/rig/character';
import { frontPoses } from '../islander/rig/poses';
/** Resolve only authored rig IDs; missing phase-two art keeps its seated/idle fallback. */
export function homeCharacterPose(pose:Pose, reaction?:string){
 const compatible=reaction==='eat'||reaction==='drink'||reaction==='hold'?undefined:reaction==='lie-asleep'&&pose!=='lie'?undefined:reaction;
 const requested=compatible??(pose==='stand'?'idle':pose==='sit'?'sit-relaxed':pose);
 return frontPoses.some(p=>p.id===requested)?requested:pose==='stand'?'idle':'sit-relaxed';
}

/** Same base-preserving overlay used by the new rig, in the legacy viewport. */
export function homeCharacterRigPose(pose: Pose, reaction?: string) {
  if (reaction === 'eat' || reaction === 'drink' || reaction === 'hold') {
    return { ...characterPose(pose, reaction), expression: reaction === 'hold' ? 'happy' as const : 'anticipate' as const };
  }
  return homeCharacterPose(pose, reaction);
}
