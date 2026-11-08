import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { requireThat, digest, sha256 } from './core.mjs';

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
  const broadPattern=broad.length?new RegExp(broad.map(escape).join('|'),'gi'):undefined;
  const literalTerms=[...new Set([...policy.core,...policy.exact,...policy.lemmas,...(policy.chamoruSensitive??[])])];
  const literalPattern=literalTerms.length?new RegExp(literalTerms.map(escape).join('|'),'gi'):undefined;
  requireThat(!lstatSync(root).isSymbolicLink(),'Symlink in export tree');
  function walk(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name),name=relative(root,path).replaceAll('\\','/');
      requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in export tree');
      if (entry.isDirectory()) {if (bannedNames.test(name)) findings.push(name);walk(path);continue;}
      files++;
      const bytes=readFileSync(path),text=bytes.toString('latin1'),upper=text.toUpperCase();
      if (bannedNames.test(name) || hashes.has(sha256(bytes)) || [...hashes].some(h=>text.includes(h)) || blobs.some(b=>text.includes(b))) findings.push(name);
      // Existing app prose and random media bytes collide with the overinclusive
      // scan union. Only exact, pre-pinned legacy artifact bytes may bypass this
      // heuristic; changed/new files get the full check. Canaries never bypass it.
      if (knownLegacy.has(sha256(bytes))) legacyHeuristicExemptions++;
      if (!knownLegacy.has(sha256(bytes))) {
        const distinct=new Set();
        if(broadPattern) for(const m of text.matchAll(broadPattern)) {distinct.add(m[0].toUpperCase());if(distinct.size>=3)break;}
        if(distinct.size>=3) findings.push(`${name}:partial-list`);
        if(literalPattern && text.search(literalPattern)!==-1) findings.push(`${name}:blocked-literal`);
      }
      for(const word of policy.canaries??[]) if(upper.includes(word.toUpperCase())) findings.push(`${name}:canary`);

    }
  }
  walk(root);
  requireThat(findings.length===0,`Private word data leaked: ${[...new Set(findings)].join(', ')}`);
  return {passed:true,files,legacyHeuristicExemptions,privateHashesChecked:hashes.size,policyDataChecked:policy.scan.length>0};
}
