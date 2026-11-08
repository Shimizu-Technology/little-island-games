import {spawnSync} from 'node:child_process';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
export function assertDevConfig(config) {
 if(config.ios?.bundleIdentifier!=='com.shimizutechnology.littleisland.dev'||config.extra?.lagoonMeasurement!==true||config.scheme!=='littleisland-dev')throw new Error('Refusing native build: resolved config is not the isolated .dev app.');
}
export function assertDevNative(projects) {
 for(const text of projects)for(const match of text.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";\s]+)"?\s*;/g))if(match[1]!=='com.shimizutechnology.littleisland.dev')throw new Error('Refusing native build: existing ios project contains a non-dev bundle identifier. Use an isolated checkout with no generated ios directory.');
}
export function main(args=process.argv.slice(2)) {
 const env={...process.env,LITTLE_ISLAND_VARIANT:'development'},cli=require.resolve('expo/bin/cli');
 const run=(args,capture=false)=>{
  const result=spawnSync(process.execPath,[cli,...args],{env,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Expo ${args[0]} failed (${result.status}): ${result.stderr??''}`);
  return result.stdout;
 };
 assertDevConfig(JSON.parse(run(['config','--type','public','--json'],true)));
 const projects=()=>existsSync('ios')?readdirSync('ios').filter(name=>name.endsWith('.xcodeproj')).map(name=>readFileSync(path.join('ios',name,'project.pbxproj'),'utf8')):[];
 assertDevNative(projects());
 // Generate through Expo, with the same enforced variant; never hand-edit native files.
 run(['prebuild','--platform','ios',...(args.includes('--prepare')?['--no-install']:[])]);
 assertDevConfig(JSON.parse(run(['config','--type','public','--json'],true)));assertDevNative(projects());
 if(!args.includes('--prepare'))run(['run:ios',...args]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
