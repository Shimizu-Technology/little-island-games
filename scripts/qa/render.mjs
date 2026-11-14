import { writeFileSync } from 'node:fs';
import { discoverInventory, readMatrix, readScope, renderMatrix, validateMatrix } from './matrix.ts';
const matrix = readMatrix(), scope = readScope();
validateMatrix(matrix, scope, discoverInventory());
writeFileSync('docs/QA_MATRIX.md', renderMatrix(matrix));
console.log(`QA matrix: ${matrix.rows.length} rows validated and rendered.`);
