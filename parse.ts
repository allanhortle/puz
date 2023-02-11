import {Buffer} from 'node:buffer';
const puz = Bun.file('./nyt-puz/daily/1993/11/Nov2193.puz');
const buffer = new Uint8Array(await puz.arrayBuffer());
//const width = buffer.readUInt8(0x2c);
//const height = buffer.readUInt8(0x2d);
console.log(buffer);

export {};
