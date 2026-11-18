import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { digest, sha256, requireThat } from './core.mjs';
import { privatePath } from './paths.mjs';

/** Artifact collision metadata is independent of word/content admission. */
export function contentPolicy(policy) {
  const {legacyArtifactSha256,legacyArtifactSource,artifactTermExceptions,artifactStringExceptions,sourceUnitExceptions,dependencyIdentifierProvenance,...content}=policy;
  return content;
}

/** Trusted operator configuration, deliberately not selectable by bank input. */
export function lockedPolicy(supplied) {
  const file=process.env.LITTLE_ISLAND_WORD_POLICY_LOCK;
  requireThat(file,'Private policy lock required in LITTLE_ISLAND_WORD_POLICY_LOCK');
  const lock=JSON.parse(readFileSync(privatePath(file),'utf8'));
  const policyFile=privatePath(resolve(dirname(file),lock.policyFile));
  const bytes=readFileSync(policyFile),policy=JSON.parse(bytes);
  requireThat(lock.schemaVersion === 1 && lock.policySha256 === sha256(bytes) && lock.scanListSha256 === digest([...policy.scan].sort()) && (!supplied || digest(contentPolicy(supplied)) === digest(contentPolicy(policy))), 'Private policy lock mismatch');
  for (const key of ['scan','core','exact','lemmas','canaries']) requireThat(Array.isArray(policy[key]) && policy[key].length > 0 && policy[key].every(w=>typeof w==='string' && w.length),`Private policy lock missing ${key}`);
  return {policy,lock,policyFile};
}
