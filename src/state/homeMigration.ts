import { encodeSave } from "./profiles";
import {validHome} from '../home/model';
import type {Save} from './validation';
import type {StorageAdapter} from './storage';
import {preserveAndReplace} from './replacement';
/** Hydration publishes no writable state until the exact pre-migration bytes are safe. */
export async function preserveLearnerMigration(adapter:StorageAdapter,encoded:string,before:Save,after:Save){
 try{assertMigratedHomes(after);}catch(error){await adapter.preserve(encoded);throw error;}
 const changed=learnersChanged(before,after);
 if(!changed)return false;
 await preserveAndReplace(adapter,encodeSave(after),encoded);
 return true;
}

/** Repaired homes and backfilled rewards. Older builds reject reward ids they don't know, so these copies are the rollback point. */
export function learnersChanged(before:Save,after:Save){
 const people=before.personalization?.people??{};
 return Object.entries(after.personalization?.people??{}).some(([id,person])=>Object.hasOwn(people,id)?JSON.stringify(people[id])!==JSON.stringify(person):!!person.earned.length||person.milestones.some(milestone=>milestone!=='migration:badges-v1'));
}
/** Restore retains the incoming pre-migration bytes AND the device's persisted/live originals. */
export async function preserveImportedLearners(adapter:StorageAdapter,encoded:string,before:Save,after:Save,current:string|null,upgraded=false){
 try{assertMigratedHomes(after);}catch(error){await adapter.preserve(encoded);throw error;}
 if(upgraded||learnersChanged(before,after))await adapter.preserve(encoded);
 await preserveAndReplace(adapter,encodeSave(after),current);
}

/** A migration is never a license to publish an unreadable active save. */
export function assertMigratedHomes(save:Save){
 for(const person of Object.values(save.personalization?.people??{}))if(person.home.version!==4||!validHome(person.home))throw new Error('This home could not be migrated. Your original has been kept.');
}
