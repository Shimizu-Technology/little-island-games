import type { EdgeGenerator } from './family';
import { bridgesGenerator } from './bridges';
import { loopGenerator, pearlGenerator } from '../lines/loops';

/** G5 generators by family id. */
export const edgeGenerators: Record<string, EdgeGenerator<any, any>> = { bridges: bridgesGenerator, loop: loopGenerator, 'pearl-loop': pearlGenerator };
