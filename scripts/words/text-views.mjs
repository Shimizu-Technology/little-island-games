import { Buffer, isUtf8 } from 'node:buffer';
import { requireThat } from './core.mjs';
import { hermesStrings } from './artifact-views.mjs';
import { validPNG, validRIFF, validMP4, validID3, validFont, validGIF, validJPEG, validOgg, validMPEG } from './media-structure.mjs';

// Extensions and decoding errors never determine whether content is binary.
export function binaryKind(bytes) {
  const hex=bytes.subarray(0,12).toString('hex');
  if(/^(?:504b0304|504b0506|504b0708|1f8b)/.test(hex))return 'archive';
  if(hex.startsWith('c61fbc03c103191f')){try{hermesStrings(bytes);return 'hermes';}catch{return undefined;}}
  if(validPNG(bytes) || validJPEG(bytes) || validGIF(bytes))return 'image';
  if(validRIFF(bytes))return 'media';
  if(validMP4(bytes) || validID3(bytes) || validOgg(bytes) || validMPEG(bytes))return 'audio';
  if(validFont(bytes))return 'font';
  return undefined;
}
export function cleanText(text) {
  return text.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g,'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g,' ');
}
export function exportTextViews(bytes) {
  const kind=binaryKind(bytes);
  // Compressed containers are not reviewed media and cannot hide members.
  requireThat(kind!=='archive','Compressed export requires explicit reviewed extraction; archives are forbidden');
  if(kind)return [];
  const bom=bytes.subarray(0,2).toString('hex'),views=[];
  if(bom==='fffe'||bom==='feff') {
    requireThat(bytes.length%2===0,'Malformed UTF-16 text export');
    const content=Buffer.from(bytes.subarray(2));if(bom==='feff')content.swap16();views.push(content.toString('utf16le'));
  } else {
    // Alternating NULs are common in BOM-less UTF-16 exports.
    const sample=bytes.subarray(0,Math.min(bytes.length,512));
    const zero=[0,0];for(let i=0;i<sample.length;i++)if(sample[i]===0)zero[i%2]++;
    if(sample.length>=4 && Math.max(...zero)>sample.length/8) {
      requireThat(bytes.length%2===0,'Malformed BOM-less UTF-16 text export');
      const content=Buffer.from(bytes);if(zero[0]>zero[1])content.swap16();views.push(content.toString('utf16le'));
    }
    if(isUtf8(bytes))views.push(bytes.toString('utf8'));
    else views.push(new TextDecoder('windows-1252').decode(bytes),bytes.toString('latin1'),bytes.toString('utf8'));
  }
  return [...new Set(views.map(cleanText))];
}
