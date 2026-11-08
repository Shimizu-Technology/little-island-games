import {runLearning,type RunState} from './engine';
export function runSounds(a:RunState,b:RunState):string[] {
 'worklet';
    const sounds:string[]=[];
    if(runLearning(b) && b.bumps>a.bumps)sounds.push("shell-0");
    if(runLearning(b) && b.passed>a.passed)sounds.push("clear");
    if(b.jump>a.jump)sounds.push("run-jump");
    if(b.duck>a.duck)sounds.push("run-roll");
    if(b.lane!==a.lane||b.edgeTime>a.edgeTime)sounds.push("run-lane");
    if(b.lives.hit>a.lives.hit)sounds.push("run-hit");
    if(b.powerEvent!==a.powerEvent)sounds.push(`run-${b.lastPower}`);
    if(b.nearMissEvent>a.nearMissEvent)sounds.push("run-near");
    for(let n=a.shells;n<b.shells && n<a.shells+3;n++)if(!runLearning(b))sounds.push(`shell-${n%5}`);
return sounds;
}
