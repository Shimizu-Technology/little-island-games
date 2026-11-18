import ts from 'typescript';
import { transformSync } from '@babel/core';
import expoPreset from 'babel-preset-expo';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { requireThat, sha256 } from './core.mjs';

// Names only: a displayed value, comment or substring cannot supply provenance.
export function identifierPositions(text, name, dependency = false) {
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true),positions=[];
  function visit(node) {
    const parent=node.parent;
    const property=parent && parent.name===node && (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || !dependency && (ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent))) && (!dependency || ts.isObjectLiteralExpression(parent.parent));
    const declaration=!dependency && parent && parent.name===node && (ts.isVariableDeclaration(parent) || ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent) || ts.isEnumDeclaration(parent) || ts.isEnumMember(parent));
    const exported=parent && ts.isExportSpecifier(parent) && parent.name===node;
    const verbatim=ts.isIdentifier(node)?node.getText(tree)===node.text:ts.isStringLiteral(node) && node.getText(tree).slice(1,-1)===node.text;
    if((property || declaration || exported) && verbatim)positions.push({identifier:node.text,offset:node.getStart(tree),line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1});
    ts.forEachChild(node,visit);
  }
  visit(tree);return positions;
}

export function authoredIdentifiers(sourceInputs, passedSources) {
  const identifiers=new Map();
  for(const [path,bytes] of sourceInputs) {
    if(!passedSources.has(path) || !/\.[cm]?[jt]sx?$/.test(path) || !path.startsWith('src/'))continue;
    for(const position of identifierPositions(bytes.toString('utf8'),path))if(!identifiers.has(position.identifier))identifiers.set(position.identifier,{path,sha256:sha256(bytes),...position});
  }
  return identifiers;
}

export function dependencyJavaScript(bytes, name) {
  try {
    return transformSync(bytes.toString('utf8'),{filename:name,configFile:false,babelrc:false,comments:false,presets:[expoPreset],caller:{name:'metro',platform:'ios',supportsStaticESM:true}}).code;
  } catch {throw new Error('Cannot transform dependency identifier source');}
}

function safeFile(root, path) {
  requireThat(typeof path==='string' && path.length>0 && !path.split('/').some(part=>['','.','..'].includes(part)) && !path.includes('\\'),'Invalid dependency identifier path');
  let current=root;
  for(const part of path.split('/')) {current=join(current,part);requireThat(existsSync(current) && !lstatSync(current).isSymbolicLink(),'Missing or symlinked dependency identifier source');}
  requireThat(lstatSync(current).isFile(),'Dependency identifier source must be a file');
  return current;
}

export function dependencyIdentifiers(root, rules, sourcePasses) {
  requireThat(Array.isArray(rules),'Invalid dependency identifier provenance');
  const identifiers=new Map();
  if(!rules.length)return identifiers;
  const lock=JSON.parse(readFileSync(safeFile(root,'package-lock.json'),'utf8'));
  for(const rule of rules) {
    requireThat(rule && typeof rule.package==='string' && /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(rule.package) && typeof rule.version==='string' && rule.version.length>0 && typeof rule.integrity==='string' && /^sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}$/.test(rule.integrity) && typeof rule.identifier==='string' && rule.identifier.length>0 && Number.isSafeInteger(rule.offset) && rule.offset>=0 && typeof rule.reason==='string' && rule.reason.trim().length>0,'Invalid dependency identifier provenance entry');
    const packagePath='node_modules/'+rule.package,locked=lock.packages?.[packagePath];
    requireThat(locked?.version===rule.version,'Stale dependency identifier version');
    requireThat(locked?.integrity===rule.integrity,'Stale dependency identifier integrity');
    const manifest=JSON.parse(readFileSync(safeFile(root,packagePath+'/package.json'),'utf8'));
    requireThat(manifest.name===rule.package && manifest.version===rule.version,'Installed dependency identifier version mismatch');
    const path=packagePath+'/'+rule.path,file=safeFile(root,path),bytes=readFileSync(file);
    requireThat(/\.[cm]?[jt]sx?$/.test(rule.path) && identifierPositions(bytes.toString('utf8'),rule.path,true).some(position=>position.identifier===rule.identifier && position.offset===rule.offset),'Stale dependency identifier position');
    requireThat(sourcePasses(bytes,rule.path),'Dependency identifier source failed scan');
    requireThat(!identifiers.has(rule.identifier),'Duplicate dependency identifier provenance');
    identifiers.set(rule.identifier,{package:rule.package,version:rule.version,integrity:rule.integrity,path:rule.path,offset:rule.offset,sha256:sha256(bytes)});
  }
  return identifiers;
}

// Only the complete basename, verified against these exact bytes, is opaque.
export function ownContentHash(name, bytes) {
  const basename=name.split('/').at(-1),stem=basename.includes('.')?basename.slice(0,basename.lastIndexOf('.')):basename;
  const algorithm={32:'md5',40:'sha1',64:'sha256'}[stem.length];
  return !!algorithm && /^[a-f0-9]+$/.test(stem) && createHash(algorithm).update(bytes).digest('hex')===stem;
}
