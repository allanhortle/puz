import puppeteer from 'puppeteer';
import handlebars from 'handlebars';

import {readFileSync} from 'fs';
import {writeFileSync} from 'fs';
(async () => {
    // File
    const puz = readFileSync('./test.puz');
    const raw = new Uint8Array(puz);
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
    //const state = text.decode(raw.slice(stateStart, stateStart + boardLength)).match(chunkRow);

    // Strings
    const [title, author, copyright, ...clues] = text
        .decode(raw.slice(stringStart))
        .split('\u0000')
        .filter((ii) => ii);
    const notes = clues.pop();

    // Helpers
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

    //
    // Clues & Numbers
    const across = [];
    const down = [];
    const board = [...Array(height)].map((_) => Array(width));

    let currentNumber = 1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBlack(x, y)) {
                board[y][x] = {black: true};
                continue;
            }
            const needsDown = needsDownNumber(x, y);
            const needsAcross = needsAcrossNumber(x, y);

            board[y][x] = {black: false};
            if (needsAcross || needsDown) {
                if (needsAcross) across[currentNumber] = clues.shift();
                if (needsDown) down[currentNumber] = clues.shift();
                board[y][x] = {black: false, number: currentNumber};
                currentNumber++;
            }
        }
    }

    //
    // Pdf
    const crossword = {
        down,
        across,
        board: board.flat(1),
        title,
        author,
        copyright,
        notes,
        width,
        height,
        boardLength
    };

    var template = handlebars.compile(readFileSync('./template.hbs', 'utf8'));
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    writeFileSync('template.html', template(crossword), 'utf8');
    await page.goto(`data:text/html;charset=UTF-8,${template(crossword)}`);
    await page.pdf({
        path: 'test.pdf',
        format: 'A4',
        printBackground: true
    });
    await browser.close();
})();
