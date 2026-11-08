#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireThat } from './core.mjs';

/** Produce and verify a receipt against the artifacts the delivery command uses. */
export function gateDelivery(cwd=process.cwd(),env=process.env,run=spawnSync) {
  const web=env.LITTLE_ISLAND_WORD_WEB_ARTIFACT,ios=env.LITTLE_ISLAND_WORD_IOS_ARTIFACT,receipt=env.LITTLE_ISLAND_WORD_RELEASE_RECEIPT;
  requireThat(web && ios && receipt,'Delivery requires LITTLE_ISLAND_WORD_WEB_ARTIFACT, LITTLE_ISLAND_WORD_IOS_ARTIFACT and a new LITTLE_ISLAND_WORD_RELEASE_RECEIPT');
  for(const [script,args] of [['check:words:release',[web,ios,receipt]],['check:words:receipt',[receipt,web,ios]]]) {
    const result=run('npm',['run',script,'--',...args],{cwd,env,stdio:'inherit'});
    requireThat(!result.error && result.status===0,`Delivery blocked by ${script}`);
  }
}
export function deliver(platform,command,cwd=process.cwd(),env=process.env,run=spawnSync) {
  requireThat(['web','ios'].includes(platform) && command.length>0,'delivery.mjs <web|ios> -- <delivery command...>');
  gateDelivery(cwd,env,run);
  // Receipt validation is the last step before the configured delivery action.
  const result=run(command[0],command.slice(1),{cwd,env,stdio:'inherit'});
  return result.status??1;
}
if(process.argv[1] && realpathSync(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const [platform,...args]=process.argv.slice(2);process.exitCode=deliver(platform,args[0]==='--'?args.slice(1):args);}
  catch(e){console.error(e.message);process.exitCode=1;}
}
