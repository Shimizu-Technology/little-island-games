import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { requireThat, digest, sha256 } from './core.mjs';

// Failure links find overlapping terms in one byte pass, including nested terms.
// Match both the single-byte and UTF-16LE string tables used by Hermes.
function rawTermMatcher(terms) {
  if(!terms.length)return ()=>new Set();
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

    }
    return new Set([...distinct].map(id=>terms[id]));
  };
}

/** Reusable scanner for inspecting documented inherited collision contexts. */
export function artifactScanner(policy) {
  const broad=rawTermMatcher([...new Set(policy.scan.filter(w=>w.length>=5).map(w=>w.toUpperCase()))]);
  const literal=rawTermMatcher([...new Set([...policy.core,...policy.exact,...policy.lemmas,...(policy.chamoruSensitive??[])].map(w=>w.toUpperCase()))]);
  return bytes=>{
    const views=[bytes.toString('latin1'),bytes.toString('utf8'),bytes.toString('utf16le'),bytes.subarray(1).toString('utf16le')];
    const uppers=views.map(text=>text.toUpperCase());
    return {views,uppers,broadHits:new Set(uppers.flatMap(upper=>[...broad(upper)])),literalHits:new Set(uppers.flatMap(upper=>[...literal(upper)]))};
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
  const findings=[];let files=0,termExceptionsUsed=0;
  // Exceptions identify a reviewed term collision in a narrow artifact path,
  // never an entire file. A changed app bundle still receives every check.
  const exceptions=policy.artifactTermExceptions ?? [];
  requireThat(Array.isArray(exceptions),'Invalid artifact term exceptions');
  for(const rule of exceptions) {
    requireThat(typeof rule.path==='string' && !rule.path.includes('..') && !rule.path.startsWith('/') && Array.isArray(rule.terms) && rule.terms.length>0,'Invalid artifact term exception path');
    for(const e of rule.terms) requireThat(['broad','literal'].includes(e.check) && typeof e.term==='string' && e.term.length>0 && typeof e.reason==='string' && e.reason.trim().length>0 && typeof e.evidence==='string' && e.evidence.trim().length>0,'Unreviewed artifact term exception');
  }
  const pathMatches=(pattern,name)=>new RegExp('^'+pattern.split('*').map(escape).join('[^/]*')+'$').test(name);
  const escape=w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const scan=artifactScanner(policy);
  requireThat(!lstatSync(root).isSymbolicLink(),'Symlink in export tree');
  function walk(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name),name=relative(root,path).replaceAll('\\','/');
      requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in export tree');
      if (entry.isDirectory()) {if (bannedNames.test(name)) findings.push(name);walk(path);continue;}
      files++;
      const bytes=readFileSync(path),fileHash=sha256(bytes);
      // Bytecode string storage is not guaranteed to begin at an even offset.
      const {views,uppers,broadHits,literalHits}=scan(bytes);
      if (bannedNames.test(name) || hashes.has(fileHash) || views.some(text=>[...hashes].some(h=>text.includes(h)) || blobs.some(b=>text.includes(b)))) findings.push(name);
      const allowed={broad:new Set(),literal:new Set()};
      for(const rule of exceptions) if(pathMatches(rule.path,name)) for(const e of rule.terms) allowed[e.check].add(e.term.toUpperCase());
      for(const [check,hits] of [['broad',broadHits],['literal',literalHits]]) {
        for(const term of hits) if(allowed[check].has(term)) {hits.delete(term);termExceptionsUsed++;}
      }
      if(broadHits.size>=(allowed.broad.size ? 1 : 3)) findings.push(`${name}:partial-list`);
      if(literalHits.size) findings.push(`${name}:blocked-literal`);
      for(const word of policy.canaries??[]) if(uppers.some(upper=>upper.includes(word.toUpperCase()))) findings.push(`${name}:canary`);

    }
  }
  walk(root);
  requireThat(findings.length===0,`Private word data leaked: ${[...new Set(findings)].join(', ')}`);
  return {passed:true,files,termExceptionsUsed,privateHashesChecked:hashes.size,policyDataChecked:policy.scan.length>0};
}
