import type { Pose } from './model';
import { frontPoses } from '../islander/rig/poses';
/** Resolve only authored rig IDs; missing phase-two art keeps its seated/idle fallback. */
export function homeCharacterPose(pose:Pose, reaction?:string){
 const requested=reaction??(pose==='stand'?'idle':pose==='sit'?'sit-relaxed':pose);
 return frontPoses.some(p=>p.id===requested)?requested:pose==='stand'?'idle':'sit-relaxed';
}
