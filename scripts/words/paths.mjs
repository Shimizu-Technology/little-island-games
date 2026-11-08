import { existsSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from './core.mjs';
export const REPO_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
/** Resolve existing symlink ancestors before any private output is created. */
export function privatePath(path) {
  const target=resolve(path);let parent=target;
  while (!existsSync(parent)) {
    requireThat(!lstatSync(parent,{throwIfNoEntry:false})?.isSymbolicLink(),'Private output cannot traverse a dangling symlink');
    parent=dirname(parent);
  }
  const canonical=resolve(realpathSync.native(parent),relative(parent,target)),rel=relative(realpathSync.native(REPO_ROOT),canonical);
  requireThat(rel === '..' || rel.startsWith(`..${sep}`),'Private output must be outside the app repository');
  return target;
}
