import { Buffer } from 'node:buffer';
import ts from 'typescript';
import { wordTokens } from './density.mjs';
import { requireThat } from './core.mjs';

export const hermesMagic = Buffer.from('c61fbc03c103191f', 'hex');

/** HBC v98: read each string by its table entry, never concatenated storage.
 * Layout: facebook/hermes BytecodeFileFormat.h (SmallFuncHeader, string tables).
 * Fail closed when the compiler changes its format. Includes identifier strings:
 * a literal can share an identifier ID, and leaked object keys must stay visible.
 */
export function hermesStrings(bytes, options={}) {
  requireThat(bytes.length >= 128 && bytes.subarray(0, 8).equals(hermesMagic), 'Invalid Hermes header');
  requireThat(bytes.readUInt32LE(8) === 98, 'Unsupported Hermes bytecode version');
  requireThat(bytes.readUInt32LE(32) === bytes.length, 'Invalid Hermes file length');
  const functions = bytes.readUInt32LE(40), kinds = bytes.readUInt32LE(44), identifiers = bytes.readUInt32LE(48);
  const count = bytes.readUInt32LE(52), overflows = bytes.readUInt32LE(56), storageSize = bytes.readUInt32LE(60);
  const table = 128 + functions * 12 + kinds * 4 + identifiers * 4;
  const overflow = table + count * 4, storage = overflow + overflows * 8;
  requireThat(storage + storageSize <= bytes.length, 'Invalid Hermes string tables');
  const strings = [];
  // Each kind run encodes its count in 31 low bits; the high bit marks identifiers.
  const identifierIds=new Set(),runs=[];let cursor=0;
  for(let i=0;i<kinds;i++) {const run=bytes.readUInt32LE(128+functions*12+i*4),length=run&0x7fffffff;runs.push({start:cursor,length,identifier:run>>>31});cursor+=length;}
  // Validate all counts before allocating identifier ranges. This also rejects
  // oversized intermediate runs without an overlapping, redundant predicate.
  requireThat(cursor===count,'Invalid Hermes string kind coverage');
  if(options.identifiers===false)for(const run of runs)if(run.identifier)for(let id=run.start;id<run.start+run.length;id++)identifierIds.add(id);
  for (let i = 0; i < count; i++) {
    const entry = bytes.readUInt32LE(table + i * 4), utf16 = entry & 1;
    let offset = (entry >>> 1) & 0x7fffff, length = entry >>> 24;
    if (length === 255) {
      requireThat(offset < overflows, 'Invalid Hermes overflow string');
      length = bytes.readUInt32LE(overflow + offset * 8 + 4);
      offset = bytes.readUInt32LE(overflow + offset * 8);
    }
    const size = length * (utf16 ? 2 : 1);
    requireThat(offset + size <= storageSize, 'Invalid Hermes string range');
    if(options.identifiers!==false || !identifierIds.has(i))strings.push(bytes.subarray(storage + offset, storage + offset + size).toString(utf16 ? 'utf16le' : 'latin1'));
  }
  return strings;
}

/** The parser decodes escapes and template segments, and excludes variables,
 * member names, regex bodies and comments from the blocked-word content view.
 * Property names and comments remain in the partial-list leak view; only literals supply displayed-word checks.
 */
export function javascriptStrings(text, teachings=[]) {
  const tree = ts.createSourceFile('artifact.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  requireThat(tree.parseDiagnostics.length === 0, 'Cannot parse exported JavaScript');
  const strings = [], keys = [], units = [], grids = [], sensitiveStrings=[], sensitiveGrids=[],decodedRanges=[];
  const propertyName=n=>n && (ts.isIdentifier(n)||ts.isStringLiteralLike(n))?n.text:undefined;
  function attachment(node) {
    let id,scope=false,field,record;
    for(let p=node.parent;p;p=p.parent) {
      if(ts.isFunctionLike(p))break;
      if(ts.isPropertyAssignment(p))field??=propertyName(p.name);
      if(ts.isObjectLiteralExpression(p) && !record) {
        const property=p.properties.find(v=>ts.isPropertyAssignment(v)&&propertyName(v.name)==='id'&&ts.isStringLiteralLike(v.initializer));
        if(property) {id=property.initializer.text;record=p;}
      }
      if(record && ts.isArrayLiteralExpression(p) && p.elements.includes(record) && ts.isPropertyAssignment(p.parent) && ['items','index'].includes(propertyName(p.parent.name))) {
        scope=catalogShape(p.parent.parent);break;
      }
    }
    return {ids:id?[id]:[],scope,field};
  }
  function catalogShape(n) {
    if(!ts.isObjectLiteralExpression(n))return false;
    const names=new Set(n.properties.filter(ts.isPropertyAssignment).map(p=>propertyName(p.name)));
    return ['items','index','preview','bytes','fixtures'].every(key=>names.has(key));
  }
  function addUnit(values,node) {values.library=attachment(node);values.origin={kind:ts.SyntaxKind[node.kind],offset:node.getStart(tree)};units.push(values);}
  function addCompact(values,node){values.compact=true;addUnit(values,node);}
  const comments=new Map();
  function recordComments(pos) {
    for(const range of [...(ts.getLeadingCommentRanges(text,pos)??[]),...(ts.getTrailingCommentRanges(text,pos)??[])]) comments.set(range.pos,text.slice(range.pos,range.end));
  }
  function visit(node) {
    recordComments(node.pos);recordComments(node.end);
    // A container owns its immediate data, never strings in other records,
    // nested containers, callbacks or functions elsewhere in the bundle.
    if (ts.isArrayLiteralExpression(node)) {
      const values=node.elements.map(n=>staticData(n));
      addUnit(plainEntries(values),node);
      const compact=compactEntries(values);if(JSON.stringify(compact)!==JSON.stringify(plainEntries(values)))addCompact(compact,node);
      for(const unit of recordUnits(values))addCompact(unit,node);
      const wordUnit=plainEntries(values);wordUnit.library=attachment(node);
      let container=node.parent,language,puzzle=false,languagePresent=false;
      while(container && !ts.isFunctionLike(container)) {if(ts.isObjectLiteralExpression(container)){const value=staticData(container);languagePresent ||= tagKeys.some(key=>key in value);language??=value.language??value.lang??value.locale??value.languages;puzzle ||= /(?:word.?search|crossword|word.?grid|builder|scramble)/i.test(value.kind??value.family??'');}container=container.parent;}
      const field=ts.isBinaryExpression(node.parent)&&ts.isPropertyAccessExpression(node.parent.left)?node.parent.left.name.text:wordUnit.library.field;
      const gridValue={[field??'unknown']:values};
      for(const grid of values.every(row=>typeof row==='string'||Array.isArray(row)&&row.every(cell=>typeof cell==='string'))?letterGrids(gridValue,validLanguage(language)||puzzle):[]){grid.wordUnit=wordUnit;grid.language=language;grid.container=field;grid.offset=node.getStart(tree);grid.puzzle=puzzle;grid.languagePresent=languagePresent;grid.languageDeclared=validLanguage(language);grids.push(grid);}
    }
    if(ts.isObjectLiteralExpression(node)) {const value=staticData(node);if(tagged(value)){sensitiveStrings.push(...chamoruValues(value,false,teachings));sensitiveGrids.push(...chamoruGrids(value));}}
    if(ts.isObjectLiteralExpression(node))for(const unit of objectUnits(staticData(node)))addCompact(unit,node);
    if(ts.isTemplateExpression(node))addCompact([[node.head.text,...node.templateSpans.map(span=>span.literal.text)].join(' ')],node);
    if(ts.isBlock(node)) {
      const names=[];function enumKeys(n){if(ts.isBinaryExpression(n) && n.operatorToken.kind===ts.SyntaxKind.EqualsToken && ts.isElementAccessExpression(n.left) && ts.isBinaryExpression(n.left.argumentExpression) && ts.isStringLiteralLike(n.right))names.push(n.right.text);if(!ts.isFunctionLike(n))ts.forEachChild(n,enumKeys);}enumKeys(node);if(names.length)addCompact(names,node);
    }
    if(ts.isCaseBlock(node))addCompact(node.clauses.filter(ts.isCaseClause).map(c=>staticData(c.expression)).filter(shortWords),node);
    if(ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken,ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind) && !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind===node.operatorToken.kind)) {
      const labels=[];function comparisons(n){if(ts.isStringLiteralLike(n))labels.push(n.text);ts.forEachChild(n,comparisons);}comparisons(node);addCompact(labels,node);
    }
    // Homogeneous short-word keys can encode a list (including library tables).
    if (ts.isObjectLiteralExpression(node) && node.properties.length && node.properties.every(p=>ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) && shortWords(p.name.text) && (ts.isNumericLiteral(p.initializer) || [ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(p.initializer.kind)))) addUnit(node.properties.map(p=>p.name.text),node);
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {strings.push(node.text);decodedRanges.push({start:node.getStart(tree),end:node.end,text:node.text});
      if(chamoruCharacters(node.text)) {
        let parent=node.parent;while(parent && !ts.isObjectLiteralExpression(parent) && !ts.isFunctionLike(parent))parent=parent.parent;
        if(!parent || !ts.isObjectLiteralExpression(parent) || !approvedTeaching(staticData(parent),teachings))sensitiveStrings.push(node.text);
      }
    }
    if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) && ts.isIdentifier(node.name) && /^\p{L}+$/u.test(node.name.text)) keys.push(node.name.text);
    if (ts.isRegularExpressionLiteral(node)) keys.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  keys.push(...comments.values());
  let cursor=0,densitySource='';
  for(const range of decodedRanges.sort((a,b)=>a.start-b.start)){densitySource+=text.slice(cursor,range.start)+' '+range.text+' ';cursor=range.end;}densitySource+=text.slice(cursor);
  return { strings, keys, units, grids, sensitiveStrings, sensitiveGrids, densitySource };
}

export function jsonStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, v]) => [key, ...jsonStrings(v)]);
  return [];
}

/** A lone letter cannot spell a multi-letter word; other matrix shapes stay declared. */
export function singleLetterMatrix(value) {
  return Array.isArray(value) && value.length===1 && Array.isArray(value[0]) && value[0].length===1 && typeof value[0][0]==='string' && /^\p{L}$/u.test(value[0][0]);
}

/** Detect actual letter matrices, including digraph cells and row strings.
 * Grid scanning deliberately has no word boundaries: adjacent cells form words.
 */
export function letterGrids(value, declared=false) {
  const grids = [];
  function visit(x,key,active=declared) {
    if (!x || typeof x !== 'object') return;
    if(!Array.isArray(x))active ||= tagKeys.some(name=>validLanguage(x[name]));
    if (Array.isArray(x)) {
      if(x.length>=3 && x.every(c=>typeof c==='string' && /^(?:CH|NG|[A-ZÅÑ])$/u.test(c))) {
        const grid=[x.map(c=>c.toUpperCase())];grid.languageDeclared=active;grid.container=key;grid.supplemental=true;grids.push(grid);return;
      }
      const supplemental=!active && !/^(?:cells|grid|board|rows)$/i.test(key??'') && x.length>=2 && x.every(row=>typeof row==='string' && /^[A-ZÅÑ]{3,25}$/u.test(row) && row.length===x[0].length);
      const rows=x.map(row=>typeof row==='string' && (active || supplemental || /^(?:cells|grid|board|rows)$/i.test(key??''))?[...row]:row);
      const cell=c=>typeof c==='string' && (/^(?:CH|NG|[A-ZÅÑʼ’']|[^\p{L}]|)$/iu.test(c) || rows.length===1 && rows[0]?.length===1 && /^[\p{L}ʼ’']+$/u.test(c));
      if(rows.length && rows.length<=25 && rows.every(row=>Array.isArray(row) && row.length>0 && row.length<=25 && row.length===rows[0].length && row.every(cell)) && rows.flat().some(c=>/\p{L}/u.test(c))) {
        const grid=rows.map(row=>row.map(c=>/\p{L}/u.test(c)?c.toUpperCase().replace(/[ʼ’]/g,"'"):/['ʼ’]/.test(c)?"'":'#'));grid.languageDeclared=active;grid.container=key;grid.supplemental=supplemental;grids.push(grid);
      } else x.forEach(child=>visit(child,key,active));
    } else Object.entries(x).forEach(([name,child])=>visit(child,name,active));
  }
  visit(value);return grids;
}

// Ignore odd entries without dropping the plain-word portion of a list.
export function plainEntries(values) {
  return values.flatMap(value=>{
    if(shortWords(value))return [value];
    if(value && !Array.isArray(value) && typeof value==='object' && Object.keys(value).length===1)return Object.values(value).filter(shortWords);
    return [];
  });
}
// New encoding views are strict only for compact concentrations; the global
// density windows independently cover larger fragments. Ordinary app catalogs
// contain isolated broad English words across many records.
function compactEntries(values) {
  return values.flatMap(value=>{
    if(shortWords(value))return [value];
    if(Array.isArray(value))return compactEntries(value);
    if(typeof value==='string') {
      const word=value.replace(/^\w+:/,'').replace(/\.[a-z0-9]{1,8}$/i,'').replace(/[-_]?\d+$/,'');
      if(/^\p{L}+$/u.test(word))return [word];
    }
    return [];
  });
}
const staticDataCache=new WeakMap();
function staticData(n) {
  if(!n)return undefined;
  if(staticDataCache.has(n))return staticDataCache.get(n);
  let value;
  if(ts.isStringLiteralLike(n))value=n.text;
  else if(ts.isNumericLiteral(n))value=Number(n.text);
  else if(n.kind===ts.SyntaxKind.TrueKeyword || n.kind===ts.SyntaxKind.FalseKeyword)value=n.kind===ts.SyntaxKind.TrueKeyword;
  else if(ts.isArrayLiteralExpression(n))value=n.elements.map(staticData);
  else if(ts.isObjectLiteralExpression(n))value=Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText().replace(/^['"]|['"]$/g,''),staticData(p.initializer)]));
  staticDataCache.set(n,value);return value;
}

/** Metro-generated asset URIs and digest identifiers are not spoken/display text.
 * Keep their original bytes in the unconditional leak view.
 */
export function technicalString(text) {
  return /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(text)
    || /^[a-f0-9]{16,64}$/i.test(text)
    || /^assets\/[a-f0-9]{32}$/i.test(text)
    || /^(?:\.?\/)?(?:assets\/)+[^\s]*[.-][a-f0-9]{32}\.(?:m4a|mp3|wav|png|jpe?g|webp|gif|svg|ttf|woff2?|lipuzzle)$/i.test(text)
    || /^\/?_expo\/static\/js\/[^\s]*-[a-f0-9]{32}\.(?:js|hbc)$/i.test(text);
}

export function htmlViews(text,teachings=[]) {
  // HTML shell content, accessible text attributes and inline script literals.
  const strings=[],keys=[],units=[],grids=[],sensitiveStrings=[],sensitiveGrids=[];
  for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if(match[1].trim()) {const parsed=javascriptStrings(match[1],teachings),worklets=workletStrings(parsed.strings);grids.push(...parsed.grids,...worklets.grids);sensitiveStrings.push(...parsed.sensitiveStrings,...worklets.sensitiveStrings);sensitiveGrids.push(...parsed.sensitiveGrids,...worklets.sensitiveGrids);strings.push(...worklets.strings);keys.push(...parsed.keys,...worklets.keys);units.push(...parsed.units,...worklets.units);}
  const visible=text.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'');
  for(const match of visible.matchAll(/\b(?:alt|title|aria-label|placeholder|content|value)\s*=\s*["']([^"']*)["']/gi)) strings.push(match[1]);
  for(const match of visible.matchAll(/>([^<]+)</g)) strings.push(match[1]);
  return {strings,keys,units,grids,sensitiveStrings,sensitiveGrids};
}

/** Inline vectors contain XML syntax rather than one displayed sentence.
 * Keep each visible label, attribute list and comment as its own unit.
 */
export function isSvgDocument(text) {
  return /^\s*(?:<\?xml[^>]*>\s*)?<svg\b[\s\S]*<\/svg>\s*$/i.test(text)
    || /^\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*\/>\s*$/i.test(text);
}
export function svgViews(text,teachings=[]) {
  requireThat(isSvgDocument(text),'Cannot parse embedded SVG');
  const parsed=htmlViews(text,teachings);
  for(const match of text.matchAll(/\b[\w:-]+\s*=\s*["']([^"']*)["']/g))parsed.keys.push(match[1]);
  for(const match of text.matchAll(/<!--([\s\S]*?)-->/g))parsed.keys.push(match[1]);
  const language=text.match(/\b(?:xml:)?lang\s*=\s*["']([^"']+)["']/i)?.[1];
  if(chamoru(language))parsed.sensitiveStrings.push(...parsed.strings);
  return parsed;
}

/** Reanimated serializes complete functions into string literals. Scan their
 * source as code too, so identifier text is never mistaken for UI vocabulary.
 */
export function workletStrings(strings, depth=0) {
  const output=[],keys=[],units=[],grids=[],sensitiveStrings=[],sensitiveGrids=[];
  for(const text of strings) {
    if(depth<4 && /^function(?:\s|\()/.test(text) && /}\s*$/.test(text)) {
      const source='('+text+')';
      const tree=ts.createSourceFile('worklet.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      if(tree.parseDiagnostics.length===0) {
        const parsed=javascriptStrings(source),nested=workletStrings(parsed.strings,depth+1);
        grids.push(...parsed.grids,...nested.grids);sensitiveStrings.push(...parsed.sensitiveStrings,...nested.sensitiveStrings);sensitiveGrids.push(...parsed.sensitiveGrids,...nested.sensitiveGrids);output.push(...nested.strings);keys.push(...parsed.keys,...nested.keys);units.push(...parsed.units,...nested.units);continue;
      }
    }
    output.push(text);
  }
  return {strings:output,keys,units,grids,sensitiveStrings,sensitiveGrids};
}

/** Decoded payload values are content. Object field names and the validated
 * puzzle-kind discriminator are codec metadata, rather than displayed words.
 */
export function puzzleStrings(value) {
  if(typeof value==='string')return [value];
  if(Array.isArray(value))return value.flatMap(puzzleStrings);
  if(value && typeof value==='object')return Object.entries(value).filter(([key])=>key!=='kind').flatMap(([,v])=>puzzleStrings(v));
  return [];
}

/** One JSON container at a time; sibling records never form a list fragment. */
function objectUnits(value) {
  if(!value || Array.isArray(value) || typeof value!=='object')return [];
  const keys=Object.keys(value),values=Object.values(value);
  return [...(keys.length>=3 && keys.every(shortWords) && values.every(v=>typeof v===typeof values[0] && typeof v==='string')?[keys]:[]),...(values.length>=3 && !keys.some(key=>['id','label','title','description','text'].includes(key)) && values.every(shortWords)?[values]:[])];
}
function recordUnits(values) {
  if(values.length<3 || !values.every(v=>v && !Array.isArray(v) && typeof v==='object'))return [];
  const keys=Object.keys(values[0]).sort();
  if(keys.some(key=>['id','label','title','description','text','terms','sounds'].includes(key)))return [];
  if(!values.every(v=>JSON.stringify(Object.keys(v).sort())===JSON.stringify(keys)))return [];
  return keys.map(key=>values.map(v=>v[key])).filter(unit=>unit.every(shortWords) && new Set(unit).size===unit.length);
}
export function jsonUnits(value, context={ids:[],scope:false}) {
  if (!value || typeof value !== 'object') return [];
  const direct=Array.isArray(value)?plainEntries(value):(Object.entries(value).every(([k,v])=>shortWords(k) && ['number','boolean'].includes(typeof v))?Object.keys(value):[]);
  const ids=typeof value.id==='string'?[value.id]:context.ids;
  const unit=[...direct];unit.library={ids,scope:context.scope,field:context.field};
  const catalog=!Array.isArray(value) && ['items','index','preview','bytes','fixtures'].every(key=>key in value);
  const compact=Array.isArray(value)?compactEntries(value):[];
  const added=[...(JSON.stringify(compact)!==JSON.stringify(direct)?[compact]:[]),...(Array.isArray(value)?recordUnits(value):objectUnits(value))].map(entry=>{entry.compact=true;entry.library=unit.library;return entry;});
  return [unit,...added,...Object.entries(value).flatMap(([key,v])=>jsonUnits(v,{ids,scope:catalog && ['items','index'].includes(key) || context.scope && (Array.isArray(value) || typeof value.id==='string' && ['terms','sounds'].includes(key)),field:Array.isArray(value)?context.field:key}))];
}

export const chamoru = value => typeof value==='string' && /^(?:ch(?:-|$)|cha$|chamoru$|chamorro$)/i.test(value.trim());
export function validLanguage(value) {
  return typeof value==='string' ? value.trim().length>0 : Array.isArray(value) && value.length>0 && value.every(entry=>typeof entry==='string' && entry.trim().length>0);
}
export const chamoruCharacters = text => /[åʼ]/iu.test(text.normalize('NFC')) || /\p{L}’(?!(?:s|t|re|ll|ve|d|m)\b)\p{L}|(?!s)\p{L}’(?!\p{L})/iu.test(text.normalize('NFC'));
const tagKeys=['language','lang','locale','languages'];
function tagged(value) {return tagKeys.some(key=>Array.isArray(value[key])?value[key].some(chamoru):chamoru(value[key]));}
export function approvedTeaching(value, teachings) {
  return value && !Array.isArray(value) && Object.values(value).every(v=>typeof v==='string') && !Object.keys(value).some(key=>['kind','cells','grid','board','rows','words','spelling'].includes(key)) && teachings.some(entry=>entry.id===value.id && entry.term===value.term && JSON.stringify(Object.entries(entry.fields).sort())===JSON.stringify(Object.entries(value).sort()));
}
export function chamoruValues(value, active=false, teachings=[]) {
  if(typeof value==='string')return active||chamoruCharacters(value)?[value]:[];
  if(Array.isArray(value))return value.flatMap(v=>chamoruValues(v,active,teachings));
  if(!value || typeof value!=='object')return [];
  if(Object.keys(value).some(key=>/^(?:label|title|text|term|example|words|speech|spelling|cells|grid|board|rows)$/.test(key)) && tagKeys.some(key=>key in value))requireThat(tagKeys.filter(key=>key in value).every(key=>validLanguage(value[key])),'Unresolved JSON content language tag');
  if(approvedTeaching(value,teachings))return [];
  return Object.entries(value).flatMap(([key,v])=>[...(tagged(value)||active||chamoruCharacters(key)?[key]:[]),...chamoruValues(v,tagged(value)||active,teachings)]);
}

/** Resolve local static constants, shorthand and spreads without evaluating code.
 * Unresolved language on content records rejects; runtime option objects with no
 * authored text are not language declarations for a content surface.
 */
export function chamoruSource(text, name) {
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,/\.tsx$/.test(name)?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  requireThat(tree.parseDiagnostics.length===0,'Cannot parse CHamoru content source');
  const strings=[],grids=[],teachingEntries=[],declarations=new Map();
  function collect(n) {if(ts.isParameter(n)&&ts.isIdentifier(n.name))declarations.set(n.name.text,null);if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer)declarations.set(n.name.text,declarations.has(n.name.text)?null:n.initializer);ts.forEachChild(n,collect);}
  collect(tree);
  const unknown=Symbol('dynamic');
  function data(n,seen=new Set()) {
    if(!n)return unknown;
    if(ts.isStringLiteralLike(n))return n.text;
    if(ts.isNumericLiteral(n))return Number(n.text);
    if(ts.isAsExpression(n)||ts.isSatisfiesExpression(n)||ts.isParenthesizedExpression(n))return data(n.expression,seen);
    if(ts.isIdentifier(n)&&declarations.get(n.text)&&!seen.has(n.text))return data(declarations.get(n.text),new Set([...seen,n.text]));
    if(ts.isArrayLiteralExpression(n))return n.elements.map(v=>data(v,seen));
    if(ts.isObjectLiteralExpression(n)) {
      const value={};
      for(const p of n.properties) {
        if(ts.isSpreadAssignment(p)) {const spread=data(p.expression,seen);if(spread && typeof spread==='object' && !Array.isArray(spread))Object.assign(value,spread);else value.__unknownSpread=unknown;}
        else if(ts.isPropertyAssignment(p))value[p.name.getText(tree).replace(/^['"]|['"]$/g,'')]=data(p.initializer,seen);
        else if(ts.isShorthandPropertyAssignment(p))value[p.name.text]=data(p.name,seen);
      }
      return value;
    }
    return unknown;
  }
  const namedTeaching=/src\/learn\/content\/chamoru[^/]*\.[jt]sx?$/.test(name);
  const teaching=namedTeaching||/\bChamoruWord\b/.test(text)||/src\/learn\//.test(name) && /["']?term["']?\s*:/.test(text) && /["']?english["']?\s*:/.test(text);
  function visit(n) {
    if(namedTeaching && ts.isPropertyAssignment(n))requireThat(ts.isStringLiteral(n.initializer), 'blocked CHamoru teaching fields must be plain string literals');
    if(teaching && ts.isObjectLiteralExpression(n)) {
      const fields=data(n);if('term' in fields) {
        requireThat(typeof fields.term==='string','CHamoru teaching term must be static text');
        requireThat(n.properties.every(p=>ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)), 'blocked CHamoru teaching fields must be plain string literals');
        teachingEntries.push({id:fields.id,term:fields.term,fields,strings:jsonStrings(fields),grids:letterGrids(fields)});return;
      }
    }
    if(ts.isStringLiteralLike(n) && (teaching||chamoruCharacters(n.text)))strings.push(n.text);
    if(ts.isObjectLiteralExpression(n)) {
      const value=data(n),hasText=Object.keys(value).some(key=>/^(?:label|title|text|term|example|words|speech|spelling|cells|grid|board|rows)$/.test(key));
      if(hasText && tagKeys.some(key=>key in value))requireThat(tagKeys.filter(key=>key in value).every(key=>validLanguage(value[key])),'Unresolved content language tag');
      if(tagged(value)) {
        requireThat(!('__unknownSpread' in value),'Unresolved spread in tagged content');
        strings.push(...chamoruValues(value));grids.push(...letterGrids(value));
      }
    }
    ts.forEachChild(n,visit);
  }
  visit(tree);return {strings,grids,teachingEntries};
}

export function teachingRecordData(value) {
  return !!value && typeof value==='object' && (!Array.isArray(value) && 'term' in value && 'english' in value || Object.values(value).some(teachingRecordData));
}
export function teachingJSON(value) {
  const teachingEntries=[],strings=[];
  function visit(v) {
    if(typeof v==='string'){strings.push(v);return;}
    if(!v || typeof v!=='object')return;
    if(!Array.isArray(v) && 'term' in v) {
      requireThat(Object.values(v).every(field=>typeof field==='string'), 'blocked CHamoru teaching fields must be plain string literals');
      teachingEntries.push({id:v.id,term:v.term,fields:v,strings:jsonStrings(v),grids:letterGrids(v)});return;
    }
    Object.values(v).forEach(visit);
  }
  visit(value);return {strings,grids:[],teachingEntries};
}

export function chamoruGrids(value, active=false) {
  if(!value || typeof value!=='object')return [];
  if(!Array.isArray(value))active||=tagged(value);
  if(active)return letterGrids(value);
  return Object.values(value).flatMap(v=>chamoruGrids(v));
}

export function requireGridLanguages(value, language, key, puzzle=false) {
  if(!value || typeof value!=='object')return;
  puzzle ||= /(?:word.?search|crossword|word.?grid|builder|scramble)/i.test(value.kind??value.family??'');
  if(!Array.isArray(value) && tagKeys.some(key=>key in value))requireThat(tagKeys.filter(key=>key in value).every(key=>validLanguage(value[key])),'Invalid grid language declaration');
  const declared=Array.isArray(value)?language:(value.language??value.lang??value.locale??value.languages??language);
  if(puzzle && Array.isArray(value) && value.every(row=>typeof row==='string') && letterGrids(value,true).length)requireThat(/^(?:cells|grid|board|rows)$/i.test(key??'') || declared!==undefined,'Puzzle grid needs a recognised container or language declaration');
  if(letterGrids(key?{[key]:value}:value,validLanguage(declared)).some(grid=>!grid.supplemental)) {
    // A child declaration can supply its own grid's language.
    if(Array.isArray(value) && value.every(row=>typeof row==='string'||Array.isArray(row)&&row.every(c=>typeof c==='string')) && !(singleLetterMatrix(value) && !puzzle && declared===undefined && !/^(?:cells|grid|board|rows)$/i.test(key??'')))requireThat(/^(?:cells|grid|board|rows)$/i.test(key??'') || validLanguage(declared),'Grid needs a recognised container or language declaration');
  }
  Object.entries(value).forEach(([name,v])=>requireGridLanguages(v,declared,Array.isArray(value)?key:name,puzzle));
}

/** Lists contain short words, not identifiers, paths, sentences or UI records.
 * Three distinct broad terms remain the threshold, even in a long short-word
 * array: lowering it would reject ordinary pairs without adding leak evidence.
 */
export function shortWords(text) {
  if(typeof text==='string')text=text.normalize('NFKC').replace(/\p{Default_Ignorable_Code_Point}/gu,'');
  return typeof text==='string' && text.length<=64 && /^[\p{L}\p{M}]+(?:['’'-][\p{L}\p{M}]+)*(?:[ ]+[\p{L}\p{M}]+(?:['’'-][\p{L}\p{M}]+)*)?$/u.test(text.trim());
}
export function listString(text, excluded=[]) {
  const trimmed=text.trim().replace(/^\/\/\s*|^\/\*\s*|\s*\*\/$/g,'').replace(/^\/(.*)\/[a-z]*$/s,'$1');
  try {const decoded=JSON.parse(trimmed);if(decoded && typeof decoded==='object')return jsonUnits(decoded).some(unit=>unit.length>=3);}catch { /* Text list. */ }
  const words=trimmed.replace(/\\[bBdDsSwW]|\(\?:/g,' ').split(/[\s,|;_]+/).map(word=>word.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu,'')).filter(shortWords);
  if(words.length<3)return false;
  if(/[,|;\n\t_]/.test(trimmed)) {
    const parts=trimmed.split(/[,|;\n\t_]+/).map(part=>part.trim().replace(/^\d+[.)]\s*/,'').replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu,''));
    if(parts.filter(shortWords).length>=3)return true;
  }
  const functions=safeFunctionWords(excluded),flags=words.map(word=>functions.has(word.toLowerCase()));
  let switches=0;for(let i=1;i<flags.length;i++)if(flags[i]!==flags[i-1])switches++;
  const sentence=words.length>=5 && switches>=3 && (policyShare(words,excluded)<0.5 || /\b(?:is|are|was|were|be|does|do|did|has|have|had|can|could|will|would)\b/i.test(trimmed)) && new Set(words.filter((_,i)=>flags[i]).map(word=>word.toLowerCase())).size>=2;
  return !sentence;
}

// Public English grammar vocabulary. It is disjoint from the current private
// broad/core lists; runtime subtraction keeps that invariant under policy drift.
export const functionWords = ["a", "an", "the", "and", "or", "of", "in", "on", "as", "is", "it", "its", "how", "why", "does", "into", "with", "at", "by", "for", "from", "to", "than", "that", "this", "these", "those", "are", "was", "were", "be", "been", "being", "can", "could", "do", "did", "has", "have", "had", "if", "not", "only", "our", "their", "them", "we", "you", "your", "which", "who", "what", "when", "where", "while", "will", "would"];
const normalizedPolicyCache=new WeakMap();
function policyShare(words, excluded) {
  const functions=safeFunctionWords(excluded);
  let policy=normalizedPolicyCache.get(excluded);if(!policy){policy=new Set(excluded.flatMap(wordTokens));normalizedPolicyCache.set(excluded,policy);}
  const content=words.flatMap(wordTokens).filter(word=>!functions.has(word.toLowerCase()));
  return content.filter(word=>policy.has(word)).length/Math.max(1,content.length);
}
const grammarCache=new WeakMap();
function safeFunctionWords(excluded) {
  if(grammarCache.has(excluded))return grammarCache.get(excluded);
  const forbidden=new Set(excluded.map(w=>w.toLowerCase()));
  const safe=new Set(functionWords.filter(w=>!forbidden.has(w)));grammarCache.set(excluded,safe);return safe;
}
const broadTokenCache=new WeakMap();
export function proseTokens(strings, excluded=[]) {
  const tokens=strings.flatMap(text=>wordTokens(text.replace(/['’]s\b/gi,'')).map(w=>w.toLowerCase())),functions=safeFunctionWords(excluded);
  const flags=tokens.map(token=>functions.has(token));
  // Require sentence-like interleaving, never a prefix/suffix cluster or repeated
  // article affixes. Broad vocabulary must be under 20% of content tokens.
  const content=tokens.filter((_,i)=>!flags[i]);
  let broad=broadTokenCache.get(excluded);if(!broad){broad=new Set(excluded.map(w=>w.toLowerCase()));broadTokenCache.set(excluded,broad);}
  const hits=content.filter(token=>broad.has(token)).length;
  let switches=0;for(let i=1;i<flags.length;i++)if(flags[i]!==flags[i-1])switches++;
  return tokens.length>=12 && flags.filter(Boolean).length/tokens.length>=0.25 && switches>=5 && hits/Math.max(1,content.length)<0.2;

}

/** Provenance is structural and item-local. A matching token elsewhere in the
 * Library, an unattached array, or a generated terms/sounds field alone cannot
 * manufacture authored provenance. Exact/core checks are independent of this.
 */
export function tracedLibraryUnit(unit, library) {
  if(!unit.library?.scope || !['terms','sounds'].includes(unit.library.field))return false;
  return unit.library.ids.some(id=>{
    const source=library.find(row=>row.id===id);
    if(!source)return false;
    const allowed=new Set(unit.library.field==='sounds'?source.sounds:source.tokens);
    return unit.length>0 && unit.every(text=>{
      const tokens=libraryNormalize(text).split(' ').filter(Boolean);
      return tokens.length>0 && tokens.every(token=>allowed.has(token));
    });
  });
}

/** Unknown tokens keep the entire unit strict. Only established body tokens
 * may leave the list view; recognized authored metadata stays as a strict list.
 */
export function untracedLibraryUnit(unit,library) {
  if(!unit.library?.scope || !['terms','sounds'].includes(unit.library.field))return unit;
  const source=library.find(row=>row.id===unit.library.ids[0]);if(!source)return unit;
  const all=new Set(unit.library.field==='sounds'?source.allSounds:source.allTokens);
  if(!unit.every(text=>libraryNormalize(text).split(' ').filter(Boolean).every(token=>all.has(token))))return unit;
  return unit.filter(text=>{const entry=[text];entry.library=unit.library;return !tracedLibraryUnit(entry,library);});
}

// Kept byte-for-byte equivalent to src/library/search.ts normalize. The source
// bridge checks it against the generator for every authored field before use.
export function libraryNormalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim().replace(/\s+/g,' ');
}
