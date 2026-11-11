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
 * Quoted keys and comments remain in the leak view; bare property names are identifiers.
 */
export function javascriptStrings(text) {
  const tree = ts.createSourceFile('artifact.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  requireThat(tree.parseDiagnostics.length === 0, 'Cannot parse exported JavaScript');
  const strings = [], keys = [];
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan()) {
    if(token===ts.SyntaxKind.SingleLineCommentTrivia || token===ts.SyntaxKind.MultiLineCommentTrivia) keys.push(scanner.getTokenText());
  }
  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) strings.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { strings, keys };
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

export function htmlStrings(text) {
  // HTML shell content, accessible text attributes and inline script literals.
  const strings=[];
  for(const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if(match[1].trim()) strings.push(...javascriptStrings(match[1]).strings);
  const visible=text.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,'');
  for(const match of visible.matchAll(/\b(?:alt|title|aria-label|placeholder)\s*=\s*["']([^"']*)["']/gi)) strings.push(match[1]);
  strings.push(visible.replace(/<[^>]*>/g,' '));
  return strings;
}

/** Reanimated serializes complete functions into string literals. Scan their
 * source as code too, so identifier text is never mistaken for UI vocabulary.
 */
export function workletStrings(strings, depth=0) {
  const output=[],keys=[];
  for(const text of strings) {
    if(depth<4 && /^function(?:\s|\()/.test(text) && /}\s*$/.test(text)) {
      const source='('+text+')';
      const tree=ts.createSourceFile('worklet.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      if(tree.parseDiagnostics.length===0) {
        const parsed=javascriptStrings(source),nested=workletStrings(parsed.strings,depth+1);
        output.push(...nested.strings);keys.push(...parsed.keys,...nested.keys);continue;
      }
    }
    output.push(text);
  }
  return {strings:output,keys};
}
