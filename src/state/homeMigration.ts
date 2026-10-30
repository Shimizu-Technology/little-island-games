import type {Save} from './validation';
import type {StorageAdapter} from './storage';
import {preserveAndReplace} from './replacement';
/** Hydration publishes no writable state until the exact pre-repair bytes are safe. */
export async function preserveHomeMigration(adapter:StorageAdapter,encoded:string,before:Save,after:Save){
 const changed=Object.entries(before.personalization?.people??{}).some(([id,person])=>JSON.stringify(person.home)!==JSON.stringify(after.personalization?.people[id]?.home));
 if(!changed)return false;
 await preserveAndReplace(adapter,JSON.stringify(after),encoded);
 return true;
}
