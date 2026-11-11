import { registerSaveContent, type Bank, type Dare, type SaveCatalog, type SessionCodec } from '../state/challenge';
import { learnIds } from '../learn/generated/ids';
import { challengeEntries } from './registry.generated';
export { challengeEntries } from './registry.generated';
export const schoolContext = (game: string, level: number) => `s${learnIds.indexOf(game as typeof learnIds[number])}-${level}`;
/** Side-effect-free aggregation is also used by registration/route tests. */
export function buildCatalog(entries = challengeEntries): SaveCatalog {
  const banks=new Map<number,Bank>(), dares=new Map<number,Dare>(), codecs=new Map<string,SessionCodec>();
  const contexts=new Set(learnIds.flatMap(game=>[1,2,3,4,5].map(level=>schoolContext(game,level))));
  const games=new Set<string>();
  for(const entry of entries) {
    if(['story-studio','island-home'].includes(entry.game) || entry.game==='beep-bot'&&entry.puzzles.some(p=>p.path==='deep-water'))throw new Error('This game does not support that Challenge path.');
    if(games.has(entry.game))throw new Error('Duplicate Challenge game.');games.add(entry.game);
    for(const [id,value] of entry.catalog.banks) {if(banks.has(id))throw new Error('Duplicate bank slot.');banks.set(id,value);}
    for(const [id,value] of entry.catalog.dares) {if(dares.has(id))throw new Error('Duplicate dare slot.');dares.set(id,value);}
    for(const [id,value] of entry.catalog.codecs) {if(codecs.has(id))throw new Error('Duplicate codec.');codecs.set(id,value);}
    for(const id of entry.catalog.contexts) {if(contexts.has(id))throw new Error('Duplicate signal context.');contexts.add(id);}
  }
  return {banks,dares,codecs,contexts};
}
registerSaveContent(buildCatalog());
export const challengeFor = (game: string) => challengeEntries.find(entry=>entry.game===game && (entry.puzzles.length>0 || !!entry.packed?.bands.length));
