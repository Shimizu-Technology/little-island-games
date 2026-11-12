// A recognizable tag is insufficient: validate the container before skipping text.
const tag=(b,at,n)=>b.subarray(at,at+n).toString('latin1');
export function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function validPNG(b) {
  if(b.length<57 || b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return false;
  let at=8,header=false,data=false;
  while(at+12<=b.length) {
    const size=b.readUInt32BE(at),kind=tag(b,at+4,4),end=at+12+size;
    if(end>b.length || !/^[A-Za-z]{4}$/.test(kind) || crc32(b.subarray(at+4,end-4))!==b.readUInt32BE(end-4))return false;
    if(!header){if(kind!=='IHDR' || size!==13 || !b.readUInt32BE(at+8) || !b.readUInt32BE(at+12) || ![1,2,4,8,16].includes(b[at+16]) || ![0,2,3,4,6].includes(b[at+17]) || b[at+18] || b[at+19] || b[at+20]>1)return false;header=true;}
    else if(kind==='IHDR')return false;
    if(kind==='IDAT')data=true;
    if(kind==='IEND')return size===0 && data && end===b.length;
    at=end;
  }
  return false;
}
export function validRIFF(b) {
  if(b.length<20 || tag(b,0,4)!=='RIFF' || b.readUInt32LE(4)+8!==b.length || !['WAVE','WEBP'].includes(tag(b,8,4)))return false;
  let at=12,format=false,data=false;
  while(at+8<=b.length){const kind=tag(b,at,4),size=b.readUInt32LE(at+4);if(at+8+size>b.length)return false;if(kind==='fmt ' && size>=16)format=true;if(kind==='data' || ['VP8 ','VP8L','ANMF'].includes(kind))data=true;at+=8+size+(size%2);}
  return at===b.length && data && (tag(b,8,4)==='WEBP' || format);
}
export function validMP4(b) {
  let at=0,ftyp=false;
  while(at+8<=b.length){let size=b.readUInt32BE(at),header=8;const kind=tag(b,at+4,4);if(size===1){if(at+16>b.length)return false;const large=b.readBigUInt64BE(at+8);if(large>BigInt(Number.MAX_SAFE_INTEGER))return false;size=Number(large);header=16;}else if(size===0)size=b.length-at;if(size<header || at+size>b.length)return false;if(kind==='ftyp'){if(at!==0 || size<header+8 || (size-header)%4 || !/^[\x20-\x7e]{4}$/.test(tag(b,at+header,4)))return false;ftyp=true;}at+=size;}
  return ftyp && at===b.length;
}
export function validID3(b) {
  return b.length>=10 && tag(b,0,3)==='ID3' && [2,3,4].includes(b[3]) && b[4]!==255 && !(b[5] & (b[3]===2?0x3f:b[3]===3?0x1f:0x0f)) && b.subarray(6,10).every(n=>n<128) && 10+((b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9])+(b[3]===4 && (b[5]&16)?10:0)<=b.length;
}
export function validFont(b) {
  const magic=b.subarray(0,4).toString('hex');
  if(['00010000','4f54544f','74727565'].includes(magic)) {
    if(b.length<12)return false;const count=b.readUInt16BE(4);if(!count || count>4096 || 12+count*16>b.length)return false;
    const tags=new Set();for(let i=0;i<count;i++){const at=12+i*16,name=tag(b,at,4),offset=b.readUInt32BE(at+8),size=b.readUInt32BE(at+12);if(!/^[\x20-\x7e]{4}$/.test(name) || tags.has(name) || offset<12+count*16 || offset+size>b.length)return false;tags.add(name);}return true;
  }
  if(['774f4646','774f4632'].includes(magic)) {
    const woff2=magic==='774f4632',header=woff2?48:44;
    if(b.length<header || b.readUInt32BE(8)!==b.length || !b.readUInt16BE(12) || b.readUInt16BE(14)!==0 || b.readUInt32BE(16)<12)return false;
    if(woff2)return b.readUInt32BE(20)>0 && header+b.readUInt32BE(20)<=b.length;
    const count=b.readUInt16BE(12);if(header+count*20>b.length)return false;
    for(let i=0;i<count;i++){const at=header+i*20,offset=b.readUInt32BE(at+4),size=b.readUInt32BE(at+8);if(offset<header+count*20 || offset+size>b.length || size>b.readUInt32BE(at+12))return false;}return true;
  }
  if(magic==='74746366') {
    if(b.length<16 || ![0x10000,0x20000].includes(b.readUInt32BE(4)))return false;
    const count=b.readUInt32BE(8);if(!count || count>4096 || 12+count*4>b.length)return false;
    // Collection table offsets are absolute, so validate each directory in place.
    for(let i=0;i<count;i++){const at=b.readUInt32BE(12+i*4);if(at+12>b.length || !['00010000','4f54544f','74727565'].includes(b.subarray(at,at+4).toString('hex')))return false;const n=b.readUInt16BE(at+4);if(!n || at+12+n*16>b.length)return false;for(let j=0;j<n;j++){const p=at+12+j*16;if(b.readUInt32BE(p+8)+b.readUInt32BE(p+12)>b.length)return false;}}return true;
  }
  return false;
}
export function validGIF(b) {
  if(b.length<14 || !/^GIF8[79]a$/.test(tag(b,0,6)) || !b.readUInt16LE(6) || !b.readUInt16LE(8))return false;
  let at=13+(b[10]&128?3*(2**((b[10]&7)+1)):0),image=false;
  function blocks(){while(at<b.length){const size=b[at++];if(!size)return true;if(at+size>b.length)return false;at+=size;}return false;}
  while(at<b.length){const type=b[at++];if(type===0x3b)return image && at===b.length;if(type===0x21){at++;if(!blocks())return false;}else if(type===0x2c){if(at+9>b.length || !b.readUInt16LE(at+4) || !b.readUInt16LE(at+6))return false;const packed=b[at+8];at+=9+(packed&128?3*(2**((packed&7)+1)):0);if(at>=b.length || b[at]<2 || b[at]>8)return false;at++;if(!blocks())return false;image=true;}else return false;}
  return false;
}
export function validJPEG(b) {
  if(b.length<6 || b[0]!==255 || b[1]!==216)return false;
  let at=2,frame=false,scan=false;
  while(at<b.length){if(b[at++]!==255)return false;while(b[at]===255)at++;const marker=b[at++];if(marker===217)return frame && scan && at===b.length;if(marker===0 || marker===216 || at+2>b.length)return false;const size=b.readUInt16BE(at);if(size<2 || at+size>b.length)return false;if([192,193,194].includes(marker)){if(size<8 || !b.readUInt16BE(at+3) || !b.readUInt16BE(at+5))return false;frame=true;}at+=size;if(marker===218){scan=true;while(at<b.length){if(b[at]!==255){at++;continue;}if(b[at+1]===0 || b[at+1]>=208 && b[at+1]<=215){at+=2;continue;}break;}}}
  return false;
}
export function validOgg(b) {
  let at=0,pages=0;
  while(at+27<=b.length){if(tag(b,at,4)!=='OggS' || b[at+4]!==0 || (b[at+5]&~7))return false;const n=b[at+26];if(at+27+n>b.length)return false;const size=b.subarray(at+27,at+27+n).reduce((a,n)=>a+n,0);at+=27+n+size;if(at>b.length)return false;pages++;}
  return pages>0 && at===b.length;
}
export function validMPEG(b) {
  if(b.length<4 || b[0]!==255 || (b[1]&0xe0)!==0xe0)return false;
  const version=(b[1]>>3)&3,layer=(b[1]>>1)&3,rate=(b[2]>>2)&3,index=b[2]>>4;
  if(version===1 || layer!==1 || rate===3 || index===0 || index===15)return false;
  const rates=[44100,48000,32000],bitrates=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
  const length=Math.floor((version===3?144:72)*bitrates[index]*1000/(rates[rate]/(version===3?1:version===2?2:4)))+((b[2]>>1)&1);
  return b.length>=length;
}
