import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
it('Play gates both the Listen button and sound-off prompt on available instructions',()=>{
 const source=readFileSync('src/app/play.tsx','utf8');
 expect(source).toContain('{hasInstructions && <Button onPress={() => sound(instructions)}');
 expect(source).toContain('{hasInstructions && !store.save.settings.sound && <Copy>Turn sound on to hear the instructions.</Copy>}');
 expect(source).toContain('const hasInstructions = id !== "numbers" || !!(learnSources as Record<string, number>)[instructions]');
});
