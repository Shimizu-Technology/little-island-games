import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { hermesMagic, hermesStrings, javascriptStrings, jsonStrings, letterGrids, technicalString, htmlViews, workletStrings, puzzleStrings } from './artifact-views.mjs';
import { scanGrid } from './scan.mjs';
import { requireThat, digest, sha256, foldScan } from './core.mjs';
import { contentPolicy } from './policy.mjs';

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
    let state=0,index=0;const distinct=new Set();
    for(const c of text) {
      while(state && !nodes[state].next.has(c))state=nodes[state].fail;
      state=nodes[state].next.get(c)??0;
      index+=c.length;
      for(const id of nodes[state].out) {
        const start=index-terms[id].length;
        if(!/[\p{L}\p{M}]$/u.test(text.slice(Math.max(0,start-2),start)) && !/^[\p{L}\p{M}]/u.test(text.slice(index,index+2))) distinct.add(id);
      }

    }
    return new Set([...distinct].map(id=>terms[id]));
  };
}

function byteViews(bytes) {
  const views=[bytes.toString('latin1'),bytes.toString('utf8'),bytes.toString('utf16le'),bytes.subarray(1).toString('utf16le')];
  return {views,uppers:views.map(text=>text.toUpperCase())};
}

/** Raw views are reserved for unconditional private-byte detection. */
export function artifactScanner(policy) {
  const broad=rawTermMatcher([...new Set(policy.scan.filter(w=>w.length>=5).map(w=>w.toUpperCase()))]);
  const literal=rawTermMatcher([...new Set([...policy.core,...policy.exact,...policy.lemmas,...(policy.chamoruSensitive??[])].map(w=>w.toUpperCase()))]);
  return (bytes,name='artifact.bin',decodedPack,raw=byteViews(bytes)) => {
    const {views,uppers}=raw;
    let strings=[],keys=[],grids=[],semantic=true;
    if(bytes.subarray(0,8).equals(hermesMagic) || /\.hbc$/i.test(name)) strings=hermesStrings(bytes);
    else if(/\.(?:[cm]?js|bundle)$/i.test(name)) ({strings,keys}=javascriptStrings(views[1]));
    else if(decodedPack) {strings=puzzleStrings([decodedPack.payloads,decodedPack.speech]);keys=puzzleStrings(decodedPack.metadata);grids=letterGrids(decodedPack.payloads);}
    else if(/\.(?:json|lipuzzle|webmanifest)$/i.test(name)) {
      let value;
      try {value=JSON.parse(views[1]);} catch {requireThat(false,'Cannot parse exported JSON');}
      strings=jsonStrings(value);grids=letterGrids(value);
    } else if(/\.html$/i.test(name)) ({strings,keys}=htmlViews(views[1]));
    else if(/\.(?:txt|css|svg|xml|bin)$/i.test(name)) {strings=views;semantic=false;}
    else semantic=false;
    if(bytes.subarray(0,8).equals(hermesMagic) || /\.(?:[cm]?js|bundle)$/i.test(name)) {
      const parsed=workletStrings(strings);strings=parsed.strings;keys.push(...parsed.keys);
    }
    // Binary media is not vocabulary. Partial-list leaks still get a raw,
    // whole-word scan, in addition to unconditional blob/hash/canary checks.
    const leakStrings=strings.length || /\.(?:[cm]?js|bundle)$/i.test(name) ? [...strings,...keys] : views;
    const contentStrings=new Set(strings);
    const stringHits=leakStrings.filter(text=>!technicalString(text)).map(text=>({sha256:sha256(text),broad:[...broad(text.toUpperCase())],literal:contentStrings.has(text)?[...literal(text.toUpperCase())]:[]}));
    return {views,uppers:[...uppers,...strings.map(text=>text.toUpperCase())],strings,grids,semantic,stringHits,broadHits:new Set(stringHits.flatMap(s=>s.broad)),literalHits:new Set(stringHits.flatMap(s=>s.literal))};
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
  const hashes=new Set([digest([...policy.scan].sort()),digest(policy),digest(contentPolicy(policy)),...groups.filter(a=>a.length).map(a=>digest([...a].sort())),...privateReceipts.flatMap(r=>[r.scanListSha256,r.vocabularySha256,r.policySha256])].filter(Boolean));
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
  const stringExceptions=policy.artifactStringExceptions??[];
  requireThat(Array.isArray(stringExceptions),'Invalid artifact string exceptions');
  for(const rule of stringExceptions) {
    requireThat(typeof rule.path==='string' && !rule.path.includes('..') && !rule.path.startsWith('/') && Array.isArray(rule.strings),'Invalid artifact string exception path');
    for(const item of rule.strings) {
      requireThat(/^[a-f0-9]{64}$/.test(item.sha256) && Number.isSafeInteger(item.occurrences) && item.occurrences>0 && Array.isArray(item.terms) && item.terms.length>0,'Invalid artifact string exception');
      for(const e of item.terms) requireThat(['broad','literal'].includes(e.check) && typeof e.term==='string' && e.term.length>0 && typeof e.reason==='string' && e.reason.trim().length>0 && typeof e.evidence==='string' && e.evidence.trim().length>0,'Unreviewed artifact string exception');
    }
  }
  const gridTerms=[...new Set([...policy.scan,...policy.core,...policy.exact,...policy.lemmas,...(policy.chamoruSensitive??[])].map(foldScan).filter(w=>/^[A-Z]{3,40}$/.test(w)))];
  const scan=artifactScanner(policy);
  const entries=[];
  function collect(dir) {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name),name=relative(root,path).replaceAll('\\','/');
      requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in export tree');
      if(entry.isDirectory()) {if(bannedNames.test(name))findings.push(name);collect(path);}
      else entries.push({path,name,bytes:readFileSync(path)});
    }
  }
  requireThat(!lstatSync(root).isSymbolicLink(),'Symlink in export tree');
  collect(root);
  const packs=entries.filter(e=>/\.lipuzzle$/i.test(e.name));
  if(packs.length) {
    const runner=fileURLToPath(new URL('./decode-packs.mjs',import.meta.url));
    const result=spawnSync(process.execPath,['--import',resolve('scripts/puzzles/register.mjs'),runner],{input:JSON.stringify(packs.map(e=>e.bytes.toString('utf8'))),encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});
    requireThat(result.status===0,'Cannot decode exported puzzle packs');
    const decoded=JSON.parse(result.stdout);
    packs.forEach((e,i)=>{e.decoded=decoded[i];});
  }
  for(const {name,bytes,decoded} of entries) {
      files++;
      const fileHash=sha256(bytes),raw=byteViews(bytes);
      if(bannedNames.test(name) || hashes.has(fileHash) || raw.uppers.some(upper=>[...hashes].some(h=>upper.includes(h.toUpperCase())) || blobs.some(b=>upper.includes(b.toUpperCase())))) {findings.push(name);continue;}
      if((policy.canaries??[]).some(word=>raw.uppers.some(upper=>upper.includes(word.toUpperCase())))) {findings.push(`${name}:canary`);continue;}
      // Bytecode string storage is not guaranteed to begin at an even offset.
      const {uppers,broadHits,literalHits,grids,semantic,stringHits}=scan(bytes,name,decoded,raw);
      if(grids.some(grid=>scanGrid(grid,gridTerms).length)) findings.push(`${name}:blocked-grid`);
      if (bannedNames.test(name) || hashes.has(fileHash) || uppers.some(upper=>[...hashes].some(h=>upper.includes(h.toUpperCase())) || blobs.some(b=>upper.includes(b.toUpperCase())))) findings.push(name);
      const allowed={broad:new Set(),literal:new Set()};
      for(const rule of exceptions) if(!semantic && pathMatches(rule.path,name)) for(const e of rule.terms) allowed[e.check].add(e.term.toUpperCase());
      for(const [check,hits] of [['broad',broadHits],['literal',literalHits]]) {
        for(const term of hits) if(allowed[check].has(term)) {hits.delete(term);termExceptionsUsed++;}
      }
      if(semantic) {
        broadHits.clear();literalHits.clear();
        const seen=new Map(),scoped=new Map();
        for(const rule of stringExceptions) if(pathMatches(rule.path,name)) for(const item of rule.strings) {
          const rows=scoped.get(item.sha256)??[];rows.push(item);scoped.set(item.sha256,rows);
        }
        for(const hit of stringHits) {
          const occurrence=(seen.get(hit.sha256)??0)+1;seen.set(hit.sha256,occurrence);
          const reviewed={broad:new Set(),literal:new Set()};
          for(const item of scoped.get(hit.sha256)??[]) {
            if(occurrence<=item.occurrences) for(const e of item.terms) reviewed[e.check].add(e.term.toUpperCase());
          }
          for(const [check,hits] of [['broad',broadHits],['literal',literalHits]]) for(const term of hit[check]) {
            if(reviewed[check].has(term))termExceptionsUsed++;else hits.add(term);
          }
        }
      }
      if(broadHits.size>=(allowed.broad.size ? 1 : 3)) findings.push(`${name}:partial-list`);
      if(literalHits.size) findings.push(`${name}:blocked-literal`);
      for(const word of policy.canaries??[]) if(uppers.some(upper=>upper.includes(word.toUpperCase()))) findings.push(`${name}:canary`);

  }
  requireThat(findings.length===0,`Private word data leaked: ${[...new Set(findings)].join(', ')}`);
  return {passed:true,files,termExceptionsUsed,privateHashesChecked:hashes.size,policyDataChecked:policy.scan.length>0};
}
