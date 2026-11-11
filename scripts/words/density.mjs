// All formats share this view; punctuation and data shape cannot launder words.
export function normalizedText(text) {
  return text.normalize('NFKC').replace(/\p{Default_Ignorable_Code_Point}/gu,'').normalize('NFD').replace(/\p{M}/gu,'').toUpperCase();
}
export const wordTokens = text => normalizedText(text).match(/\p{L}+/gu)??[];
export const densityWindow = 1000;
export const densityThreshold = 16; // Calibrated against the historical export matrix; see README.
export const shortDensityWindow = 200;
export const shortDensityThreshold = 12; // Historical text-view peak 9; 33% margin, checked again on current exports.
export function densityScanner(terms, window=densityWindow) {
  const vocabulary=new Set(terms.map(normalizedText));
  return text=>{
    const tokens=wordTokens(text),counts=new Map();let maximum=0;
    for(let i=0;i<tokens.length;i++) {
      if(vocabulary.has(tokens[i]))counts.set(tokens[i],(counts.get(tokens[i])??0)+1);
      if(i>=window && vocabulary.has(tokens[i-window])) {
        const word=tokens[i-window],count=counts.get(word)-1;
        if(count)counts.set(word,count);else counts.delete(word);
      }
      maximum=Math.max(maximum,counts.size);
    }
    return maximum;
  };
}

/** Recursively decode JSON carried inside strings without executing source. */
export function decodedTextViews(strings) {
  const views=[],seen=new Set(),queue=strings.map(text=>({text,depth:0}));
  for(let i=0;i<queue.length;i++) {
    const {text,depth}=queue[i];
    if(seen.has(text) || !/^\s*["[{]/.test(text))continue;seen.add(text);
    let decoded;try{decoded=JSON.parse(text);}catch{continue;}
    if(typeof decoded!=='string' && (!decoded || typeof decoded!=='object'))continue;
    if(depth>=8)throw new Error('Encoded text nesting exceeds guard limit');
    views.push(typeof decoded==='string'?decoded:JSON.stringify(decoded));
    function visit(value) {
      if(typeof value==='string')queue.push({text:value,depth:depth+1});
      else if(value && typeof value==='object')for(const [key,child] of Object.entries(value)){views.push(key);visit(child);}
    }
    visit(decoded);
  }
  return views;
}
