import { expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { parseSave } from '../src/state/validation';
it('exports a real migrated frozen save for the archived old Store rollback rehearsal',()=>{
 const raw=readFileSync('tests/fixtures/save-v3/main-envelope-2.json','utf8');const next=encodeSave(migrateProfiles(parseSave(raw)));expect(parseSave(next).version).toBe(3);
 if(process.env.F1_NEW_SAVE)writeFileSync(process.env.F1_NEW_SAVE,next);
});
