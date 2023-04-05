import fs from 'fs';
import {parse, join} from 'path';
const {readFile, writeFile, lstat} = fs.promises;
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import path from 'path';
import {Buffer} from 'buffer';

function* chunks(arr, n) {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}

type PuzzleData = {
    down: string[];
    across: string[];
    fileName: string;
    board: Array<{black: boolean; number?: number}>;
    solution: Array<string>;
    title: string;
    author: string;
    copyright: string;
    notes: string;
    width: number;
    height: number;
    boardLength: number;
};

export default class Puzzle {
    data: PuzzleData;
    constructor(data: PuzzleData) {
        this.data = data;
    }

    static async fromFile(file: string) {
        // File
        const puz = await readFile(file);
        const raw = new Uint8Array(puz);
        const text = new TextDecoder('windows-1252');
        const toString = (x) => text.decode(x);
        const encoder = new TextEncoder();
        const {name} = parse(file);
        let buf = Buffer.from(raw);

        // Properties
        const width = raw[0x2c];
        const height = raw[0x2d];
        const boardLength = width * height;

        //
        // THE BOARDS SECTION
        //
        const boardStart = 0x34;
        const stateStart = boardStart + boardLength;
        const stringStart = stateStart + boardLength;
        const chunkRow = new RegExp(`.{${width}}`, 'g');
        const solution =
            text.decode(raw.slice(boardStart, boardStart + boardLength)).match(chunkRow) || [];
        //const state = text.decode(raw.slice(stateStart, stateStart + boardLength)).match(chunkRow);

        //
        // THE STRINGS SECTION
        //
        let stringData = buf.subarray(stringStart);

        // Shift off a everything up to the next null
        function shiftToNull() {
            const end = stringData.indexOf(0x00);
            const next = stringData.subarray(0, end);
            stringData = stringData.subarray(end + 1);
            return next;
        }
        function shiftClue() {
            return toString(shiftToNull());
        }

        const title = shiftClue();
        const author = shiftClue();
        const copyright = shiftClue();

        //
        // Then Do The Clues

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

        // Work through the board one by one building up the data
        // At each valid clue location shift off a new clue from the buffer
        const across: string[] = [];
        const down: string[] = [];
        const board: {
            black: boolean;
            circle?: boolean;
            number?: number;
        }[][] = [...Array(height)].map((_) => Array(width));

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
                    if (needsAcross) across[currentNumber] = shiftClue() ?? '';
                    if (needsDown) down[currentNumber] = shiftClue() ?? '';
                    board[y][x] = {black: false, number: currentNumber};
                    currentNumber++;
                }
            }
        }

        // Process Extras
        while (stringData.length > 0) {
            const data = shiftToNull();

            if (toString(data).match(/(GEXT)|(GRBS)|(RTBL)/)) {
                const title = toString(data.subarray(0, 4));
                const length = data[4];
                const content = stringData.subarray(2, length + 2);
                if (title === 'RTBL') {
                    // Probably dont need to parse these for printing
                }
                if (title === 'GRBS') {
                    // Probably dont need to parse these for printing
                }
                if (title === 'GEXT') {
                    content.forEach((ii, index) => {
                        const column = index % width;
                        const row = Math.floor(index / width);
                        board[row][column].circle = ii > 0;
                    });
                }
            }
        }

        //
        // Pdf
        return new Puzzle({
            down,
            across,
            fileName: name,
            board: board.flat(1),
            solution,
            title,
            author,
            copyright,
            notes: '',
            width,
            height,
            boardLength
        });
    }

    get stats() {
        return {
            title: this.data.title,
            author: this.data.author,
            copyright: this.data.copyright,
            notes: this.data.notes,
            width: this.data.width,
            height: this.data.height,
            acrossClues: this.data.across.filter((ii) => ii).length,
            downClues: this.data.down.filter((ii) => ii).length,
            fileName: this.data.fileName
        };
    }

    async pdf(options: {output?: string; debugTemplate?: boolean} = {}) {
        const {output = process.cwd(), debugTemplate} = options;
        const stats = await lstat(output);
        const outputPath = stats.isDirectory()
            ? path.join(output, `${this.data.fileName}.pdf`)
            : output;
        const template = handlebars.compile(
            await readFile(path.join(__dirname, '../../src/template.hbs'), 'utf8')
        );
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const html = template(this.data);
        if (debugTemplate) await writeFile('template.html', html, 'utf8');

        await page.goto(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true
        });
        await browser.close();
        return outputPath;
    }

    printSolution() {
        console.log(this.data.solution.join('\n').replace(/\./g, ' ').replace(/(.)/g, '$1 '));
    }
}
