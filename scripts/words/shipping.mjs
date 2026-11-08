import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { digest, requireThat } from './core.mjs';
import { bakeBank } from './bake.mjs';

/** Runs from the normal Vitest/CI gate. Newly shipped banks require actual bake inputs. */
export function checkShippingTree(root, evidenceDirectory) {
  const files=[];
  function walk(path) {
    if (!existsSync(path)) return;
    for (const e of readdirSync(path,{withFileTypes:true})) {
      if (e.isDirectory()) walk(join(path,e.name));
      else files.push(join(path,e.name));
    }
  }
  walk(join(root,'src'));walk(join(root,'content/words'));
  const assets=[];
  for (const path of files) {
    const name=relative(root,path).replaceAll('\\','/');
    if (/\.[cm]?[jt]sx?$/.test(path)) {
      const source=readFileSync(path,'utf8');
      requireThat(!/(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"\n]*(?:scripts\/words|\.private|supplement\.draft|calibration\.draft|sources\.lock)/.test(source), `Private word dependency in app: ${name}`);
    }
    if (name.startsWith('content/words/banks/') && name.endsWith('.json')) assets.push(path);
  }
  for (const assetPath of assets) {
    requireThat(evidenceDirectory,'Word bank requires detached admission evidence in LITTLE_ISLAND_WORD_RECEIPTS');
    const inputPath=join(resolve(evidenceDirectory),relative(join(root,'content/words/banks'),assetPath));
    requireThat(existsSync(inputPath),'Missing detached word-bank admission evidence');
    const {asset}=bakeBank(JSON.parse(readFileSync(inputPath,'utf8')));
    requireThat(digest(asset) === digest(JSON.parse(readFileSync(assetPath,'utf8'))),'Shipped word bank differs from reviewed, scanned bake');
  }
  return {passed:true,files:files.length,banks:assets.length};
}
