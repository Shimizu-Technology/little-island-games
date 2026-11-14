import {expect,it} from 'vitest';
import content from '../src/learn/games/beep-bot/content.json';
import {requireGridLanguages} from '../scripts/words/artifact-views.mjs';

it('baked programming plans remain plan records in the export scanner',()=>{
 expect(()=>requireGridLanguages(content)).not.toThrow();
});
