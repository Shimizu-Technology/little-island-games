import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { requireThat, digest, sha256 } from './core.mjs';

/** Audit built bundles AND staged source exports. Does not copy or publish an export. */
export function guardTree(directory, policy, privateReceipts = []) {
  const root=resolve(directory), hashes = new Set([digest([...policy.scan].sort()), ...privateReceipts.flatMap(r => [r.scanListSha256,r.vocabularySha256])].filter(Boolean));
  const blobs = [JSON.stringify(policy.scan), JSON.stringify([...policy.scan].sort()), JSON.stringify(policy), ...(policy.scan.join('\n').length > 8 ? [policy.scan.join('\n')] : [])];
  const bannedNames = /(?:^|\/)(?:private|scan-list|block-list|review-[ab]|reconciliation)(?:[/.]|$)/i;
  const findings=[];let files=0;
  function walk(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name), name=relative(root,path).replaceAll('\\','/');
      requireThat(!lstatSync(path).isSymbolicLink(), 'Symlink in export tree');
      if (entry.isDirectory()) { if (bannedNames.test(name)) findings.push(name); walk(path); continue; }
      files++;
      const bytes=readFileSync(path), text=bytes.toString('utf8');
      if (bannedNames.test(name) || hashes.has(sha256(bytes)) || [...hashes].some(h => text.includes(h)) || blobs.some(b => text.includes(b))) findings.push(name);
      // Literal entries, never substring matching common letter fragments in code/binary.
      // Short/common broad-list terms can be legitimate text (e.g. a family word).
      // Check explicit blocked-answer literals; scan list is checked as data and hashes.
      for (const word of new Set([...policy.exact,...policy.lemmas])) {
        if (new RegExp(`(?:["'\\x60])${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:["'\\x60])`,'i').test(text)) findings.push(`${name}:blocked-literal`);
      }
    }
  }
  walk(root);
  requireThat(findings.length === 0, `Private word data leaked: ${[...new Set(findings)].join(', ')}`);
  return {passed:true,files,privateHashesChecked:hashes.size,policyDataChecked:true};
}
