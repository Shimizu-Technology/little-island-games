import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { requireThat, digest, sha256 } from './core.mjs';

// Failure links find overlapping terms in one byte pass, including nested terms.
// Matching folds ASCII case only; no decoding of Hermes string tables is needed.
function rawTermMatcher(terms) {
  if(!terms.length)return ()=>false;
  const nodes=[{next:new Map(),fail:0,out:[]}];
  for(const [id,term] of terms.entries()) {
    let state=0;
    for(const c of term) {
      if(!nodes[state].next.has(c)) {nodes[state].next.set(c,nodes.length);nodes.push({next:new Map(),fail:0,out:[]});}
      state=nodes[state].next.get(c);
    }
    nodes[state].out.push(id);
  }
  const queue=[...nodes[0].next.values()];
  for(let head=0;head<queue.length;head++) {
    const state=queue[head];
    for(const [c,next] of nodes[state].next) {
      let fallback=nodes[state].fail;
      while(fallback && !nodes[fallback].next.has(c))fallback=nodes[fallback].fail;
      nodes[next].fail=nodes[fallback].next.get(c)??0;
      nodes[next].out.push(...nodes[nodes[next].fail].out);queue.push(next);
    }
  }
  return text=>{
    let state=0;const distinct=new Set();
    for(const c of text) {
      while(state && !nodes[state].next.has(c))state=nodes[state].fail;
      state=nodes[state].next.get(c)??0;
      for(const id of nodes[state].out)distinct.add(id);
      if(distinct.size>=3)return true;
    }
    return false;
  };
}

/** Reads raw bytes, including Hermes' string table.
 * @param {string} directory
 * @param {any} [policy]
 * @param {any[]} [privateReceipts]
 */
export function guardTree(directory, policy = {scan:[],core:[],exact:[],lemmas:[],chamoruSensitive:[],canaries:[]}, privateReceipts = []) {
  const root=resolve(directory);
  const groups=['scan','core','exact','lemmas','chamoruSensitive','canaries'].map(k=>policy[k] ?? []);
  const hashes=new Set([digest([...policy.scan].sort()),digest(policy),...groups.filter(a=>a.length).map(a=>digest([...a].sort())),...privateReceipts.flatMap(r=>[r.scanListSha256,r.vocabularySha256,r.policySha256])].filter(Boolean));
  const blobs=groups.filter(a=>a.length).flatMap(a=>[JSON.stringify(a),...(a.length>1?[a.join('\n')]:[])]);
  const bannedNames=/(?:^|\/)(?:private|scan-list|block-list|review-[ab])(?:[/.]|$)|\.private\.|\.queue\.json$|reconcil|\.draft\.|sources\.lock\.json$/i;
  const findings=[];let files=0,legacyHeuristicExemptions=0;
  const knownLegacy=new Set(policy.legacyArtifactSha256 ?? []);
  const escape=w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const broad=[...new Set(policy.scan.filter(w=>w.length>=5).map(w=>w.toUpperCase()))].sort((a,b)=>b.length-a.length);
  const hasRawTerms=rawTermMatcher(broad);
  const literalTerms=[...new Set([...policy.core,...policy.exact,...policy.lemmas,...(policy.chamoruSensitive??[])])];
  const literalPattern=literalTerms.length?new RegExp(literalTerms.map(escape).join('|'),'gi'):undefined;
  requireThat(!lstatSync(root).isSymbolicLink(),'Symlink in export tree');
  function walk(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name),name=relative(root,path).replaceAll('\\','/');
      requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in export tree');
      if (entry.isDirectory()) {if (bannedNames.test(name)) findings.push(name);walk(path);continue;}
      files++;
      const bytes=readFileSync(path),fileHash=sha256(bytes),text=bytes.toString('latin1'),upper=text.toUpperCase();
      if (bannedNames.test(name) || hashes.has(fileHash) || [...hashes].some(h=>text.includes(h)) || blobs.some(b=>text.includes(b))) findings.push(name);
      // Existing app prose and random media bytes collide with the overinclusive
      // scan union. Only exact, pre-pinned legacy artifact bytes may bypass this
      // heuristic; changed/new files get the full check. Canaries never bypass it.
      if (knownLegacy.has(fileHash)) legacyHeuristicExemptions++;
      if (!knownLegacy.has(fileHash)) {
        if(hasRawTerms(upper)) findings.push(`${name}:partial-list`);
        if(literalPattern && text.search(literalPattern)!==-1) findings.push(`${name}:blocked-literal`);
      }
      for(const word of policy.canaries??[]) if(upper.includes(word.toUpperCase())) findings.push(`${name}:canary`);

    }
  }
  walk(root);
  requireThat(findings.length===0,`Private word data leaked: ${[...new Set(findings)].join(', ')}`);
  return {passed:true,files,legacyHeuristicExemptions,privateHashesChecked:hashes.size,policyDataChecked:policy.scan.length>0};
}
