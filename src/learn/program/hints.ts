export function blockPosition(path: string): string {
  return path.split('.').filter(part=>part!=='body').map((part,i)=>part==='main'?'plan':part.startsWith('song')?`song ${Number(part.slice(4))+1}`:part==='yes'?'blocked branch':part==='no'?'otherwise branch':`${i===1?'block':'inside block'} ${Number(part)+1}`).join(', ');
}
export function blockHint(edit: {op:string;at:number;card?:unknown} | null | undefined, frames: {path:string;iteration:number[]}[], name: string): string {
  if(!edit)return 'Your blocks reach the goal. Press Go to try them.';
  const frame=frames[edit.at];
  if(!frame)return `Add ${name} at End of plan.`;
  const where=blockPosition(frame.path), turn=frame.iteration.length?` (repeat turn ${frame.iteration.map(n=>n+1).join(', ')})`:'';
  return `${edit.op==='remove'?'Remove':edit.op==='insert'?'Insert '+name+' before':'Change'} ${where}${turn}${edit.op==='change'||edit.op==='replace'?` to ${name}`:''}. Edits inside a repeat change every turn. Run again to check.`;
}
