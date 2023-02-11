import {Buffer} from 'node:buffer';
const puz = Bun.file('./test.puz');
const raw = new Uint8Array(await puz.arrayBuffer());
const view = new DataView(await puz.arrayBuffer());
const text = new TextDecoder();

const meta = {
    width: raw[0x2c],
    height: raw[0x2d],
    numberOfClues: raw[0x2e] + raw[0x2f]
};

const boardLength = meta.width * meta.height;
const bodyStart = 0x34;
const stateStart = bodyStart + boardLength;
const stringStart = stateStart + boardLength;

const row = new RegExp(`.{${meta.width}}`, 'g');

const solution = text.decode(raw.slice(bodyStart, bodyStart + boardLength)).match(row);

const state = text.decode(raw.slice(stateStart, stateStart + boardLength)).match(row);

let lastIndex = 0;
const [title, author, copyright, ...clues] = text
    .decode(raw.slice(stringStart))
    .split('\u0000')
    .filter((ii) => ii);

const notes = clues.pop();

//const clues = [];
//const nMap = (n: number) => String.fromCharCode(n);
//const stringify = (n: number[]) => n.map(nMap).join('');
//// Is adding the clues the right way to do this? Not sure
//for (let i = 0, max = meta.clues[0] + meta.clues[1]; i < max; i++) {
//const clue = get(index + 1);
//clues.push(stringify(clue.value));
//({index} = clue);
//}
console.log(meta);
console.log(solution);
console.log(state);
console.log({title, author, copyright, notes, clues: clues.length, meta});

export {};
