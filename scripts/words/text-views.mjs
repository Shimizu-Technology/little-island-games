import { Buffer, isUtf8 } from 'node:buffer';
import { requireThat } from './core.mjs';

// Extensions and decoding errors never determine whether content is binary.
export function binaryKind(bytes) {
  const hex=bytes.subarray(0,12).toString('hex'),ascii=bytes.subarray(0,12).toString('latin1');
  if(/^(?:504b0304|504b0506|504b0708|1f8b)/.test(hex))return 'archive';
  if(hex.startsWith('c61fbc03c103191f'))return 'hermes';
  if(hex.startsWith('89504e470d0a1a0a') || hex.startsWith('ffd8ff') || /^GIF8[79]a/.test(ascii))return 'image';
  if(ascii.startsWith('RIFF') && /^(?:WAVE|WEBP)$/.test(ascii.slice(8,12)))return 'media';
  if(ascii.slice(4,8)==='ftyp' || ascii.startsWith('OggS') || ascii.startsWith('ID3') || bytes[0]===255 && (bytes[1]&0xe6)===0xe2)return 'audio';
  if(/^(?:00010000|4f54544f|74727565|74746366|774f4646|774f4632)/.test(hex))return 'font';
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
