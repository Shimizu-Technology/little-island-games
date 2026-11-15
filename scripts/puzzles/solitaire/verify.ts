import {readCatalog,readPackText,productionDirs} from '../pipeline';
import {parsePack} from '../../../src/puzzles/bank';
import {decodeRow} from '../../../src/puzzles/descriptor';
import {solitaireAdapter,semanticKey} from '../../../src/puzzles/table/adapter';
import {solve} from '../../../src/puzzles/table/solver';
import {verifyLine} from './independent';
const catalog=readCatalog(productionDirs),counts:Record<string,number>={},seen=new Set<string>();
for(const family of ['solitaire','freecell']){const m=catalog.families.get(family);if(!m)continue;const adapter=solitaireAdapter(family==='solitaire');for(const p of m.packs){const pack=parsePack(readPackText(productionDirs,p[0]),p,m);if(!pack)throw new Error('Malformed bank.');for(const row of pack.rows){const d=decodeRow(row,m.bands[p[5]],adapter);if(!d)throw new Error('Malformed deal.');const key=semanticKey(d.payload);if(seen.has(key))throw new Error('Semantic duplicate.');seen.add(key);const r=solve(d.payload,undefined,10000);if(r.status!=='solved'||!verifyLine(d.payload.cards,d.payload.mode,r.moves))throw new Error('Independent certificate replay failed.');counts[d.payload.mode]=(counts[d.payload.mode]??0)+1;}}}
console.log(JSON.stringify({verification:'independent rules replay',counts}));if(!Object.keys(counts).length)throw new Error('No certified Solitaire deals.');
