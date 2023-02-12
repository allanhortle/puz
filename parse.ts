// File
const puz = Bun.file('./test.puz');
const raw = new Uint8Array(await puz.arrayBuffer());
const text = new TextDecoder();

// Properties
const width = raw[0x2c];
const height = raw[0x2d];
const boardLength = width * height;

// Board
const boardStart = 0x34;
const stateStart = boardStart + boardLength;
const stringStart = stateStart + boardLength;
const chunkRow = new RegExp(`.{${width}}`, 'g');
const solution = text.decode(raw.slice(boardStart, boardStart + boardLength)).match(chunkRow);
const state = text.decode(raw.slice(stateStart, stateStart + boardLength)).match(chunkRow);

// Strings
const [title, author, copyright, ...clues] = text
    .decode(raw.slice(stringStart))
    .split('\u0000')
    .filter((ii) => ii);
const notes = clues.pop();

const crossword = {
    title,
    author,
    copyright,
    notes,
    width,
    height,
    clues,
    boardLength
};

function isBlack(x: number, y: number) {
    return solution[y][x] === '.';
}

function needsAcrossNumber(x: number, y: number) {
    // Check that there is no space to the left
    if (x === 0 || isBlack(x - 1, y)) {
        // Check that there is space (at least two cells) for a word here
        if (x + 2 < width && !isBlack(x + 1, y)) {
            return true;
        }
    }
    return false;
}

function needsDownNumber(x: number, y: number) {
    // Check that there is no space above
    if (y === 0 || isBlack(x, y - 1)) {
        // Check that there is space (at least two cells) for a word here
        if (y + 2 < height && !isBlack(x, y + 1)) {
            return true;
        }
    }
    return false;
}

const clueStack = [...clues];
const acrossClues = [];
const downClues = [];
const numbers = [...Array(height)].map((_) => Array(width));

let currentNumber = 1;
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        if (isBlack(x, y)) continue;
        const needsDown = needsDownNumber(x, y);
        const needsAcross = needsAcrossNumber(x, y);

        if (needsAcross || needsDown) {
            if (needsAcross) acrossClues[currentNumber] = `${currentNumber}: ${clueStack.shift()}`;
            if (needsDown) downClues[currentNumber] = `${currentNumber}: ${clueStack.shift()}`;
            numbers[y][x] = currentNumber;
            currentNumber++;
        }
    }
}

console.log(downClues.filter((ii) => ii).join('\n'));
console.log(
    solution
        .map((row) =>
            row
                .split('')
                .map((ii) => ii + ' ')
                .join('')
        )
        .join('\n')
        .replace(/\./g, ' ')
);

console.log('---');

console.log(
    state
        .map((row, y) =>
            row
                .split('')
                .map((ii, x) => {
                    if (ii === '.') return '   ';
                    return `${numbers[y][x] ?? '□'}`.padEnd(3, ' ');
                })
                .join('')
        )
        .join('\n')
);

export {};
