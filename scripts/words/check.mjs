#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hermesMagic, hermesStrings, javascriptStrings } from './artifact-views.mjs';
import { guardTree } from './guard.mjs';
import { checkShippingTree } from './shipping.mjs';
import { lockedPolicy } from './policy.mjs';
import { privatePath } from './paths.mjs';
import { digest, sha256, requireThat } from './core.mjs';

export function treeHash(root) {
  const entries=[];
  function walk(dir) {for(const e of readdirSync(dir,{withFileTypes:true})) {const p=join(dir,e.name);requireThat(!lstatSync(p).isSymbolicLink(),'Symlink in release artifact');if(e.isDirectory())walk(p);else entries.push([relative(root,p),sha256(readFileSync(p))]);}}
  walk(root);return digest(entries.sort((a,b)=>a[0].localeCompare(b[0])));
}
export const previewGeneratedFiles=['src/library/catalog.generated.json','src/library/assets.generated.ts','src/library/speech.generated.ts','src/library/vectors.generated.ts'];
export function requireCleanSource(root, preview=process.env.EXPO_PUBLIC_LIBRARY_PREVIEW==='1') {
  const dirty=execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trimEnd();
  if(!dirty)return;
  requireThat(preview && dirty.split('\n').every(line=>/^ M /.test(line) && previewGeneratedFiles.includes(line.slice(3))), 'Word release gate requires a clean source tree');
  const temporary=mkdtempSync(join(tmpdir(),'li-word-preview-source-'));
  try {
    execFileSync(process.execPath,['--experimental-strip-types','scripts/library/build-index.mjs','--output-dir',temporary],{cwd:root,env:{...process.env,EXPO_PUBLIC_LIBRARY_PREVIEW:'1'},stdio:'pipe',maxBuffer:64*1024*1024});
    requireThat(previewGeneratedFiles.every(file=>readFileSync(resolve(root,file)).equals(readFileSync(join(temporary,file.split('/').at(-1))))), 'Preview generated files differ from reproducible source');
  } finally {rmSync(temporary,{recursive:true,force:true});}
}
export function checkExport(root, directory) {
  const admission=checkShippingTree(root,process.env.LITTLE_ISLAND_WORD_RECEIPTS,{full:true});
  // CI receives the private policy lock via an operator-provisioned secret file.
  // Before the first bank, a policy-free structural check is explicit in the receipt.
  requireThat(process.env.CI!=='true' || !!process.env.LITTLE_ISLAND_WORD_POLICY_LOCK?.trim(), 'CI export requires a nonempty private policy');
  const configuration=process.env.LITTLE_ISLAND_WORD_POLICY_LOCK ? lockedPolicy() : undefined;
  if(!configuration)console.error('policy not checked: local export has no private policy');
  // A bank can only reach here after full rebake with the operator policy lock.
  return {admission,guard:guardTree(directory,configuration?.policy,configuration?[configuration.lock]:[],{sourceRoot:root})};
}
export function checkRelease(root, web, ios, output, run=execFileSync) {
  requireCleanSource(root);
  const {policy,lock}=lockedPolicy();
  const admission=checkShippingTree(root,process.env.LITTLE_ISLAND_WORD_RECEIPTS,{full:true});
  let hbc=false;const embeddedStrings=[];
  function find(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);requireThat(!e.isSymbolicLink(),'Symlink in iOS artifact');if(e.isDirectory())find(p);else {const bytes=readFileSync(p);if(bytes.subarray(0,8).equals(hermesMagic)){hbc=true;embeddedStrings.push(...hermesStrings(bytes,{identifiers:false}));}}}}
  find(ios);requireThat(hbc,'Real embedded Hermes iOS bundle required');
  const temporary=mkdtempSync(join(tmpdir(),'li-word-ios-js-'));
  let iosJavaScript;
  try {
    run(process.execPath,[resolve(root,'node_modules/expo/bin/cli'),'export','--platform','ios','--no-bytecode','--output-dir',temporary],{cwd:root,stdio:'pipe',env:{...process.env,CI:'1'},maxBuffer:64*1024*1024});
    let js=false;const exportedStrings=new Set();
    function findJS(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())findJS(p);else if(/\.(?:js|bundle)$/.test(e.name)){js=true;const text=readFileSync(p,'utf8'),view=javascriptStrings(text);for(const value of [...view.strings,...view.keys,...(text.match(/[\p{L}_$][\p{L}\p{N}_$]*/gu)??[])])exportedStrings.add(value);}}}
    findJS(temporary);requireThat(js,'Native platform JavaScript export required');
    iosJavaScript={sha256:treeHash(temporary),...guardTree(temporary,policy,[lock],{sourceRoot:root})};
    requireThat(embeddedStrings.every(value=>exportedStrings.has(value)), 'Hermes strings diverge from native JavaScript export');
    iosJavaScript.hermesStringsMatched=true;
    requireCleanSource(root);
  } finally {rmSync(temporary,{recursive:true,force:true});}
  const receipt={schemaVersion:2,iosJavaScript,source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),policySha256:lock.policySha256,scanListSha256:lock.scanListSha256,admission,web:{path:resolve(web),sha256:treeHash(web),...guardTree(web,policy,[lock],{sourceRoot:root})},ios:{path:resolve(ios),sha256:treeHash(ios),...guardTree(ios,policy,[lock],{sourceRoot:root})}};
  writeFileSync(privatePath(output),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
}
export function verifyReleaseReceipt(root,file,web,ios) {
  requireCleanSource(root);
  const r=JSON.parse(readFileSync(privatePath(file),'utf8')),{lock}=lockedPolicy();
  requireThat(r.schemaVersion===2 && r.iosJavaScript?.hermesStringsMatched===true && r.iosJavaScript?.passed===true && /^[a-f0-9]{64}$/.test(r.iosJavaScript.sha256) && r.source===execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim() && r.policySha256===lock.policySha256 && r.scanListSha256===lock.scanListSha256 && r.admission?.full===true && r.admission.passed===true && r.web?.passed===true && r.ios?.passed===true && r.web.sha256===treeHash(web) && r.ios.sha256===treeHash(ios),'Stale/missing private word release receipt');
  return {passed:true};
}
if(process.argv[1] && realpathSync(process.argv[1])===fileURLToPath(import.meta.url)) {
  let privateDirectory;
  try {
    if (!process.env.LITTLE_ISLAND_WORD_POLICY_LOCK && (process.env.LITTLE_ISLAND_WORD_POLICY_JSON || process.env.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64)) {
      privateDirectory=mkdtempSync(join(tmpdir(),'li-word-ci-'));
      const policyFile=join(privateDirectory,'policy.private.json'),bytes=process.env.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64 ? gunzipSync(Buffer.from(Array.from({length:16},(_,i)=>process.env['LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64'+(i?'_'+(i+1):'')]??'').join(''),'base64'),{maxOutputLength:4*1024*1024}) : Buffer.from(process.env.LITTLE_ISLAND_WORD_POLICY_JSON);
      const policy=JSON.parse(bytes);
      writeFileSync(policyFile,bytes,{mode:0o600});
      const lockFile=join(privateDirectory,'lock.private.json');
      writeFileSync(lockFile,JSON.stringify({schemaVersion:1,policyFile,policySha256:sha256(bytes),scanListSha256:digest([...policy.scan].sort())}),{mode:0o600});
      process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;
    }
    const [mode,...args]=process.argv.slice(2),root=process.cwd();
    let result;
    if(mode==='full')result=checkShippingTree(root,process.env.LITTLE_ISLAND_WORD_RECEIPTS,{full:true});
    else if(mode==='export')result=checkExport(root,args[0]??'dist');
    else if(mode==='release'){requireThat(args.length===3,'release <web-dist> <embedded-ios-directory> <new-private-receipt>');result=checkRelease(root,...args);}
    else if(mode==='receipt'){requireThat(args.length===3,'receipt <private-receipt> <web-dist> <embedded-ios-directory>');result=verifyReleaseReceipt(root,...args);}
    else throw new Error('Expected full, export, release or receipt');
    console.log(JSON.stringify(result));
  }catch(e){console.error(e.message);process.exitCode=1;}
  finally {if(privateDirectory)rmSync(privateDirectory,{recursive:true,force:true});}
}
