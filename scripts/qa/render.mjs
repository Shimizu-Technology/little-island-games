import { writeFileSync } from 'node:fs';
import { buildMatrix, discoverInventory, readScope, renderMatrix, serializeMatrix, validateMatrix } from './matrix.ts';
const scope = readScope(), inventory = discoverInventory(), matrix = buildMatrix(process.cwd(), scope, inventory);
validateMatrix(matrix, scope, inventory);
writeFileSync('docs/qa-matrix.json', serializeMatrix(matrix));
writeFileSync('docs/QA_MATRIX.md', renderMatrix(matrix));
console.log(`QA matrix: ${matrix.rows.length} rows generated, validated and rendered.`);
