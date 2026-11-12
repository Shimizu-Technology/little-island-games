import { readFileSync,writeFileSync,readdirSync,lstatSync,existsSync,mkdtempSync,mkdirSync,rmSync,realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join,resolve,dirname,relative } from 'node:path';
import { execFileSync,spawnSync } from 'node:child_process';
import { sha256,digest,requireThat } from './core.mjs';
import { privatePath } from './paths.mjs';
import { hermesMagic } from './artifact-views.mjs';

/** Match Expo SDK 57's resolver, while rejecting unpinned higher-priority overrides. */
export function compilerIdentity(root) {
  const require=createRequire(resolve(root,'package.json'));
  const nativeRoot=dirname(require.resolve('react-native/package.json'));
  const packageFile=createRequire(join(nativeRoot,'package.json')).resolve('hermes-compiler/package.json');
  const packagePath=realpathSync(dirname(packageFile)),platform={darwin:'osx-bin/hermesc',linux:'linux64-bin/hermesc',win32:'win64-bin/hermesc.exe'}[process.platform];
  requireThat(platform && !process.env.REACT_NATIVE_OVERRIDE_HERMES_DIR && !existsSync(join(nativeRoot,'ReactAndroid/hermes-engine/build/hermes/bin/hermesc')),'Hermes compiler must use the pinned package without an override');
  const executablePath=realpathSync(join(packagePath,'hermesc',platform)),pkg=JSON.parse(readFileSync(packageFile));
  return {packagePath,packageVersion:pkg.version,executablePath,executableSha256:sha256(readFileSync(executablePath)),versionOutput:execFileSync(executablePath,['-version'],{encoding:'utf8'}).trim()};
}
export function bytecodeFiles(directory) {
  const files=[];
  function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in native compiler artifact');if(e.isDirectory())visit(path);else {const bytes=readFileSync(path);if(bytes.subarray(0,8).equals(hermesMagic))files.push({path:relative(directory,path),sha256:sha256(bytes)});}}}
  requireThat(!lstatSync(directory).isSymbolicLink(),'Symlink in native compiler artifact');
  visit(directory);return files.sort((a,b)=>a.path.localeCompare(b.path));
}

/** The shim records actual invocations of the pinned compiler, not an inferred tool version. */
export function prepareCompilerCapture(root) {
  const compiler=compilerIdentity(root),directory=mkdtempSync(join(tmpdir(),'li-hermes-build-')),bin=join(directory,'build/bin'),log=join(directory,'calls.jsonl');mkdirSync(bin,{recursive:true});
  const wrapper=join(bin,'hermesc');
  const script=`#!/usr/bin/env node
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
const compiler=${JSON.stringify(compiler)},log=${JSON.stringify(log)},args=process.argv.slice(2);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(hash(compiler.executablePath)!==compiler.executableSha256){process.stderr.write('Native Hermes compiler changed\\n');process.exit(1);}
const result=cp.spawnSync(compiler.executablePath,args,{stdio:'inherit'});
const index=args.indexOf('-out'),output=index>=0?args[index+1]:undefined;
if(result.status===0&&output&&fs.existsSync(output))fs.appendFileSync(log,JSON.stringify({compiler,outputSha256:hash(output),compilerUnchanged:hash(compiler.executablePath)===compiler.executableSha256})+'\\n',{mode:0o600});
process.exit(result.status??1);
`;
  writeFileSync(wrapper,script,{mode:0o700});
  return {
    compiler,executable:wrapper,environment:{HERMES_CLI_PATH:wrapper,REACT_NATIVE_OVERRIDE_HERMES_DIR:directory},
    finish(ios,output) {
      const files=bytecodeFiles(ios),calls=existsSync(log)?readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
      requireThat(files.length>0 && digest(compilerIdentity(root))===digest(compiler) && files.every(file=>calls.some(call=>call.outputSha256===file.sha256 && call.compilerUnchanged && digest(call.compiler)===digest(compiler))),'Native Hermes artifact lacks matching compiler capture');
      const record={schemaVersion:1,compiler,bytecodeFiles:files};writeFileSync(privatePath(output),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});return record;
    },
    cleanup(){rmSync(directory,{recursive:true,force:true});},
  };
}
export function captureNativeBuild(command,root,env,run=spawnSync) {
  requireThat(env.LITTLE_ISLAND_WORD_IOS_ARTIFACT && env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT,'Native build requires its artifact path and LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT');
  const capture=prepareCompilerCapture(root);
  try {const result=run(command[0],command.slice(1),{cwd:root,env:{...env,...capture.environment},stdio:'inherit'});if(result.status===0)capture.finish(env.LITTLE_ISLAND_WORD_IOS_ARTIFACT,env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT);return result;}
  finally {capture.cleanup();}
}
export function verifyCompilerCapture(root,ios,path=process.env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT) {
  requireThat(path,'Native compiler capture required in LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT');
  const file=privatePath(path),bytes=readFileSync(file),record=JSON.parse(bytes),current=compilerIdentity(root);
  requireThat(record.schemaVersion===1 && digest(record.compiler)===digest(current),'Native Hermes compiler identity/version mismatch');
  requireThat(digest(record.bytecodeFiles)===digest(bytecodeFiles(ios)),'Native Hermes compiler artifact mismatch');
  return {path:file,sha256:sha256(bytes),compiler:current};
}
