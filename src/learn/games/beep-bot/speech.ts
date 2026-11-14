import {codes,type Action} from './challenge-engine';
/** Card edits speak the same shipped pre-reader names as Crab. */
export function cardSpeech(a:Action):string|null {
 const code=a[0]==='a'?a[1]:a[0]==='i'||a[0]==='r'?a[2]:undefined;
 if(code===undefined)return null;const card=codes[code];
 return `crab-commands-card-${card.startsWith('repeat')?'repeat':card}`;
}
