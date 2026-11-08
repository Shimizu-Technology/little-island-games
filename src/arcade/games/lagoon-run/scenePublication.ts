import {runLearning,type RunState} from './engine';
/** Moving rows and instruction text must never invalidate the complete scene root. */
export function runScenePublication(s:RunState){'worklet';return {dead:s.lives.hearts===0};}
export function runRowPublication(s:RunState,i:number){
 'worklet';const r=s.rows[i];return {kind:r.kind,secondKind:r.secondKind,third:r.third,surface:r.surface,power:r.power,choices:runLearning(s)?r.fact.choices:[]};
}
export function runInstructionPublication(s:RunState){
 'worklet';let row:RunState['rows'][number]|undefined;
 for(const r of s.rows)if(!r.passed&&(!row||r.z>row.z))row=r;
 return row?.action==='idle'?row.shellLane<s.lane?'left':'right':row?.action??'idle';
}
