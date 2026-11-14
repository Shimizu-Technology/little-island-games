// Build-time only. Policy and answer records never enter the application import graph.
import { cellsFor, requireThat } from '../../words/core.mjs';
import { countOccurrences, scanGrid } from '../../words/scan.mjs';
const directions = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
const alphabets = { en: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ch: ["'",'A','Å','B','CH','D','E','F','G','H','I','K','L','M','N','Ñ','NG','O','P','R','S','T','U','Y'] };
function random(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s,1664525)+1013904223) >>> 0) / 4294967296); }
const shuffle = (array, rnd) => { const a = [...array]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
export function generateSurface({ words, policy, seed, size, count, directionCount = 8, id, message = null, distractors = 0, attempts = 2000 }) {
  requireThat(Number.isInteger(seed) && Number.isInteger(size) && size >= 4 && size <= 16 && Number.isInteger(count) && count > 0 && count <= 24 && [2,4,8].includes(directionCount) && Number.isInteger(distractors) && distractors>=0 && distractors<=8, 'Invalid Word Search bake options');
  requireThat(new Set(words.map(w=>w.language)).size===1,'A grid needs one language');
  const language=words[0].language, alphabet=alphabets[language], rnd=random(seed);
  const pool=words.filter(w=>cellsFor(w.spelling,language).length>=2 && cellsFor(w.spelling,language).length<=size);
  requireThat(pool.length>=count,'Not enough answers for this grid');
  for(let attempt=0;attempt<attempts;attempt++) {
    const chosen=shuffle(pool,rnd).slice(0,count).sort((a,b)=>cellsFor(b.spelling,language).length-cellsFor(a.spelling,language).length);
    const cells=Array.from({length:size},()=>Array(size).fill(null)),listed=[];
    const place = (letters, record = null) => {
      for(let t=0;t<300;t++) {
        const [dr,dc]=directions[Math.floor(rnd()*directionCount)],r=Math.floor(rnd()*size),c=Math.floor(rnd()*size),path=letters.map((_,i)=>[r+dr*i,c+dc*i]);
        if(path.some(([y,x],i)=>y<0 || x<0 || y>=size || x>=size || cells[y][x] && cells[y][x]!==letters[i]))continue;
        path.forEach(([y,x],i)=>{cells[y][x]=letters[i];});if(record)listed.push({wordId:record.id,answer:record.spelling,cells:path});return true;
      }return false;
    };
    if(!chosen.every(w=>place(cellsFor(w.spelling,language),w)))continue;
    // Look-alike trails are one-letter variants of reviewed answers, never accepted answers.
    let decoys=0;
    for(const w of shuffle(chosen,rnd)) {
      if(decoys>=distractors)break;
      const letters=cellsFor(w.spelling,language),at=Math.floor(rnd()*letters.length);let replacement;
      do replacement=alphabet[Math.floor(rnd()*alphabet.length)];while(replacement===letters[at]);letters[at]=replacement;
      if(place(letters))decoys++;
    }
    if(decoys<distractors)continue;
    const fixed=new Set();for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(cells[r][c]!==null)fixed.add(`${r},${c}`);
    const free=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(cells[r][c]===null)free.push([r,c]);
    if(message!==null) {
      const chars=cellsFor(message,language);if(chars.length!==free.length)continue;
      free.forEach(([r,c],i)=>{cells[r][c]=chars[i];});
    } else free.forEach(([r,c])=>{cells[r][c]=alphabet[Math.floor(rnd()*alphabet.length)];});
    // Repair filler only. Answers and look-alike trails are fixed, with no scan exemptions added.
    let clean=false;
    for(let repair=0;repair<1000;repair++) {
      const hits=scanGrid(cells,policy.scan,listed),duplicate=listed.find(w=>countOccurrences(cells,cellsFor(w.answer,language))!==1);
      if(!hits.length && !duplicate){clean=true;break;}
      if(message!==null)break;
      let editable=hits.length ? hits[0].cells.filter(([r,c])=>!fixed.has(`${r},${c}`)) : [];
      if(!hits.length && duplicate) {
        const letters=cellsFor(duplicate.answer,language);
        for(let r=0;r<size;r++)for(let c=0;c<size;c++)for(const [dr,dc] of directions) {
          const path=letters.map((_,i)=>[r+dr*i,c+dc*i]);
          if(path.every(([y,x],i)=>cells[y]?.[x]===letters[i]))editable.push(...path.filter(([y,x])=>!fixed.has(`${y},${x}`)));
        }
      }
      if(!editable.length)break;
      const [r,c]=editable[Math.floor(rnd()*editable.length)];let replacement;
      do replacement=alphabet[Math.floor(rnd()*alphabet.length)];while(replacement===cells[r][c]);cells[r][c]=replacement;
    }
    if(!clean)continue;
    return { surface:{id,kind:'word-search',wordIds:listed.map(w=>w.wordId),cells,listed}, attempt, distractors:decoys };
  }
  throw new Error('No safe unique grid within the deterministic attempt budget');
}
