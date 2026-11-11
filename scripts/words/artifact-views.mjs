import { Buffer } from 'node:buffer';
import ts from 'typescript';
import { requireThat } from './core.mjs';

export const hermesMagic = Buffer.from('c61fbc03c103191f', 'hex');

/** HBC v98: read each string by its table entry, never concatenated storage.
 * Layout: facebook/hermes BytecodeFileFormat.h (SmallFuncHeader, string tables).
 * Fail closed when the compiler changes its format. Includes identifier strings:
 * a literal can share an identifier ID, and leaked object keys must stay visible.
 */
export function hermesStrings(bytes) {
  requireThat(bytes.length >= 128 && bytes.subarray(0, 8).equals(hermesMagic), 'Invalid Hermes header');
  requireThat(bytes.readUInt32LE(8) === 98, 'Unsupported Hermes bytecode version');
  requireThat(bytes.readUInt32LE(32) === bytes.length, 'Invalid Hermes file length');
  const functions = bytes.readUInt32LE(40), kinds = bytes.readUInt32LE(44), identifiers = bytes.readUInt32LE(48);
  const count = bytes.readUInt32LE(52), overflows = bytes.readUInt32LE(56), storageSize = bytes.readUInt32LE(60);
  const table = 128 + functions * 12 + kinds * 4 + identifiers * 4;
  const overflow = table + count * 4, storage = overflow + overflows * 8;
  requireThat(storage + storageSize <= bytes.length, 'Invalid Hermes string tables');
  const strings = [];
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
    strings.push(bytes.subarray(storage + offset, storage + offset + size).toString(utf16 ? 'utf16le' : 'latin1'));
  }
  return strings;
}

/** The parser decodes escapes and template segments, and excludes variables,
 * member names, regex bodies and comments from the blocked-word content view.
 * Property names and comments remain in the partial-list leak view; only literals supply displayed-word checks.
 */
export function javascriptStrings(text) {
  const tree = ts.createSourceFile('artifact.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  requireThat(tree.parseDiagnostics.length === 0, 'Cannot parse exported JavaScript');
  const strings = [], keys = [], units = [];
  const propertyName=n=>n && (ts.isIdentifier(n)||ts.isStringLiteralLike(n))?n.text:undefined;
  function attachment(node) {
    const ids=[];let scope=false,field;
    for(let p=node.parent;p;p=p.parent) {
      if(ts.isFunctionLike(p))break;
      if(ts.isPropertyAssignment(p)) {const name=propertyName(p.name);field??=name;scope ||= ['items','index'].includes(name);}
      if(ts.isObjectLiteralExpression(p)) {
        const id=p.properties.find(v=>ts.isPropertyAssignment(v)&&propertyName(v.name)==='id'&&ts.isStringLiteralLike(v.initializer));
        if(id)ids.push(id.initializer.text);
      }
    }
    return {ids,scope,field};
  }
  function addUnit(values,node) {values.library=attachment(node);units.push(values);}
  const comments=new Map();
  function recordComments(pos) {
    for(const range of [...(ts.getLeadingCommentRanges(text,pos)??[]),...(ts.getTrailingCommentRanges(text,pos)??[])]) comments.set(range.pos,text.slice(range.pos,range.end));
  }
  function visit(node) {
    recordComments(node.pos);recordComments(node.end);
    // A container owns its immediate data, never strings in other records,
    // nested containers, callbacks or functions elsewhere in the bundle.
    if (ts.isArrayLiteralExpression(node) && node.elements.length && node.elements.every(ts.isStringLiteralLike) && node.elements.every(n=>shortWords(n.text))) addUnit(node.elements.map(n=>n.text),node);
    // Homogeneous short-word keys can encode a list (including library tables).
    if (ts.isObjectLiteralExpression(node) && node.properties.length && node.properties.every(p=>ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) && shortWords(p.name.text) && (ts.isNumericLiteral(p.initializer) || [ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(p.initializer.kind)))) addUnit(node.properties.map(p=>p.name.text),node);
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) strings.push(node.text);
    if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) && ts.isIdentifier(node.name) && /^\p{L}+$/u.test(node.name.text)) keys.push(node.name.text);
    if (ts.isRegularExpressionLiteral(node)) keys.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  keys.push(...comments.values());
  return { strings, keys, units };
}

export function jsonStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, v]) => [key, ...jsonStrings(v)]);
  return [];
}

/** Detect actual letter matrices, including digraph cells and row strings.
 * Grid scanning deliberately has no word boundaries: adjacent cells form words.
 */
export function letterGrids(value) {
  const grids = [];
  function visit(x, key) {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) {
      const rows = x.map(row => typeof row === 'string' && /^(?:cells|grid|board)$/i.test(key??'') ? [...row] : row);
      if (rows.length && rows.length <= 25 && rows.every(row => Array.isArray(row) && row.length > 0 && row.length <= 25 && row.length === rows[0].length && row.every(c => typeof c === 'string' && /^(?:CH|NG|[A-ZÅÑ']|#)$/u.test(c)))) grids.push(rows);
      else x.forEach(child => visit(child, key));
    } else Object.entries(x).forEach(([name, child]) => visit(child, name));
  }
  visit(value);
  return grids;
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

export function htmlViews(text) {
  // HTML shell content, accessible text attributes and inline script literals.
  const strings=[],keys=[],units=[];
  for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if(match[1].trim()) {const parsed=javascriptStrings(match[1]),worklets=workletStrings(parsed.strings);strings.push(...worklets.strings);keys.push(...parsed.keys,...worklets.keys);units.push(...parsed.units,...worklets.units);}
  const visible=text.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'');
  for(const match of visible.matchAll(/\b(?:alt|title|aria-label|placeholder)\s*=\s*["']([^"']*)["']/gi)) strings.push(match[1]);
  for(const match of visible.matchAll(/>([^<]+)</g)) strings.push(match[1]);
  return {strings,keys,units};
}

/** Reanimated serializes complete functions into string literals. Scan their
 * source as code too, so identifier text is never mistaken for UI vocabulary.
 */
export function workletStrings(strings, depth=0) {
  const output=[],keys=[],units=[];
  for(const text of strings) {
    if(depth<4 && /^function(?:\s|\()/.test(text) && /}\s*$/.test(text)) {
      const source='('+text+')';
      const tree=ts.createSourceFile('worklet.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      if(tree.parseDiagnostics.length===0) {
        const parsed=javascriptStrings(source),nested=workletStrings(parsed.strings,depth+1);
        output.push(...nested.strings);keys.push(...parsed.keys,...nested.keys);units.push(...parsed.units,...nested.units);continue;
      }
    }
    output.push(text);
  }
  return {strings:output,keys,units};
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
export function jsonUnits(value, context={ids:[],scope:false}) {
  if (!value || typeof value !== 'object') return [];
  const direct=Array.isArray(value) ? (value.every(v=>typeof v==='string' && shortWords(v))?value:[]) : (Object.entries(value).every(([k,v])=>shortWords(k) && ['number','boolean'].includes(typeof v))?Object.keys(value):[]);
  const ids=typeof value.id==='string'?[value.id,...context.ids]:context.ids;
  const unit=[...direct];unit.library={ids,scope:context.scope,field:context.field};
  return [unit,...Object.entries(value).flatMap(([key,v])=>jsonUnits(v,{ids,scope:context.scope||['items','index'].includes(key),field:key}))];
}

const chamoru = value => typeof value==='string' && ['ch','chamoru','chamorro'].includes(value.toLowerCase());
/** Tagged banks/labels/speech inherit language only inside their own record. */
export function chamoruValues(value, tagged=false) {
  if(typeof value==='string')return tagged?[value]:[];
  if(Array.isArray(value))return value.flatMap(v=>chamoruValues(v,tagged));
  if(!value || typeof value!=='object')return [];
  const active=chamoru(value.language??value.lang??value.locale) || tagged;
  return Object.entries(value).filter(([key])=>!['english','sourceNote'].includes(key)).flatMap(([,v])=>chamoruValues(v,active));
}

/** Source-backed teaching terms and explicit language tags survive minification
 * only in the source. Do not infer language from an English UI collision. */
export function chamoruSource(text, name) {
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true, /\.tsx$/.test(name)?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  requireThat(tree.parseDiagnostics.length===0,'Cannot parse CHamoru content source');
  const strings=[],grids=[];
  function data(n) {
    if(ts.isStringLiteralLike(n))return n.text;
    if(ts.isArrayLiteralExpression(n))return n.elements.map(data);
    if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(tree).replace(/^['"]|['"]$/g,''),data(p.initializer)]));
    return null;
  }
  function visit(n) {
    if(ts.isObjectLiteralExpression(n)) {
      const value=data(n);
      if(chamoru(value.language??value.lang??value.locale)) {strings.push(...chamoruValues(value));grids.push(...letterGrids(value));return;}
      if(name.endsWith('src/learn/content/chamoru.ts') && 'term' in value) {
        requireThat(typeof value.term==='string','CHamoru teaching term must be static text');
        strings.push(value.term);
      }
    }
    ts.forEachChild(n,visit);
  }
  visit(tree);return {strings,grids};
}

export function chamoruGrids(value, tagged=false) {
  if(!value || typeof value!=='object')return [];
  const active=tagged || (!Array.isArray(value) && chamoru(value.language??value.lang??value.locale));
  if(active)return letterGrids(value);
  return Object.values(value).flatMap(v=>chamoruGrids(v));
}

/** Lists contain short words, not identifiers, paths, sentences or UI records.
 * Three distinct broad terms remain the threshold, even in a long short-word
 * array: lowering it would reject ordinary pairs without adding leak evidence.
 */
export function shortWords(text) {
  return typeof text==='string' && text.length<=64 && /^[\p{L}\p{M}]+(?:['’'-][\p{L}\p{M}]+)*(?:[ ]+[\p{L}\p{M}]+(?:['’'-][\p{L}\p{M}]+)*)?$/u.test(text.trim());
}
export function listString(text, excluded=[]) {
  const trimmed=text.trim().replace(/^\/\/\s*|^\/\*\s*|\s*\*\/$/g,'').replace(/^\/(.*)\/[a-z]*$/s,'$1');
  const words=trimmed.split(/[\s,|;]+/).filter(Boolean);
  if(words.length<3 || !words.every(shortWords))return false;
  // Explicit list separators are stronger evidence than connective words.
  if(/[,|;\n\t]/.test(trimmed) && trimmed.split(/[,|;\n\t]+/).every(part=>/^[\p{L}\p{M}'’-]+$/u.test(part.trim())))return true;
  return !words.some(word=>safeFunctionWords(excluded).has(word.toLowerCase()));
}

// Public English grammar vocabulary. It is disjoint from the current private
// broad/core lists; runtime subtraction keeps that invariant under policy drift.
export const functionWords = ["a", "an", "the", "and", "or", "of", "in", "on", "as", "is", "it", "its", "how", "why", "does", "into", "with", "at", "by", "for", "from", "to", "than", "that", "this", "these", "those", "are", "was", "were", "be", "been", "being", "can", "could", "do", "did", "has", "have", "had", "if", "not", "only", "our", "their", "them", "we", "you", "your", "which", "who", "what", "when", "where", "while", "will", "would"];
function safeFunctionWords(excluded) {
  const forbidden=new Set(excluded.map(w=>w.toLowerCase()));
  return new Set(functionWords.filter(w=>!forbidden.has(w)));
}
export function proseTokens(strings, excluded=[]) {
  const tokens=strings.flatMap(text=>text.toLowerCase().split(/\s+/)),functions=safeFunctionWords(excluded);
  // Small arrays remain lists: one connective cannot excuse three leaked words.
  return tokens.length>=12 && tokens.filter(token=>functions.has(token)).length/tokens.length>=0.25;
}

/** Provenance is structural and item-local. A matching token elsewhere in the
 * Library, an unattached array, or a generated terms/sounds field alone cannot
 * manufacture authored provenance. Exact/core checks are independent of this.
 */
export function tracedLibraryUnit(unit, library) {
  if(!unit.library?.scope)return false;
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

// Kept byte-for-byte equivalent to src/library/search.ts normalize. The source
// bridge checks it against the generator for every authored field before use.
export function libraryNormalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim().replace(/\s+/g,' ');
}
