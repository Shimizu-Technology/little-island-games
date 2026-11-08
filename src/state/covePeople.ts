import { emptyChallenge, validChallengeProgress, type ChallengeProgress, type SaveCatalog, saveCatalog } from './challenge';
import { asciiId, exactKeys, plain, jsonBytes } from './saveBits';
import type { Save } from './validation';
export type CovePerson = { name: string; challenge: ChallengeProgress };
export type CovePeople = { version: 1; active: string | null; people: Record<string, CovePerson> };
export const emptyCove = (): CovePeople => ({ version:1, active:null, people:{} });
export function validCove(v: unknown, learners: readonly string[], catalog: SaveCatalog = saveCatalog): v is CovePeople {
  return plain(v) && exactKeys(v,['version','active','people']) && v.version === 1 && plain(v.people) && Object.keys(v.people).length <= 4 && Object.entries(v.people).every(([id,p]) => asciiId(id,40) && /^[a-z0-9-]+$/.test(id) && id.startsWith('cove-') && !learners.includes(id) && plain(p) && jsonBytes(p) <= 72_000 && exactKeys(p,['name','challenge']) && typeof p.name === 'string' && !!p.name.trim() && [...p.name].length <= 24 && validChallengeProgress(p.challenge,id,catalog,true)) && (v.active === null || typeof v.active === 'string' && Object.hasOwn(v.people,v.active));
}
export function addCovePerson(save: Save, name: string, id: string): Save {
  const cove = save.cove; const clean = name.trim().replace(/\s+/g,' ');
  if (!cove || Object.keys(cove.people).length >= 4 || !asciiId(id,40) || !/^[a-z0-9-]+$/.test(id) || !id.startsWith('cove-') || save.learning?.people.some(p => p.id === id) || Object.hasOwn(cove.people,id) || !clean || [...clean].length > 24 || Object.values(cove.people).some(p => p.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) return save;
  return { ...save, cove:{ ...cove, active:id, people:{ ...cove.people, [id]:{ name:clean, challenge:emptyChallenge(true) } } } };
}
export function removeCovePerson(save: Save, id: string): Save {
  if (!save.cove || !Object.hasOwn(save.cove.people,id)) return save;
  return { ...save, cove:{ ...save.cove, active:save.cove.active === id ? null : save.cove.active, people:Object.fromEntries(Object.entries(save.cove.people).filter(([owner]) => owner !== id)) } };
}
